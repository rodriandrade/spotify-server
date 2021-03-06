/**
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var tokens = [];
var client_id = '1b015d21997143e28e0724a9646dedd3'; // Your client id
var client_secret = '732b088b97ba44ecb86a96a290f1f8e4'; // Your secret
var redirect_uri = 'https://spotify-server-seven.vercel.app/callback'; // Your redirect uri

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express();

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser());

app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);
  console.log("hola");
  // your application requests authorization
  var scope = 'playlist-modify-public playlist-modify-private user-top-read user-read-recently-played user-read-currently-playing user-read-playback-state playlist-read-private playlist-read-collaborative user-follow-modify user-follow-read user-library-read user-library-modify user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter
  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;
  console.log("Esto es el code" + " " + code)
  console.log("Esto es el state" + " " + state)
  console.log(storedState)
  console.log(req.cookies)
  
  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        tokens.push(access_token);
        tokens.push(refresh_token);

        var options = {
          url: '/tokens',
          json: true
        };

        // use the access token to access the Spotify Web API
        request.post(options, function(error, response, body) {
          /*
          res.send({
            'access_token': access_token,
            'refresh_token': refresh_token
          });
          */
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('https://my-spotify-data-center.vercel.app/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));

      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/tokens', function(req, res) {
  res.send(tokens);
  console.log(tokens);
});

app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  console.log(req.query);
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      console.log("Holiiiiiiis")
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
