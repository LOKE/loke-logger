import { Logger } from "./logger";

export const nullLogger = {
  prefix: "null",
  debug(): void {
    return;
  },
  log(): void {
    return;
  },
  info(): void {
    return;
  },
  warn(): void {
    return;
  },
  error(): void {
    return;
  },
  withPrefix(): Logger {
    return nullLogger;
  },
};
