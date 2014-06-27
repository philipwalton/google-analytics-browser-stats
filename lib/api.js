var fs = require('fs-extra');
var request = require('./request');
var params = require('./params');
var log = require('./log');

module.exports = {

  query: function() {

    // The `this` context invoking this promise will contain the config data.

    log('Querying the Google Analytics core reporting API.');

    return request.get(params.forApiQuery({
        ids: this.config.ids,
        metric: this.config.metric,
        days: this.config.days,
        access_token: this.tokenData.access_token
      }))
      .bind(this)
      .then(function(body) {
        var results = JSON.parse(body);
        if (results.error) {
          throw new Error('(' + results.error.code + ') ' +
              results.error.message);
        }
        return this.results = results;
      });
  }
};
