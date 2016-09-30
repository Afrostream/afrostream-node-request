var querystring = require('querystring');

var _ = require('lodash');
var Q = require('q');

var myAssert = require('./mylib/my-assert.js');

var log = require('./log.js');

module.exports.computeCacheKey = function (queryOptions) {
  myAssert(queryOptions);

  var cacheKey = null;

  // only caching GET requests.
  if (queryOptions.cache &&
      queryOptions.cache.mode === 'fallback' &&
      queryOptions.cache.redis &&
      queryOptions.method === 'GET') {
    cacheKey = 'request:GET:'+queryOptions.uri;
    if (queryOptions.qs) {
      // ordering query string parameters, to limit cache invalidations
      cacheKey += '?' + querystring.stringify(_(queryOptions.qs).map(function (v, k) { return [k, v]; }).sortBy(0).fromPairs().value());
    }
  }
  return cacheKey;
};

module.exports.saveBody = function (queryOptions, cacheKey, body) {
  myAssert(queryOptions);
  myAssert(cacheKey === null || typeof cacheKey === 'string');
  myAssert(!cacheKey || queryOptions.cache.redis);

  if (cacheKey) {
    // saving async
    setImmediate(function () {
      // saving body result in cache
      var cacheData = JSON.stringify({body: body});
      log.info(queryOptions, 'caching ' + cacheData + ' in ' + cacheKey);
      Q.ninvoke(queryOptions.cache.redis, 'set', cacheKey, cacheData)
        .then(function () {
          log.info(queryOptions, 'cache ok');
        }, function (redisError) {
          log.info(queryOptions, 'cannot cache result: ' + redisError.message);
        });
    });
  } else {
    if (queryOptions.debug) {
      log.debug(queryOptions, 'no cache active');
    }
  }
};

module.exports.readFromCache = function (queryOptions, cacheKey) {
  myAssert(queryOptions);
  myAssert(cacheKey === null || typeof cacheKey === 'string');
  myAssert(!cacheKey || queryOptions.cache.redis);

  return Q()
    .then(function () {
      if (!cacheKey) {
        throw new Error('cannot read from cache, no cacheKey => skip');
      }
      log.info(queryOptions, 'try to read from cacheKey='+cacheKey);
      return Q.ninvoke(queryOptions.cache.redis, 'get', cacheKey);
    })
    .then(function (cacheResult) {
      if (!cacheResult) {
        throw new Error('empty cache result');
      }
      cacheResult = JSON.parse(cacheResult);
      if (!cacheResult.body) {
        throw new Error('malformed cache result');
      }
      // generating fake response
      var fakeResponse = { statusCode: 200, fromCache: true };
      var cachedBody = cacheResult.body;
      return [
        fakeResponse,
        cachedBody
      ];
    });
  };
