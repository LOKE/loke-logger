const os = require('os');
const dgram = require('dgram');
const {Writable} = require('stream');
const glossy = require('glossy');

const {DEBUG, INFO, WARN, ERROR} = require('../common');

const SYSLOG_LEVELS = new Map([
  [DEBUG, 'debug'],
  [INFO, 'info'],
  [WARN, 'warning'],
  [ERROR, 'error']
]);

class SyslogStream extends Writable {
  constructor({host, port, socket, hostname, pid, appName} = {}) {
    super({objectMode: true});
    this.host = host || '127.0.0.1';
    this.port = port || 514;
    this.socket = socket || dgram.createSocket('udp4');

    this.producer = new glossy.Produce({
      type: 'RFC5424',
      facility: 'local0',
      appName: appName || process.title,
      pid: pid || process.pid,
      host: hostname || os.hostname().split('.')[0]
    });
  }

  _write(log, _, callback) {
    const {level, message} = log;

    const syslogMsg = this.producer.produce({
      severity: SYSLOG_LEVELS.get(level),
      date: new Date(),
      message
    });

    this.socket.send(syslogMsg, this.port, this.host);

    callback();
  }
}

exports.SyslogStream = SyslogStream;
