var defaults = require('lodash-node/modern').defaults;

var defaultConfig = {
  metric: 'ga:sessions',
  days: 30,
  outputFile: 'ga-config.json',
  tokenFile: '.ga-tokens',
  threshold: 0,
  verbose: false
};

module.exports = {
  defaults: function(source, var_args) {
    var overrides = Array.prototype.slice.call(arguments, 1);
    var args = [source || {}].concat(overrides).concat(defaultConfig);

    return defaults.apply(null, args);
  }
};
