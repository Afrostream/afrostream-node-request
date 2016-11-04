var request = require('request');
var Q = require('q');

var _ = require('lodash');

var cacheHelper = require('./cacheHelper.js');

var myInspect = require('./mylib/my-inspect.js').inspect;
var myInspectFilter = require('./mylib/my-inspect.js').filter;
var myOmit = require('./mylib/my-omit.js');
var myToLowerCaseKeys = require('./mylib/my-toLowerCaseKeys');

var log = require('./log.js');

var glRequestId = 0;

module.exports.filters = {
  tap: require('./filters/tap.js'),
  "200OK": require('./filters/200OK.js'),
  "200OKNotEmpty": require('./filters/200OKNotEmpty.js')
};

var fwdError = function (err) {
  var error = new Error(err.message);
  error.statusCode = err.statusCode || 500;
  throw error;
};

module.exports.create = function (defaultOptions) {
  // horrible hack, car _.merge() is messing up with redis object :gun:
  //  we omit redis cli & save it in "defaultRedis" custom var.
  var defaultRedis = defaultOptions && defaultOptions.cache && defaultOptions.cache.redis || null;
  defaultOptions = _.merge({}, {
    // properties
    name: 'AFR-REQUEST',     // default name.
    method: 'GET',
    json: true,
    timeout: 5000,
    forwardedProperty: { userIp: 'x-forwarded-user-ip' }, // params from options.context.req forwarded
    forwardedHeaders: {
      'cookie': 'cookie',
      'x-forwarded-user-agent': 'x-forwarded-user-agent', // first in list taken.
      'x-forwarded-user-ip': 'x-forwarded-user-ip',
      'User-Agent': 'x-forwarded-user-agent',
      'Content-Type': 'Content-Type'
    },
    filter: module.exports.filters["200OK"]
  }, myOmit(defaultOptions || {}, ['cache.redis', 'req']));
  //
  log.info(defaultOptions, 'defaultOptions=', JSON.stringify(defaultOptions));
  //
  return function (options) {
    var inputQueryOptions = options || {};      // options specific to this call.
    var defaultQueryOptions = defaultOptions;   // json, timeout, ...
    var computedQueryOptions = { headers: {} }; // headers forwarded to the backend
    var rewritedQueryOptions = {};              // uri, timeout
    var queryOptions = {};                      // result

    // cacheKey = 'request:GET:http://..../foo/bar?key=val&...'
    // cacheVal = JSON.stringify({headers:...,body:...})
    var cacheKey = null;

    if (inputQueryOptions.context && inputQueryOptions.context.req) {
      // forwardReqParams
      _.forEach(_.merge({}, defaultOptions.forwardedProperty, inputQueryOptions.forwardedProperty),
        function (outputHeaderName, paramName) {
          computedQueryOptions.headers[String(outputHeaderName).toLowerCase()] = inputQueryOptions.context.req[paramName];
        }
      );
      // forwardHeaders
      _.forEach(_.merge({}, myToLowerCaseKeys(defaultOptions.forwardedHeaders), myToLowerCaseKeys(inputQueryOptions.forwardedHeaders)),
        function (outputHeaderName, inputHeaderName) {
          // only set if empty.
          computedQueryOptions.headers[String(outputHeaderName).toLowerCase()] = computedQueryOptions.headers[String(outputHeaderName).toLowerCase()] || inputQueryOptions.context.req.get(inputHeaderName);
        }
      );
    }

    if (inputQueryOptions.token) {
      _.merge(computedQueryOptions, { headers: myToLowerCaseKeys({ Authorization: 'Bearer ' + inputQueryOptions.token }) });
    }

    // debug as query string
    if (inputQueryOptions.qs && inputQueryOptions.qs.DEBUG && inputQueryOptions.qs.DEBUG.indexOf('afrostream-node-request') !== -1) {
      computedQueryOptions.debug = true;
    }

    // timeout = null <=> rewrited to default timeout
    if (inputQueryOptions.timeout === null) {
      rewritedQueryOptions.timeout = defaultQueryOptions.timeout;
    }

    // HACK
    var inputRedis = inputQueryOptions.cache && inputQueryOptions.cache.redis || null;
    var redis = defaultRedis || inputRedis || null;

    // lowercasing all headers before merge
    defaultQueryOptions.headers = myToLowerCaseKeys(defaultQueryOptions.headers);
    computedQueryOptions.headers = myToLowerCaseKeys(computedQueryOptions.headers);
    inputQueryOptions.headers = myToLowerCaseKeys(inputQueryOptions.headers);
    rewritedQueryOptions.headers = myToLowerCaseKeys(rewritedQueryOptions.headers);

    // Maximum call stack size exceeded error <=> inputQueryOptions with infinite recursive object
    queryOptions = _.merge({}, defaultQueryOptions, computedQueryOptions, myOmit(inputQueryOptions, ['cache.redis', 'context.req']), rewritedQueryOptions);

    // adding redis to query options
    if (redis) {
      queryOptions.cache.redis = redis;
    }
    // adding requestId to query options
    queryOptions.requestId = ++glRequestId;
    // adding custom inspectFilter
    queryOptions.inspect = myInspectFilter;

    //
    cacheKey = cacheHelper.computeCacheKey(queryOptions);
    if (cacheKey) {
      log.info(queryOptions, 'using cache key='+cacheKey);
    }

    // logs
    if (queryOptions.debug) {
      log.debug(queryOptions, 'inputQueryOptions ' + myInspect(inputQueryOptions));
      log.debug(queryOptions, 'rewritedQueryOptions ' + myInspect(rewritedQueryOptions));
      log.debug(queryOptions, 'computedQueryOptions ' + myInspect(computedQueryOptions));
      log.debug(queryOptions, 'defaultQueryOptions ' + myInspect(defaultQueryOptions));
      log.debug(queryOptions, 'queryOptions ' + myInspect(queryOptions));
    }
    log.info(queryOptions, myInspect(queryOptions));

    return Q()
      .then(function () {
        // security. Avoid request "str.replace" is not a function...
        if (queryOptions.headers &&
            queryOptions.headers['content-type'] &&
            queryOptions.headers['content-type'] === 'application/x-www-form-urlencoded' &&
            typeof queryOptions.body !== 'string') {
          throw new Error('body must be a string when content-type = application/x-www-form-urlencoded')
        }
        // security, enforce body is null if method=GET
        if ((!queryOptions.method || queryOptions.method === 'GET') && queryOptions.body) {
          log.warn(queryOptions, 'body should be undefined when method=GET => overwriting body');
          queryOptions.body = undefined;
        }
        return Q.nfcall(request, queryOptions)
      })
      .then(function (data) {
        var response = data[0]
          , body = data[1];

        if (!response) {
          throw new Error('no response, body = ' + JSON.stringify(body));
        } else {
          log.info(queryOptions, 'response received, http.statusCode=' + response.statusCode);
        }
        // filtering result
        if (typeof queryOptions.filter === 'function') {
          return queryOptions.filter(data);
        }
        return data;
      }).then(function (data) {
        var response = data[0]
          , body = data[1];

          // async. doing this next tick.
          cacheHelper.saveBody(queryOptions, cacheKey, body);

          return data;
        }
      , function (err) {
          log.error(queryOptions, err.message + ' for ' + myInspect(queryOptions));
          //
          return cacheHelper.readFromCache(queryOptions, cacheKey)
            .then(function (data) {
              log.info(queryOptions, 'response read from cache cacheKey=' + cacheKey);
              return data;
            },
            function (cacheError) {
              log.error(queryOptions, 'cannot read from cache '+ cacheError.message);
              fwdError(err); // on forward l'erreur initiale
            });
      });
    };
};
