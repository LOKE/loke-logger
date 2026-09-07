import { createRequire } from "module";
import type { LogFields } from "./common";
import type { LokeLogger } from "./logger";

type Middleware = (next: LokeLogger) => LokeLogger;

interface LogCounter {
  inc(labels: { domain: string; severity: string }): void;
}

type CounterConstructor = new (config: {
  name: string;
  help: string;
  labelNames: string[];
  registers: [];
}) => LogCounter;

/** Structural subset of the prom-client / @prometheus-io/client `Registry`. */
export interface MetricsRegistry {
  registerMetric(metric: object): void;
}

interface PrometheusClient {
  Registry: new () => unknown;
  Counter: CounterConstructor;
}

const clientPackages = ["@prometheus-io/client", "prom-client"];
const requirePeer = createRequire(__filename);

/**
 * The counter has to come from the same package as the registry it is
 * registered into; the two serialise metrics differently.
 */
function counterFor(registry: MetricsRegistry): CounterConstructor {
  const clients: PrometheusClient[] = [];

  for (const name of clientPackages) {
    try {
      clients.push(requirePeer(name) as PrometheusClient);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "MODULE_NOT_FOUND") throw err;
    }
  }

  const client =
    clients.find((c) => registry instanceof c.Registry) ?? clients[0];

  if (!client) {
    throw new Error(
      `metricsRegistry requires one of ${clientPackages.join(" or ")} to be installed`,
    );
  }

  return client.Counter;
}

const wrap = (next: LokeLogger, wrapper: Partial<LokeLogger>): LokeLogger =>
  Object.assign(Object.create(next), wrapper);

const logCounters = new WeakMap<MetricsRegistry, LogCounter>();

export function metricsMiddleware(registry: MetricsRegistry): Middleware {
  let logCounter = logCounters.get(registry);
  if (!logCounter) {
    logCounter = new (counterFor(registry))({
      name: "log_messages_total",
      help: "Total count of log messages",
      labelNames: ["domain", "severity"],
      registers: [],
    });
    logCounters.set(registry, logCounter);
  }
  registry.registerMetric(logCounter);

  const counter = logCounter;

  return (next: LokeLogger) => {
    return wrap(next, {
      debug(msg: string, ...fields: LogFields[]) {
        if (this.showDebug) {
          counter.inc({
            severity: "debug",
            domain: this.domain || "<NONE>",
          });
        }
        return next.debug.call(this, msg, ...fields);
      },
      log(msg: string, ...fields: LogFields[]) {
        counter.inc({ severity: "info", domain: this.domain || "<NONE>" });
        return next.log.call(this, msg, ...fields);
      },
      info(msg: string, ...fields: LogFields[]) {
        counter.inc({ severity: "info", domain: this.domain || "<NONE>" });
        return next.info.call(this, msg, ...fields);
      },
      warn(msg: string, ...fields: LogFields[]) {
        counter.inc({ severity: "warn", domain: this.domain || "<NONE>" });
        return next.warn.call(this, msg, ...fields);
      },
      error(msg: string, ...fields: LogFields[]) {
        counter.inc({ severity: "error", domain: this.domain || "<NONE>" });
        return next.error.call(this, msg, ...fields);
      },
    });
  };
}
