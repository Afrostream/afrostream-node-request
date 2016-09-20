# Description

wraper around request module, adds cache, filters, promise & headers fwding functionality  

default request are considered as JSON   
default timeout is 5000ms  

default promise behavior is :  
200OK => success  
network error, 3XX, 4XX, 5XX => error

# Usage

same usage as request library, but using promise return style

```js
var request = require('afrostream-node-request').create();
request("http://google.fr").then(
  function () { },
  function () { }
);
```

additional features: cache

```js
var request = require('afrostream-node-request').create();
request({uri:"http://google.fr", cache: {mode:"fallback",redis:redisClient}}).then(...)
```

# Features

## defaultQueryOptions

```js
var defaultQueryOptions = {
  param1: param2,
  ...
};
var request = require('afrostream-node-request').create(defaultQueryOptions);
```

## inputQueryOptions

```js
var request = require('afrostream-node-request').create();
var inputQueryOptions = { json: true, uri: 'http://whatever' }
request(inputQueryOptions);
```

## inputQueryOptions.token

inputQueryOptions.token is transfered as Header= Authorization: Bearer <token>

## inputQueryOptions.context

inputQueryOptions.context can contain :  
inputQueryOptions.context.req (req object)

## options

wording: options = _.merge({}, defaultQueryOptions, inputQueryOptions)

## options.forwardedHeaders (using inputQueryOptions.context.req)

options.forwardedHeaders are a { inputHeaderName: outputHeaderName} list of headers  
  forwarded from options.context.req

## Cache

```js
request({cache: options})  
```

options object:  
mode   string    [MANDATORY] fallback
redis  object    [MANDATORY]  redis client object backup, if not => in memory.

/!\ only caching method=GET requests
cache key is:  "request:GET:uri?qs=..."

```js
var request = require('afrostream-node-request');
request({uri:"http://google.fr", cache: "fallback", redis: redisClient}).then(...)
```

## fallback

fallback mode means the cache is only here to prevent "downtimes"
fallback mode read from cache on error (timeout / statusCode !== 200)
fallback mode save result in cache whenever 200ok is received.

```
cache: {
  "redis": redisClient,
  "mode": "fallback"
}
```

## cache

FIXME: not yet implemented.


# filter

```js
var filter = function (err, response, body) {
  if (err && err.statusCode >= 400 && err.statusCode <= 500) {
    return; // 4XX are not an error
  }
  return [err, response, body];
}
request({uri:"http://google.fr", filter: filter }).then(...)
```
