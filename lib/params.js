/** @module params */

var CLIENT_ID = '424707252803-6vr5g4cgs2h11qmmt08atrjdc469n1hk' +
    '.apps.googleusercontent.com';
var CLIENT_SECRET = 'e7-rOnu_YFvzrjsnerjwtDpx';
var SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
var AUTH_URL = 'https://accounts.google.com/o/oauth2/token';

module.exports = {

  /**
   * Return an object containing all the params needed for a reqest to
   * refresh an expired access token.
   * @param {string} refreshToken - The refresh token.
   * @returns {Object} The params.
   */
  forRefreshRequest: function(refreshToken) {
    return {
      url: AUTH_URL,
      form: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refreshToken
      }
    };
  },

  /**
   * Return an object containing all the params needed to request a device
   * code for the OAuth 2.0 flow for devices.
   * @returns {Object} The params.
   */
  forDeviceCodeRequest: function() {
    return {
      url: 'https://accounts.google.com/o/oauth2/device/code',
      qs: {
        scope: SCOPE,
        client_id: CLIENT_ID
      }
    };
  },

  /**
   * Return an object containing all the params needed to request an
   * access token.
   * @param {string} deviceCode - the device code retrieved from the OAuth 2.0
   *     flow for devices request.
   * @returns {Object} The params.
   */
  forAccessTokenRequest: function(deviceCode) {
    return {
      url: AUTH_URL,
      form: {
        grant_type: 'http://oauth.net/grant_type/device/1.0',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: deviceCode
      }
    };
  },

  /**
   * Return an object containing all the params needed for a Google Analytics
   * Core Reporting API request.
   * @param {Object} data - An object with the `ids`, `metric`, `days`
   *     and `accessToken` values.
   * @returns {Object} The params.
   */
  forApiQuery: function(data) {
    return {
      url: 'https://www.googleapis.com/analytics/v3/data/ga',
      qs: {
        'ids': data.ids,
        'metrics': data.metric,
        'dimensions': 'ga:browser,ga:browserVersion',
        'start-date': data.days + 'daysAgo',
        'end-date': 'yesterday',
        'access_token': data.accessToken
      }
    };
  }
};
