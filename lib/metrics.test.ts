import test from "ava";
import { Registry } from "prom-client";
import { metricsMiddleware } from "./metrics";
import { LokeLogger } from "./logger";
import { Writable } from "stream";

test("logger metrics", async (t) => {
  const registry = new Registry();
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      callback();
    },
  });
  const logger = metricsMiddleware(registry)(
    new LokeLogger({ streams: [stream] }),
  );

  logger.debug();
  logger.log();
  logger.info();
  logger.warn();
  logger.error();

  t.snapshot(await registry.metrics());
});

test("prefix passes through", (t) => {
  const registry = new Registry();
  let lastWrite = null;

  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      lastWrite = chunk;
      callback();
    },
  });

  const logger = metricsMiddleware(registry)(
    new LokeLogger({ streams: [stream], prefix: "PREFIX" }),
  );

  logger.log("prefixed message");
  t.snapshot(lastWrite);

  logger.withPrefix("OTHER_PREFIX").log("prefixed message");
  t.snapshot(lastWrite);
});
