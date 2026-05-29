import type { Registry } from "prom-client";
import { LokeLogger } from "./lib/logger";
import { metricsMiddleware } from "./lib/metrics";
import { ConsoleStream, SyslogStream } from "./lib/streams";

export { LogFields, printf } from "./lib/common";
export { Logger, LokeLogger } from "./lib/logger";
export { nullLogger } from "./lib/null";
export { ConsoleStream, SyslogStream } from "./lib/streams";

export interface CreateLoggerOptions {
  syslog?: boolean;
  metricsRegistry?: Registry;
  showDebug?: boolean;
  systemdPrefix?: boolean;
  escapeNewlines?: boolean;
  domain?: string;
}

const systemd = Boolean(process.env.JOURNAL_STREAM);
const kubernetes = Boolean(process.env.KUBERNETES_SERVICE_HOST);

export function createLogger({
  syslog = false,
  metricsRegistry,
  showDebug,
  systemdPrefix = systemd,
  escapeNewlines = systemd || kubernetes,
  domain,
}: CreateLoggerOptions = {}): LokeLogger {
  const streams: NodeJS.WritableStream[] = [
    new ConsoleStream(undefined, undefined, systemdPrefix, escapeNewlines),
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
