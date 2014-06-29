var fs = require('fs-extra');
var request = require('./request');
var params = require('./params');
var log = require('./log');
var messages = require('./messages');

module.exports = {

  query: function() {

    // The `this` context invoking this promise will contain the config data.

    log.trace(messages.api.QUERY_START);

    return request.get(params.forApiQuery({
        ids: this.config.ids,
        metric: this.config.metric,
        days: this.config.days,
        access_token: this.tokenData.accessToken
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
