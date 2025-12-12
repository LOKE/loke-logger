import { Writable } from "node:stream";

import { DEBUG, INFO, WARN, ERROR, Log } from "../common";

const SYSTEMD_PREFIX = {
  [DEBUG]: "<7>",
  [INFO]: "<6>",
  [WARN]: "<4>",
  [ERROR]: "<3>",
};

export class ConsoleStream extends Writable {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  systemdPrefix: boolean;
  escapeNewlines: boolean;

  constructor(
    stdout: NodeJS.WritableStream = process.stdout,
    stderr: NodeJS.WritableStream = process.stderr,
    systemdPrefix = false,
    escapeNewlines = false,
  ) {
    super({ objectMode: true });
    this.stdout = stdout;
    this.stderr = stderr;
    this.systemdPrefix = systemdPrefix;
    this.escapeNewlines = escapeNewlines;
  }

  _write(log: Log, _: string, callback: () => void): void {
    const { level } = log;
    let message = log.message;

    let prefix = "";
    if (this.systemdPrefix) {
      prefix = SYSTEMD_PREFIX[level];
    }

    if (this.escapeNewlines) {
      message = message.replace(/\n/g, "\\n");
    }

    switch (level) {
      case ERROR:
      case WARN:
        this.stderr.write(prefix + message + "\n");
        break;
      default:
        this.stdout.write(prefix + message + "\n");
    }
    callback();
  }
}
