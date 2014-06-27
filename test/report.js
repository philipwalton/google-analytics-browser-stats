var fs = require('fs-extra');
var assert = require('assert');
var Promise = require('bluebird');

var report = require('../lib/report');
var readJSON = Promise.promisify(fs.readJSON);

describe('report', function() {

  after(function(done) {
    fs.remove('tmp', done);
  });

  describe('.output', function() {

    it('processes the query result and outputs a the browser stats to a file.',
        function(done) {

      var context =  {
        config: {
          ids: 'ga:12345',
          metric: 'ga:sessions',
          days: 30,
          threshold: 0,
          outputFile: 'tmp/stats.json'
        }
      };

      readJSON('test/fixtures/query-results.json')
          .bind(context)
          .then(report.output)
          .then(function() {

        var actualPromise = readJSON(context.config.outputFile);
        var expectedPromise = readJSON('test/fixtures/browser-stats.json');

        Promise
            .all([actualPromise, expectedPromise])
            .then(function(value) {

          var actual = value[0];
          var expected = value[1];

          // Remove the dates before comparing
          delete actual.generatedOn;
          delete expected.generatedOn;

          assert.deepEqual(actual, expected);

          done();
        });

      });

    });

  });

});
