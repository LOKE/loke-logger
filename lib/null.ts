import type { Logger } from "./logger";

export const nullLogger: Logger = {
  debug(): void {},
  log(): void {},
  info(): void {},
  warn(): void {},
  error(): void {},
};
