const test = require("ava");
const { Registry } = require("prom-client");
const { metricsMiddleware } = require("./metrics");
const { nullLogger } = require("./null");
const { Logger } = require("./logger");
const { Writable } = require("stream");

test("logger metrics", t => {
  const registry = new Registry();
  const logger = metricsMiddleware(registry)(nullLogger);

  logger.debug();
  logger.log();
  logger.info();
  logger.warn();
  logger.error();

  t.snapshot(registry.metrics());
});

test("prefix passes through", t => {
  const registry = new Registry();
  let lastWrite = null;

  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      lastWrite = chunk;
      callback();
    }
  });

  const logger = metricsMiddleware(registry)(
    new Logger({ streams: [stream], prefix: "PREFIX" })
  );

  logger.log("prefixed message");
  t.snapshot(lastWrite);

  logger.withPrefix("OTHER_PREFIX").log("prefixed message");
  t.snapshot(lastWrite);
});
