var fs = require('fs-extra');
var get = require('./request').get;
var log = require('./log');

module.exports = {

  query: function() {

    // The `this` context invoking this promise will contain the config data.

    log('Querying the Google Analytics core reporting API.');
    return get({
        url: 'https://www.googleapis.com/analytics/v3/data/ga',
        qs: {
          'ids': this.config.ids,
          'metrics': this.config.metric,
          'dimensions': 'ga:browser,ga:browserVersion',
          'start-date': this.config.days + 'daysAgo',
          'end-date': 'yesterday',
          'access_token': this.tokenData.access_token
        }
      })
      .bind(this)
      .then(function(response) {
        var results = JSON.parse(response[1]);
        if (results.error) {
          throw new Error('(' + results.error.code + ') ' +
              results.error.message);
        }
        return this.results = results;
      });
  }
};
