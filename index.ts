import { LokeLogger } from "./lib/logger";
import { metricsMiddleware, type MetricsRegistry } from "./lib/metrics";
import { ConsoleStream, SyslogStream } from "./lib/streams";

export { LogFields, printf } from "./lib/common";
export { Logger, LokeLogger } from "./lib/logger";
export { MetricsRegistry } from "./lib/metrics";
export { nullLogger } from "./lib/null";
export { ConsoleStream, SyslogStream } from "./lib/streams";

const kubernetes = Boolean(process.env.KUBERNETES_SERVICE_HOST);

export interface CreateLoggerOptions {
  syslog?: boolean;
  pretty?: boolean;
  metricsRegistry?: MetricsRegistry;
  showDebug?: boolean;
  domain?: string;
}

export function createLogger({
  syslog = false,
  metricsRegistry,
  showDebug,
  domain,
  pretty = !kubernetes,
}: CreateLoggerOptions = {}): LokeLogger {
  const streams: NodeJS.WritableStream[] = [
    new ConsoleStream(undefined, undefined, pretty),
  ];

  if (syslog) {
    streams.push(new SyslogStream());
  }

  let logger = new LokeLogger({ showDebug, streams, domain });

  if (metricsRegistry) {
    logger = metricsMiddleware(metricsRegistry)(logger);
  }

  return logger;
}
