# LOKE Logger

A multi-target logger tailored for LOKE Group and based around LOKE standards.

Currently supports console output and Papertrail. More coming soon...

## Overview

Docs coming soon...

```js
var opts = {
    system: 'suiteName',
    service: 'myService',
    console: {enabled:true},
    papertrail: {enabled:true, host:'logs.papertrailapp.com', port: 1234}
};
var logger = require('loke-logger').createLogger(opts);
logger.info('Test');

var subLogger = logger.createLogger({service: 'myModule'});
subLogger.info('Something else');
```

## Root Logger

A root logger is created directly off the LOKE Logger library:

```js
var opts = {
    system: 'suiteName',
    service: 'myService'
};
var logger = require('loke-logger').createLogger(opts);
logger.info('Test');
```

If `opts.system` is not defined it will be set to `os.hostname()`.

## Sub Loggers

A sub logger is created off another instance off a LOKE Logger:

```js
var logger = rootLogger.createLogger({service:'sub'});
// The service name will now be `myService/sub`.

logger.info('Test');
```

Loggers can be nested indefinitely.

If `opts.system` is not defined it will be set to `os.hostname()`.

## Exception handlers

Exception handlers attached to a logger will be called whenever logger.exception() is called.

Note: sub-loggers will inherit handlers.

## Request handlers

Request handlers attached to a logger will be called whenever logger.request() is called.

*Note: sub-loggers will inherit handlers.*
