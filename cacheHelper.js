var querystring = require('querystring');

var _ = require('lodash');
var Q = require('q');

var assert = require('./assert');

module.exports.computeCacheKey = function (queryOptions) {
  assert(queryOptions);

  var cacheKey = null;

  // only caching GET requests.
  if (queryOptions.cache &&
      queryOptions.cache.mode === 'fallback' &&
      queryOptions.cache.redis &&
      queryOptions.method === 'GET') {
    cacheKey = 'request:GET:'+queryOptions.uri;
    if (queryOptions.qs) {
      // ordering query string parameters, to limit cache invalidations
      cacheKey += '?' + querystring.stringify(_(queryOptions.qs).map((v, k) => [k, v]).sortBy(0).fromPairs().value());
    }
  }
  return cacheKey;
};

module.exports.saveBody = function (queryOptions, cacheKey, body) {
  assert(queryOptions);
  assert(cacheKey === null || typeof cacheKey === 'string');
  assert(!cacheKey || queryOptions.cache.redis);


  if (cacheKey) {
    // saving async
    setImmediate(function () {
      // saving body result in cache
      var cacheData = JSON.stringify({body: body});
      console.error('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: caching ' + cacheData + ' in ' + cacheKey);
      Q.ninvoke(queryOptions.cache.redis, 'set', cacheKey, cacheData)
        .then(function () {
          console.error('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: cache ok');
        }, function (redisError) {
          console.error('[ERROR]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: cannot cache result: ' + redisError.message);
        });
    });
  } else {
    console.error('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: cannot cache result');
  }
};

module.exports.readFromCache = function (queryOptions, cacheKey) {
  assert(queryOptions);
  assert(cacheKey === null || typeof cacheKey === 'string');
  assert(!cacheKey || queryOptions.cache.redis);

  return Q()
    .then(function () {
      if (!cacheKey) {
        throw new Error('cannot read from cache, no cacheKey => skip');
      }
      console.log('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: try to read from cacheKey='+cacheKey);
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
