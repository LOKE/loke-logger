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

  logger.debug("test");
  logger.log("test");
  logger.info("test");
  logger.warn("test");
  logger.error("test");

  t.snapshot(await registry.metrics());
});

test("domain passes through", (t) => {
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
    new LokeLogger({ streams: [stream], domain: "my-service" }),
  );

  logger.log("prefixed message");
  t.snapshot(lastWrite);

  logger.withDomain("other-service").log("domain message");
  t.snapshot(lastWrite);
});
