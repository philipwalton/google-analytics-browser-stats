var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var log = require('../lib/log');
var fsp = require('../lib/fsp');
var params = require('../lib/params');
var request = require('../lib/request');
var responses = require('./fixtures/responses');

var originalArgv = process.argv;

function stubArgv(command) {
  process.argv = command.split(' ');
}

describe('end-to-end', function() {

  afterEach(function() {
    process.argv = originalArgv;
  });

  it('parses the command line args, authorizes the user, queries the api, ' +
      'and generates a report.', function(done) {

    stubArgv('node browser-stats -i 1234');

    var alertStub = sinon.stub(log, 'alert');

    var postStub = sinon.stub(request, 'post');
    postStub.withArgs(params.forDeviceCodeRequest())
        .returns(responses.deviceCodeData);
    postStub.withArgs(params.forAccessTokenRequest('some-device-code'))
        .returns(responses.authorizationSuccess);

    var getStub = sinon.stub(request, 'get');
    getStub.returns(fsp.readFile('test/fixtures/query-results.json'));

    var outputJsonStub = sinon.stub(fsp, 'outputJson');
    outputJsonStub.returns(Promise.resolve(null));

    var successStub = sinon.stub(log, 'success', function() {

      assert(alertStub.calledOnce);
      assert(postStub.calledTwice);
      assert(getStub.calledOnce);
      assert(successStub.calledOnce);
      assert(outputJsonStub.calledOnce);

      alertStub.restore();
      postStub.restore();
      getStub.restore();
      successStub.restore();
      outputJsonStub.restore();

      done();
    });

    require('../bin/browser-stats');
  });

});
