const {PassThrough} = require('stream');
const {format, DEBUG, INFO, WARN, ERROR} = require('./common');

const isProd = process.env.NODE_ENV === 'production';

class Logger {
  constructor({showDebug = !isProd, prefix, streams} = {}) {
    this.prefix = prefix;
    this.showDebug = showDebug;
    this.stream = new PassThrough({objectMode: true});

    for (const s of streams) {
      this.stream.pipe(s);
    }
  }

  _write(level, args) {
    const message = format(this.prefix, level, args);
    this.stream.write({level, message});
  }

  debug(...args) {
    if (!this.showDebug) {
      return;
    }
    this._write(DEBUG, args);
  }

  log(...args) {
    this._write(INFO, args);
  }

  info(...args) {
    this._write(INFO, args);
  }

  warn(...args) {
    this._write(WARN, args);
  }

  error(...args) {
    this._write(ERROR, args);
  }

  withPrefix(prefix) {
    return Object.assign(Object.create(this), {prefix});
  }
}

exports.Logger = Logger;
