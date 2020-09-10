import os from "os";
import dgram from "dgram";
import { Writable } from "stream";
import glossy from "glossy";

import { DEBUG, INFO, WARN, ERROR, Log } from "../common";

export const mockable = { Date };

const SYSLOG_LEVELS = new Map([
  [DEBUG, "debug"],
  [INFO, "info"],
  [WARN, "warning"],
  [ERROR, "error"],
]);

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
      severity: SYSLOG_LEVELS.get(level),
      date: new mockable.Date(),
      message,
    });

    this.socket.send(syslogMsg, this.port, this.host);

    callback();
  }
}
