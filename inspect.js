var util = require('util');

var omit = require('./omit');

module.exports.inspect = function (obj) {
  // breakLength: Infinity is not functionnal in node 4.5 LTS
  return util.inspect(obj, { breakLength: Infinity }).replace(/\n/g, "");
};

module.exports.filter = function(depth) {
  return omit(this, ['inspect', 'filter', 'context.req', 'cache.redis', 'forwardedHeaders', 'forwardedProperty']);
};
