import { Writable } from "node:stream";
import test from "ava";
import { LokeLogger } from "../logger";
import { ConsoleStream } from "./console";

function createTestWritable() {
  const data: string[] = [];
  const writable = new Writable({
    objectMode: false,
    write(chunk, encoding, callback) {
      data.push(chunk.toString("utf8"));
      callback();
    },
  });
  function clear() {
    data.length = 0;
  }
  return { writable, data, clear };
}

const stdout = createTestWritable();
const stderr = createTestWritable();

test("logger with debug true", (t) => {
  const logger = new LokeLogger({
    showDebug: true,
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.debug("debug message");
  t.is(stdout.data[0], 'level=debug msg="debug message"\n');
  stdout.clear();

  logger.log("log message");
  t.is(stdout.data[0], 'level=info msg="log message"\n');
  stdout.clear();

  logger.info("info message");
  t.is(stdout.data[0], 'level=info msg="info message"\n');
  stdout.clear();

  logger.warn("warn message");
  t.is(stderr.data[0], 'level=warn msg="warn message"\n');
  stderr.clear();

  logger.error("error message");
  t.is(stderr.data[0], 'level=error msg="error message"\n');
  stderr.clear();

  logger.log("multiline\nmessage");
  t.is(stdout.data[0], 'level=info msg="multiline\nmessage"\n');
  stdout.clear();
});

test("logger with debug false", (t) => {
  const logger = new LokeLogger({
    showDebug: false,
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.debug("debug message");
  t.is(stdout.data.length, 0);
  stdout.clear();

  logger.log("log message");
  t.is(stdout.data[0], 'level=info msg="log message"\n');
  stdout.clear();

  logger.info("info message");
  t.is(stdout.data[0], 'level=info msg="info message"\n');
  stdout.clear();

  logger.warn("warn message");
  t.is(stderr.data[0], 'level=warn msg="warn message"\n');
  stderr.clear();

  logger.error("error message");
  t.is(stderr.data[0], 'level=error msg="error message"\n');
  stderr.clear();
});

test("with fields", (t) => {
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.info("request", { user_id: "abc", status: 200 });
  t.is(stdout.data[0], "level=info msg=request user_id=abc status=200\n");
  stdout.clear();
});

test("with domain", (t) => {
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.withDomain("my-service").info("domain message");
  t.is(stdout.data[0], 'level=info domain=my-service msg="domain message"\n');
  stdout.clear();
});

test("logger systemd prefix and newline escaping", (t) => {
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable, true, true)],
  });

  logger.debug("debug message");
  t.is(stdout.data[0], '<7>level=debug msg="debug message"\n');
  stdout.clear();

  logger.log("log message");
  t.is(stdout.data[0], '<6>level=info msg="log message"\n');
  stdout.clear();

  logger.info("info message");
  t.is(stdout.data[0], '<6>level=info msg="info message"\n');
  stdout.clear();

  logger.warn("warn message");
  t.is(stderr.data[0], '<4>level=warn msg="warn message"\n');
  stderr.clear();

  logger.error("error message");
  t.is(stderr.data[0], '<3>level=error msg="error message"\n');
  stderr.clear();

  logger.log("multiline\nmessage");
  t.is(stdout.data[0], '<6>level=info msg="multiline\\nmessage"\n');
  stdout.clear();
});
