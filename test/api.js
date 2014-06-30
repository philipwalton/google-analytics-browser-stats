var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');
var defaults = require('lodash-node').defaults;

var request = require('../lib/request');
var params = require('../lib/params');
var api = require('../lib/api');
var log = require('../lib/log');
var defaultConfig = require('../lib/config').defaults;

var queryResult = {
  foo: 'bar'
};

describe('api', function() {

  describe('.query', function() {

    it('makes a request to the Core Reporting API and stores the results.',
        function(done) {

      var context =  {
        config: defaults({ids:'ga:12345'}, defaultConfig),
        tokenData: {
          accessToken: 'some-access-token'
        }
      };

      var traceStub = sinon.stub(log, 'trace');
      var getStub = sinon.stub(request, 'get');
      getStub.returns(Promise.resolve(JSON.stringify(queryResult)));

      Promise.bind(context)
          .then(api.query)
          .then(function(results) {

        assert.deepEqual(results, queryResult);

        traceStub.restore();
        getStub.restore();
        done();
      });

    });

  });

});
