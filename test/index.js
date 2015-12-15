'use strict'

/* global beforeEach afterEach describe it */

var LOKELogger = require('../')
var expect = require('expect')

describe('LOKELogger', function () {
  var sinon
  beforeEach(function () {
    sinon = require('sinon').sandbox.create()
  })
  afterEach(function () { sinon.restore() })

  it('should instantiate without errors', function () {
    var logger = new LOKELogger()
    expect(logger).toExist()
    expect(logger.enableSyslog).toExist()
    expect(logger.enableConsole).toExist()
    expect(logger.log).toExist()
  })

  it('should be silent by default', function () {
    var logger = new LOKELogger()
    var stub = sinon.stub(console, 'error')
    logger.log('http', 'error', 'Testing 123')
    expect(stub.callCount).toBe(0)
  })

  it('should log to console', function () {
    var logger = new LOKELogger()

    var stub = sinon.stub(console, 'error')

    logger
    .enableConsole()
    .create('http')
    .error('Testing 123')

    expect(stub.callCount).toBe(1)
  })

  it('should log to console when the option is set', function () {
    var logger = new LOKELogger({console: true})

    var stub = sinon.stub(console, 'error')

    logger
    .create('http')
    .error('Testing 123')

    expect(stub.callCount).toBe(1)
  })

  it('should log to syslog', function () {
    var logger = new LOKELogger()

    var stub = sinon.stub(console, 'error')

    logger
    .enableSyslog()
    .create('http')
    .error('Testing 123')

    expect(stub.callCount).toBe(0)
  })
})
