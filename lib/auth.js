var fs = require('fs-extra');
var Promise = require('bluebird');
var log = require('./log');
var messages = require('./messages');

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
      log.trace(messages.auth.MISSING_TOKENS);
      throw new UnauthorizedError();
    });
}

function ensureUsableTokens() {
  if (!(this.tokenData.accessToken && this.tokenData.refreshToken)) {
    log.trace(messages.auth.INVALID_TOKENS);
    throw new UnauthorizedError();
  }
  if (!this.tokenData.expires || Date.now() > this.tokenData.expires) {
    throw new ExpiredAccessTokenError();
  }
}

function oneTimeAuthorize() {
  log.trace(messages.auth.ONE_TIME_AUTH_START);

  return request.post(params.forDeviceCodeRequest())
    .bind(this)
    .then(function(body) {
      var data = JSON.parse(body);
      promptUserAuth(data.user_code);

      log.trace(messages.auth.POLLING);

      return pollForAuthSuccess
          .call(this, data.device_code, data.interval * 1000);
    });
}

function promptUserAuth(code) {
  log.alert(messages.auth.PROMPT_USER, code);
}

function onAccessDenied() {
  log.error(messages.auth.ACCESS_DENIED);
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
          log.trace(messages.auth.AUTHORIZATION_PENDING);
          return pollForAuthSuccess.call(this, code, interval);
        }
      }
      else {
        log.trace(messages.auth.AUTHORIZATION_SUCCESS);
        return saveTokenData.call(this, data);
      }
    });
}

function refreshAccessToken() {
  log.trace(messages.auth.REFRESHING_TOKEN);

  return request.post(params.forRefreshRequest(this.tokenData.refreshToken))
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
  this.tokenData = this.tokenData || {};

  if (data.access_token) this.tokenData.accessToken = data.access_token;
  if (data.refresh_token) this.tokenData.refreshToken = data.refresh_token;
  if (data.expires_in) {
    this.tokenData.expires = (+data.expires_in * 1000) + Date.now();
  }

  log.trace(messages.auth.SAVING_TOKENS, this.config.tokenFile);
  return writeJSON(this.config.tokenFile, this.tokenData);
}



module.exports = {
  getAccessToken: function() {

    // The `this` context invoking this promise will contain the config data.

    log.trace(messages.auth.AUTH_START);

    return Promise.bind(this)
      .then(getTokenData)
      .then(ensureUsableTokens)
      .catch(ExpiredAccessTokenError, refreshAccessToken)
      .catch(UnauthorizedError, oneTimeAuthorize)
      .catch(AccessDeniedError, onAccessDenied);
  }
};
