const { SyslogStream, ConsoleStream } = require("./lib/streams");
const { Logger } = require("./lib/logger");
const { nullLogger } = require("./lib/null");
const { metricsMiddleware } = require("./lib/metrics");

exports.create = ({ syslog = false, metricsRegistry, showDebug } = {}) => {
  const streams = [new ConsoleStream()];

  if (syslog) {
    streams.push(new SyslogStream());
  }

  let logger = new Logger({ showDebug, streams });

  if (metricsRegistry) {
    logger = metricsMiddleware(metricsRegistry)(logger);
  }

  return logger;
};

exports.SyslogStream = SyslogStream;
exports.ConsoleStream = ConsoleStream;
exports.Logger = Logger;
exports.nullLogger = nullLogger;
