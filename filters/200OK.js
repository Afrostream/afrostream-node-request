var log = require('../log.js');

module.exports = function (data) {
  var response = data[0]
    , body = data[1];

  if (response.statusCode !== 200) {
    log.error(this, response.statusCode + ' ' + JSON.stringify(body));
    var error = new Error(body && body.error || 'unknown');
    error.statusCode = response.statusCode || 500;
    throw error;
  }
  return data;
};
