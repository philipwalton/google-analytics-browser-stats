/** @module fsp */

var fs = require('fs-extra');
var Promise = require('bluebird');

module.exports = {
  readJson: Promise.promisify(fs.readJson),
  outputJson: Promise.promisify(fs.outputJson),
  readFile: Promise.promisify(fs.readFile),
  outputFile: Promise.promisify(fs.outputFile)
};
