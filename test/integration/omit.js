'use strict';

var omit = require('../../mylib/my-omit.js');

var assert = require('better-assert');

describe('omit key in object... @#! lodash', function () {
  var o = {
    a: 42,
    b: 43,
    c: {
      a: 'nested',
      b: 'shouldn\'t be present',
      c: 'nested'
    },
    d : "ajiezaijea",
    e: {
      a: {
        b: 44,
        c: "42342",
        d: { "foo" : "bar"}
      }
    },
    f: [ ]
  };
  describe('testing omit', function () {
    it('should work fgs', function () {
      var obis = omit(o, 'c.b');
      assert(obis);
      assert(obis.a === 42);
      assert(obis.c.a === 'nested');
      assert(typeof obis.c.b === 'undefined');
      assert(Array.isArray(obis.f));
    });

    it('should work fgs (2)', function () {
      var obis = omit(o, 'e.a.c');
      assert(obis);
      assert(obis.a === 42);
      assert(obis.c.a === 'nested');
      assert(typeof obis.e.a.c === 'undefined');
      assert(obis.e.a.d.foo === 'bar');
      assert(Array.isArray(obis.f));
    });
  });
});
