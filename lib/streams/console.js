const {Writable} = require('stream');

const {WARN, ERROR} = require('../common');

class ConsoleStream extends Writable {
  constructor(stdout = process.stdout, stderr = process.stderr) {
    super({objectMode: true});
    this.stdout = stdout;
    this.stderr = stderr;
  }

  _write(log, _, callback) {
    const {level, message} = log;

    switch (level) {
      case ERROR:
      case WARN:
        this.stderr.write(message + '\n');
        break;
      default:
        this.stdout.write(message + '\n');
    }
    callback();
  }
}

exports.ConsoleStream = ConsoleStream;
