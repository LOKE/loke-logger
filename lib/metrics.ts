import { Counter, Registry } from "prom-client";
import { LokeLogger } from "./logger";

type Middleware = (next: LokeLogger) => LokeLogger;

const wrap = (next: LokeLogger, wrapper: Partial<LokeLogger>): LokeLogger =>
  Object.assign(Object.create(next), wrapper);

const logCounter = new Counter({
  name: "log_messages_total",
  help: "Total count of log messages",
  labelNames: ["prefix", "severity"],
  registers: [],
});

export function metricsMiddleware(registry: Registry): Middleware {
  registry.registerMetric(logCounter);

  return (next: LokeLogger) => {
    return wrap(next, {
      debug(...args) {
        logCounter.inc({ severity: "debug", prefix: this.prefix || "<NONE>" });
        return next.debug.apply(this, args);
      },
      log(...args) {
        logCounter.inc({ severity: "info", prefix: this.prefix || "<NONE>" });
        return next.log.apply(this, args);
      },
      info(...args) {
        logCounter.inc({ severity: "info", prefix: this.prefix || "<NONE>" });
        return next.info.apply(this, args);
      },
      warn(...args) {
        logCounter.inc({ severity: "warn", prefix: this.prefix || "<NONE>" });
        return next.warn.apply(this, args);
      },
      error(...args) {
        logCounter.inc({ severity: "error", prefix: this.prefix || "<NONE>" });
        return next.error.apply(this, args);
      },
    });
  };
}
