import test from "ava";
import { format, printf } from "./common";

test("printf", (t) => {
  t.is(printf("example %s", 100, "after"), "example 100 after");
  t.is(printf("hello %s", "world"), "hello world");
});

test("format - no domain", (t) => {
  t.is(
    format(undefined, "info", "hello world", {}),
    'level=info msg="hello world"',
  );
  t.is(format(undefined, "info", "simple", {}), "level=info msg=simple");
});

test("format - with domain", (t) => {
  t.is(
    format("my-service", "info", "hello world", {}),
    'level=info domain=my-service msg="hello world"',
  );
});

test("format - with fields", (t) => {
  t.is(
    format(undefined, "info", "request", { user: "abc", status: 200 }),
    "level=info msg=request user=abc status=200",
  );
  t.is(
    format(undefined, "info", "request", { flag: true }),
    "level=info msg=request flag=true",
  );
  t.is(
    format(undefined, "info", "request", { label: "hello world" }),
    'level=info msg=request label="hello world"',
  );
});

test("format - error field", (t) => {
  const err = new Error("message");
  err.stack = [
    "Error: message",
    "    at Thing.method (lib/thing.js:21:15)",
  ].join("\n");

  const result = format(undefined, "error", "something failed", { error: err });
  t.true(
    result.startsWith(
      'level=error msg="something failed" error="Error: message',
    ),
  );
});

test("format - null/undefined fields are skipped", (t) => {
  t.is(
    format(undefined, "info", "msg", { a: null, b: undefined, c: "ok" }),
    "level=info msg=msg c=ok",
  );
});

test("format - values that JSON.stringify cannot serialize", (t) => {
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  const namedFunction = function example() {};
  const bigint: unknown = Function("return 123n")();

  const result = format(undefined, "info", "values", {
    bigint,
    cyclic,
    symbol: Symbol("value"),
    fn: namedFunction,
  });

  t.regex(result, /bigint=123/);
  t.regex(result, /cyclic=".*Circular.*"/);
  t.regex(result, /symbol="?Symbol\(value\)"?/);
  t.regex(result, /fn="?\[Function: example\]"?/);
});

test("format - accepts non-string messages at runtime", (t) => {
  const error = new Error("failed");
  error.stack = undefined;

  t.is(
    Reflect.apply(format, undefined, [undefined, "error", error, {}]),
    'level=error msg="Error: failed"',
  );
  t.is(
    Reflect.apply(format, undefined, [undefined, "info", 42, {}]),
    "level=info msg=42",
  );
});

test("format - ignores invalid and logger-owned field keys", (t) => {
  t.is(
    format("service", "info", "safe", {
      level: "error",
      domain: "spoofed",
      msg: "spoofed",
      "user id": "abc",
      'bad"key': "abc",
      "bad=key": "abc",
      user: "valid",
    }),
    "level=info domain=service msg=safe user=valid",
  );
});

test("format - rejects control characters in keys and escapes them in values", (t) => {
  t.is(
    format(undefined, "info", "safe", {
      "bad\0key": "ignored",
      control: "\0",
    }),
    'level=info msg=safe control="\\u0000"',
  );
});

test("format - escapes lone UTF-16 surrogates", (t) => {
  t.is(
    format("service\ud800", "info", "message\udfff", { value: "field\ud800" }),
    'level=info domain="service\\ud800" msg="message\\udfff" value="field\\ud800"',
  );
});
