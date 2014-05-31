'use strict';

var assert = require('assert');
var Promise = require('promise');
var utils = require('../utils.js');

// "symbols"
var collection = '_collection_' + Math.random();
var filter = '_filter_' + Math.random();

module.exports = FilteredStore;
function FilteredStore(innerStore, config) {
  Object.keys(config).forEach(function (name) {
    this[name] = (config[name] !== null && config[name] !== undefined) ?
      new FilteredCollection(innerStore[name], config[name]) :
      innerStore[name];
  }.bind(this));
}

function FilteredCollection(innerCollection, filterQuery) {
  this[collection] = innerCollection;
  this[filter] = filterQuery
}
FilteredCollection.prototype.find = function (query) {
  return Promise.resolve(null).then(function () {
    return this[collection].find(utils.mergeQuery(this[filter], query));
  }.bind(this)).then(null, function (err) {
    if (err.code === 'EMERGEQUERYISEMPTY') return [];
    else throw err;
  });
};
FilteredCollection.prototype.insert = function (item) {
  return Promise.resolve(null).then(function () {
    if (utils.isMatch(this[filter], item)) {
      return this[collection].insert(item);
    } else {
      throw new Error('You cannot insert this item as it does not match the filters');
    }
  }.bind(this));
};
FilteredCollection.prototype.update = function (query, key, value) {
  return Promise.resolve(null).then(function () {
    return this[collection].update(utils.mergeQuery(this[filter], query), key, value);
  }.bind(this)).then(null, function (err) {
    if (err.code === 'EMERGEQUERYISEMPTY') return 0;
    else throw err;
  });
};
FilteredCollection.prototype.remove = function (query) {
  return Promise.resolve(null).then(function () {
    return this[collection].remove(utils.mergeQuery(this[filter], query));
  }.bind(this)).then(null, function (err) {
    if (err.code === 'EMERGEQUERYISEMPTY') return 0;
    else throw err;
  });
};
