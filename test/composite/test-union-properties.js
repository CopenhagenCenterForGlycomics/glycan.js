/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Sugar.union — structural invariants', {});

QUnit.test('union with empty is structurally identity (a.union(empty))', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const empty = new IupacSugar();
  const u = a.union(empty);
  assert.equal(u.composition().length, a.composition().length);
  assert.equal(u.root.identifier, a.root.identifier);
});

QUnit.test('union is commutative structurally', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const ab = a.union(b);
  const ba = b.union(a);
  assert.equal(ab.composition().length, ba.composition().length);
});

QUnit.test('union size is bounded below by max', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Fuc(a1-3)GlcNAc';
  const u = a.union(b);
  assert.ok(u.composition().length >= Math.max(a.composition().length, b.composition().length));
});

QUnit.test('union size is bounded above by sum', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Fuc(a1-3)GlcNAc';
  const u = a.union(b);
  assert.ok(u.composition().length <= a.composition().length + b.composition().length);
});

QUnit.test('union is associative structurally (|a.union(b).union(c)| = |a.union(b.union(c))|)', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const c = new IupacSugar(); c.sequence = 'Fuc(a1-3)[Gal(b1-4)]GlcNAc';
  const left  = a.union(b).union(c);
  const right = a.union(b.union(c));
  assert.equal(left.composition().length, right.composition().length);
});

QUnit.test('union of a with itself is structurally a', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const a2 = new IupacSugar(); a2.sequence = 'Gal(b1-4)GlcNAc';
  const u = a.union(a2);
  assert.equal(u.composition().length, a.composition().length);
});

QUnit.test('union refuses incompatible roots', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal';
  const b = new IupacSugar(); b.sequence = 'Glc';
  assert.throws(() => a.union(b), /incompatible roots/);
});
