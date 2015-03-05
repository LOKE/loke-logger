var rollbar = require('rollbar');
var cid = require('./cid');

/**
 * Logs errors to rollbar
 */
function RollbarHandler(opts) {
  if (!opts.token) throw new Error('No rollbar token supplied');

  var config = {
    environment: opts.environment || 'unknown'
  };

  rollbar.init(opts.token, config);
}

RollbarHandler.prototype.close = function() {
  // note: rollbar is static
  // if there are multiple instances of the handler they will stop working!
  rollbar.shutdown();
};

RollbarHandler.prototype.logError = function(err, meta, level) {
  rollbar.handleErrorWithPayloadData(err, {level: level, custom: {cid: cid.getCID()}});
};

RollbarHandler.prototype.logRequest = function(err, status, request, meta) {
  // ignore request if no error
  if (!err) return;

  rollbar.handleErrorWithPayloadData(
    err,
    {
      level: level,
      custom: {cid: cid.getCID()}
    },
    req);
};

module.exports = exports = RollbarHandler;
