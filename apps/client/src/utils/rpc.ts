import { ChannelCredentials } from "@grpc/grpc-js";
import type { StreamMessage } from "@repo/proto";
import { CrdtServiceClient, type ICrdtServiceClient } from "@repo/proto/client";

import { HOST } from "./consts";

export const client = new CrdtServiceClient(
  HOST,
  ChannelCredentials.createInsecure(),
  {},
  {},
);
