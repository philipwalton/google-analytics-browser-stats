var request = require('request');
var fs = require('fs-extra');

module.exports = {
  get: function(access_token, config) {

    return new Promise(function(resolve, reject) {

      console.log(config);
      var params = {
        url: 'https://www.googleapis.com/analytics/v3/data/ga',
        qs: {
          'ids': config.ids,
          'metrics': config.metric,
          'dimensions': 'ga:browser,ga:browserVersion',
          'start-date': config.days + 'daysAgo',
          'end-date': 'yesterday',
          'access_token': access_token
        }
      }

      console.log("Querying the API...");
      request(params, function(error, response, body) {
        var results = JSON.parse(body);

        if (results.error) {
          throw new Error('(' + results.error.code + ') ' + results.error.message);
        }
        else {
          resolve(results);
        }

      });
    });
  }
};
