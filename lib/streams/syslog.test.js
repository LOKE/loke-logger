import dgram from 'dgram';
import test from 'ava';
import {yellow} from 'chalk';
import {Logger} from '../logger';
import {DEBUG, INFO, WARN, ERROR} from '../common';
import {SyslogStream} from './syslog';

process.env.TZ = 'utc';

function createTestSocket() {
  const socket = dgram.createSocket('udp4');

  const next = () =>
    new Promise(resolve =>
      socket.once('message', buf => resolve(buf.toString('utf8')))
    );

  const done = () => socket.close();

  return new Promise(resolve =>
    socket.bind(() => {
      resolve({next, done, port: socket.address().port});
    })
  );
}

class FakeDate extends Date {
  constructor() {
    super('2018-02-23T11:46:24Z');
  }
}

// Bit of a hack, but it'll do for now
global.Date = FakeDate;

test('logger with debug true', async t => {
  const {next, done, port} = await createTestSocket();
  const logger = new Logger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: 'ip-10-0-0-115',
        appName: 'test'
      })
    ]
  });

  logger.debug('debug message');
  t.is(
    await next(),
    `<135>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${DEBUG} debug message`
  );

  logger.log('log message');
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} log message`
  );

  logger.info('info message');
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} info message`
  );

  logger.warn('warn message');
  t.is(
    await next(),
    `<132>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${WARN} warn message`
  );

  logger.error('error message');
  t.is(
    await next(),
    `<131>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${ERROR} error message`
  );

  done();
});

test('formatted messages', async t => {
  const {next, done, port} = await createTestSocket();
  const logger = new Logger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: 'ip-10-0-0-115',
        appName: 'test'
      })
    ]
  });

  logger.info('%s message', 1, 'other');
  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} 1 message other`
  );

  done();
});

test('with prefix', async t => {
  const {next, done, port} = await createTestSocket();
  const logger = new Logger({
    showDebug: true,
    streams: [
      new SyslogStream({
        port,
        pid: 2607,
        hostname: 'ip-10-0-0-115',
        appName: 'test'
      })
    ]
  });

  logger.withPrefix('PREFIX').info('prefixed message');

  const PREFIX = yellow('PREFIX');

  t.is(
    await next(),
    `<134>1 2018-02-23T11:46:24.00Z ip-10-0-0-115 test 2607 - - ${INFO} ${PREFIX}: prefixed message`
  );

  done();
});
