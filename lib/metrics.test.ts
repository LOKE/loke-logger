import test from "ava";
import { Counter, Registry } from "prom-client";
import {
  Counter as PrometheusIoCounter,
  Registry as PrometheusIoRegistry,
} from "@prometheus-io/client";
import { metricsMiddleware } from "./metrics";
import { LokeLogger } from "./logger";
import { Writable } from "stream";
import { spawnSync } from "node:child_process";

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

test("works with a @prometheus-io/client registry", async (t) => {
  const registry = new PrometheusIoRegistry();
  const stream = new Writable({
    objectMode: true,
    write(chunk, encoding, callback) {
      callback();
    },
  });
  const logger = metricsMiddleware(registry)(
    new LokeLogger({ streams: [stream], domain: "successor" }),
  );

  logger.error("failure");

  t.regex(await registry.metrics(), /severity="error",domain="successor"} 1/);
});

test("the counter comes from the same package as the registry", (t) => {
  const promClient = new Registry();
  const prometheusIo = new PrometheusIoRegistry();

  metricsMiddleware(promClient);
  metricsMiddleware(prometheusIo);

  t.true(promClient.getSingleMetric("log_messages_total") instanceof Counter);
  t.true(
    prometheusIo.getSingleMetric("log_messages_total") instanceof
      PrometheusIoCounter,
  );
});

test("matching a registry does not load the unused peer", (t) => {
  const script = `
    const { Registry } = require("@prometheus-io/client");
    const { metricsMiddleware } = require("./dist/lib/metrics");
    const Module = require("node:module");
    const load = Module._load;
    Module._load = function (name, ...args) {
      if (name === "prom-client") throw new Error("unused peer loaded");
      return load.call(this, name, ...args);
    };
    metricsMiddleware(new Registry());
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});

test("missing transitive peer dependencies are not silently ignored", (t) => {
  const script = `
    const assert = require("node:assert/strict");
    const { Registry } = require("prom-client");
    const { metricsMiddleware } = require("./dist/lib/metrics");
    const Module = require("node:module");
    const load = Module._load;
    const failure = Object.assign(new Error("Cannot find module 'dependency'"), {
      code: "MODULE_NOT_FOUND",
    });
    Module._load = function (name, ...args) {
      if (name === "@prometheus-io/client") throw failure;
      return load.call(this, name, ...args);
    };
    assert.throws(() => metricsMiddleware(new Registry()), (err) => err === failure);
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});

test("missing optional peers are skipped and absence of both is reported", (t) => {
  const script = `
    const assert = require("node:assert/strict");
    const { Counter, Registry } = require("prom-client");
    const { metricsMiddleware } = require("./dist/lib/metrics");
    const Module = require("node:module");
    const resolve = Module._resolveFilename;
    const missing = new Set(["@prometheus-io/client"]);
    Module._resolveFilename = function (name, ...args) {
      if (missing.has(name)) {
        throw Object.assign(new Error("Cannot find module '" + name + "'"), {
          code: "MODULE_NOT_FOUND",
        });
      }
      return resolve.call(this, name, ...args);
    };
    const registry = new Registry();
    metricsMiddleware(registry);
    assert.ok(registry.getSingleMetric("log_messages_total") instanceof Counter);
    missing.add("prom-client");
    assert.throws(() => metricsMiddleware(new Registry()), {
      message: "metricsRegistry requires one of @prometheus-io/client or prom-client to be installed",
    });
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});
