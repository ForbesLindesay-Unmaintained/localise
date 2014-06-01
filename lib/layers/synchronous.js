'use strict';

var assert = require('assert');
var guid = require('guid').raw;
var Promise = require('promise');
var utils = require('../utils.js');

// "symbols"
var items = '_items_' + Math.random();
var inner = '_inner_' + Math.random();
var error = '_error_' + Math.random();

module.exports = SynchronousStore;
function SynchronousStore(innerStore) {
  Object.keys(innerStore).forEach(function (name) {
    this[name] = new SynchronousCollection(innerStore[name]);
  }.bind(this));
}

function SynchronousCollection(innerCollection) {
  this[inner] = innerCollection;
  this[items] = [];
  this.refresh();
}
SynchronousCollection.prototype.refresh = function () {
  this[error] = null;
  var result = this[inner].find().then(function (_items) {
    this[items] = _items;
  }.bind(this));
  this.ready = result.then(null, function (err) {
    this[error] = err;
  }.bind(this));
  this.ready.done();
  return result;
};
SynchronousCollection.prototype.find = function (query) {
  if (this[error] !== null) {
    var err = this[error];
    this.refresh();
    throw err;
  }
  return this[items].filter(function (item) {
    return utils.isMatch(query, item);
  });
};
SynchronousCollection.prototype.insert = function (item) {
  this[items].push(item);
  return this[inner].insert(item).then(function (realItem) {
    // copy any generated id across
    Object.keys(realItem).forEach(function (key) {
      if (typeof realItem[key] === 'string' || typeof realItem[key] === 'number') {
        item[key] = realItem[key];
      }
    });
  }, function (err) {
    // insert failed so we must revert it
    var index = this[items].indexOf(item);
    assert(index !== -1, 'The item was never even added to the local array.');
    this[items].splice(index, 1);
    throw err;
  });
};
SynchronousCollection.prototype.update = function (query, key, value) {
  var count = this[items].filter(function (item) {
    return utils.isMatch(query, item);
  }).reduce(function (count, match) {
    match[key] = value;
    return count + 1;
  }, 0);

  return this[inner].update(query, key, value).then(function (realCount) {
    assert(realCount === count, 'The asynchronous store must update the same number of rows as the local store');
    return count;
  }).then(null, function (err) {
    this.refresh();
    throw err;
  }.bind(this));
};
SynchronousCollection.prototype.remove = function (query) {
  var before = this[items].length;
  this[items] = this[items].filter(function (item) {
    return !utils.isMatch(query, item);
  });
  this.emitChange({
    action: 'remove',
    query: query
  });
  var count = before - this[items].length;

  return this[inner].remove(query).then(function (realCount) {
    assert(realCount === count, 'The asynchronous store must remove the same number of rows as the local store');
    return count;
  }).then(null, function (err) {
    this.refresh();
    throw err;
  }.bind(this));
};
