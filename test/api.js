var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');

var request = require('../lib/request');
var params = require('../lib/params');
var api = require('../lib/api');

var queryResult = {
  foo: 'bar'
};

describe('api', function() {

  describe('.query', function() {

    it('makes a request to the Core Reporting API and stores the results.',
        function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          metric: 'ga:sessions',
          days: 30
        },
        tokenData: {
          access_token: 'some-access-token'
        }
      };

      var getStub = sinon.stub(request, 'get');
      getStub.returns(Promise.resolve(JSON.stringify(queryResult)));

      api.query.call(context).then(function() {
        assert.deepEqual(this.results, queryResult);

        getStub.restore();
        done();
      });

    });


  });

});