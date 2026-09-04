import dgram from "node:dgram";
import os from "node:os";
import { Writable } from "node:stream";
import glossy from "glossy";
import type { Log } from "../common";

export const mockable = { Date };

interface SyslogStreamOptions {
  host?: string;
  port?: number;
  socket?: dgram.Socket;
  hostname?: string;
  pid?: number;
  appName?: string;
}

export class SyslogStream extends Writable {
  private host: string;
  private port: number;
  private socket: dgram.Socket;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private producer: any;

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
    this.port = port || 514;
    this.socket = socket || dgram.createSocket("udp4");

    this.producer = new glossy.Produce({
      type: "RFC5424",
      facility: "local0",
      appName: appName || process.title,
      pid: pid || process.pid,
      host: hostname || os.hostname().split(".")[0],
    });
  }

  _write(log: Log, _: string, callback: () => void): void {
    const { level, message } = log;

    const syslogMsg: string = this.producer.produce({
      severity: level === "warn" ? "warning" : level,
      date: new mockable.Date(),
      message,
    });

    this.socket.send(syslogMsg, this.port, this.host);

    callback();
  }

  close(): void {
    this.socket.close();
  }
}
