import util from "node:util";

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogFields = Record<string, unknown>;

export interface Log {
  level: LogLevel;
  message: string;
}

const loggerOwnedFields = new Set(["level", "domain", "msg"]);

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);

    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        index += 1;
      } else {
        return true;
      }
    } else if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      return true;
    }
  }

  return false;
}

function hasInvalidLogfmtCharacter(value: string): boolean {
  return (
    hasLoneSurrogate(value) ||
    [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return (
        codePoint !== undefined &&
        (codePoint <= 0x20 ||
          codePoint === 0x7f ||
          codePoint === 0xfffd ||
          character === '"' ||
          character === "=")
      );
    })
  );
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
  const fieldParts = Object.entries(fields)
    .filter(
      ([key, value]) =>
        isValidFieldKey(key) && value !== null && value !== undefined,
    )
    .map(([k, v]) => `${k}=${formatValue(v)}`);

  return [
    `level=${level}`,
    domain && `domain=${quoteValue(domain)}`,
    `msg=${formatValue(msg)}`,
    ...fieldParts,
  ]
    .filter(Boolean)
    .join(" ");
}
