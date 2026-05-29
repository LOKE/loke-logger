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
    format(undefined, "info", "request", { user_id: "abc", status: 200 }),
    "level=info msg=request user_id=abc status=200",
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
