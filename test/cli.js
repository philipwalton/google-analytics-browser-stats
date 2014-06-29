var fs = require('fs-extra');
var assert = require('assert');
var sinon = require('sinon');
var Promise = require('bluebird');
var printf = require('printf');
var cli = require('../lib/cli');
var log = require('../lib/log');
var originalArgv = process.argv;

function stubArgv(command) {
  process.argv = command.split(' ');
}

describe('cli', function() {

  describe('.getConfig', function() {

    afterEach(function() {
      process.argv = originalArgv;
    });

    it('uses the defaults for options not passed', function(done) {

      stubArgv('node config.js -i ga:1234');

      cli.getConfig().then(function(config) {

        assert.deepEqual(config, {
          ids: 'ga:1234',
          metric: 'ga:sessions',
          days: 30,
          configFile: 'ga-config.json',
          outputFile: 'ga-browser-stats.json',
          tokenFile: '.ga-tokens',
          threshold: 0,
          verbose: false
        });

        done();
      });
    });

    it('uses options from a config file if found', function(done) {

      stubArgv('node config.js -c test/fixtures/config.json');

      cli.getConfig().then(function(config) {

        assert.deepEqual(config, {
          configFile: 'test/fixtures/config.json',
          ids: 'ga:12345',
          metric: 'ga:sessions',
          days: 30,
          tokenFile: 'tokens.json',
          outputFile: 'browser-stats.json',
          threshold: 0.1,
          verbose: false
        });

        done();
      });
    });

    it('prefers passed options to those in a config file', function(done) {

      stubArgv('node config.js -c test/fixtures/config.json -i ga:42 -d 7');

      cli.getConfig().then(function(config) {

        assert.deepEqual(config, {
          configFile: 'test/fixtures/config.json',
          ids: 'ga:42',
          metric: 'ga:sessions',
          days: 7,
          tokenFile: 'tokens.json',
          outputFile: 'browser-stats.json',
          threshold: 0.1,
          verbose: false
        });

        done();
      });
    });

    it('reports an error when required config is missing', function(done) {

      stubArgv('node config.js');

      var errorStub = sinon.stub(log, 'error', function() {});

      cli.getConfig().then(function(config) {

        var errorMessage = printf.apply(null, errorStub.getCall(0).args);
        assert(errorStub.calledOnce);
        assert(errorMessage.indexOf('The "ids" option is required') >= 0);

        errorStub.restore();
        done();
      });

    });

  });

});
