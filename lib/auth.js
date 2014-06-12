require('native-promise-only');

var request = require('request');
var fs = require('fs-extra');

var CLIENT_ID = '424707252803-6vr5g4cgs2h11qmmt08atrjdc469n1hk' +
    '.apps.googleusercontent.com';
var CLIENT_SECRET = 'e7-rOnu_YFvzrjsnerjwtDpx';
var SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
var TOKEN_FILE = '.ga-tokens';

function getTokens() {
  var tokens;
  if (fs.existsSync(TOKEN_FILE)) {
    tokens = fs.readJSONSync(TOKEN_FILE, 'utf-8');
    if (tokens.access_token && tokens.refresh_token) {
      return tokens;
    }
  }
}

function validateTokens(tokens) {
  return tokens.access_token && tokens.refresh_token && tokens.expires;
}

function oneTimeAuthorize() {
  return new Promise(function(resolve, reject) {
    console.log('one time authorize...');
    var options = {
      url: 'https://accounts.google.com/o/oauth2/device/code',
      qs: {
        scope: SCOPE,
        client_id: CLIENT_ID
      }
    };
    request.post(options, function(error, response, body) {
      var data = JSON.parse(body);
      console.log('one time authorize info:', data);
      getAccessToken(data.device_code, parseInt(data.interval) * 1000)
        .then(resolve);
    });
  });
}

function getAccessToken(code, interval) {
  return new Promise(function(resolve, reject) {
    console.log('getting access token...');
    var options = {
      url: 'https://accounts.google.com/o/oauth2/token',
      form: {
        grant_type: 'http://oauth.net/grant_type/device/1.0',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code
      }
    }
    function makeRequest() {
      request.post(options, function(error, response, body) {
        console.log('token request', body);
        var data = JSON.parse(body);
        if (data.error) {
          setTimeout(makeRequest, interval);
        } else {
          storeTokens(data);
          resolve(data.access_token);
        }
      })
    }
    setTimeout(makeRequest, interval);
  });
}

function refreshAccessToken(refresh_token) {
  console.log('refreshing access token...');
  return new Promise(function(resolve, reject) {
    var options = {
      url: 'https://accounts.google.com/o/oauth2/token',
      form: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refresh_token
      }
    }
    request.post(options, function(error, response, body) {
      var data = JSON.parse(body);

      // Add the refresh token so it can be stored.
      data.refresh_token = refresh_token;

      if (response.statusCode == 200) {
        storeTokens(data);
        resolve(data.access_token);
      }
      else {
        // oneTimeAuthorize();
        reject(new Error('Something wen\'t wrong refreshing the tokens'));
      }
    });
  });
}

function storeTokens(data) {
  console.log('Saving access tokens...');
  fs.writeJSONSync(TOKEN_FILE, {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    // `data.expires` is in seconds, convert it to milliseconds.
    expires: (+data.expires_in * 1000) + Date.now()
  });
}

module.exports = {
  getAccessToken: function() {
    return new Promise(function(resolve, reject) {
      var tokens = getTokens();
      var now = Date.now();

      if (tokens && validateTokens(tokens)) {
        console.log(tokens.expires, now, tokens.expires, now > tokens.expires);
        if (!tokens.expires || now > tokens.expires) {
          refreshAccessToken(tokens.refresh_token).then(resolve);
        }
        else {
          resolve(tokens.access_token);
        }
      }
      else {
        oneTimeAuthorize().then(resolve);
      }
    });
  }
}
