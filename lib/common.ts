import util from "util";
import { cyan, blue, yellow, red } from "chalk";

const formatPrefix = (prefix?: string) => (prefix ? yellow(prefix) + ": " : "");

export interface Log {
  level: string;
  message: string;
}

export const DEBUG = cyan("DEBG");
export const INFO = blue("INFO");
export const WARN = yellow("WARN");
export const ERROR = red("ERRO");

export function format(
  prefix: string | undefined,
  level: string,
  args: any
): string {
  return level + " " + formatPrefix(prefix) + util.format.apply(null, args);
}
