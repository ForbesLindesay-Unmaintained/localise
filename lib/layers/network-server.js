'use strict';

var assert = require('assert');
var Promise = require('promise');

module.exports = NetworkServerStore;
function NetworkServerStore(innerStore) {
  this.innerStore = innerStore;
  this.handlers = [];
  this.dispose = Object.keys(innerStore).map(function (name) {
    return innerStore[name].onChange(function (change) {
      this.handlers.forEach(function (handler) {
        handler({
          collection: name,
          action: 'change',
          change: change
        });
      });
    }.bind(this));
  }.bind(this));
}

NetworkServerStore.prototype.on = function (name, fn) {
  assert(typeof name === 'string', 'Event name must be a string');
  assert(typeof fn === 'function', 'Event handler must be a function');
  assert(name === 'data', 'The only supported event is "data"');
  if (name === 'data') {
    this.handlers.push(fn);
  }
};

NetworkServerStore.prototype.write = function (data) {
  Promise.resolve(null).then(function () {
    switch (data.action) {
      case 'find':
        return this.innerStore[data.collection].find(data.query);
      case 'insert':
        return this.innerStore[data.collection].insert(data.item);
      case 'update':
        return this.innerStore[data.collection].update(data.query, data.key, data.value);
      case 'remove':
        return this.innerStore[data.collection].remove(data.query);
      default:
        throw new Error('Unrecognised action ' + data.action);
    }
  }.bind(this)).done(function (result) {
    this.handlers.forEach(function (handler) {
      handler({
        id: data.id,
        collection: data.collection,
        action: 'resolve',
        value: result
      });
    });
  }.bind(this), function (error) {
    this.handlers.forEach(function (handler) {
      handler({
        id: data.id,
        collection: data.collection,
        action: 'reject',
        value: error.message
      });
    });
  }.bind(this));
};

NetworkServerStore.prototype.end = function () {
  this.dispose.forEach(function (disposal) {
    disposal();
  });
  this.dispose = [];
  this.handlers = [];
};
