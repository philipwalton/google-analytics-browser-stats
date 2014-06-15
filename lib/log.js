require('colors');
var verbose = false;

function log(message) {
  if (verbose) console.log(' > '.grey + message.grey);
}
Object.defineProperty(log, 'verbose', {
  set: function(value) {
    if (verbose && !value) {
      throw new Error('Once the logger is set to verbose mode, ' +
          'it cannot be changed back.');
    }
    else {
      verbose = value;
    }
  }
})

module.exports = log;
