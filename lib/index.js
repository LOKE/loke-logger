'use strict';

var LEVELS = ['debug', 'info', 'notice', 'warn', 'error'];

var Syslog = require('winston-syslog').Syslog;

var hostname = require('os').hostname;
var winston = require('winston');
var chalk = require('chalk');
chalk.enabled = true;

var defaultColor = function (str) {
  return str;
};

var colors = {
  debug: defaultColor,
  info: defaultColor,
  notice: chalk.yellow,
  warn: chalk.yellow,
  error: chalk.red
};

function methodForLevel(method) {
  // Syslog uses 'warning' instead of 'warn'
  if (method === 'warn') {
    return 'warning';
  }
  return method;
}

module.exports = LOKELogger;

module.exports.create = LOKELogger;

function LOKELogger(options) {
  var winstonLogger;
  var consoleLogger;

  function write(component, level, message) {
    var method = methodForLevel(level);
    var color = colors[level];

    if (consoleLogger) {
      // Write to the console:
      consoleLogger.error( // eslint-disable-line no-console
        chalk.yellow('«' + component + '» ') + colors[level](message)
      );
    }

    if (winstonLogger) {
      // Write to syslog:
      winstonLogger.log(
        method,
        chalk.yellow(component) + ': ' + color(message)
      );
    }
  }

  function Logger(prefix) {
    this.component = prefix;
  }

  LEVELS
  .forEach(function (level) {
    Logger.prototype[level] = function (message) {
      write(this.component, level, message);
    };
  });

  var instance = {
    enableSyslog: function () {
      winstonLogger = new winston.Logger({
        levels: winston.config.syslog.levels,
        transports: [
          new Syslog({
            type: 'RFC5424',
            // First part of the domain:
            localhost: hostname().split('.')[0]
          })
        ],
        exitOnError: false
      });

      winstonLogger.level = 'info';
      return this;
    },
    enableConsole: function () {
      consoleLogger = console;
      return this;
    },
    log: function (component, level, message) {
      write(component, level, message);
    },
    create: function (prefix) {
      return new Logger(prefix);
    },
    stop: function () {
      consoleLogger = null;
      if (!winstonLogger) {
        return;
      }
      winstonLogger.close();
      winstonLogger = null;
    }
  };

  // Configure instance:
  if (options) {
    if (options.console) {
      instance.enableConsole();
    }
    if (options.syslog) {
      instance.enableSyslog();
    }
  }

  return instance;
}
