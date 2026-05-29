import dgram from "node:dgram";
import test from "ava";
import { LokeLogger } from "../logger";
import { SyslogStream, mockable } from "./syslog";

process.env.TZ = "utc";

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

mockable.Date = FakeDate as never;

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
    '<135>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=debug msg="debug message"',
  );

  logger.log("log message");
  t.is(
    await next(),
    '<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=info msg="log message"',
  );

  logger.info("info message");
  t.is(
    await next(),
    '<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=info msg="info message"',
  );

  logger.warn("warn message");
  t.is(
    await next(),
    '<132>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=warn msg="warn message"',
  );

  logger.error("error message");
  t.is(
    await next(),
    '<131>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=error msg="error message"',
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

  logger.info("request", { user_id: "abc", status: 200 });
  t.is(
    await next(),
    "<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=info msg=request user_id=abc status=200",
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
    '<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - level=info domain=my-service msg="domain message"',
  );

  syslog.close();
  await done();
});
