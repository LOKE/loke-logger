import { Counter, type Registry } from "prom-client";
import type { LogFields } from "./common";
import type { LokeLogger } from "./logger";

type Middleware = (next: LokeLogger) => LokeLogger;

const wrap = (next: LokeLogger, wrapper: Partial<LokeLogger>): LokeLogger =>
  Object.assign(Object.create(next), wrapper);

const logCounter = new Counter({
  name: "log_messages_total",
  help: "Total count of log messages",
  labelNames: ["domain", "severity"],
  registers: [],
});

export function metricsMiddleware(registry: Registry): Middleware {
  registry.registerMetric(logCounter);

  return (next: LokeLogger) => {
    return wrap(next, {
      debug(msg: string, ...fields: LogFields[]) {
        logCounter.inc({ severity: "debug", domain: this.domain || "<NONE>" });
        return next.debug.call(this, msg, ...fields);
      },
      log(msg: string, ...fields: LogFields[]) {
        logCounter.inc({ severity: "info", domain: this.domain || "<NONE>" });
        return next.log.call(this, msg, ...fields);
      },
      info(msg: string, ...fields: LogFields[]) {
        logCounter.inc({ severity: "info", domain: this.domain || "<NONE>" });
        return next.info.call(this, msg, ...fields);
      },
      warn(msg: string, ...fields: LogFields[]) {
        logCounter.inc({ severity: "warn", domain: this.domain || "<NONE>" });
        return next.warn.call(this, msg, ...fields);
      },
      error(msg: string, ...fields: LogFields[]) {
        logCounter.inc({ severity: "error", domain: this.domain || "<NONE>" });
        return next.error.call(this, msg, ...fields);
      },
    });
  };
}
