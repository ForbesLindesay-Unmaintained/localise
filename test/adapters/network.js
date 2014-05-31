'use strict';

var assert = require('assert');
var MemoryStore = require('../../lib/adapters/memory.js');
var NetworkClient = require('../../lib/adapters/network-client.js');
var NetworkServer = require('../../lib/layers/network-server.js');

var store = new MemoryStore(['collectionA', 'collectionB', 'collectionC']);
var server = new NetworkServer(store);
var client = new NetworkClient({
  on: server.on.bind(server),
  write: server.write.bind(server)
}, ['collectionA', 'collectionB', 'collectionC']);

var timeout = setTimeout(function () {
  throw new Error('adapters/network.js timed out');
}, 30000);

client.collectionA.find().then(function (items) {
  assert.deepEqual([], items);
  return client.collectionA.insert({value: 'itemA1'});
}).then(function () {
  return store.collectionA.find();
}).then(function (items) {
  assert.deepEqual(['itemA1'], items.map(function (item) { return item.value; }));
  return client.collectionA.find();
}).then(function (items) {
  assert.deepEqual(['itemA1'], items.map(function (item) { return item.value; }));
}).done(function () {
  clearTimeout(timeout);
});
