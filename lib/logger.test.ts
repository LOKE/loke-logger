import { Writable } from "node:stream";
import test from "ava";
import type { Log, LogFields } from "./common";
import { LokeLogger } from "./logger";

function captureMessages(): { stream: Writable; messages: Log[] } {
  const messages: Log[] = [];
  const stream = new Writable({
    objectMode: true,
    write(chunk: Log, _encoding, callback) {
      messages.push(chunk);
      callback();
    },
  });

  return { stream, messages };
}

test("logging skips enumerable getters without invoking them", (t) => {
  const { stream, messages } = captureMessages();
  const logger = new LokeLogger({ streams: [stream] });
  let getterCalled = false;
  const fields = Object.defineProperties(
    { safe: "kept" },
    {
      dangerous: {
        enumerable: true,
        get() {
          getterCalled = true;
          throw new Error("getter invoked");
        },
      },
    },
  );

  t.notThrows(() => logger.info("message", fields));
  t.false(getterCalled);
  t.is(messages[0]?.message, "level=info msg=message safe=kept");
});

test("logging skips fields whose Proxy reflection traps throw", (t) => {
  const { stream, messages } = captureMessages();
  const logger = new LokeLogger({ streams: [stream] });
  const fields = new Proxy(
    { unreachable: true },
    {
      ownKeys() {
        throw new Error("reflection failed");
      },
    },
  );

  t.notThrows(() =>
    logger.info("message", { before: "kept" }, fields, { after: "kept" }),
  );
  t.is(messages[0]?.message, "level=info msg=message before=kept after=kept");
});

test("logging keeps readable fields when a Proxy descriptor trap throws", (t) => {
  const { stream, messages } = captureMessages();
  const logger = new LokeLogger({ streams: [stream] });
  const target = { safe: "kept", dangerous: "unreachable" };
  const fields = new Proxy(target, {
    getOwnPropertyDescriptor(object, property) {
      if (property === "dangerous") throw new Error("descriptor failed");
      return Reflect.getOwnPropertyDescriptor(object, property);
    },
  });

  t.notThrows(() => logger.info("message", fields));
  t.is(messages[0]?.message, "level=info msg=message safe=kept");
});

test("withDomain does not mutate the logger it derives from", (t) => {
  const { stream, messages } = captureMessages();
  const logger = new LokeLogger({ streams: [stream], domain: "base" });

  const derived = logger.withDomain("derived");
  derived.info("from derived");
  logger.info("from base");

  t.is(logger.domain, "base");
  t.is(messages[0]?.message, 'level=info domain=derived msg="from derived"');
  t.is(messages[1]?.message, 'level=info domain=base msg="from base"');
});

test("fields merge safely with prototype names and later values win", (t) => {
  const { stream, messages } = captureMessages();
  const logger = new LokeLogger({ streams: [stream] });
  const fields: LogFields = Object.create({ inherited: "ignored" });
  Object.defineProperties(fields, {
    constructor: { value: "kept", enumerable: true },
    toString: { value: "kept", enumerable: true },
    hidden: { value: "ignored" },
  });
  Object.defineProperty(fields, "__proto__", {
    value: "kept",
    enumerable: true,
  });
  Object.defineProperty(fields, Symbol("ignored"), {
    value: "ignored",
    enumerable: true,
  });

  logger.info(
    "message",
    fields,
    { constructor: "last", user: "first" },
    {
      user: "last",
    },
  );

  t.is(
    messages[0]?.message,
    "level=info msg=message constructor=last toString=kept __proto__=kept user=last",
  );
});
