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

function createControlledWritable(highWaterMark = 1) {
  let completeWrite: ((error?: Error | null) => void) | undefined;
  const data: string[] = [];
  const writable = new Writable({
    highWaterMark,
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

test("reports a late destination error without completing a write twice", async (t) => {
  const destination = createControlledWritable(1024);
  const stream = new ConsoleStream(destination.writable, destination.writable);
  const failure = new Error("late write failure");
  const destinationError = new Promise<Error>((resolve) =>
    destination.writable.once("error", resolve),
  );
  const streamError = new Promise<Error>((resolve) =>
    stream.once("error", resolve),
  );
  let completions = 0;
  stream.write({ level: "info", message: "message" }, () => {
    completions += 1;
  });
  await waitForTurn();
  t.is(completions, 1);
  destination.complete(failure);
  t.is(await destinationError, failure);
  t.is(await streamError, failure);
  t.is(completions, 1);
});

test("forwards fatal logs before immediate process exit", (t) => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      `
    const { createLogger } = require("./dist");
    const logger = createLogger();
    logger.info("before");
    logger.info("second");
    logger.error("fatal");
    process.exit(1);
  `,
    ],
    { cwd: process.cwd(), encoding: "utf8" },
  );

  t.is(result.status, 1);
  t.is(result.stdout, "level=info msg=before\nlevel=info msg=second\n");
  t.is(result.stderr, "level=error msg=fatal\n");
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

test("absorbs EPIPE errors emitted by the console destination", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    createLogger();
    process.stdout.emit("error", Object.assign(new Error("broken pipe"), { code: "EPIPE" }));
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.is(result.status, 0, result.stderr);
});

test("rethrows non-EPIPE errors emitted by the console destination", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    createLogger();
    process.stdout.emit("error", Object.assign(new Error("permission denied"), { code: "EACCES" }));
  `;

  const result = spawnSync(process.execPath, ["-e", script], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  t.not(result.status, 0);
  t.regex(result.stderr, /permission denied/);
});

test("does not suppress EPIPE errors from an injected destination", async (t) => {
  const destination = createControlledWritable();
  const unusedStderr = createTestWritable();
  const stream = new ConsoleStream(destination.writable, unusedStderr.writable);
  const epipe = Object.assign(new Error("broken pipe"), { code: "EPIPE" });
  const observedDestinationError = new Promise<Error>((resolve) =>
    destination.writable.once("error", resolve),
  );
  const observedStreamError = new Promise<Error>((resolve) =>
    stream.once("error", resolve),
  );

  const writeError = new Promise<Error | null | undefined>((resolve) => {
    stream.write({ level: "info", message: "message" }, resolve);
  });
  destination.complete(epipe);

  t.is(await writeError, epipe);
  t.is(await observedDestinationError, epipe);
  t.is(await observedStreamError, epipe);
});

test("pretty expands escaped newlines, plain output keeps them escaped", async (t) => {
  const stack = 'level=error msg="failed" error="Error: boom\\n    at handler"';
  const plain = createTestWritable();
  const pretty = createTestWritable();
  const plainStream = new ConsoleStream(plain.writable, plain.writable);
  const prettyStream = new ConsoleStream(
    pretty.writable,
    pretty.writable,
    true,
  );

  const plainWritten = plain.nextWrite();
  plainStream.write({ level: "error", message: stack });
  t.is(await plainWritten, `${stack}\n`);

  const prettyWritten = pretty.nextWrite();
  prettyStream.write({ level: "error", message: stack });
  t.is(
    await prettyWritten,
    'level=error msg="failed" error="Error: boom\n    at handler"\n',
  );
});

test("createLogger prints pretty locally and escaped under kubernetes", (t) => {
  const script = `
    const { createLogger } = require("./dist");
    createLogger().error("failed", { error: Object.assign(new Error("boom"), { stack: "Error: boom\\n    at handler" }) });
  `;
  const run = (env: NodeJS.ProcessEnv) =>
    spawnSync(process.execPath, ["-e", script], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: { ...process.env, ...env },
    }).stderr;

  t.is(
    run({ KUBERNETES_SERVICE_HOST: "" }),
    'level=error msg=failed error="Error: boom\n    at handler"\n',
  );
  t.is(
    run({ KUBERNETES_SERVICE_HOST: "10.0.0.1" }),
    'level=error msg=failed error="Error: boom\\n    at handler"\n',
  );
});
