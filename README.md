# Red

This is my simple terminal-based multiplayer text editor that uses CRDTs for synchronization and conflict resolution. This
is an extension of what I learned at [Replit](https://replit.com) and recent learnings from [jazz.tools](https://jazz.tools)
about multiplayer experiences.

This is built using Bun, Protocol Buffers, and gRPC for the backend and a simple terminal frontend written using Ink.
The editor supports simple text editing features like cursor movement, text insertion, and deletion. It synchronizes
clients on first-load and stores the document history in a SQLite database.

You can view the API definition in the `packages/proto` directory and the backend implementation in the `apps/server`.

## Installation

To install the editor, you can run the following command:

```bash
git clone https://github.com/rayhanadev/red.git
cd red
bun install
```

## Usage

To start the server, run the following command:

```bash
cd apps/server
bun dev
```

To start a client, run the following command:

```bash
cd apps/client
bun dev
```
