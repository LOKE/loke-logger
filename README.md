# LOKE Logger

[![NPM Version](https://img.shields.io/npm/v/loke-logger.svg)](https://www.npmjs.com/package/loke-logger)
[![Build Status](https://img.shields.io/travis/LOKE/loke-logger/master.svg)](https://travis-ci.org/LOKE/loke-logger)

A multi-target logger tailored for LOKE Group and based around LOKE standards.

Currently supports console output and syslog.

## Overview

In version 3.x the api is a subset of `console`

it includes `.debug()`, `.log()`, `.info()`, `.warn()` and `.error()`.

in addition the is a withPrefix method that creates a logger child logger with a prefix;

```js
const logger = require('loke-logger').create();

logger.error('Lorem ipsum');
logger.warn('dolor sit amet consectetur');

const httpLogger = logger.withPrefix('HTTP');

httpLogger.info('eiusmod tempor incididunt ut');
httpLogger.debug('labore et dolore magna aliqua');
```


## `create()` Options

There are a number of options when configuring the logger;

### showDebug

Type: `boolean`<br>
Default: `false` when `NODE_ENV=production`, otherwise `true`

Whether or not debug level logs should be emitted.

### syslog

Type: `boolean`<br>
Default: `false`

This option adds syslog udp messages to the output streams, console messages will still be emitted.

### metricsRegistry

Type: `Object`

A [prom-client](https://github.com/siimon/prom-client) register to add metrics to.

```js
const {register} = require('prom-client');
const logger = require('loke-logger').create({
  metricsRegistry: register
});
```

This adds the metric `log_messages_total` with the labels `prefix` and `severity`.
