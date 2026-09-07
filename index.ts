import { LokeLogger } from "./lib/logger";
import { metricsMiddleware, type MetricsRegistry } from "./lib/metrics";
import { ConsoleStream, SyslogStream } from "./lib/streams";

export { LogFields, printf } from "./lib/common";
export { Logger, LokeLogger } from "./lib/logger";
export { MetricsRegistry } from "./lib/metrics";
export { nullLogger } from "./lib/null";
export { ConsoleStream, SyslogStream } from "./lib/streams";

export interface CreateLoggerOptions {
  syslog?: boolean;
  metricsRegistry?: MetricsRegistry;
  showDebug?: boolean;
  domain?: string;
}

export function createLogger({
  syslog = false,
  metricsRegistry,
  showDebug,
  domain,
}: CreateLoggerOptions = {}): LokeLogger {
  const streams: NodeJS.WritableStream[] = [new ConsoleStream()];

  if (syslog) {
    streams.push(new SyslogStream());
  }

  let logger = new LokeLogger({ showDebug, streams, domain });

  if (metricsRegistry) {
    logger = metricsMiddleware(metricsRegistry)(logger);
  }

  return logger;
}
