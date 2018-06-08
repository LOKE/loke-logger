import test from 'ava';
import {Registry} from 'prom-client';
import {metricsMiddleware} from './metrics';
import {nullLogger} from './null';

test('logger metrics', t => {
  const registry = new Registry();
  const logger = metricsMiddleware(registry)(nullLogger);

  logger.debug();
  logger.log();
  logger.info();
  logger.warn();
  logger.error();

  t.snapshot(registry.metrics());
});
