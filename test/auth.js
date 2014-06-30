var fs = require('fs-extra');
var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');
var defaults = require('lodash-node').defaults;
var printf = require('printf');

var request = require('../lib/request');
var params = require('../lib/params');
var auth = require('../lib/auth');
var defaultConfig = require('../lib/config').defaults;
var log = require('../lib/log');

var outputFile = Promise.promisify(fs.outputFile);

var responses = {
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

var fixtures = {
  'tmp/valid-tokens.json': JSON.stringify({
    accessToken: 'some-valid-access-token',
    refreshToken: 'some-unneeded-refresh-token',
    expires: Date.now() + (2 * 60 * 60 * 1000) // Two hours from nom.
  }),
  'tmp/expired-tokens.json': JSON.stringify({
    accessToken: 'some-expired-access-token',
    refreshToken: 'some-needed-refresh-token',
    expires: Date.now()
  }),
  'tmp/unparsable-tokens.json': 'Unparsable JSON...'
};


describe('auth', function() {

  beforeEach(function(done) {
    var promises = Object.keys(fixtures).map(function(key) {
      return outputFile(key, fixtures[key]);
    });
    Promise.all(promises).then(function() {
      done();
    });
    sinon.stub(log, 'trace');
  });

  afterEach(function(done) {
    log.trace.restore();
    fs.remove('tmp', done);
  });

  describe('.getAccessToken', function() {

    it('gets the access token from the token file if it is present and ' +
        'not expired.', function(done) {

      var context =  {
        config: defaults({
          ids: 'ga:12345',
          tokenFile: 'tmp/valid-tokens.json'
        }, defaultConfig)
      };

      Promise.bind(context)
          .then(auth.getAccessToken)
          .then(function() {
            assert.equal(this.tokenData.accessToken, 'some-valid-access-token');
            done();
          });
    });

    it('refreshes the access token when it has expired.', function(done) {

      var context =  {
        config: defaults({
          ids: 'ga:12345',
          tokenFile: 'tmp/expired-tokens.json'
        }, defaultConfig)
      };

      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forRefreshRequest('some-needed-refresh-token'))
          .returns(responses.refreshSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.accessToken,
            'some-refreshed-access-token');

        postStub.restore();
        done();
      });

    });

    it('initializes the one-time authorization flow if no access tokens ' +
        'exists.', function(done) {

      var context =  {
        config: defaults({
          ids: 'ga:12345',
          tokenFile: 'tmp/i-dont-exist.json'
        }, defaultConfig)
      };

      var alertStub = sinon.stub(log, 'alert', function() {});
      var postStub = sinon.stub(request, 'post');

      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .onFirstCall().returns(responses.authorizationPending)
          .onSecondCall().returns(responses.authorizationPending)
          .onThirdCall().returns(responses.authorizationSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.accessToken,
            'some-new-access-token');

        var alertMessage = printf.apply(null, alertStub.getCall(0).args);
        assert(alertStub.calledOnce);
        assert(alertMessage.indexOf('some-user-code') >= 0);

        alertStub.restore();
        postStub.restore();
        done();
      });

    });

    it('initializes the one-time authorization flow if there is an error ' +
        'reading the tokens file.', function(done) {

      var context =  {
        config: defaults({
          ids: 'ga:12345',
          tokenFile: 'tmp/unparsable-tokens.json'
        }, defaultConfig)
      };

      var alertStub = sinon.stub(log, 'alert', function() {});
      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .returns(responses.authorizationSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.accessToken,
            'some-new-access-token');

        var alertMessage = printf.apply(null, alertStub.getCall(0).args);
        assert(alertStub.calledOnce);
        assert(alertMessage.indexOf('some-user-code') >= 0);

        alertStub.restore();
        postStub.restore();
        done();
      });

    });

    it('logs a message if the user declines authorization.', function(done) {

      var context =  {
        config: defaults({
          ids: 'ga:12345',
          tokenFile: 'tmp/unparsable-tokens.json'
        }, defaultConfig)
      };

      var alertStub = sinon.stub(log, 'alert', function() {});
      var errorStub = sinon.stub(log, 'error', function() {});

      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .returns(responses.authorizationDenied);

      auth.getAccessToken.call(context).then(function() {

        var alertMessage = printf.apply(null, alertStub.getCall(0).args);
        var errorMessage = printf.apply(null, errorStub.getCall(0).args);
        assert(alertStub.calledOnce);
        assert(errorStub.calledOnce);
        assert(alertMessage.indexOf('some-user-code') >= 0);
        assert(errorMessage.indexOf('You have denied the request') >= 0);

        alertStub.restore();
        errorStub.restore();
        postStub.restore();
        done();
      });

    });

  });

});
