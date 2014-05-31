'use strict';

var assert = require('assert');
var Promise = require('promise');
var MemoryStore = require('../../lib/adapters/memory.js');
var FilteredStore = require('../../lib/layers/filtered.js');

var mem = new MemoryStore(['collectionA', 'collectionB', 'collectionC']);
var fil = new FilteredStore(mem, {
  collectionA: null,
  collectionB: {safe: true}
});

var timeout = setTimeout(function () {
  throw new Error('layers/filtered.js timed out');
}, 30000);

var initialData = Promise.all([
  mem.collectionA.insert({value: 'itemA1'}),
  mem.collectionA.insert({value: 'itemA2'}),
  mem.collectionB.insert({value: 'itemB1'}),
  mem.collectionB.insert({value: 'itemB2', safe: true}),
  mem.collectionC.insert({value: 'itemC1'}),
  mem.collectionC.insert({value: 'itemC2'})
]);

assert(fil.collectionC === undefined);
initialData.then(function () {
  return fil.collectionA.find().then(function (items) {
    assert.deepEqual(['itemA1','itemA2'], items.map(function (item) { return item.value; }));
    return fil.collectionB.find()
  }).then(function (items) {
    assert.deepEqual(['itemB2'], items.map(function (item) { return item.value; }));
    return Promise.all([
      fil.collectionA.insert({value: 'itemA3'}),
      fil.collectionB.insert({value: 'itemB3'}).then(function () {
        throw new Error('this insert should fail');
      }, function (err) {
        assert(err instanceof Error);
      }),
      fil.collectionB.insert({value: 'itemB4', safe: true})
    ]);
  }).then(function () {
    return fil.collectionA.find();
  }).then(function (items) {
    assert.deepEqual(['itemA1','itemA2', 'itemA3'], items.map(function (item) { return item.value; }));
    return fil.collectionB.find()
  }).then(function (items) {
    assert.deepEqual(['itemB2', 'itemB4'], items.map(function (item) { return item.value; }));
    return mem.collectionA.find();
  }).then(function (items) {
    assert.deepEqual(['itemA1','itemA2', 'itemA3'], items.map(function (item) { return item.value; }));
    return mem.collectionB.find()
  }).then(function (items) {
    assert.deepEqual(['itemB1', 'itemB2', 'itemB4'], items.map(function (item) { return item.value; }));
    return Promise.all([
      fil.collectionB.update({value: 'itemB1'}, 'value', 'itemB1-updated'), // fails
      fil.collectionB.update({value: 'itemB2'}, 'value', 'itemB2-updated')  // succceeds
    ]);
  }).then(function () {
    return mem.collectionB.find()
  }).then(function (items) {
    assert.deepEqual(['itemB1', 'itemB2-updated', 'itemB4'], items.map(function (item) { return item.value; }));
    return Promise.all([
      fil.collectionB.remove({value: 'itemB1'}), // fails
      fil.collectionB.remove({value: 'itemB2-updated'})  // succceeds
    ]);
  }).then(function () {
    return mem.collectionB.find()
  }).then(function (items) {
    assert.deepEqual(['itemB1', 'itemB4'], items.map(function (item) { return item.value; }));
  });
}).done(function () {
  clearTimeout(timeout);
});
