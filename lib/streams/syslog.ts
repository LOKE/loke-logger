import dgram from "node:dgram";
import os from "node:os";
import { Writable } from "node:stream";
import type { Log, LogLevel } from "../common";

export const mockable: { Date: new () => Date } = { Date };

interface SyslogStreamOptions {
  host?: string;
  port?: number;
  socket?: dgram.Socket;
  hostname?: string;
  pid?: number;
  appName?: string;
}

const priorities: Record<LogLevel, number> = {
  debug: 135,
  info: 134,
  warn: 132,
  error: 131,
};

function headerField(value: string, length: number): string {
  return value.replace(/[^!-~]/g, "").slice(0, length) || "-";
}

export class SyslogStream extends Writable {
  private readonly host: string;
  private readonly port: number;
  private readonly socket: dgram.Socket;
  private readonly ownsSocket: boolean;
  private readonly header: string;
  private readonly onSocketError = (error: Error): void => {
    this.destroy(error);
  };

  constructor({
    host,
    port,
    socket,
    hostname,
    pid,
    appName,
  }: SyslogStreamOptions = {}) {
    super({ objectMode: true });
    this.host = host || "127.0.0.1";
    this.port = port ?? 514;
    this.socket = socket ?? dgram.createSocket("udp4");
    this.ownsSocket = socket === undefined;
    this.header = `${headerField(hostname ?? os.hostname().split(".")[0], 255)} ${headerField(appName ?? process.title, 48)} ${headerField(String(pid ?? process.pid), 128)} - -`;
    this.socket.on("error", this.onSocketError);
  }

  _write(log: Log, _: string, callback: (error?: Error | null) => void): void {
    const message = `<${priorities[log.level]}>1 ${new mockable.Date().toISOString()} ${this.header} \uFEFF${log.message}`;
    try {
      this.socket.send(message, this.port, this.host, callback);
    } catch (error) {
      callback(error instanceof Error ? error : new Error(String(error)));
    }
  }

  _destroy(
    error: Error | null,
    callback: (error?: Error | null) => void,
  ): void {
    this.socket.removeListener("error", this.onSocketError);
    if (!this.ownsSocket) {
      callback(error);
      return;
    }
    try {
      this.socket.close(() => callback(error));
    } catch (closeError) {
      const failure =
        closeError instanceof Error
          ? closeError
          : new Error(String(closeError));
      callback(
        "code" in failure && failure.code === "ERR_SOCKET_DGRAM_NOT_RUNNING"
          ? error
          : failure,
      );
    }
  }

  close(): void {
    this.end();
  }
}
