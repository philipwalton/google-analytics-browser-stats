var fs = require('fs-extra');
var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');
var defaults = require('lodash-node').defaults;
var fsp = require('../lib/fsp');
var log = require('../lib/log');
var report = require('../lib/report');
var defaultConfig = require('../lib/config').defaults;



describe('report.generate', function() {

  after(function(done) {
    fs.remove('tmp', done);
  });

  it('processes the query result and outputs a the browser stats to a file.',
      function(done) {

    var context =  {
      config: defaults({
        ids: 'ga:12345',
        outputFile: 'tmp/stats.json'
      }, defaultConfig)
    };

    var traceStub = sinon.stub(log, 'trace');
    var successStub = sinon.stub(log, 'success');

    fsp.readJson('test/fixtures/query-results.json')
        .bind(context)
        .then(report.generate)
        .then(function() {

      var actualPromise = fsp.readJson(context.config.outputFile);
      var expectedPromise = fsp.readJson('test/fixtures/browser-stats.json');

      Promise
          .all([actualPromise, expectedPromise])
          .then(function(value) {

        var actual = value[0];
        var expected = value[1];

        // Remove the dates before comparing
        delete actual.generatedOn;
        delete expected.generatedOn;

        assert.deepEqual(actual, expected);

        traceStub.restore();
        successStub.restore();
        done();
      });

    });

  });

});
