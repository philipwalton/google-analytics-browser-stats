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
var fsp = require('../lib/fsp');

var responses = require('./fixtures/responses');

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


describe('auth.getAccessToken', function() {

  beforeEach(function(done) {
    var promises = Object.keys(fixtures).map(function(key) {
      return fsp.outputFile(key, fixtures[key]);
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

  it('gets the access token from the token file if it is present and ' +
      'not expired.', function(done) {

    var context =  {
      config: {
        tokenFile: 'tmp/valid-tokens.json'
      }
    };

    Promise.bind(context)
        .then(auth.getAccessToken)
        .then(function(accessToken) {
          assert.equal(accessToken, 'some-valid-access-token');
          done();
        });
  });

  it('refreshes the access token when it has expired.', function(done) {

    var context =  {
      config: {
        tokenFile: 'tmp/expired-tokens.json'
      }
    };

    var postStub = sinon.stub(request, 'post');
    postStub.withArgs(params.forRefreshRequest('some-needed-refresh-token'))
        .returns(responses.refreshSuccess);

    auth.getAccessToken.call(context).then(function(accessToken) {
      assert.equal(accessToken, 'some-refreshed-access-token');

      postStub.restore();
      done();
    });

  });

  it('initializes the one-time authorization flow if no access tokens ' +
      'exists.', function(done) {

    var context =  {
      config: {
        tokenFile: 'tmp/i-dont-exist.json'
      }
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
      assert.equal(this.accessToken,
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
      config: {
        tokenFile: 'tmp/unparsable-tokens.json'
      }
    };

    var alertStub = sinon.stub(log, 'alert', function() {});
    var postStub = sinon.stub(request, 'post');
    postStub.withArgs(params.forDeviceCodeRequest())
        .returns(responses.deviceCodeData);
    postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
        .returns(responses.authorizationSuccess);

    auth.getAccessToken.call(context).then(function() {
      assert.equal(this.accessToken,
          'some-new-access-token');

      var alertMessage = printf.apply(null, alertStub.getCall(0).args);
      assert(alertStub.calledOnce);
      assert(alertMessage.indexOf('some-user-code') >= 0);

      alertStub.restore();
      postStub.restore();
      done();
    });

  });

  it('saves the tokens to disk anytime new token data is received',
      function(done) {

    done();
  });

  it('logs a message if the user declines authorization.', function(done) {

    var context =  {
      config: {
        tokenFile: 'tmp/unparsable-tokens.json'
      }
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
