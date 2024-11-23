import React from "react";

import { Text } from "ink";
import { parse, setOptions } from "marked";
import TerminalRenderer, {
  type TerminalRendererOptions,
} from "marked-terminal";

export type Props = TerminalRendererOptions & {
  children: string;
};

export default function Markdown({ children, ...options }: Props) {
  setOptions({ renderer: new TerminalRenderer(options) });
  return <Text>{parse(children).trim()}</Text>;
}
