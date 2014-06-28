require('colors');

var fs = require('fs-extra');
var path = require('path');
var Command = require('commander').Command;
var Promise = require('bluebird');
var defaults = require('lodash-node/modern').defaults;
var readJSON = Promise.promisify(fs.readJSON);
var log = require('../lib/log');
var defaultConfig = require('../lib/config').defaults;

function getPackageInfo() {
  var basePath = path.normalize(__dirname + path.sep + '..');
  var pkgFile = path.join(basePath, 'package.json');
  return readJSON(pkgFile);
}

function parseCliArgs(pkg) {

  var program = new Command();
  var config = {};

  program
      .version(pkg.version)
      .usage('[options]')
      .option('-i, --ids [value]',
          'the ID of the view to query', gaPrefixOptional)
      .option('-m, --metric [metric]',
          'the metric to query [sessions]', gaPrefixOptional)
      .option('-d, --days [count]',
          'the number of days to include in the query [30]')
      .option('-c, --config-file [file]',
          'a file with config data [ga-config.json]', 'ga-config.json')
      .option('-o, --output-file [file]',
          'the file to output results [ga-browser-stats.json]')
      .option('-t, --token-file [file]', 'the file to store the oauth2 ' +
          'access and refresh tokens [.ga-tokens]')
      .option('--threshold [percentage]', 'exclude results whose ' +
          'percentage of the total is below this value [0]')
      .option('--verbose',
          'print more detailed progress information to the console')
      .parse(process.argv);

  program.options.forEach(function(option) {
    var key = camelCase(option.long.slice(2));
    var value = program[key];

    // Don't store the version option, which comes with commander by default.
    if (key == 'version') return;

    // Store all non-null values.
    if (value != null) config[key] = value;
  });

  return config;
}

function getConfig(config) {
  return readJSON(config.configFile)
      .catch(function(err) {
        // Getting here mean the config file couldn't be found or couldn't be
        // parsed. Don't throw since there's a default config file and the user
        // might not have intended to specify it.
      })
      .then(function(fileConfig) {
        return defaults(config, fileConfig, defaultConfig);
      });
}

function camelCase(str) {
  var pattern = /\-\w/;
  return str.replace(pattern, function(match) {
    return match[1].toUpperCase();
  });
}

function gaPrefixOptional(str) {
  return str.substr(0,3) == 'ga:' ? str : 'ga:' + str;
}

function validateConfig(config) {
  if (!config.ids) {
    console.log('\n' +
      'Error: '.red + 'The "ids" option is required.\n' +
      'It must be specified in the config file or as a command ' +
      'line option.\n'
    );
    process.exit(1);
  }

  return config;
}

module.exports = {
  getConfig: function() {
    return Promise.bind(this)
        .then(getPackageInfo)
        .then(parseCliArgs)
        .then(getConfig)
        .then(validateConfig)
        .then(function(config) {
          log.verbose = config.verbose;
          return this.config = config;
        });
  }
};
