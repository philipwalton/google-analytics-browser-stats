var request = require('request');
var fs = require('fs-extra');
var semver = require('semver');

var CLIENT_ID = '424707252803-6vr5g4cgs2h11qmmt08atrjdc469n1hk.apps.googleusercontent.com';
var CLIENT_SECRET = 'e7-rOnu_YFvzrjsnerjwtDpx';
var SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';
var TOKEN_FILE = 'tokens.json';

authorize();

function authorize() {
  var tokens = getTokens();
  if (tokens) {
    getData(tokens.access_token, tokens.refresh_token);
  }
  else {
    oneTimeAuthorize();
  }
}

function getTokens() {
  var tokens;
  if (fs.existsSync(TOKEN_FILE)) {
    tokens = fs.readJSONSync(TOKEN_FILE, 'utf-8');
    if (tokens.access_token && tokens.refresh_token) {
      return tokens;
    }
  }
}

function oneTimeAuthorize() {
  console.log('one time authorize...');
  var options = {
    url: 'https://accounts.google.com/o/oauth2/device/code',
    qs: {
      scope: SCOPE,
      client_id: CLIENT_ID
    }
  }

  request.post(options, function(error, response, body) {
    var data = JSON.parse(body);
    console.log(data);
    getAccessToken(data.device_code, parseInt(data.interval) * 1000);
  })
}


function getAccessToken(code, interval) {

  console.log('getting access token...');

  var options = {
    url: 'https://accounts.google.com/o/oauth2/token',
    form: {
      grant_type: 'http://oauth.net/grant_type/device/1.0',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code
    }
  }

  function makeRequest() {
    request.post(options, function(error, response, body) {
      console.log(body);
      var data = JSON.parse(body);
      if (data.error) {
        setTimeout(makeRequest, interval);
      } else {
        fs.writeJSONSync('tokens.json', {
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });
        getData(data.access_token, data.refresh_token);
      }
    })
  }

  setTimeout(makeRequest, interval);
}

function refreshAccessToken(refresh_token) {
  console.log('refreshing access token...');
  var options = {
    url: 'https://accounts.google.com/o/oauth2/token',
    form: {
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refresh_token
    }
  }

  request.post(options, function(error, response, body) {
    var data = JSON.parse(body);
    console.log(data);

    if (response.statusCode == 200) {
      fs.writeJSONSync('tokens.json', {
        access_token: data.access_token,
        refresh_token: refresh_token,
      });
      getData(data.access_token, refresh_token);
    }
    else {
      oneTimeAuthorize();
    }


  });

}

function getData(access_token, refresh_token) {
  var options = {
    url: 'https://www.googleapis.com/analytics/v3/data/ga',
    qs: {
      'ids': 'ga:42124519',
      'metrics': 'ga:sessions',
      'dimensions': 'ga:browser,ga:browserVersion',
      'start-date': '30daysAgo',
      'end-date': 'yesterday',
      'sort': '-ga:sessions',
      'access_token': access_token
    }
  }

  request(options, function(error, response, body) {
    var results = JSON.parse(body);

    if (response.statusCode == 200) {
      // console.log(JSON.stringify(results, null, 2));
      displayResults(results);
    }
    else if (response.statusCode == 401) {
      refreshAccessToken(refresh_token);
    }
    else {
      oneTimeAuthorize();
    }

  });
}

function displayResults(results) {
  var totalSessions = +results.totalsForAllResults['ga:sessions'];
  var browsers = {};
  var rows = results.rows || [];

  rows.forEach(function(row) {
    var browser = row[0];
    var versionData = parseVersion(row[1]);
    var version = versionData && versionData[0];
    var majorVersion = versionData && versionData[1];
    var minorVersion = versionData && versionData[2];
    var sessions = +row[2];

    // Initialize a browser object if it doesn't exist.
    browsers[browser] = browsers[browser] || {
      sessions: sessions,
      versions: {}
    }

    var versions = browsers[browser].versions;
    if (versions[version]) {
      versions[version].sessions += sessions;
    }
    else {
      versions[version] = {
        sessions: sessions
      }
    }

  })

  fs.writeJSONSync('output.json', browsers);
}

function parseVersion(version) {
  var parser = /^(\d+)\.?(\d+)?/;
  var parsed = parser.exec(version);
  return parsed || null;
}
