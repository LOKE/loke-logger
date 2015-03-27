module.exports = exports = createTransports;

var MAX_LISTENERS = 100;

var winston = require('winston');
var PaperTrail = require('winston-papertrail').Papertrail;
var sprintf = require('sprintf-js');
var chalk = require('chalk');
var proxy = require('./proxy');

// create formatters for different content types
var format = {
  error: chalk.bgRed.bold,
  warn: chalk.bgYellow.bold,
  info: chalk.bgGreen,
  debug: chalk.bgBlue,
  verbose: chalk.gray,
  tags: chalk.dim,
  timestamp: chalk.dim,
};

// predefine display strings for each level
var levels = {
  error:    format.error(   ' ERROR '),
  warn:     format.warn(    ' WARN  '),
  info:     format.info(    ' INFO  '),
  debug:    format.debug(   ' DEBUG '),
  verbose:  format.verbose( ' VERB  ')
};


function createTransports(opts) {
  var transports = [];
  if (opts.console && opts.console.enabled) transports.push(createConsoleTransport(opts));
  if (opts.papertrail && opts.papertrail.enabled) transports.push(createPapertrailTransport(opts));

  if (transports.length === 0) console.warn('No logger transports are enabled');

  return proxy(transports, opts);
}

function createConsoleTransport(opts) {
  var ct = new winston.transports.Console({
    level: opts.level || 'info',
    timestamp: function() { return format.timestamp(new Date().toISOString()); },
    colorize: true,
    formatter: function(options) {
      // Return string will be passed to logger.
      return options.timestamp() +' '+
        levels[options.level] +' '+
        (undefined !== options.message ? options.message : '') +
        formatMeta(options.meta);
    }
  });
  ct.setMaxListeners(MAX_LISTENERS);
  return ct;
}

function createPapertrailTransport(opts) {
  var pt = new winston.transports.Papertrail({
    level: opts.level || 'info',
    host: opts.papertrail.host,
    port: opts.papertrail.port,
    inlineMeta: true,
    colorize: false,
    logFormat: function(level, message) {
      return levels[level] + ' ' +
        message;
    }
  });
  pt.setMaxListeners(MAX_LISTENERS);
  pt.on('error', function(err) {
    console.error('Papertrail Error:');
    console.error(err.stack);
  });

  return pt;
}

function formatMeta(meta) {
  return (meta && Object.keys(meta).length ?
    '\t\t' + format.tags(JSON.stringify(meta)) :
    '');
}

