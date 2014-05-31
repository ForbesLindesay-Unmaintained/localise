'use strict';

// "symbols"
var listeners = '_listeners_' + Math.random();

exports.isMatch = function (query, obj) {
  if (query && typeof query === 'object') {
    if (!obj || typeof obj !== 'object') return false;
    var keys = Object.keys(query);
    return keys.every(function (key) {
      return exports.isMatch(query[key], obj[key]);
    });
  } else if (query === null || query === undefined) {
    return true;
  } else {
    return query === obj;
  }
};

exports.mergeQuery = function (first, second) {
  if (first === undefined || first === null) return second;
  if (second === undefined || second === null) return first;

  if (typeof first === 'object' && typeof second === 'object') {
    var result = {};
    var keys = Object.keys(first);
    keys = keys.concat(Object.keys(second).filter(function (key) {
      return keys.indexOf(key) === -1;
    }));
    keys.forEach(function (key) {
      result[key] = exports.mergeQuery(first[key], second[key]);
    });
    return result;
  } else {
    if (first === second) {
      return first;
    } else {
      var err = new Error('The queries are incompatible so they will return the empty set');
      err.code = 'EMERGEQUERYISEMPTY';
      return err;
    }
  }
};


exports.changeEmitter = function (proto) {
  proto.emitChange = function (change) {
    if (!this[listeners]) return;
    assert(Array.isArray(this[listeners]), 'this[listeners] must be an array.');
    this[listeners].forEach(function (listener) {
      listener(change);
    });
  };
  proto.onChange = function (handler) {
    if (!this[listeners]) this[listeners] = [];
    assert(typeof handler === 'function');
    assert(Array.isArray(this[listeners]), 'this[listeners] must be an array.');
    function _handler(change) {
      handler(change);
    }
    this[listeners].push(_handler);
    return function dispose() {
      assert(Array.isArray(this[listeners]), 'this[listeners] must be an array.');
      this[listeners] = this[listeners].filter(function (handler) {
        return handler !== _handler;
      });
    }.bind(this);
  };
};
