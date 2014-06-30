/** @module auth */

var fs = require('fs-extra');
var Promise = require('bluebird');
var log = require('./log');
var messages = require('./messages');

var request = require('./request');
var params = require('./params');
var readJSON = Promise.promisify(fs.readJSON);
var writeJSON = Promise.promisify(fs.writeJSON);

/**
 * @constructor ExpiredAccessTokenError
 * @extends Error
 */
function ExpiredAccessTokenError(){}
ExpiredAccessTokenError.prototype = Object.create(Error.prototype);

/**
 * @constructor UnauthorizedError
 * @extends Error
 */
function UnauthorizedError(){}
UnauthorizedError.prototype = Object.create(Error.prototype);

/**
 * @constructor AccessDeniedError
 * @extends Error
 */
function AccessDeniedError(){}
AccessDeniedError.prototype = Object.create(Error.prototype);

/**
 * Reads the token file and stores the token data on `this.tokenData`.
 */
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

/**
 * Validates that both a refresh and access token exists and that the access
 * token has not expired.
 * @throws {UnauthorizedError}
 * @throws {ExpiredAccessTokenError}
 */
function ensureUsableTokens() {
  if (!(this.tokenData.accessToken && this.tokenData.refreshToken)) {
    log.trace(messages.auth.INVALID_TOKENS);
    throw new UnauthorizedError();
  }
  if (!this.tokenData.expires || Date.now() > this.tokenData.expires) {
    throw new ExpiredAccessTokenError();
  }
}

/**
 * Take the user through the OAuth 2.0 flow for devices.
 * https://developers.google.com/accounts/docs/OAuth2ForDevices
 *
 * The user receives a code that must then be entered into the form at
 * http://google.com/devices. `pollForAuthSuccess` will then be invoked
 * on an interval until a successful or failed authorization occurs.
 */
function oneTimeAuthorize() {
  log.trace(messages.auth.ONE_TIME_AUTH_START);
  return request.post(params.forDeviceCodeRequest())
    .bind(this)
    .then(function(body) {
      var data = JSON.parse(body);

      log.alert(messages.auth.PROMPT_USER, data.user_code);
      log.trace(messages.auth.POLLING);

      return pollForAuthSuccess.call(this, data.device_code,
          data.interval * 1000);
    });
}

/**
 * Wait for the specified interval and then send a request with the specified
 * code. Call this function recursively until either access is granted or
 * access is denied.
 * @param {string} code - The device code for the request.
 * @param {number} interval - The amount of time to delay before sending
 *     the request.
 * @throws {AccessDeniedError}
 */
function pollForAuthSuccess(code, interval) {
  return Promise.delay(interval)
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
          saveTokenData.call(this, data);
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
        return data;
      })
      .then(saveTokenData);
}

/**
 * Save updates to the token data to disk.
 * @param {Object} data - The response from an auth request.
 */
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

/**
 * Callback for thrown AccessDeniedError errors.
 * Log a message to the console and exit the process.
 */
function onAccessDenied() {
  log.error(messages.auth.ACCESS_DENIED);
}


module.exports = {

  getAccessToken: function() {
    log.trace(messages.auth.AUTH_START);
    return Promise.bind(this)
      .then(getTokenData)
      .then(ensureUsableTokens)
      .catch(ExpiredAccessTokenError, refreshAccessToken)
      .catch(UnauthorizedError, oneTimeAuthorize)
      .catch(AccessDeniedError, onAccessDenied);

  }
};
