/** @module cli */

var fs = require('fs-extra');
var path = require('path');
var Command = require('commander').Command;
var Promise = require('bluebird');
var defaults = require('lodash-node/modern').defaults;
var readJSON = Promise.promisify(fs.readJSON);
var log = require('../lib/log');
var defaultConfig = require('../lib/config').defaults;

/**
 * Get the package data from package.json.
 * @returns {Promise} A promise that resolves to the package.json data.
 */
function getPackageInfo() {
  var basePath = path.normalize(__dirname + path.sep + '..');
  var pkgFile = path.join(basePath, 'package.json');
  return readJSON(pkgFile);
}

/**
 * Setup the command line interface options.
 * @param {Object} pkg - The package.json data to get the version from.
 * @returns {Command} The Command instance.
 */
function setupCli(pkg) {
  return new Command()
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
          'print more detailed progress information to the console');
}

/**
 * Parse the CLI options and return the specified configuration data.
 * @return {Object} The configuration data from the CLI.
 */
function parseCliArgs(program) {

  program.parse(process.argv);

  var config = {};
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

/**
 * Merge the default configuration options with the returned CLI options
 * as well as any config options stored in the config file.
 * @param {Object} config - Command line config options.
 * @returns {Promise} A promise that resolves to the final merged config.
 */
function mergeConfig(config) {
  return readJSON(config.configFile)
      .catch(function(err) {
        // Getting here means the config file couldn't be found or couldn't be
        // parsed. Don't throw since there's a default config file and the user
        // might not have intended to specify it.
      })
      .then(function(fileConfig) {
        return defaults(config, fileConfig, defaultConfig);
      });
}

/**
 * Run validation logic to determine if the config if valid.
 * @param {Object} config - The final merged config object.
 * @returns {Object} The passed config object.
 */
function validateConfig(config) {
  if (!config.ids) {
    log.error('*Error:* The "ids" option is required.\n' +
        'It must be specified in the config file or as a command line option.');
  }
  return config;
}

/**
 * A utility function to camelCase strings.
 * @param {string} str - The string to camelCase.
 * @return {string} The camelCased string.
 */
function camelCase(str) {
  var pattern = /\-\w/;
  return str.replace(pattern, function(match) {
    return match[1].toUpperCase();
  });
}

/**
 * A utility function that adds the 'ga:' prefix if it's not there.
 * @param {string} str - The string to optionally prefix.
 * @return {string} The string with the prefix.
 */
function gaPrefixOptional(str) {
  return str.substr(0,3) == 'ga:' ? str : 'ga:' + str;
}

module.exports = {

  /**
   * Use the CLI, file, and default configs to get and store the final
   * config values to be used by the rest of the program.
   * @returns {Promise} A promise that resolves to the final config object.
   */
  getConfig: function() {
    return Promise.bind(this)
        .then(getPackageInfo)
        .then(setupCli)
        .then(parseCliArgs)
        .then(mergeConfig)
        .then(validateConfig)
        .then(function(config) {
          log.verbose = config.verbose;
          return this.config = config;
        });
  }
};
