import { Writable } from "node:stream";
import type { Log } from "../common";

const handledDefaultDestinations = new WeakSet<NodeJS.WritableStream>();

function isEpipe(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "EPIPE"
  );
}

function handleDefaultDestinationErrors(stream: NodeJS.WritableStream): void {
  if (handledDefaultDestinations.has(stream)) return;
  stream.on("error", (error: unknown) => {
    if (!isEpipe(error)) throw error;
  });
  handledDefaultDestinations.add(stream);
}

export class ConsoleStream extends Writable {
  stdout: NodeJS.WritableStream;
  stderr: NodeJS.WritableStream;
  pretty: boolean;
  private readonly defaultStdout: boolean;
  private readonly defaultStderr: boolean;

  constructor(
    stdout?: NodeJS.WritableStream,
    stderr?: NodeJS.WritableStream,
    pretty = false,
  ) {
    super({ objectMode: true });
    this.defaultStdout = stdout === undefined;
    this.defaultStderr = stderr === undefined;
    this.stdout = stdout ?? process.stdout;
    this.stderr = stderr ?? process.stderr;
    if (this.defaultStdout) handleDefaultDestinationErrors(this.stdout);
    if (this.defaultStderr) handleDefaultDestinationErrors(this.stderr);
    this.pretty = pretty;
  }

  _write(log: Log, _: string, callback: (error?: Error | null) => void): void {
    const { level } = log;
    // Undoes logfmt escaping wholesale, so a literal "\n" in text expands too.
    const message = this.pretty
      ? log.message.replace(/\\n/g, "\n")
      : log.message;

    const destination =
      level === "error" || level === "warn" ? this.stderr : this.stdout;
    const suppressEpipe =
      level === "error" || level === "warn"
        ? this.defaultStderr
        : this.defaultStdout;
    let completed = false;
    const complete = (error?: Error | null): void => {
      const failure = suppressEpipe && isEpipe(error) ? undefined : error;
      if (completed) {
        if (failure) this.destroy(failure);
        return;
      }
      completed = true;
      callback(failure);
    };
    if (destination.write(`${message}\n`, complete)) complete();
  }
}
