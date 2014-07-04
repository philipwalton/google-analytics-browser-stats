var Promise = require('bluebird');

module.exports = {

  refreshSuccess: Promise.resolve(JSON.stringify({
    access_token: 'some-refreshed-access-token',
    token_type: 'Bearer',
    expires_in: 3600
  })),

  deviceCodeData: Promise.resolve(JSON.stringify({
    device_code : 'some-device-code',
    user_code : 'some-user-code',
    verification_url : 'http://www.google.com/device',
    expires_in : 1800,
    interval : 0.01 // No need to wait the usual 5 seconds to poll.
  })),

  authorizationPending: Promise.resolve(JSON.stringify({
    error : 'authorization_pending'
  })),

  authorizationDenied: Promise.resolve(JSON.stringify({
    error : 'access_denied'
  })),

  authorizationSuccess: Promise.resolve(JSON.stringify({
    access_token : 'some-new-access-token',
    token_type : 'Bearer',
    expires_in : 3600,
    refresh_token : 'some-new-refresh-token'
  }))
};
