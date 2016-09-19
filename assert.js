var assert = require('assert');

module.exports = (process.env.NODE_ENV === 'PRODUCTION') ? function () {} : assert;
