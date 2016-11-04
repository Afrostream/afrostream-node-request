var log = function () {
  var args = Array.prototype.slice.call(arguments);
  var level = args.shift();
  var options = args.shift();

  args.unshift('[' + level + ']: [' + options.name + ']: [REQUEST-'+ (options.requestId || '?') +']: ');
  switch (level) {
    case 'ERROR':
      console.error.apply(console, args);
      break;
    case 'WARNING':
      console.warn.apply(console, args);
      break;
    case 'DEBUG':
    case 'INFO':
    default:
      console.log.apply(console, args);
      break;
  }
};

module.exports = {
  debug: function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('DEBUG');
    log.apply(null, args);
  },
  info:function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('INFO');
    log.apply(null, args);
  },
  warn:function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('WARNING');
    log.apply(null, args);
  },
  error:function () {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('ERROR');
    log.apply(null, args);
  }
};
