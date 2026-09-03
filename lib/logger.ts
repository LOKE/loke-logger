import { PassThrough } from "node:stream";
import { format, type LogFields, type LogLevel } from "./common";

const isProd = process.env.NODE_ENV === "production";

export interface LoggerOptions {
  showDebug?: boolean;
  domain?: string;
  streams: NodeJS.WritableStream[];
}

export interface Logger {
  debug(msg: string, ...fields: LogFields[]): void;
  log(msg: string, ...fields: LogFields[]): void;
  info(msg: string, ...fields: LogFields[]): void;
  warn(msg: string, ...fields: LogFields[]): void;
  error(msg: string, ...fields: LogFields[]): void;
}

function mergeFields(fieldGroups: LogFields[]): LogFields {
  const merged: LogFields = {};

  for (const fields of fieldGroups) {
    let keys: (string | symbol)[];

    try {
      keys = Reflect.ownKeys(fields);
    } catch {
      continue;
    }

    for (const key of keys) {
      if (typeof key !== "string") continue;

      try {
        const descriptor = Reflect.getOwnPropertyDescriptor(fields, key);
        if (!descriptor?.enumerable || !("value" in descriptor)) continue;

        Object.defineProperty(merged, key, {
          configurable: true,
          enumerable: true,
          value: descriptor.value,
          writable: true,
        });
      } catch {
        continue;
      }
    }
  }

  return merged;
}

export class LokeLogger implements Logger {
  domain?: string;
  showDebug: boolean;
  private stream: PassThrough;

  constructor({ showDebug = !isProd, domain, streams }: LoggerOptions) {
    this.domain = domain;
    this.showDebug = showDebug;
    this.stream = new PassThrough({ objectMode: true });

    for (const s of streams) {
      this.stream.pipe(s);
    }
  }

  private _write(level: LogLevel, msg: string, fields: LogFields[]): void {
    const message = format(this.domain, level, msg, mergeFields(fields));
    this.stream.write({ level, message });
  }

  debug(msg: string, ...fields: LogFields[]): void {
    if (!this.showDebug) return;
    this._write("debug", msg, fields);
  }

  log(msg: string, ...fields: LogFields[]): void {
    this._write("info", msg, fields);
  }

  info(msg: string, ...fields: LogFields[]): void {
    this._write("info", msg, fields);
  }

  warn(msg: string, ...fields: LogFields[]): void {
    this._write("warn", msg, fields);
  }

  error(msg: string, ...fields: LogFields[]): void {
    this._write("error", msg, fields);
  }

  withDomain(domain: string): LokeLogger {
    return Object.assign(Object.create(this), { domain });
  }
}
