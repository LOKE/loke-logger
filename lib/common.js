const util = require('util');
const {cyan, blue, yellow, red} = require('chalk');

const formatPrefix = prefix => (prefix ? yellow(prefix) + ': ' : '');

exports.DEBUG = cyan('DEBG');
exports.INFO = blue('INFO');
exports.WARN = yellow('WARN');
exports.ERROR = red('ERRO');

exports.format = (prefix, level, args) => {
  return level + ' ' + formatPrefix(prefix) + util.format.apply(null, args);
};
