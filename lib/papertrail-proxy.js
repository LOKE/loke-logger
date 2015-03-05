module.exports = exports = PapertrailProxy;

var merge = require('merge');
var chalk = require('chalk');
var format = {
  meta: chalk.dim
};

function PapertrailProxy(transport, opts) {
  var self = this;

  this.hostname = opts.system || transport.hostname;
  this.program = opts.service || transport.program;

  // this.facility = opts.category || transport.facility;
  this._transport = transport;

  // bind most methods & fields through, but change some context objects

  if (transport instanceof PapertrailProxy) {
    linkMethod('sendMessage');
    linkMethod('close');
    linkMethod('on');
    this.transportLog = transport.transportLog;
  } else {
    bindMethod('sendMessage');
    bindMethod('close');
    bindMethod('on');
    this.transportLog = transport.log;
  }

  this.level = opts.level || 'info';

  defineGetters([
    'loggingEnabled',
    'inlineMeta',
    'colorize',
    'name'
  ]);

  function linkMethod(name) {
    self[name] = transport[name];
  }

  function linkField(name) {
    self[name] = transport[name];
  }

  function bindMethod(name) {
    self[name] = transport[name].bind(transport);
  }

  function defineGetters(names) {
    names.forEach(defineGetter);
  }

  function defineGetter(name) {
    Object.defineProperty(self, name, {get: function() {
      return transport[name];
    }});
  }
}


PapertrailProxy.prototype.log = function (level, msg, meta, callback) {
  if (meta && meta.error instanceof Error) {
    return this._logErr.apply(this, arguments);
  }

  meta = merge({}, meta);
  this._logStr.apply(this, arguments);
};

PapertrailProxy.prototype._logStr = function (level, str, meta, callback) {
  this.transportLog(level, str, meta, callback);
};

PapertrailProxy.prototype._logErr = function (level, msg, meta, callback) {
  // replace the message with the error stack
  var err = meta.error;
  meta = merge({}, meta);
  meta.error = err.name;
  this._logStr(level, err.message, meta, callback);
};
