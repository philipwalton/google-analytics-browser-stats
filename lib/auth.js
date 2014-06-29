var fs = require('fs-extra');
var Promise = require('bluebird');
var assign = require('lodash-node/modern').assign;
var log = require('./log');

var request = require('./request');
var params = require('./params');
var readJSON = Promise.promisify(fs.readJSON);
var writeJSON = Promise.promisify(fs.writeJSON);

var CLIENT_ID = '424707252803-6vr5g4cgs2h11qmmt08atrjdc469n1hk' +
    '.apps.googleusercontent.com';
var CLIENT_SECRET = 'e7-rOnu_YFvzrjsnerjwtDpx';
var SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
var AUTH_URL = 'https://accounts.google.com/o/oauth2/token';

function ExpiredAccessTokenError(){}
ExpiredAccessTokenError.prototype = Object.create(Error.prototype);

function UnauthorizedError(){}
UnauthorizedError.prototype = Object.create(Error.prototype);

function AccessDeniedError(){}
AccessDeniedError.prototype = Object.create(Error.prototype);


function getTokenData() {
  return readJSON(this.config.tokenFile)
    .bind(this)
    .then(function(data) {
      this.tokenData = data;
    })
    .catch(function() {
      log.trace('The token file either doesn\'t exist or can\'t be parsed.');
      throw new UnauthorizedError();
    });
}

function ensureUsableTokens() {
  if (!(this.tokenData.access_token && this.tokenData.refresh_token)) {
    log.trace('The token file is missing required data.');
    throw new UnauthorizedError();
  }
  if (!this.tokenData.expires || Date.now() > this.tokenData.expires) {
    throw new ExpiredAccessTokenError();
  }
}

function oneTimeAuthorize() {
  log.trace('Starting the one time authorization flow.');

  return request.post(params.forDeviceCodeRequest())
    .bind(this)
    .then(function(body) {
      var data = JSON.parse(body);
      promptUserAuth(data.user_code);

      log.trace('Polling to check if the code has been successfully entered ' +
          'and authorization has been granted.');

      return pollForAuthSuccess
          .call(this, data.device_code, data.interval * 1000);
    });
}

function promptUserAuth(code) {
  log.alert('This script needs to do a one-time authorization in order ' +
      'to access your Google Analytics data.\n' +
      'In your browser, go to *http://google.com/device* and enter the ' +
      'following code: *%s*', code);
}

function onAccessDenied() {
  log.error('*Error:* You have denied the request to access your ' +
      'Google Analytics account.\n' +
      'Access must be granted before browser statistics reports ' +
      'can be generated.'
  );
}

function pollForAuthSuccess(code, interval) {
  return Promise
    .delay(interval)
    .bind(this)
    .then(function() {
      return request.post(params.forAccessTokenRequest(code));
    })
    .then(function(body) {
      var data = JSON.parse(body);
      if (data.error) {
        if (data.error == 'access_denied') {
          throw new AccessDeniedError();
        }
        else {
          log.trace('Request sent, authorization still pending.');
          return pollForAuthSuccess.call(this, code, interval);
        }
      }
      else {
        log.trace('User successfully authorized.');
        return saveTokenData.call(this, data);
      }
    });
}

function refreshAccessToken() {
  log.trace('Refreshing access token.');

  return request.post(params.forRefreshRequest(this.tokenData.refresh_token))
    .bind(this)
    .then(function(body) {
      var data = JSON.parse(body);
      if (body.error) {
        throw new UnauthorizedError(body.error);
      }
      return saveTokenData.call(this, data);
    });
}

function saveTokenData(data) {
  if (!this.tokenData) this.tokenData = {};
  assign(this.tokenData, data);

  log.trace('Saving new authorization tokens to "%s".', this.config.tokenFile);

  return writeJSON(this.config.tokenFile, {
    access_token: this.tokenData.access_token,
    refresh_token: this.tokenData.refresh_token,
    expires: (+this.tokenData.expires_in * 1000) + Date.now()
  });
}

module.exports = {
  getAccessToken: function() {

    // The `this` context invoking this promise will contain the config data.

    log.trace('Authorizing the user.');

    return Promise.bind(this)
      .then(getTokenData)
      .then(ensureUsableTokens)
      .catch(ExpiredAccessTokenError, refreshAccessToken)
      .catch(UnauthorizedError, oneTimeAuthorize)
      .catch(AccessDeniedError, onAccessDenied);
  }
};
