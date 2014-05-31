'use strict';

var assert = require('assert');
var Promise = require('promise');
var guid = require('guid').raw;
var utils = require('../utils.js');

module.exports = NetworkClientStore;
function NetworkClientStore(channel, collections, options) {
  assert(Array.isArray(collections), 'collections must be an array');
  collections.forEach(function (name) {
    this[name] = new NetworkClientCollection(name, channel, options);
  }.bind(this));
}

function NetworkClientCollection(name, channel, options) {
  this.pending = {};
  channel.on('data', function (message) {
    if (message.collection === name) {
      switch (message.action) {
        case 'reject':
        case 'resolve':
          if (this.pending[message.id]) {
            this.pending[message.id][message.action](message.value);
            delete this.pending[message.id];
          }
          break;
        case 'change':
          this.emitChange(message.change);
          break;
      }
    }
  }.bind(this));
  this.makeRequest = function (message) {
    return new Promise(function (resolve, reject) {
      message.id = guid();
      message.collection = name;
      var timeout = null;
      if ((options && options.timeout) !== Infinity) {
        timeout = setTimeout(function () {
          reject(new Error('Request timed out.'));
        }, (options && options.timeout) || 10000);
      }
      this.pending[message.id] = {
        resolve: function (res) {
          clearTimeout(timeout);
          resolve(res);
        },
        reject: function (err) {
          clearTimeout(timeout);
          if (typeof err === 'string') {
            reject(new Error(err));
          } else {
            reject(err);
          }
        }
      };
      channel.write(message);
    }.bind(this));
  };
}
NetworkClientCollection.prototype.find = function (query) {
  return this.makeRequest({
    action: 'find',
    query: query
  });
};
NetworkClientCollection.prototype.insert = function (item) {
  return this.makeRequest({
    action: 'insert',
    item: item
  });
};
NetworkClientCollection.prototype.update = function (query, key, value) {
  return this.makeRequest({
    action: 'update',
    query: query,
    key: key,
    value: value
  });
};
NetworkClientCollection.prototype.remove = function (query) {
  return this.makeRequest({
    action: 'remove',
    query: query
  });
};

utils.changeEmitter(NetworkClientCollection.prototype);
