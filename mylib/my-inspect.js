var util = require('util');

var myOmit = require('./my-omit.js');

module.exports.inspect = function (obj) {
  try {
    // breakLength: Infinity is not functionnal in node 4.5 LTS
    return util.inspect(obj, { breakLength: Infinity }).replace(/\n/g, "");
  } catch (e) {
    // we do not want to break anything for an "inspect.."
    return 'cannot inspect: ' + e.message;
  }
};

module.exports.filter = function(depth) {
  return myOmit(this, ['inspect', 'filter', 'context.req', 'cache.redis', 'forwardedHeaders', 'forwardedProperty']);
};
