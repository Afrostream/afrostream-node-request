function rec(obj, paths, pk) {
  // debug: console.log('REC : ', pk);
  var result = {};

  Object.keys(obj).forEach(function (k) {
    var ck = pk + (pk?'.':'') + k;

    for (var i = 0; i < paths.length; ++i) {
      // debug: console.log(' -> ' + paths[i] + ' vs ' + ck);
      if (paths[i] === ck) {
        return; // omit
      }
    }
    if (typeof obj[k] === 'object' && obj[k]) {
      result[k] = rec(obj[k], paths, ck);
    } else {
      result[k] = obj[k];
    }
  });
  return result;
}

/**
 * usage: new object is a cloned one with missing omit params.
 * /!\ doesn't work with object keys containing dots
 *
 * FIXME: NON OPTIMISED: iterating on each paths for each key
 */
module.exports = function (obj, paths) {
  obj = obj || {};
  paths = ((typeof paths === 'string') ? [paths] : paths) || [];
  return rec(obj, paths, '');
}
