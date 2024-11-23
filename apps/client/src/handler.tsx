import readline from "node:readline";

import { useEffect, useState } from "react";
import { Box, render, Text, useInput, useApp, useFocus, useStdin } from "ink";

import { useStdoutDimensions } from "./hooks/useStdoutDimensions";
import Markdown from "./components/Markdown";
import {
  ENTER_ALT_SCREEN_ANSI_SEQUENCE,
  EXIT_ALT_SCREEN_ANSI_SEQUENCE,
} from "./utils/consts";

const defaultText = `# Welcome to Red

Red is a lightning-fast, **collaborative** editor available in your terminal.`;

export default async function handler(opts: string) {
  // TODO: read options
  // TODO: create/connect server

  const app = render(<Editor initialText={defaultText} />);

  await app.waitUntilExit();
  process.exit();
}

const Editor = ({ initialText }: Readonly<{ initialText?: string }>) => {
  const { exit } = useApp();
  const [columns, rows] = useStdoutDimensions();
  const { stdin, setRawMode } = useStdin();

  const [textContent, setTextContent] = useState(initialText ?? "");
  const [cursor, setCursor] = useState({ x: textContent.length - 1 });
  const [blink, setBlink] = useState(true);
  const [count, setCount] = useState(0);

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

  // stdin.on("keypress", (chunk, key: KeyboardEvent) => {
  //   // const key = data.toString();
  //   // if (key.code === "\u001b") {
  //   //   exit();
  //   // }

  //   // // setTextContent((prev) => {
  //   // //   const start = prev.slice(0, cursor.x);
  //   // //   const end = prev.slice(cursor.x);
  //   // //   return `${start}${key}${end}`;
  //   // // });
  //   setCount((prev) => prev + 1);
  //   setTextContent(String(count));
  //   // setCursor((prev) => ({ x: prev.x + 1 }));
  // });

  useInput((input, key) => {
    if (key.escape) {
      exit();
      return;
    }

    if (key.return) {
      setTextContent((prev) => {
        const start = prev.slice(0, cursor.x);
        const end = prev.slice(cursor.x);
        return `${start}\n${end}`;
      });
      setCursor((prev) => ({ x: prev.x + 1 }));
      return;
    }

    if (key.backspace) {
      // can't differentiate between backspace and delete
    }

    if (key.delete) {
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

    if (key.upArrow) {
      return;
    }

    if (key.downArrow) {
      return;
    }

    if (input) {
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
