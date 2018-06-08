const {Counter} = require('prom-client');

const wrap = (next, wrapper) => Object.assign(Object.create(next), wrapper);

const logCounter = new Counter({
  name: 'log_messages_total',
  help: 'Total count of log messages',
  labelNames: ['prefix', 'severity'],
  registers: []
});

exports.metricsMiddleware = registry => {
  registry.registerMetric(logCounter);

  return next => {
    return wrap(next, {
      debug(...args) {
        logCounter.inc({severity: 'debug', prefix: this.prefix || '<NONE>'});
        return next.debug(...args);
      },
      log(...args) {
        logCounter.inc({severity: 'info', prefix: this.prefix || '<NONE>'});
        return next.log(...args);
      },
      info(...args) {
        logCounter.inc({severity: 'info', prefix: this.prefix || '<NONE>'});
        return next.info(...args);
      },
      warn(...args) {
        logCounter.inc({severity: 'warn', prefix: this.prefix || '<NONE>'});
        return next.warn(...args);
      },
      error(...args) {
        logCounter.inc({severity: 'error', prefix: this.prefix || '<NONE>'});
        return next.error(...args);
      }
    });
  };
};
