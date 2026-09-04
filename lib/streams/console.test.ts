import { spawnSync } from "node:child_process";
import { Writable } from "node:stream";
import test from "ava";
import { LokeLogger } from "../logger";
import { ConsoleStream } from "./console";

function createTestWritable() {
  const data: string[] = [];
  let resolveNextWrite: ((value: string) => void) | undefined;
  const writable = new Writable({
    objectMode: false,
    write(chunk, encoding, callback) {
      const value = chunk.toString("utf8");
      data.push(value);
      resolveNextWrite?.(value);
      resolveNextWrite = undefined;
      callback();
    },
  });

  function nextWrite(): Promise<string> {
    if (resolveNextWrite) throw new Error("Already waiting for a write");
    return new Promise((resolve) => {
      resolveNextWrite = resolve;
    });
  }

  return { writable, data, nextWrite };
}

function createControlledWritable() {
  let completeWrite: ((error?: Error | null) => void) | undefined;
  const data: string[] = [];
  const writable = new Writable({
    highWaterMark: 1,
    write(chunk, encoding, callback) {
      data.push(chunk.toString("utf8"));
      completeWrite = callback;
    },
  });

  return {
    writable,
    data,
    complete(error?: Error) {
      if (!completeWrite) throw new Error("No pending write");
      completeWrite(error);
    },
  };
}

function waitForTurn(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

test("logger with debug true", async (t) => {
  const stdout = createTestWritable();
  const stderr = createTestWritable();
  const logger = new LokeLogger({
    showDebug: true,
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  let written = stdout.nextWrite();
  logger.debug("debug message");
  t.is(await written, 'level=debug msg="debug message"\n');

  written = stdout.nextWrite();
  logger.log("log message");
  t.is(await written, 'level=info msg="log message"\n');

  written = stdout.nextWrite();
  logger.info("info message");
  t.is(await written, 'level=info msg="info message"\n');

  written = stderr.nextWrite();
  logger.warn("warn message");
  t.is(await written, 'level=warn msg="warn message"\n');

  written = stderr.nextWrite();
  logger.error("error message");
  t.is(await written, 'level=error msg="error message"\n');

  written = stdout.nextWrite();
  logger.log("multiline\nmessage");
  t.is(await written, 'level=info msg="multiline\\nmessage"\n');
});

test("logger with debug false", async (t) => {
  const stdout = createTestWritable();
  const stderr = createTestWritable();
  const logger = new LokeLogger({
    showDebug: false,
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.debug("debug message");
  t.is(stdout.data.length, 0);

  let written = stdout.nextWrite();
  logger.log("log message");
  t.is(await written, 'level=info msg="log message"\n');

  written = stdout.nextWrite();
  logger.info("info message");
  t.is(await written, 'level=info msg="info message"\n');

  written = stderr.nextWrite();
  logger.warn("warn message");
  t.is(await written, 'level=warn msg="warn message"\n');

  written = stderr.nextWrite();
  logger.error("error message");
  t.is(await written, 'level=error msg="error message"\n');
});

test("with fields", async (t) => {
  const stdout = createTestWritable();
  const stderr = createTestWritable();
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  const written = stdout.nextWrite();
  logger.info("request", { user: "abc", status: 200 });
  t.is(await written, "level=info msg=request user=abc status=200\n");
});

test("with domain", async (t) => {
  const stdout = createTestWritable();
  const stderr = createTestWritable();
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  const written = stdout.nextWrite();
  logger.withDomain("my-service").info("domain message");
  t.is(await written, 'level=info domain=my-service msg="domain message"\n');
});

test("logger newline escaping", async (t) => {
  const stdout = createTestWritable();
  const stderr = createTestWritable();
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable, true)],
  });

  let written = stdout.nextWrite();
  logger.debug("debug message");
  t.is(await written, 'level=debug msg="debug message"\n');

  written = stdout.nextWrite();
  logger.log("log message");
  t.is(await written, 'level=info msg="log message"\n');

  written = stdout.nextWrite();
  logger.info("info message");
  t.is(await written, 'level=info msg="info message"\n');

  written = stderr.nextWrite();
  logger.warn("warn message");
  t.is(await written, 'level=warn msg="warn message"\n');

  written = stderr.nextWrite();
  logger.error("error message");
  t.is(await written, 'level=error msg="error message"\n');

  written = stdout.nextWrite();
  logger.log("multiline\nmessage");
  t.is(await written, 'level=info msg="multiline\\nmessage"\n');
});

test("waits for the selected destination to finish writing", async (t) => {
  const controlledStdout = createControlledWritable();
  const unusedStderr = createTestWritable();
  const stream = new ConsoleStream(
    controlledStdout.writable,
    unusedStderr.writable,
  );
  let completed = false;

  stream.write({ level: "info", message: "message" }, () => (completed = true));
  await waitForTurn();

  t.false(completed);
  t.deepEqual(controlledStdout.data, ["message\n"]);
  t.true(controlledStdout.writable.writableNeedDrain);

  controlledStdout.complete();
  await waitForTurn();

  t.true(completed);
  t.false(controlledStdout.writable.writableNeedDrain);
});

test("propagates selected destination write errors", async (t) => {
  const controlledStderr = createControlledWritable();
  const unusedStdout = createTestWritable();
  const stream = new ConsoleStream(
    unusedStdout.writable,
    controlledStderr.writable,
  );
  const destinationError = new Error("destination failed");
  t.is(controlledStderr.writable.listenerCount("error"), 0);
  t.is(stream.listenerCount("error"), 0);

  const observedDestinationError = new Promise<Error>((resolve) => {
    controlledStderr.writable.once("error", resolve);
  });
  const observedStreamError = new Promise<Error>((resolve) => {
    stream.once("error", resolve);
  });

  const writeError = new Promise<Error | null | undefined>((resolve) => {
    stream.write({ level: "error", message: "message" }, resolve);
  });

  controlledStderr.complete(destinationError);

  t.is(await writeError, destinationError);
  t.is(await observedDestinationError, destinationError);
  t.is(await observedStreamError, destinationError);
});

test("createLogger absorbs console EPIPE errors", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    process.stdout.write = function (_chunk, _encoding, callback) {
      const done = typeof _encoding === "function" ? _encoding : callback;
      const error = Object.assign(new Error("broken pipe"), { code: "EPIPE" });
      process.nextTick(() => {
        done(error);
        process.stdout.emit("error", error);
      });
      return false;
    };
    createLogger().info("message");
    setTimeout(() => process.exit(0), 25);
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});

test("createLogger does not absorb non-EPIPE console errors", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    process.stdout.write = function (_chunk, _encoding, callback) {
      const done = typeof _encoding === "function" ? _encoding : callback;
      const error = Object.assign(new Error("permission denied"), { code: "EACCES" });
      process.nextTick(() => {
        done(error);
        process.stdout.emit("error", error);
      });
      return false;
    };
    createLogger().info("message");
    setTimeout(() => process.exit(0), 25);
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.not(result.status, 0);
  t.regex(result.stderr, /permission denied/);
});

test("repeated createLogger calls reuse process error handlers", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    const stdoutBefore = process.stdout.listenerCount("error");
    const stderrBefore = process.stderr.listenerCount("error");
    for (let index = 0; index < 20; index += 1) createLogger();
    const stdoutAdded = process.stdout.listenerCount("error") - stdoutBefore;
    const stderrAdded = process.stderr.listenerCount("error") - stderrBefore;
    process.exit(stdoutAdded === 1 && stderrAdded === 1 ? 0 : 1);
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});
