const test = require("ava");
const logger = require(".");

test("Sanity check", t => {
  t.true(logger.create({ syslog: true }) instanceof logger.Logger);
  t.true(logger.create() instanceof logger.Logger);

  const debug = logger.create({ showDebug: true });
  t.is(debug.showDebug, true);
});

test("Registers a metric", t => {
  t.plan(1);

  const registry = {
    registerMetric() {
      t.pass();
    }
  };

  logger.create({ metricsRegistry: registry });
});
