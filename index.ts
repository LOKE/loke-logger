import { SyslogStream, ConsoleStream } from "./lib/streams";
import { LokeLogger } from "./lib/logger";
import { metricsMiddleware, Registry } from "./lib/metrics";

export { SyslogStream, ConsoleStream } from "./lib/streams";
export { LokeLogger, Logger } from "./lib/logger";
export { nullLogger } from "./lib/null";

export interface CreateLoggerOptions {
  syslog?: boolean;
  metricsRegistry?: Registry;
  showDebug?: boolean;
  systemdPrefix?: boolean;
}

const systemd = Boolean(process.env.JOURNAL_STREAM);

export function create({
  syslog = false,
  metricsRegistry,
  showDebug,
  systemdPrefix = systemd,
}: CreateLoggerOptions = {}): LokeLogger {
  const streams: NodeJS.WritableStream[] = [
    new ConsoleStream(undefined, undefined, systemdPrefix),
  ];

  if (syslog) {
    streams.push(new SyslogStream());
  }

  let logger = new LokeLogger({ showDebug, streams });

  if (metricsRegistry) {
    logger = metricsMiddleware(metricsRegistry)(logger);
  }

  return logger;
}
