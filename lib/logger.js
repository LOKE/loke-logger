module.exports = exports = Logger;

var winston = require('winston');
var proxy = require('./proxy');
var os = require('os');
var merge = require('merge');

var cid = require('./cid');

function Logger(transports, opts) {

  opts = opts || {};

  this._transports = transports;
  this.service = opts.service || 'root';
  this.system = opts.system || os.hostname();
  this.level = opts.defaultLevel || 'debug';
  // this.tags = opts.tags || undefined;

  this._exceptionHandlers = opts.exceptionHandlers || [];
  this._requestHandlers = opts.requestHandlers || [];

  this._client = createClient(transports);
}

Logger.prototype._getMeta = function(meta) {
  var merged = merge({}, meta);
  var id = cid.getCID();
  if (id) merged.cid = id;
  return merged;
};

Logger.prototype.log = function(message, meta, level) {
  meta = this._getMeta(meta);
  if (typeof message === 'object') {

    if (message instanceof Error) {
      
      this._exception(message, meta, level);
      meta.error = message;
      // replace the message to the error's message
      message = message.message;

    } else {

      // replace the message with the object.toString()
      message = message.toString();

    }

  }
  
  this._client[level || this._level](message, meta);
};

['debug', 'info', 'warn', 'error']
.forEach(function(level) {
  Logger.prototype[level] = function(message, meta) {
    this.log(message, meta, level);
  };
});

Logger.prototype._exception = function(err, meta, level) {
  this._exceptionHandlers.forEach(function (handler) {
    handler(err, meta, level);
  });
};

Logger.prototype.request = function(err, status, req, meta) {
  var level = levelFromStatus(status);

  // fire any bound request handlers
  meta = this._getMeta(meta);

  this._requestHandlers.forEach(function (handler) {
    handler(err, status, req, meta, level);
  });

  // log the request
  var message = status + ' ' + req.originalUrl + ' ' + (err ? err.message : '');
  if (err) meta.error = err;
  meta.status = status;

  this[level](message, meta);
};

Logger.prototype.createLogger = function(opts) {
  opts = opts || {};
  var newOpts = {
    system: opts.system || this.system,
    service: (!opts.service || opts.service === 'root') ?
      this.service :
      this.service + '/' + opts.service,
    // tags: [].concat(opts.tags ? opts.tags.concat(this.tags) : this.tags),
    level: opts.level || this.level,
    exceptionHandlers: this._exceptionHandlers,
    requestHandlers: this._requestHandlers
  };

  var transports = proxy(this._transports, newOpts);
  return new Logger(transports, newOpts);
};

Logger.prototype.getClient = function() {
  return this._client;
};

Logger.prototype.getTags = function() {
  return this._tags;
};

Logger.prototype.getDefaultLevel = function() {
  return this._level;
};

Logger.prototype.close = function() {
  if (!this._transports) return;

  this._transports.forEach(function(transport) {
    if (transport.close) transport.close();
  });
};

function createClient(transports) {
  return new winston.Logger({ transports: transports });
}

function levelFromStatus(code) {
  if (code < 300) return 'debug';
  if (code < 400) return 'info';
  if (code < 500) return 'warn';
  return 'error';
}
