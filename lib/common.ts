import util from "node:util";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Log {
  level: LogLevel;
  message: string;
}

const loggerOwnedFields = new Set(["level", "domain", "msg"]);

function hasInvalidLogfmtCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint !== undefined &&
      (codePoint <= 0x20 ||
        codePoint === 0x7f ||
        codePoint === 0xfffd ||
        (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
        character === '"' ||
        character === "=")
    )
      return true;
  }
  return false;
}

function quoteValue(value: string): string {
  return value === "null" || hasInvalidLogfmtCharacter(value)
    ? JSON.stringify(value)
    : value;
}

function inspectValue(value: unknown): string {
  try {
    return quoteValue(util.inspect(value, { breakLength: Infinity }));
  } catch {
    return "[Unserializable]";
  }
}

function formatValue(value: unknown): string {
  try {
    if (value instanceof Error) return quoteValue(value.stack ?? String(value));
    if (typeof value === "string") return quoteValue(value);
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    )
      return String(value);

    const json = JSON.stringify(value);
    if (json !== undefined) return quoteValue(json);
  } catch {
    return inspectValue(value);
  }

  return inspectValue(value);
}

function isValidFieldKey(key: string): boolean {
  return (
    !loggerOwnedFields.has(key) &&
    key.length > 0 &&
    !hasInvalidLogfmtCharacter(key)
  );
}

export function printf(fmt: string, ...args: unknown[]): string {
  return util.format(fmt, ...args);
}

export function format(
  domain: string | undefined,
  level: LogLevel,
  msg: unknown,
  fields: LogFields,
): string {
  const parts = [`level=${level}`];
  if (domain) parts.push(`domain=${quoteValue(domain)}`);
  parts.push(`msg=${formatValue(msg)}`);

  for (const [key, value] of Object.entries(fields)) {
    if (value !== null && value !== undefined && isValidFieldKey(key)) {
      parts.push(`${key}=${formatValue(value)}`);
    }
  }

  return parts.join(" ");
}
