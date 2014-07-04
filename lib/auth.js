/** @module auth */

var Promise = require('bluebird');
var assign = require('lodash-node/modern').assign;
var log = require('./log');
var messages = require('./messages');
var request = require('./request');
var params = require('./params');
var fsp = require('./fsp');

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
 * Validates that both a refresh and access token exists and that the access
 * token has not expired.
 * @throws {UnauthorizedError}
 * @throws {ExpiredAccessTokenError}
 */
function ensureUsableTokens() {
  if (!(this.accessToken && this.refreshToken)) {
    log.trace(messages.auth.INVALID_TOKENS);
    throw new UnauthorizedError();
  }
  if (!this.expires || Date.now() > this.expires) {
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
          return data;
        }
      });
}

function refreshAccessToken() {
  log.trace(messages.auth.REFRESHING_TOKEN);
  return request.post(params.forRefreshRequest(this.refreshToken))
      .then(function(body) {
        var data = JSON.parse(body);
        if (body.error) {
          throw new UnauthorizedError(body.error);
        }
        return data;
      });
}


function handleNewTokenData(data) {
  // When this follows an auth request, data will be defined.
  // If data is not defined it means the tokens haven't changed.
  if (data) {
    if (data.access_token) this.accessToken = data.access_token;
    if (data.refresh_token) this.refreshToken = data.refresh_token;
    if (data.expires_in) {
      this.expires = (+data.expires_in * 1000) + Date.now();
    }
  }
}

// function saveTokensToDisk(file) {
//   log.trace(messages.auth.SAVING_TOKENS, file);
// }


/**
 * Callback for thrown AccessDeniedError errors.
 * Log a message to the console and exit the process.
 */
function onAccessDenied() {
  log.error(messages.auth.ACCESS_DENIED);
}


module.exports = {

  getAccessToken: function() {

    var tokenFile = this.config.tokenFile;
    var tokenData = {};

    log.trace(messages.auth.AUTH_START);

    return fsp.readJson(tokenFile)
        .bind(tokenData)
        .then(function(fileData) {
          assign(this, fileData);
        })
        .catch(function() {
          log.trace(messages.auth.MISSING_TOKENS);
          throw new UnauthorizedError();
        })
        .then(ensureUsableTokens)
        .catch(ExpiredAccessTokenError, refreshAccessToken)
        .catch(UnauthorizedError, oneTimeAuthorize)
        .catch(AccessDeniedError, onAccessDenied)
        .then(handleNewTokenData)
        .then(function() {
          log.trace(messages.auth.SAVING_TOKENS, tokenFile);

        })
        .then(function() {
          return this.accessToken;
        });

  }
};
