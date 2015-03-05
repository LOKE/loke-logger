var transports = require('winston').transports;
var PapertrailProxy = require('./papertrail-proxy');
var ConsoleProxy = require('./console-proxy');

module.exports = exports = function(what, opts) {
  if (Array.isArray(what)) {
    return proxyArray(what, opts);
  } else {
    return proxySingle(what, opts);
  }
};

function proxySingle(what, opts) {
  if (what instanceof transports.Console || what instanceof ConsoleProxy) {
    return new ConsoleProxy(what, opts);
  }
  if (what instanceof transports.Papertrail || what instanceof PapertrailProxy) {
    return new PapertrailProxy(what, opts);
  }

  throw new Error('Can\'t proxy transport - unknown type');
}

function proxyArray(what, opts) {
  return what.map(function(item) {
    return proxySingle(item, opts);
  });
}
