var fs = require('fs-extra');
var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var request = require('../lib/request');
var params = require('../lib/params');
var auth = require('../lib/auth');

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
    access_token: 'some-valid-access-token',
    refresh_token: 'some-unneeded-refresh-token',
    expires: Date.now() + (2 * 60 * 60 * 1000) // Two hours from nom.
  }),
  'tmp/expired-tokens.json': JSON.stringify({
    access_token: 'some-expired-access-token',
    refresh_token: 'some-needed-refresh-token',
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
  });

  after(function(done) {
    fs.remove('tmp', done);
  });

  describe('.getAccessToken', function() {

    it('gets the access token from the token file if it is present and ' +
        'not expired.', function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          tokenFile: 'tmp/valid-tokens.json'
        }
      };

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.access_token, 'some-valid-access-token');
        done();
      });
    });


    it('refreshes the access token when it has expired.', function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          tokenFile: 'tmp/expired-tokens.json'
        }
      };

      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forRefreshRequest('some-needed-refresh-token'))
          .returns(responses.refreshSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.access_token,
            'some-refreshed-access-token');

        postStub.restore();
        done();
      });

    });

    it('initializes the one-time authorization flow if no access tokens ' +
        'exists.', function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          tokenFile: 'tmp/i-dont-exist.json'
        }
      };

      var logStub = sinon.stub(console, 'log', function() {});
      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .onFirstCall().returns(responses.authorizationPending)
          .onSecondCall().returns(responses.authorizationPending)
          .onThirdCall().returns(responses.authorizationSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.access_token,
            'some-new-access-token');

        assert(logStub.calledOnce);
        assert(logStub.getCall(0).args[0].indexOf('user-code') >= 0);

        logStub.restore();
        postStub.restore();
        done();
      });

    });

    it('initializes the one-time authorization flow if there is an error ' +
        'reading the tokens file.', function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          tokenFile: 'tmp/unparsable-tokens.json'
        }
      };

      var logStub = sinon.stub(console, 'log', function() {});
      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .returns(responses.authorizationSuccess);

      auth.getAccessToken.call(context).then(function() {
        assert.equal(this.tokenData.access_token,
            'some-new-access-token');

        assert(logStub.calledOnce);
        assert(logStub.getCall(0).args[0].indexOf('user-code') >= 0);

        logStub.restore();
        postStub.restore();
        done();
      });

    });

    it('logs a message if the user declines authorization.', function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          tokenFile: 'tmp/unparsable-tokens.json'
        }
      };

      var logStub = sinon.stub(console, 'log', function() {});
      var exitStub = sinon.stub(process, 'exit', function() {});

      var postStub = sinon.stub(request, 'post');
      postStub.withArgs(params.forDeviceCodeRequest())
          .returns(responses.deviceCodeData);
      postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
          .returns(responses.authorizationDenied);

      auth.getAccessToken.call(context).then(function() {
        assert(exitStub.calledOnce);

        assert(logStub.calledTwice);
        assert(logStub.getCall(0).args[0].indexOf('user-code') >= 0);
        assert(logStub.getCall(1).args[0].indexOf('You have denied the ' +
            'request to access your Google Analytics account.') >= 0);

        logStub.restore();
        exitStub.restore();
        postStub.restore();
        done();
      });

    });

  });

});
