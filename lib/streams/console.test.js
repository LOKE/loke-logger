const test = require("ava");
const { yellow } = require("chalk");
const { Logger } = require("../logger");
const { DEBUG, INFO, WARN, ERROR } = require("../common");
const { ConsoleStream } = require("./console");

class MockWriter {
  constructor() {
    this.clear();
  }

  clear() {
    this.data = [];
  }

  write(str) {
    this.data.push(str);
  }
}

const stdout = new MockWriter();
const stderr = new MockWriter();

test("logger with debug true", t => {
  const logger = new Logger({
    showDebug: true,
    streams: [new ConsoleStream(stdout, stderr)]
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

test("logger with debug false", t => {
  const logger = new Logger({
    showDebug: false,
    streams: [new ConsoleStream(stdout, stderr)]
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

test("formatted messages", t => {
  const logger = new Logger({
    streams: [new ConsoleStream(stdout, stderr)]
  });

  logger.info("%s message", 1, "other");
  t.is(stdout.data[0], `${INFO} 1 message other\n`);
  stdout.clear();
});

test("with prefix", t => {
  const logger = new Logger({
    streams: [new ConsoleStream(stdout, stderr)]
  });

  logger.withPrefix("PREFIX").info("prefixed message");

  const PREFIX = yellow("PREFIX");

  t.is(stdout.data[0], `${INFO} ${PREFIX}: prefixed message\n`);
  stdout.clear();
});
