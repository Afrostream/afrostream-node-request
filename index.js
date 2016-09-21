var util = require('util');

var request = require('request');
var Q = require('q');

var _ = require('lodash');

var cacheHelper = require('./cacheHelper.js');

var myInspect = require('./mylib/my-inspect.js').inspect;
var myInspectFilter = require('./mylib/my-inspect.js').filter;
var myOmit = require('./mylib/my-omit.js');

var glRequestId = 0;

module.exports.filters = {
  tap: require('./filters/tap.js'),
  "200OK": require('./filters/200OK.js')
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
    method: 'GET',
    json: true,
    timeout: 5000,
    forwardedProperty: { userIp: 'x-forwarded-user-ip' }, // params from options.context.req forwarded
    forwardedHeaders: {
      'User-Agent': 'x-forwarded-user-agent',
      'x-forwarded-user-ip': 'x-forwarded-user-ip',
      'x-forwarded-user-agent': 'x-forwarded-user-agent',
      'Content-Type': 'Content-Type'
    },
    filter: module.exports.filters["200OK"]
  }, myOmit(defaultOptions || {}, ['cache.redis', 'req']]));

  console.log('[INFO]: [AFR-REQUEST]: defaultOptions=', JSON.stringify(defaultOptions));
  return function (options) {
    var inputQueryOptions = options || {};      // options specific to this call.
    var defaultQueryOptions = defaultOptions;   // json, timeout, ...
    var computedQueryOptions = {};              // headers forwarded to the backend
    var rewritedQueryOptions = {};              // uri
    var queryOptions = {};                      // result

    // cacheKey = 'request:GET:http://..../foo/bar?key=val&...'
    // cacheVal = JSON.stringify({headers:...,body:...})
    var cacheKey = null;

    if (inputQueryOptions.context && inputQueryOptions.context.req) {
      // forwardReqParams
      _.forEach(inputQueryOptions.forwardedProperty, function (paramName, outputHeaderName) {
        computedQueryOptions.headers[outputHeaderName] = inputQueryOptions.context.req[paramName];
      });
      // forwardHeaders
      _.forEach(inputQueryOptions.forwardedHeaders, function (inputHeaderName, outputHeaderName) {
        computedQueryOptions.headers[outputHeaderName] = inputQueryOptions.context.req.get(inputHeaderName);
      });
    }

    if (inputQueryOptions.token) {
      _.merge(computedQueryOptions, { headers: { Authorization: 'Bearer ' + inputQueryOptions.token } });
    }

    // HACK
    var inputRedis = inputQueryOptions.cache && inputQueryOptions.cache.redis || null;
    var redis = defaultRedis || inputRedis || null;

    queryOptions = _.merge({}, defaultQueryOptions, computedQueryOptions, myOmit(inputQueryOptions, ['cache.redis', 'req']]), rewritedQueryOptions);
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
      console.log('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: using cache key='+cacheKey);
    }

    // logs
    console.log('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: ' + myInspect(queryOptions));

    return Q.nfcall(request, queryOptions)
      .then(function (data) {
        var response = data[0]
          , body = data[1];

        if (!response) {
          throw new Error('no response, body = ' + JSON.stringify(body));
        } else {
          console.log('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: response received, http.statusCode=' + response.statusCode);
        }
        // filtering result
        if (typeof queryOptions.filter === 'function') {
          return queryOptions.filter(data)
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
          console.error('[ERROR]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: ' + err.message + ' for ' + myInspect(queryOptions));
          //
          return cacheHelper.readFromCache(queryOptions, cacheKey)
            .then(function (data) {
              console.log('[INFO]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: response read from cache cacheKey=' + cacheKey);
              return data;
            },
            function (cacheError) {
              console.error('[ERROR]: [AFR-REQUEST]: [REQUEST-'+queryOptions.requestId+']: cannot read from cache '+ cacheError.message);
              fwdError(err); // on forward l'erreur initiale
            });
      });
    };
};
