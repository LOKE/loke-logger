const nullLogger = {
  prefix: 'null',
  debug() {},
  log() {},
  info() {},
  warn() {},
  error() {},
  withPrefix() {
    return nullLogger;
  }
};

exports.nullLogger = nullLogger;
