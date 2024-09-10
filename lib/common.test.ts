import test from "ava";
import { yellow } from "chalk";
import { format } from "./common";

test("formatting", (t) => {
  t.is(
    format(undefined, "level", ["example %s", 100, "after"]),
    "level example 100 after",
  );

  t.is(
    format("prefix", "level", ["example %s", 100, "after"]),
    `level ${yellow("prefix")}: example 100 after`,
  );

  t.is(
    format("prefix", "level", ["example %s", 100, { prop: "value" }]),
    `level ${yellow("prefix")}: example 100 { prop: 'value' }`,
  );

  const err = new Error("message");

  err.stack = [
    "Error: message",
    "    at Thing.method (lib/thing.js:21:15)",
  ].join("\n");

  t.is(
    format("prefix", "level", [err]),
    `level ${yellow("prefix")}: ${err.stack}`,
  );

  // Node 12 now logs stack, not just message.
  // Check startsWith for consistency between versions.
  t.true(
    format("prefix", "level", ["example %s", err]).startsWith(
      `level ${yellow("prefix")}: example Error: message`,
    ),
  );
});
