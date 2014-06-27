var CLIENT_ID = '424707252803-6vr5g4cgs2h11qmmt08atrjdc469n1hk' +
    '.apps.googleusercontent.com';
var CLIENT_SECRET = 'e7-rOnu_YFvzrjsnerjwtDpx';
var SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
var AUTH_URL = 'https://accounts.google.com/o/oauth2/token';

module.exports = {
  forRefreshRequest: function(refresh_token) {
    return {
      url: AUTH_URL,
      form: {
        grant_type: 'refresh_token',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: refresh_token
      }
    };
  },
  forDeviceCodeRequest: function() {
    return {
      url: 'https://accounts.google.com/o/oauth2/device/code',
      qs: {
        scope: SCOPE,
        client_id: CLIENT_ID
      }
    };
  },
  forAccessTokenRequest: function(device_code) {
    return {
      url: AUTH_URL,
      form: {
        grant_type: 'http://oauth.net/grant_type/device/1.0',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: device_code
      }
    };
  },
  forApiQuery: function(data) {
    return {
      url: 'https://www.googleapis.com/analytics/v3/data/ga',
      qs: {
        'ids': data.ids,
        'metrics': data.metric,
        'dimensions': 'ga:browser,ga:browserVersion',
        'start-date': data.days + 'daysAgo',
        'end-date': 'yesterday',
        'access_token': data.access_token
      }
    };
  }
};
