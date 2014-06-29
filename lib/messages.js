module.exports = {

  api: {

    QUERY_START:
        'Querying the Google Analytics Core Reporting API.',
  },

  auth: {

    MISSING_TOKENS:
        'The token file either doesn\'t exist or can\'t be parsed.',

    INVALID_TOKENS:
        'The token file is missing required data.',

    ONE_TIME_AUTH_START:
        'Starting the one time authorization flow.',

    POLLING:
        'Polling to check if the code has been successfully entered ' +
        'and authorization has been granted.',

    PROMPT_USER:
        'This script needs to do a one-time authorization in order ' +
        'to access your Google Analytics data.\n' +
        'In your browser, go to *http://google.com/device* and enter the ' +
        'following code: *%s*',

    ACCESS_DENIED:
        '*Error:* You have denied the request to access your ' +
        'Google Analytics account.\n' +
        'Access must be granted before browser statistics reports ' +
        'can be generated.',

    AUTHORIZATION_PENDING:
        'Request sent, authorization still pending.',

    AUTHORIZATION_SUCCESS:
        'User successfully authorized.',

    REFRESHING_TOKEN:
        'Refreshing access token.',

    SAVING_TOKENS:
        'Saving new authorization tokens to "%s".',

    AUTH_START:
        'Authorizing the user.',

  },

  report: {

    PARSE_ERROR:
        'Note: could not parse %s version "%s".',

    WEBKIT_VERSION_DETECTED:
        'Note: ignoring Safari result reporting Webkit version %s.'
  }

};
