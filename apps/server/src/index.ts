import { Database } from "bun:sqlite";

import * as grpc from "@grpc/grpc-js";
import type { Operation, StreamMessage } from "@repo/proto";
import { crdtServiceDefinition, type ICrdtService } from "@repo/proto/server";

const host = process.env.HOST ?? "localhost:50051";

const db = new Database("document.db");
db.run(`
  CREATE TABLE IF NOT EXISTS operations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operation_type TEXT NOT NULL,
    char_id TEXT NOT NULL,
    value TEXT,
    prev_id TEXT
  )
`);

const clients: Set<grpc.ServerDuplexStream<StreamMessage, StreamMessage>> =
  new Set();

const crdtServer: ICrdtService = {
  syncStream: (call: grpc.ServerDuplexStream<StreamMessage, StreamMessage>) => {
    clients.add(call);
    console.log("Client connected. Total clients:", clients.size);

    const existingOperations = db
      .query(
        "SELECT operation_type as operationType, char_id as charId, value, prev_id as prevId FROM operations",
      )
      .all() as Operation[];

    console.log("Syncing client with", JSON.stringify(existingOperations));

    call.write({ operations: existingOperations });

    call.on("data", (message: StreamMessage) => {
      console.log("Received OP:", JSON.stringify(message.operations));

      const stmt = db.prepare(`
              INSERT INTO operations (operation_type, char_id, value, prev_id)
              VALUES (?, ?, ?, ?)
            `);

      for (const operation of message.operations) {
        stmt.run(
          operation.operationType,
          operation.charId,
          operation.value ?? null,
          operation.prevId ?? null,
        );
      }

      for (const client of clients) {
        if (client !== call) {
          client.write(message);
        }
      }
    });

    call.on("end", () => {
      console.log("Stream ended");
      clients.delete(call);
      call.end();
    });

    call.on("error", (error) => {
      console.error("GRPC Server Error:", error);
      clients.delete(call);
    });
  },
};

const server = new grpc.Server();
server.addService(crdtServiceDefinition, crdtServer);
server.bindAsync(
  host,
  grpc.ServerCredentials.createInsecure(),
  (err: Error | null, port: number) => {
    if (err) {
      console.error(`Server error: ${err.message}`);
    } else {
      console.log(`Server bound on port: ${port}`);
    }
  },
);
