'use strict';

var assert = require('assert');
var guid = require('guid').raw;
var Promise = require('promise');
var utils = require('../utils.js');

// "symbols"
var inner = '_inner_' + Math.random();
var items = '_items_' + Math.random();

function CachedStore(innerStore, collections) {
  if (Array.isArray(collections)) {
    Object.keys(innerStore).forEach(function (name) {
      this[name] = collections.indexOf(name) !== -1 ? new CachedCollection(innerStore[name]) : innerStore[name];
    }.bind(this));
    collections.forEach(function (name) {
      assert(this[name] instanceof CachedCollection, 'Cannot cache the collection ' + name + ' because it does not exist.');
    });
  }
}

function CachedCollection(innerCollection) {
  this[inner] = innerCollection;
  this[items] = this[inner].find();
  this[inner].onChange(function (change) {
    this[items] = this[items].then(function (items) {
      if (change.action === 'insert') {
        items.push(change.item);
        return items;
      } else if (change.action === 'update') {
        items.forEach(function (item) {
          if (utils.isMatch(change.query, item)) {
            item[change.key] = change.value;
          }
        });
        return items;
      } else if (change.action === 'remove') {
        return items.filter(function (item) {
          return utils.isMatch(change.query, item);
        });
      }
    });
  }.bind(this));
}
CachedCollection.prototype.find = function (query) {
  return this[items].then(null, function (err) {
    return this[items] = this[inner].find();
  }.bind(this)).then(function (items) {
    return items.filter(function (item) {
      return utils.isMatch(query, item);
    });
  }.bind(this));
};
Collection.prototype.insert = function (item) {
  return this[inner].insert(item);
};
Collection.prototype.update = function (query, key, value) {
  return this[inner].update(query, key, value);
};
Collection.prototype.remove = function (query) {
  return this[inner].remove(query);
});
