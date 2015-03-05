module.exports = exports = ConsoleProxy;

var merge = require('merge');

function ConsoleProxy(transport, opts) {
  var self = this;

  opts = opts || {};

  this.system = opts.system || 'default';
  this.service = opts.service || 'root';
  this.level = opts.level || 'info';

  this._transport = transport;
  this._baseMeta = {
    sys: this.system,
    svc: this.service
  };

  if (transport.close) bindMethod('close');
  bindMethod('on');

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

ConsoleProxy.prototype.log = function (level, msg, meta, callback) {
  if (meta && meta.error instanceof Error) {
    return this._logErr.apply(this, arguments);
  }

  meta = merge(this._baseMeta, meta);
  this._logStr.apply(this, arguments);
};

ConsoleProxy.prototype._logStr = function (level, str, meta, callback) {
  this._transport.log(level, str, meta, callback);
};

ConsoleProxy.prototype._logErr = function (level, msg, meta, callback) {
  // replace the message with the error stack
  var err = meta.error;
  meta = merge(this._baseMeta, meta);
  meta.error = err.name;

  this._logStr(level, err.stack, meta, callback);
};
