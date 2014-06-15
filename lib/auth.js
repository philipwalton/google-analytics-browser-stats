require('colors');

var fs = require('fs-extra');
var request = require('request');
var Promise = require('bluebird');
var assign = require('lodash-node/modern').assign;
var log = require('./log');

var post = Promise.promisify(request.post);
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
    });
}

function ensureUsableTokens() {
  if (!(this.tokenData.access_token && this.tokenData.refresh_token)) {
    throw new UnauthorizedError();
  }
  if (!this.tokenData.expires || Date.now() > this.tokenData.expires) {
    throw new ExpiredAccessTokenError();
  }
}

function oneTimeAuthorize() {
  log('Starting the one time authorization flow.');
  return post({
      url: 'https://accounts.google.com/o/oauth2/device/code',
      qs: {scope: SCOPE, client_id: CLIENT_ID}
    })
    .bind(this)
    .then(function(response) {
      var data = JSON.parse(response[1]);
      promptUserAuth(data.user_code);
      log('Polling to check if the code has been successfully entered and ' +
          'authorization has been granted.');
      return pollForAuthSuccess
          .call(this, data.device_code, data.interval * 1000);
    });
}

function promptUserAuth(code) {
  console.log(
    '\n' +
    'This script needs to do a one-time authorization in order ' +
    'to access your Google Analytics data.\n' +
    'In your browser, go to ' + 'http://google.com/device '.red +
    'and enter the following code: ' + code.red + '\n'
  );
}

function onAccessDenied() {
  console.log(
    '\n' + 'Error: '.red +
    'You have denied the request to access your Google Analytics account.\n' +
    'Access must be granted before browser statistics reports ' +
    'can be generated.\n'
  );
  process.exit(1);
}

function pollForAuthSuccess(code, interval) {
  return Promise
    .delay(interval)
    .bind(this)
    .then(post.bind(null, {
      url: AUTH_URL,
      form: {
        grant_type: 'http://oauth.net/grant_type/device/1.0',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      }
    }))
    .then(function(response) {
      var data = JSON.parse(response[1]);
      if (data.error) {
        if (data.error == 'access_denied') {
          throw new AccessDeniedError();
        }
        else {
          log('Request sent, authorization still pending.');
          return pollForAuthSuccess.call(this, code, interval);
        }
      }
      else {
        log('User successfully authorized.');
        assign(this.tokenData, data);
        this.tokenData.hasChanged = true;
      }
    });
}

function refreshAccessToken() {
  log('Refreshing access token.');
  return post({
      url: AUTH_URL,
      form: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: this.tokenData.refresh_token
      }
    })
    .bind(this)
    .then(function(response) {
      var data = JSON.parse(response[1]);
      if (response.statusCode == 200) {
        throw new UnauthorizedError();
      }
      assign(this.tokenData, data);
      this.tokenData.hasChanged = true;
    });
}

function saveTokenChanges() {[]
  if (this.tokenData.hasChanged) {
    log('Saving new authorization tokens to `' + this.config.tokenFile + '`.');
    return writeJSON(this.config.tokenFile, {
      access_token: this.tokenData.access_token,
      refresh_token: this.tokenData.refresh_token,
      expires: (+this.tokenData.expires_in * 1000) + Date.now()
    });
  }
}

module.exports = {
  getAccessToken: function() {

    // The `this` context invoking this promise will contain the config data.
    return Promise.bind(this)
      .then(getTokenData)
      .then(ensureUsableTokens)
      .catch(ExpiredAccessTokenError, refreshAccessToken)
      .catch(UnauthorizedError, oneTimeAuthorize)
      .catch(AccessDeniedError, onAccessDenied)
      .then(saveTokenChanges);
  }
}
