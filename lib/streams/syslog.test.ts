import { spawnSync } from "node:child_process";
import { once } from "node:events";
import dgram from "node:dgram";
import test from "ava";
import { LokeLogger } from "../logger";
import { SyslogStream, mockable } from "./syslog";

async function createTestSocket() {
  const socket = dgram.createSocket("udp4");

  const next = (): Promise<string> =>
    new Promise((resolve) =>
      socket.once("message", (buf) => resolve(buf.toString("utf8"))),
    );

  const done = () => new Promise<void>((resolve) => socket.close(resolve));

  await new Promise<void>((resolve) => socket.bind(resolve));

  return { next, done, port: socket.address().port };
}

class FakeDate extends Date {
  constructor() {
    super("2018-02-23T11:46:24Z");
  }
}

mockable.Date = FakeDate;

test("logger with debug true", async (t) => {
  const { next, done, port } = await createTestSocket();
  const syslog = new SyslogStream({
    port,
    pid: 2607,
    hostname: "ip-10-0-0-115",
    appName: "test",
  });
  const logger = new LokeLogger({ showDebug: true, streams: [syslog] });

  logger.debug("debug message");
  t.is(
    await next(),
    '<135>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=debug msg="debug message"',
  );

  logger.log("log message");
  t.is(
    await next(),
    '<134>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=info msg="log message"',
  );

  logger.info("info message");
  t.is(
    await next(),
    '<134>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=info msg="info message"',
  );

  logger.warn("warn message");
  t.is(
    await next(),
    '<132>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=warn msg="warn message"',
  );

  logger.error("error message");
  t.is(
    await next(),
    '<131>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=error msg="error message"',
  );

  syslog.close();
  await done();
});

test("with fields", async (t) => {
  const { next, done, port } = await createTestSocket();
  const syslog = new SyslogStream({
    port,
    pid: 2607,
    hostname: "ip-10-0-0-115",
    appName: "test",
  });
  const logger = new LokeLogger({ showDebug: true, streams: [syslog] });

  logger.info("request", { user: "abc", status: 200 });
  t.is(
    await next(),
    "<134>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=info msg=request user=abc status=200",
  );

  syslog.close();
  await done();
});

test("with domain", async (t) => {
  const { next, done, port } = await createTestSocket();
  const syslog = new SyslogStream({
    port,
    pid: 2607,
    hostname: "ip-10-0-0-115",
    appName: "test",
  });
  const logger = new LokeLogger({ showDebug: true, streams: [syslog] });

  logger.withDomain("my-service").info("domain message");
  t.is(
    await next(),
    '<134>1 2018-02-23T11:46:24.000Z ip-10-0-0-115 test 2607 - - \uFEFFlevel=info domain=my-service msg="domain message"',
  );

  syslog.close();
  await done();
});

test("syslog timestamps preserve the instant and milliseconds outside UTC", (t) => {
  const script = `
    const dgram = require("node:dgram");
    const { SyslogStream, mockable } = require("./dist/lib/streams/syslog");
    mockable.Date = class extends Date {
      constructor() { super("2026-09-22T00:00:00.010Z"); }
    };
    const receiver = dgram.createSocket("udp4");
    receiver.on("message", (message) => {
      process.stdout.write(message);
      receiver.close();
    });
    receiver.bind(0, "127.0.0.1", () => {
      const stream = new SyslogStream({ port: receiver.address().port, hostname: "host", appName: "test", pid: 1 });
      stream.end({ level: "info", message: "hello" });
    });
  `;
  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env, TZ: "Australia/Melbourne" },
    timeout: 5000,
  });

  t.is(result.status, 0, result.stderr);
  t.is(
    result.stdout,
    "<134>1 2026-09-22T00:00:00.010Z host test 1 - - \uFEFFhello",
  );
});

test("close flushes pending messages before closing an owned socket", async (t) => {
  const receiver = dgram.createSocket("udp4");
  const messages: string[] = [];
  const received = new Promise<void>((resolve) => {
    receiver.on("message", (message) => {
      messages.push(message.toString());
      if (messages.length === 3) resolve();
    });
  });
  await new Promise<void>((resolve) => receiver.bind(0, "127.0.0.1", resolve));
  t.teardown(() => receiver.close());
  const stream = new SyslogStream({ port: receiver.address().port });
  const closed = once(stream, "close");

  for (const message of ["first", "second", "third"]) {
    stream.write({ level: "info", message });
  }
  stream.close();
  await closed;
  await received;

  t.deepEqual(
    messages.map((message) => message.split("\uFEFF")[1]),
    ["first", "second", "third"],
  );
  t.true(stream.destroyed);
});

test("closing an unused syslog stream is harmless and repeatable", async (t) => {
  const stream = new SyslogStream();
  const closed = once(stream, "close");
  stream.close();
  stream.close();
  await closed;
  t.true(stream.destroyed);
});

test("syslog send errors reach the write callback and stream", async (t) => {
  const stream = new SyslogStream({ port: 70000 });
  const failure = new Promise<Error>((resolve) =>
    stream.once("error", resolve),
  );
  const writeError = await new Promise<Error | null | undefined>((resolve) => {
    stream.write({ level: "info", message: "hello" }, resolve);
  });
  t.true(writeError instanceof Error);
  t.is(writeError, await failure);
  t.true(stream.destroyed);
});

test("asynchronous syslog send errors reach the stream", async (t) => {
  const stream = new SyslogStream();
  const failure = new Promise<Error>((resolve) =>
    stream.once("error", resolve),
  );
  const writeError = await new Promise<Error | null | undefined>((resolve) => {
    stream.write({ level: "info", message: "x".repeat(65536) }, resolve);
  });
  t.true(writeError instanceof Error);
  t.is(writeError, await failure);
});

test("ending syslog preserves a caller-owned socket", async (t) => {
  const socket = dgram.createSocket("udp4");
  await new Promise<void>((resolve) => socket.bind(0, "127.0.0.1", resolve));
  t.teardown(() => socket.close());
  const port = socket.address().port;
  const stream = new SyslogStream({ socket });
  const closed = once(stream, "close");
  stream.end();
  await closed;
  t.is(socket.address().port, port);
  t.is(socket.listenerCount("error"), 0);
});

test("syslog sanitizes and bounds headers while preserving Unicode messages", async (t) => {
  const { next, done, port } = await createTestSocket();
  t.teardown(done);
  const stream = new SyslogStream({
    port,
    hostname: "\n " + "h".repeat(300),
    appName: "日本\n" + "a".repeat(60),
    pid: 0,
  });
  const received = next();
  stream.end({ level: "info", message: "日本 ☕" });
  t.is(
    await received,
    `<134>1 2018-02-23T11:46:24.000Z ${"h".repeat(255)} ${"a".repeat(48)} 0 - - \uFEFF日本 ☕`,
  );
});
