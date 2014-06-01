'use strict';

var assert = require('assert');
var Promise = require('promise');
var MemoryStore = require('../../lib/adapters/memory.js');
var SynchronousStore = require('../../lib/layers/synchronous.js');

var mem = new MemoryStore(['collection']);
var first = new SynchronousStore(mem);
var second = new SynchronousStore(mem);

var timeout = setTimeout(function () {
  throw new Error('layers/synchronous.js timed out');
}, 30000);

Promise.all([first.collection.ready, second.collection.ready]).then(function () {
  assert.deepEqual([], first.collection.find());
  assert.deepEqual([], second.collection.find());
  var added = first.collection.insert({value: 'itemA'});
  assert.deepEqual([{value: 'itemA'}], first.collection.find());
  return added;
}).then(function () {
  assert.deepEqual(['itemA'], first.collection.find().map(function (item) { return item.value; }));
  return mem.collection.find();
}).then(function (items) {
  assert.deepEqual(['itemA'], items.map(function (item) { return item.value; }));
}).done(function () {
  clearTimeout(timeout);
});
