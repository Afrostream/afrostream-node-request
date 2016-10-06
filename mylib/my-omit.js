function rec(obj, paths, pk, depth, maxDepth) {
  // debug: console.log('REC : ', pk);
  var result;

  var f = function (result, obj, k) {
    var ck = pk + (pk?'.':'') + k;

    for (var i = 0; i < paths.length; ++i) {
      // debug: console.log(' -> ' + paths[i] + ' vs ' + ck);
      if (paths[i] === ck) {
        return; // omit
      }
    }

    if (typeof obj[k] === 'object' && obj[k]) {
      if (depth + 1 <= maxDepth) {
        result[k] = rec(obj[k], paths, ck, depth + 1, maxDepth);
      } else {
        result[k] = "<object too deep, max="+maxDepth+">";
      }
    } else {
      result[k] = obj[k];
    }
  };

  if (Array.isArray(obj)) {
    result = [];
    for (var k = 0; k < obj.length; ++k) {
      f(result, obj, k)
    }
  } else {
     result = {};
     Object.keys(obj).forEach(function (k) {
       f(result, obj, k);
     });
  }
  return result;
}

/**
 * usage: new object is a cloned one with missing omit params.
 * /!\ doesn't work with object keys containing dots
 *
 * FIXME: NON OPTIMISED: iterating on each paths for each key
 */
module.exports = function (obj, paths, maxDepth) {
  obj = obj || {};
  paths = ((typeof paths === 'string') ? [paths] : paths) || [];
  return rec(obj, paths, '', 1, maxDepth || Infinity);
}
