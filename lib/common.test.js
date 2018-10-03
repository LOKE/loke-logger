import test from "ava";
import { yellow } from "chalk";
import { format } from "./common";

test("formatting", t => {
  t.is(
    format(undefined, "level", ["example %s", 100, "after"]),
    "level example 100 after"
  );

  t.is(
    format("prefix", "level", ["example %s", 100, "after"]),
    `level ${yellow("prefix")}: example 100 after`
  );
});
