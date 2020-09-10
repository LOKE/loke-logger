/* eslint-disable @typescript-eslint/no-explicit-any */
import { PassThrough } from "stream";
import { format, DEBUG, INFO, WARN, ERROR } from "./common";

const isProd = process.env.NODE_ENV === "production";

export interface LoggerOptions {
  showDebug?: boolean;
  prefix?: string;
  streams: NodeJS.WritableStream[];
}

/**
 * Logger is the interface services should depend on, note it does not include
 * withPrefix by design
 */
export interface Logger {
  debug(message?: any, ...optionalParams: any[]): void;
  log(message?: any, ...optionalParams: any[]): void;
  info(message?: any, ...optionalParams: any[]): void;
  warn(message?: any, ...optionalParams: any[]): void;
  error(message?: any, ...optionalParams: any[]): void;
}

// assert that a plain console logger can be used as a Logger
{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: Logger = console;
}

export class LokeLogger implements Logger {
  prefix?: string;
  showDebug: boolean;
  private stream: PassThrough;

  constructor({ showDebug = !isProd, prefix, streams }: LoggerOptions) {
    this.prefix = prefix;
    this.showDebug = showDebug;
    this.stream = new PassThrough({ objectMode: true });

    for (const s of streams) {
      this.stream.pipe(s);
    }
  }

  private _write(level: string, args: any[]) {
    const message = format(this.prefix, level, args);
    this.stream.write({ level, message });
  }

  debug(...args: any[]): void {
    if (!this.showDebug) {
      return;
    }
    this._write(DEBUG, args);
  }

  log(...args: any[]): void {
    this._write(INFO, args);
  }

  info(...args: any[]): void {
    this._write(INFO, args);
  }

  warn(...args: any[]): void {
    this._write(WARN, args);
  }

  error(...args: any[]): void {
    this._write(ERROR, args);
  }

  withPrefix(prefix: string): LokeLogger {
    return Object.assign(Object.create(this), { prefix });
  }

  // NOTE: not yet useful, but might make migrating easier
  withContext(ctx: unknown): LokeLogger {
    return Object.assign(Object.create(this), { ctx });
  }
}
