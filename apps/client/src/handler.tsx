import readline from "node:readline";

import type { ClientDuplexStream } from "@grpc/grpc-js";
import type { Operation, StreamMessage } from "@repo/proto";
import { useEffect, useState } from "react";
import { Box, render, Text, useInput, useApp, useFocus, useStdin } from "ink";

import { useStdoutDimensions } from "./hooks/useStdoutDimensions";
import Markdown from "./components/Markdown";
import {
  ENTER_ALT_SCREEN_ANSI_SEQUENCE,
  EXIT_ALT_SCREEN_ANSI_SEQUENCE,
} from "./utils/consts";
import { client } from "./utils/rpc";

const defaultText = "";

export default async function handler(opts: string) {
  const call = client.syncStream();

  const app = render(<Editor initialText={defaultText} />);

  await app.waitUntilExit();
  process.exit();
}

const Editor = ({ initialText }: Readonly<{ initialText?: string }>) => {
  const { exit } = useApp();
  const [columns, rows] = useStdoutDimensions();
  const { stdin, setRawMode } = useStdin();

  const [textContent, setTextContent] = useState(initialText ?? "");
  const [cursor, setCursor] = useState({ x: textContent.length });
  const [blink, setBlink] = useState(true);
  const [stream, setStream] = useState<ClientDuplexStream<
    StreamMessage,
    StreamMessage
  > | null>(null);

  useEffect(() => {
    // Establish the gRPC stream
    const call = client.syncStream();

    call.on("data", (response) => {
      const operations = response.operations as Operation[];

      for (const operation of operations) {
        if (operation.operationType === "insert") {
          if (operation.prevId === null) {
            setTextContent((prev) => `${operation.value}${prev}`);
          } else {
            // const index = getIndexFromId(operation.prevId) + 1;
            setTextContent((prev) => {
              const start = prev.slice(0, cursor.x);
              const end = prev.slice(cursor.x);
              return `${start}${operation.value}${end}`;
            });
          }

          setCursor((prev) => ({
            x: prev.x + 1,
          }));
        } else if (operation.operationType === "delete") {
          const index = getIndexFromId(operation.charId);
          setTextContent((prev) => {
            const start = prev.slice(0, cursor.x);
            const end = prev.slice(cursor.x + 1);
            return `${start}${end}`;
          });

          setCursor((prev) => ({
            x: prev.x - 1,
          }));
        }
      }
    });

    call.on("error", (err) => console.error("Stream error:", err));
    call.on("end", () => console.log("Stream ended."));

    setStream(call);

    return () => {
      if (stream) stream.end();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlink((prev) => !prev);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    process.stdout.write(ENTER_ALT_SCREEN_ANSI_SEQUENCE);
    process.stdin.resume();

    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) setRawMode(true);
    stdin.setEncoding("utf-8");

    return () => {
      if (process.stdin.isTTY) setRawMode(false);
      process.stdout.write(EXIT_ALT_SCREEN_ANSI_SEQUENCE);
    };
  }, []);

  useFocus({ autoFocus: true });

  const sendOperation = (operation) => {
    if (stream) {
      stream.write({ operations: [operation] });
    }
  };

  // useInput((input, key) => {
  //   if (key.escape) {
  //     exit();
  //     return;
  //   }

  //   if (key.return) {
  //     setTextContent((prev) => {
  //       const start = prev.slice(0, cursor.x);
  //       const end = prev.slice(cursor.x);
  //       return `${start}\n${end}`;
  //     });
  //     setCursor((prev) => ({ x: prev.x + 1 }));
  //     return;
  //   }

  //   if (key.backspace) {
  //     // can't differentiate between backspace and delete
  //   }

  //   if (key.delete) {
  //     setTextContent((prev) => {
  //       const start = prev.slice(0, cursor.x - 1);
  //       const end = prev.slice(cursor.x);
  //       return `${start}${end}`;
  //     });
  //     setCursor((prev) => ({ x: Math.max(0, prev.x - 1) }));
  //     return;
  //   }

  //   if (key.leftArrow) {
  //     setCursor((prev) => ({ x: Math.max(0, prev.x - 1) }));
  //     return;
  //   }

  //   if (key.rightArrow) {
  //     setCursor((prev) => ({ x: Math.min(textContent.length, prev.x + 1) }));
  //     return;
  //   }

  //   if (key.upArrow) {
  //     return;
  //   }

  //   if (key.downArrow) {
  //     return;
  //   }

  //   if (input) {
  //     setTextContent((prev) => {
  //       const start = prev.slice(0, cursor.x);
  //       const end = prev.slice(cursor.x);
  //       return `${start}${input}${end}`;
  //     });
  //     setCursor((prev) => ({ x: prev.x + 1 }));
  //   }
  // });

  useInput((input, key) => {
    if (key.return) {
      const operation: Operation = {
        operationType: "insert",
        charTd: generateUniqueId(cursor.x),
        value: "\n",
        prevId: getPrevCharId(cursor.x),
      };
      sendOperation(operation);
      setTextContent((prev) => {
        const start = prev.slice(0, cursor.x);
        const end = prev.slice(cursor.x);
        return `${start}\n${end}`;
      });
      setCursor((prev) => ({ x: prev.x + 1 }));
      return;
    }

    if (key.backspace || key.delete) {
      const charId = getCharId(cursor.x - 1); // Assuming char ID maps to cursor position
      const operation: Operation = {
        operationType: "delete",
        charId: charId,
        value: "", // Value is unnecessary for delete
        prevId: null,
      };
      sendOperation(operation);
      setTextContent((prev) => {
        const start = prev.slice(0, cursor.x - 1);
        const end = prev.slice(cursor.x);
        return `${start}${end}`;
      });
      setCursor((prev) => ({ x: Math.max(0, prev.x - 1) }));
      return;
    }

    if (key.leftArrow) {
      setCursor((prev) => ({ x: Math.max(0, prev.x - 1) }));
      return;
    }

    if (key.rightArrow) {
      setCursor((prev) => ({ x: Math.min(textContent.length, prev.x + 1) }));
      return;
    }

    if (input) {
      const operation = {
        operationType: "insert",
        charId: generateUniqueId(cursor.x),
        value: input,
        prevId: getPrevCharId(cursor.x),
      };
      sendOperation(operation);
      setTextContent((prev) => {
        const start = prev.slice(0, cursor.x);
        const end = prev.slice(cursor.x);
        return `${start}${input}${end}`;
      });
      setCursor((prev) => ({ x: prev.x + 1 }));
    }
  });

  const beforeCursor = textContent.slice(0, cursor.x);
  const afterCursor = textContent.slice(cursor.x + 1);
  const currentChar = textContent[cursor.x] ?? " ";

  return (
    <Box
      borderStyle="single"
      alignItems="flex-start"
      padding={1}
      height={rows}
      width={columns}
    >
      <Markdown>
        {`${beforeCursor}${blink ? currentChar : " "}${afterCursor}`}
      </Markdown>
    </Box>
  );
};

function generateUniqueId(index) {
  return `char-${index}-${Date.now()}`;
}

function getPrevCharId(index) {
  return index > 0 ? `char-${index - 1}` : null;
}

function getCharId(index) {
  return `char-${index}`;
}

function getIndexFromId(char_id) {
  const match = char_id.match(/char-(\d+)-/);
  return match ? Number.parseInt(match[1], 10) : 0;
}
