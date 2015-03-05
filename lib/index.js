var Logger = require('./logger');
var transportFactory = require('./transport-factory');
var os = require('os');
var RollbarHandler = require('./rollbar-handler');

exports.createLogger = function (opts) {
  if (!opts.system) opts.system = os.hostname();
  if (!opts.service) opts.service = 'root';
  if (!opts.exceptionHandlers) opts.exceptionHandlers = [
    printStackTrace
  ];
  if (!opts.requestHandlers) opts.requestHandlers = [];

  if (opts.rollbar) {
    var rollbarHandler = new RollbarHandler(opts.rollbar);
    opts.exceptionHandlers.push(rollbarHandler.logError.bind(rollbarHandler));
    opts.requestHandlers.push(rollbarHandler.logRequest.bind(rollbarHandler));
  }

  var transports = transportFactory(opts);
  return new Logger(transports, opts);
};

function printStackTrace (err) {
  // console.error('----this should be saved to file or db----');
  // console.error(err.stack);
  // console.error('------------');
}