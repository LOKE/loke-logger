var logger = require('../lib').createLogger({
  system: 'dispatch',
  service: 'testing',
  level: 'debug',
  console: {
    enabled: true
  },
  papertrail: {
    enabled: false
  }
});
var domain = require('domain');

var d = domain.create();

d.cid = 'testing';

d.run(function() {

  logger.debug('Debug 1234');
  logger.info('Testing 1234');
  logger.error('Error 123');

  var l2 = logger.createLogger({service:'xyz'});

  l2.debug('Testing xyz');
  l2.info('Testing xyz');

});
