/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Sugar.union — basic cases', {});

QUnit.test('union of identical disaccharides is structurally identical', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(b1-4)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 2);
  assert.equal(u.root.identifier, 'GlcNAc');
  assert.equal(u.root.children[0].identifier, 'Gal');
});

QUnit.test('union adds new residue from right side', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 3);
  const gal = u.root.children.find(c => c.identifier === 'Gal');
  assert.ok(gal, 'Gal present');
  assert.equal(gal.children[0].identifier, 'NeuAc');
});

QUnit.test('union adds new branch from left side', (assert) => {
  const a = new IupacSugar(); a.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(b1-4)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 3);
});

QUnit.test('union of two branching disaccharides includes all branches', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-3)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(b1-4)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 3, 'root + two Gal at different linkages');
  const gals = u.root.children.filter(c => c.identifier === 'Gal');
  assert.equal(gals.length, 2);
});

QUnit.test('union does not mutate inputs', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  a.freeze(); b.freeze();
  // Frozen inputs must not be mutated — union should complete without throwing
  const u = a.union(b);
  assert.ok(u, 'union returns a result');
  assert.equal(u.composition().length, 3, 'union has correct size');
});

QUnit.test('union throws on incompatible roots', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal';
  const b = new IupacSugar(); b.sequence = 'Glc';
  assert.throws(() => a.union(b), /incompatible roots/);
});

QUnit.test('onMerge callback is called for matching residues', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(b1-4)GlcNAc';
  const calls = [];
  a.union(b, {
    onMerge: (composite, source, idx) => calls.push([composite.identifier, idx]),
  });
  // root + child, each from two sources
  assert.equal(calls.length, 4);
  assert.ok(calls.some(([,idx]) => idx === 0));
  assert.ok(calls.some(([,idx]) => idx === 1));
});

QUnit.test('onAdopt callback is called for unmatched residues', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const adopted = [];
  a.union(b, {
    onAdopt: (composite, source, idx) => adopted.push([composite.identifier, idx]),
  });
  assert.ok(adopted.some(([id]) => id === 'NeuAc'), 'NeuAc adopted from right');
});
