import { Writable } from "stream";

import { WARN, ERROR, Log } from "../common";

export class ConsoleStream extends Writable {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;

  constructor(
    stdout: NodeJS.WritableStream = process.stdout,
    stderr: NodeJS.WritableStream = process.stderr
  ) {
    super({ objectMode: true });
    this.stdout = stdout;
    this.stderr = stderr;
  }

  _write(log: Log, _: string, callback: () => void): void {
    const { level, message } = log;

    switch (level) {
      case ERROR:
      case WARN:
        this.stderr.write(message + "\n");
        break;
      default:
        this.stdout.write(message + "\n");
    }
    callback();
  }
}
