// from: http://stackoverflow.com/questions/12539574/whats-the-best-way-most-efficient-to-turn-all-the-keys-of-an-object-to-lower
module.exports = function (obj) {
  // security
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  // code
  var key, keys = Object.keys(obj);
  var n = keys.length;
  var newobj={}

  while (n--) {
    key = keys[n];
    newobj[key.toLowerCase()] = obj[key];
  }
  return newobj;
}
