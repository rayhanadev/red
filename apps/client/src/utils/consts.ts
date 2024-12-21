export const ENTER_ALT_SCREEN_ANSI_SEQUENCE = "\x1b[?1049h";
export const EXIT_ALT_SCREEN_ANSI_SEQUENCE = "\x1b[?1049l";

// TODO: dynamically set the host based on parameters
export const HOST = process.env.HOST ?? "localhost:50051";
