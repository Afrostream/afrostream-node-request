'use strict';

var anr = require('../../index.js');

var Q = require('q');

var assert = require('better-assert');

describe('defaultOptions baseUrl', function () {
  this.timeout(5000);

  var request = anr.create({baseUrl: 'https://afr-api-v1-staging.herokuapp.com'});

  describe('fetching an url normaly returning 404', function () {
    it('should throw an error without specifying a filter', function (done) {
      request({uri:'/this-route-should-return-404'})
      .then(
        function success(data) {
          done(new Error('we shouldn t be in success promise handler'));
        },
        function error(err) {
          try {
            assert(err.statusCode === 404);
            done();
          } catch (e) {
            done(e);
          }
        });
    });
  });

  describe('fetching an url normaly returning 404', function () {
    it('should not throw an error with no filter', function (done) {
      request({uri:'/this-route-should-return-404', filter: null})
      .then(function () { done(); }, done);
    });
  });
});
