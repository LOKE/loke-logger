import test from "ava";
import { Writable } from "stream";
import { yellow } from "chalk";
import { LokeLogger } from "../logger";
import { DEBUG, INFO, WARN, ERROR } from "../common";
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
  t.is(stdout.data[0], `${DEBUG} debug message\n`);
  stdout.clear();

  logger.log("log message");
  t.is(stdout.data[0], `${INFO} log message\n`);
  stdout.clear();

  logger.info("info message");
  t.is(stdout.data[0], `${INFO} info message\n`);
  stdout.clear();

  logger.warn("warn message");
  t.is(stderr.data[0], `${WARN} warn message\n`);
  stderr.clear();

  logger.error("error message");
  t.is(stderr.data[0], `${ERROR} error message\n`);
  stderr.clear();
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
  t.is(stdout.data[0], `${INFO} log message\n`);
  stdout.clear();

  logger.info("info message");
  t.is(stdout.data[0], `${INFO} info message\n`);
  stdout.clear();

  logger.warn("warn message");
  t.is(stderr.data[0], `${WARN} warn message\n`);
  stderr.clear();

  logger.error("error message");
  t.is(stderr.data[0], `${ERROR} error message\n`);
  stderr.clear();
});

test("formatted messages", (t) => {
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.info("%s message", 1, "other");
  t.is(stdout.data[0], `${INFO} 1 message other\n`);
  stdout.clear();
});

test("with prefix", (t) => {
  const logger = new LokeLogger({
    streams: [new ConsoleStream(stdout.writable, stderr.writable)],
  });

  logger.withPrefix("PREFIX").info("prefixed message");

  const PREFIX = yellow("PREFIX");

  t.is(stdout.data[0], `${INFO} ${PREFIX}: prefixed message\n`);
  stdout.clear();
});
