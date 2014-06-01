'use strict';

var assert = require('assert');
var guid = require('guid').raw;
var Promise = require('promise');
var utils = require('../utils.js');

// "symbols"
var items = '_items_' + Math.random();

module.exports = MemoryStore;
function MemoryStore(collections, options) {
  assert(Array.isArray(collections), 'collections must be an array');
  collections.forEach(function (name) {
    this[name] = new MemoryCollection(options);
  }.bind(this));
}

function MemoryCollection(options) {
  this.id = (options && options.id) || '_id';
  this[items] = [];
}
MemoryCollection.prototype.find = function (query) {
  return Promise.resolve(null).then(function () {
    return this[items].filter(function (item) {
      return utils.isMatch(query, item);
    });
  }.bind(this));
};
MemoryCollection.prototype.insert = function (item) {
  return Promise.resolve(null).then(function () {
    if (item[this.id] === undefined) item[this.id] = guid();
    assert(typeof item[this.id] === 'string' || typeof item[this.id] === 'number', 'Id must be a string or a number.');
    assert(!this[items].some(function (_item) { return _item[this.id] === item[this.id]; }.bind(this)), 'Duplicate id detected');
    this[items].push(item);
    this.emitChange({
      action: 'insert',
      item: item
    });
    return item;
  }.bind(this));
};
MemoryCollection.prototype.update = function (query, key, value) {
  return Promise.resolve(null).then(function () {
    var count = this[items].filter(function (item) {
      return utils.isMatch(query, item);
    }).reduce(function (count, match) {
      match[key] = value;
      return count + 1;
    }, 0);
    this.emitChange({
      action: 'update',
      query: query,
      key: key,
      value: value
    });
    return count;
  }.bind(this));
};
MemoryCollection.prototype.remove = function (query) {
  return Promise.resolve(null).then(function () {
    var before = this[items].length;
    this[items] = this[items].filter(function (item) {
      return !utils.isMatch(query, item);
    });
    this.emitChange({
      action: 'remove',
      query: query
    });
    return before - this[items].length;
  }.bind(this));
};

utils.changeEmitter(MemoryCollection.prototype);
