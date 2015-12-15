# LOKE Logger

[![NPM Version](https://img.shields.io/npm/v/loke-logger.svg)](https://www.npmjs.com/package/loke-logger)
[![Build Status](https://img.shields.io/travis/LOKE/loke-logger/master.svg)](https://travis-ci.org/LOKE/loke-logger)

A multi-target logger tailored for LOKE Group and based around LOKE standards.

Currently supports console output and syslog.

## Overview

```js
var lokeLogger = require('loke-logger').create()

lokeLogger
.enableConsole()
.enableSyslog();

// Each logger object has a component name used to prefix all messages.
// This is so we know which part of the system a message is from.
var logger = lokeLogger.create('my-module')
logger.error('Lorem ipsum');
logger.warn('dolor sit amet consectetur');
logger.notice('adipisicing elit sed do');
logger.info('eiusmod tempor incididunt ut');
logger.debug('labore et dolore magna aliqua');
```


## Options

Alternatively, you can specify the outputs when the `lokeLogger` instance is created.

```js
var lokeLogger = require('loke-logger').create({
  syslog: true,
  console: true
});
```

When finished, you need to call: `lokeLogger.stop()` in order to close any open connections.
