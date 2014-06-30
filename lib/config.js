/** @module config */

module.exports = {
  defaults: {
    metric: 'ga:sessions',
    days: 30,
    configFile: 'ga-config.json',
    outputFile: 'ga-browser-stats.json',
    tokenFile: '.ga-tokens',
    threshold: 0,
    verbose: false
  }
};
