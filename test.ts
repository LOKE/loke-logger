import test from "ava";
import * as logger from ".";

test("Sanity check", (t) => {
  t.true(logger.createLogger({ syslog: true }) instanceof logger.LokeLogger);
  t.true(logger.createLogger() instanceof logger.LokeLogger);

  const debug = logger.createLogger({ showDebug: true });
  t.is(debug.showDebug, true);
});

test("Registers a metric", (t) => {
  t.plan(1);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const registry: any = {
    registerMetric() {
      t.pass();
    },
  };

  logger.createLogger({ metricsRegistry: registry });
});
