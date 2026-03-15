/*global QUnit*/

import { MONOSACCHARIDE } from '../../js/reference_monosaccharides.js';

QUnit.module('MONOSACCHARIDE constants', {});

QUnit.test('MONOSACCHARIDE is frozen', function(assert) {
  assert.ok(Object.isFrozen(MONOSACCHARIDE), 'Object is frozen');
});

QUnit.test('MONOSACCHARIDE values match their keys (self-referential)', function(assert) {
  for (const [k, v] of Object.entries(MONOSACCHARIDE)) {
    assert.equal(v, k, `${k} value matches key`);
  }
});

QUnit.test('contains expected common monosaccharides', function(assert) {
  assert.equal(MONOSACCHARIDE.GlcNAc, 'GlcNAc', 'GlcNAc');
  assert.equal(MONOSACCHARIDE.GalNAc, 'GalNAc', 'GalNAc');
  assert.equal(MONOSACCHARIDE.Man, 'Man', 'Man');
  assert.equal(MONOSACCHARIDE.Fuc, 'Fuc', 'Fuc');
  assert.equal(MONOSACCHARIDE.NeuAc, 'NeuAc', 'NeuAc');
  assert.equal(MONOSACCHARIDE.NeuGc, 'NeuGc', 'NeuGc');
  assert.equal(MONOSACCHARIDE.GlcA, 'GlcA', 'GlcA');
});

QUnit.test('cannot add new properties to frozen object', function(assert) {
  'use strict';
  assert.throws(() => { MONOSACCHARIDE.Foo = 'Foo'; }, 'Cannot mutate frozen object');
});
