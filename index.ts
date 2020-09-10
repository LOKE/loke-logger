import { SyslogStream, ConsoleStream } from "./lib/streams";
import { LokeLogger } from "./lib/logger";
import { metricsMiddleware } from "./lib/metrics";
import { Registry } from "prom-client";

export { SyslogStream, ConsoleStream } from "./lib/streams";
export { LokeLogger, Logger } from "./lib/logger";
export { nullLogger } from "./lib/null";

export interface CreateLoggerOptions {
  syslog?: boolean;
  metricsRegistry?: Registry;
  showDebug?: boolean;
}

export function create({
  syslog = false,
  metricsRegistry,
  showDebug,
}: CreateLoggerOptions = {}): LokeLogger {
  const streams: NodeJS.WritableStream[] = [new ConsoleStream()];

  if (syslog) {
    streams.push(new SyslogStream());
  }

  let logger = new LokeLogger({ showDebug, streams });

  if (metricsRegistry) {
    logger = metricsMiddleware(metricsRegistry)(logger);
  }

  return logger;
}
