import dgram from "dgram";
import test from "ava";
import { yellow } from "chalk";
import { LokeLogger } from "../logger";
import { DEBUG, INFO, WARN, ERROR } from "../common";
import { SyslogStream, mockable } from "./syslog";

process.env.TZ = "utc";

async function createTestSocket() {
  const socket = dgram.createSocket("udp4");

  const next = (): Promise<string> =>
    new Promise((resolve) =>
      socket.once("message", (buf) => resolve(buf.toString("utf8")))
    );

  const done = () => socket.close();

  await new Promise((resolve) => socket.bind(resolve));

  return { next, done, port: socket.address().port };
}

class FakeDate extends Date {
  constructor() {
    super("2018-02-23T11:46:24Z");
  }
}

// Bit of a hack, but it'll do for now
mockable.Date = FakeDate as never;

test("logger with debug true", async (t) => {
  const { next, done, port } = await createTestSocket();
  const logger = new LokeLogger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: "ip-10-0-0-115",
        appName: "test",
      }),
    ],
  });

  logger.debug("debug message");
  t.is(
    await next(),
    `<135>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${DEBUG} debug message`
  );

  logger.log("log message");
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} log message`
  );

  logger.info("info message");
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} info message`
  );

  logger.warn("warn message");
  t.is(
    await next(),
    `<132>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${WARN} warn message`
  );

  logger.error("error message");
  t.is(
    await next(),
    `<131>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${ERROR} error message`
  );

  done();
});

test("formatted messages", async (t) => {
  const { next, done, port } = await createTestSocket();
  const logger = new LokeLogger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: "ip-10-0-0-115",
        appName: "test",
      }),
    ],
  });

  logger.info("%s message", 1, "other");
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} 1 message other`
  );

  done();
});

test("with prefix", async (t) => {
  const { next, done, port } = await createTestSocket();
  const logger = new LokeLogger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: "ip-10-0-0-115",
        appName: "test",
      }),
    ],
  });

  logger.withPrefix("PREFIX").info("prefixed message");

  const PREFIX = yellow("PREFIX");

  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} ${PREFIX}: prefixed message`
  );

  done();
});
