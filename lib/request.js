var request = require('request');
var Promise = require('bluebird');

module.exports = {
  get: function(data) {
    return new Promise(function(resolve, reject) {
      request.get(data, function(err, response, body) {
        if (err) {
          reject(err);
        }
        else {
          // Since we never use the response, just resolve with the
          // response body.
          resolve(body);
        }
      })
    });
  },
  post: function(data) {
    return new Promise(function(resolve, reject) {
      request.post(data, function(err, response, body) {
        if (err) {
          reject(err);
        }
        else {
          // Since we never use the response, just resolve with the
          // response body.
          resolve(body);
        }
      })
    });
  }
};
