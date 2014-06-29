var fs = require('fs-extra');
var Promise = require('bluebird');
var log = require('./log');

var outputJSON = Promise.promisify(fs.outputJSON);

function groupResultsWithSimilarBrowserVersions(results) {
  var browsers = {};
  results.forEach(function(row) {
    var browser = row[0];
    var version = parseVersion(row[1], browser);
    var count = +row[2];

    if (!browsers[browser]) {
      browsers[browser] = {count: count, versions: {}};
    }
    else {
      browsers[browser].count += count;
    }

    var versions = browsers[browser].versions;
    if (!versions[version]) {
      versions[version] = {count: count};
    }
    else {
      versions[version].count += count;
    }
  });
  return browsers;
}

function extractBrowserData(groups, total, threshold) {
  var browsers = [];
  Object.keys(groups).forEach(function(browser) {
    var percentOfTotal = convertToPercentage(groups[browser].count / total);
    if (percentOfTotal > threshold) {
      browsers.push({
        name: browser,
        count: groups[browser].count,
        percentOfTotal: percentOfTotal
      });
    }
  });
  return browsers;
}

function extractBrowserVersionData(groups, total, threshold) {
  var versions = [];

  Object.keys(groups).forEach(function(browserName) {
    var browser = groups[browserName];
    Object.keys(browser.versions).forEach(function(versionNumber) {
      var version = browser.versions[versionNumber];
      var percentOfTotal = convertToPercentage(version.count / total);
      var percentOfBrowser = convertToPercentage(version.count / browser.count);
      if (percentOfTotal > threshold) {
        versions.push({
          name: browserName,
          version: versionNumber,
          count: version.count,
          percentOfTotal: percentOfTotal,
          percentOfBrowser: percentOfBrowser
        });
      }
    });
  });

  return versions;
}


function parseVersion(fullVersion, browser) {
  var pattern = /^v?(\d+)\.?(\d+)?/i;
  var matches = pattern.exec(fullVersion);
  if (!matches) {

    log.trace('Note: could not parse ' + browser + ' version "' +
        fullVersion + '".');

    log.trace('Note: could not parse %s version %s.', browser, fullVersion);

    return '(unknown)';
  }
  var version = matches[0];
  var majorVersion = +matches[1];
  var minorVersion = +matches[2];

  if (browser == 'Safari' && majorVersion > 10) {

    log.trace('Note: ignoring Safari result reporting Webkit version ' +
        version + '.');

    log.trace('Note: ignoring Safari result reporting Webkit version %s.',
        version);

    return '(unknown)';
  }

  return version;
}

function convertToPercentage(num) {
  var decimalPoints = 5;
  var percentage = num * 100;
  var power = Math.pow(10, decimalPoints);
  return Math.round(percentage * power) / power;
}

function sortDescendingByCount(a, b) {
  return b.count - a.count;
}

module.exports = {

  output: function(results) {

    // The `this` context invoking this promise will contain the config data.

    var metric = this.config.metric;
    var total = +results.totalsForAllResults[metric];
    var threshold = +this.config.threshold;
    var groups = groupResultsWithSimilarBrowserVersions(results.rows);

    var browsers = extractBrowserData(groups, total, threshold);
    var versions = extractBrowserVersionData(groups, total, threshold);

    var output = {
      total: total,
      metric: metric.slice(3),
      viewId: this.config.ids.slice(3),
      dateRange: 'Last ' + this.config.days + ' days',
      generatedOn: new Date().toString(),
      browsers: browsers.sort(sortDescendingByCount),
      versions: versions.sort(sortDescendingByCount)
    };

    return outputJSON(this.config.outputFile, output)
      .bind(this)
      .then(function() {
        log.alert('%s Report saved to "%s"','Success!'.green,
            this.config.outputFile);
      });
  }
};
