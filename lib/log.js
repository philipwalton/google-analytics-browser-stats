require('colors');

var printf = require('printf');

/**
 * Keep track of the messages that have been logged so the spacing and
 * formatting of subsequent messages can be determined.
 */
var history = [];

/**
 * Convienence method to access the last item in the history.
 */
history.last = function() {
  return this[this.length - 1];
};

/**
 * Add an item to the history.
 * @param {string} type - The message type: "alert" or "trace".
 * @param {message} message - The message content.
 */
history.add = function(type, message) {
  this.push({type: type, message: message});
};

module.exports = {

  /**
   * When verbose is false, trace messages are not printed to the console.
   */
  verbose: false,

  /**
   * Log a message to the console.
   * Alerts are logged even when verbose is false.
   * @param {string} message - The message to log. Can be printf formatted.
   * @param {*} ...var_args - Arguments for printf formatted strings.
   */
  alert: function(message, var_args) {
    if (!history.last() || history.last().type == 'trace') console.log();

    message = printf.apply(null, arguments);
    console.log(message + '\n');

    history.add('alert', message);
  },

  /**
   * Errors are sent to STDERR and the process is exited immediately.
   * @param {string} message - The message to log.
   */
  error: function(message, var_args) {
    if (!history.last() || history.last().type == 'trace') console.log();

    message = printf.apply(null, arguments);
    console.error(message + '\n');

    process.exit(1);
  },

  /**
   * Trace messages are only logged in verbose mode.
   * @param {string} message - The message to log.
   */
  trace: function(message, var_args) {
    if (this.verbose) {
      message = printf.apply(null, arguments);
      console.log(' > '.grey + message.grey);

      history.add('trace', message);
    }
  }

};
