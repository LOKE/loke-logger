import util from "node:util";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Log {
  level: LogLevel;
  message: string;
}

function quoteValue(value: string): string {
  if (/[\s"=]/.test(value)) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

function formatValue(value: unknown): string {
  if (value instanceof Error) return quoteValue(value.stack ?? String(value));
  if (typeof value === "string") return quoteValue(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return quoteValue(JSON.stringify(value));
}

export function printf(fmt: string, ...args: unknown[]): string {
  return util.format(fmt, ...args);
}

export function format(
  domain: string | undefined,
  level: LogLevel,
  msg: string,
  fields: LogFields,
): string {
  const fieldParts = Object.entries(fields)
    .filter(([, v]) => v !== null && v !== undefined)
    .map(([k, v]) => `${k}=${formatValue(v)}`);

  return [
    `level=${level}`,
    domain && `domain=${domain}`,
    `msg=${quoteValue(msg)}`,
    ...fieldParts,
  ]
    .filter(Boolean)
    .join(" ");
}
