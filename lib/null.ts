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
  withPrefix() {
    return nullLogger;
  },
};
