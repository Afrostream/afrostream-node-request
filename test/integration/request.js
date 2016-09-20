'use strict';

var anr = require('../../index.js');

var Q = require('q');

var assert = require('better-assert');

function waitXmsec(x) {
  var deferred = Q.defer();

  setTimeout(function () {
    deferred.resolve(undefined);
  }, x);
  return deferred.promise;
}

describe('defaultOptions baseUrl', function () {
  this.timeout(5000);

  var request = anr.create({baseUrl: 'https://afr-api-v1-staging.herokuapp.com'});

  describe('test computedOptions by passing a relative uri', function () {
    it('should concatenate , call the api, and return a result', function (done) {
      request({uri:'/alive'}).then(function (data) {
        assert(Array.isArray(data));
        assert(data[1]);
        assert(data[1].alive === true);
      })
      .then(done, done);
    });
  });
});

describe('testing cache', function () {
  this.timeout(5000);

  var server;
  var randomText = String(Math.random());
  var port = null;
  var redisClient = null;

  before(function (done) {
    console.log('spawning a simple express server');
    var app = require('express')();
    app.get('/*', function (req, res) { res.json({randomText: randomText})});
    var http = require('http');
    server = http.createServer(app).listen(function () {
      port = server.address().port;
      console.log('temporary server spawned on port ' + port);
      done();
    });
  });

  before(function (done) {
    console.log('connecting to redis');
    var redis = require('redis');
    redisClient = redis.createClient();
    redisClient.on('ready', function () {
      redisClient.set('foo', 'bar');
      done();
    });
    redisClient.on('error', function (err) {
      console.error('REDIS CLIENT ERROR', err);
      done(err);
    })
  });

  describe('calling a sub server with some cache', function () {
    it('should trigger cache', function (done) {
      var request = anr.create();
      var uri = 'http://localhost:' + port + '/test?random='+randomText;
      //
      request({uri: uri, cache: { mode: 'fallback', redis: redisClient }})
        .then(function (result) {
          assert(result);
          assert(result[1]); // body
          var body = result[1];
          assert(result[1].randomText === randomText); // random string correctly forwaded
        })
        .then(function () { return waitXmsec(500); })
        .then(function () {
          var key = 'request:GET:'+uri;
          console.log('SEARCHING KEY='+key);
          return Q.ninvoke(redisClient, 'get', key);
        })
        .then(function (result) {
          result = JSON.parse(result);
          console.log(result);
          assert(result.body.randomText === randomText);
        })
        .then(function closeServer() {
          server.close();
        })
        .then(function () { return waitXmsec(500); })
        .then(function () {
          // request again !
          return request({uri: uri, cache: { mode: 'fallback', redis: redisClient }});
        })
        .then(function (result) {
          assert(result);
          assert(result[1]); // body
          var body = result[1];
          assert(result[1].randomText === randomText); // random string correctly forwaded
          assert(result[0].fromCache === true);
        })
        .then(done, done);
    });
  });
});
