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

test("suppressed debug logs are not counted", async (t) => {
  const registry = new Registry();
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      callback();
    },
  });
  const logger = metricsMiddleware(registry)(
    new LokeLogger({
      streams: [stream],
      showDebug: false,
    }),
  );

  logger.withDomain("suppressed-debug").debug("not emitted");

  t.notRegex(await registry.metrics(), /domain="suppressed-debug"/);
});

test("metrics are isolated by registry", async (t) => {
  const registryA = new Registry();
  const registryB = new Registry();
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      callback();
    },
  });
  const loggerA = metricsMiddleware(registryA)(
    new LokeLogger({ streams: [stream], domain: "service-a" }),
  );

  metricsMiddleware(registryB);
  loggerA.error("failure");

  t.regex(await registryA.metrics(), /severity="error",domain="service-a"} 1/);
  t.notRegex(await registryB.metrics(), /domain="service-a"/);
});

test("duplicate middleware registration remains accepted", (t) => {
  const registry = new Registry();

  metricsMiddleware(registry);

  t.notThrows(() => metricsMiddleware(registry));
});
