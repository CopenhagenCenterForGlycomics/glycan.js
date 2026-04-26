/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import { compose } from '../../js/Compositor';
import * as Composite from '../../js/Composite';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Sugar.union — edge cases', {});

QUnit.test('two residues at unknown linkage with same identifier merge', (assert) => {
  // Both have GlcNAc at unknown linkage on the root
  const a = new IupacSugar(); a.sequence = 'GlcNAc(b1-?)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'GlcNAc(b1-?)GlcNAc';
  const u = a.union(b);
  // Should merge into one — same identifier at unknown linkage
  assert.equal(u.composition().length, 2);
});

QUnit.test('two residues at unknown linkage with different identifiers both adopted', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-?)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Fuc(a1-?)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 3, 'root + Gal + Fuc');
  const ids = u.root.children.map(c => c.identifier).sort();
  assert.deepEqual(ids, ['Fuc', 'Gal']);
});

QUnit.test('sulfate child (HSO3) at linkage 6 is treated as a distinct branch', (assert) => {
  // GlcNAc6S is represented as GlcNAc with HSO3 child at linkage 6
  const a = new IupacSugar(); a.sequence = 'HSO3(1-6)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'GlcNAc';
  const u = a.union(b);
  // Union should contain the sulfate from a; root GlcNAc is shared
  assert.equal(u.root.identifier, 'GlcNAc');
  assert.ok(u.composition().some(r => r.identifier === 'HSO3'), 'sulfate preserved');
});

QUnit.test('sulfate is not merged with a non-sulfated sibling at same linkage', (assert) => {
  // a: GlcNAc with HSO3@6 and Gal@4; b: GlcNAc with Fuc@6 and Gal@4
  const a = new IupacSugar(); a.sequence = 'HSO3(1-6)[Gal(b1-4)]GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Fuc(a1-6)[Gal(b1-4)]GlcNAc';
  const u = a.union(b);
  // Gal@4 should merge (same); HSO3@6 and Fuc@6 are distinct → both adopted
  const root = u.root;
  const hasHSO3 = root.children.some(c => c.identifier === 'HSO3');
  const hasFuc  = root.children.some(c => c.identifier === 'Fuc');
  assert.ok(hasHSO3, 'HSO3 present');
  assert.ok(hasFuc,  'Fuc present');
  assert.equal(root.children.filter(c => c.identifier === 'Gal').length, 1, 'Gal merged once');
});

QUnit.test('anomer difference prevents merge when both are known', (assert) => {
  // α-Gal vs β-Gal at same linkage — different anomers, both known
  const a = new IupacSugar(); a.sequence = 'Gal(a1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(b1-4)GlcNAc';
  const u = a.union(b);
  // Both Gal should be present as separate residues
  assert.equal(u.root.children.filter(c => c.identifier === 'Gal').length, 2);
});

QUnit.test('unknown anomer u matches known anomer at root', (assert) => {
  // Root with unknown anomer should unify with known anomer
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Gal(u1-4)GlcNAc';
  // Should not throw — unknown anomer on root is treated as compatible
  assert.ok(a.union(b), 'union with unknown-anomer root succeeds');
  assert.equal(a.union(b).composition().length, 2);
});

QUnit.test('compose with single input: all residues have COUNT=1, SATURATION=1', (assert) => {
  const c = compose([
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 42 },
  ], { SugarClass: IupacSugar });

  for (const res of c.composition()) {
    assert.equal(res.getTag(Composite.COUNT), 1);
    const sat = res.getTag(Composite.SATURATION);
    assert.ok(sat && Math.abs(sat.default - 1.0) < 1e-9, `${res.identifier} saturation is 1`);
  }
});

QUnit.test('compose with zero inputs returns empty composite', (assert) => {
  const c = compose([], { SugarClass: IupacSugar });
  assert.notOk(c.root, 'root is null');
  assert.equal(c.composition().length, 0);
});

QUnit.test('deeply nested subtrees are fully adopted', (assert) => {
  const a = new IupacSugar(); a.sequence = 'GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  const u = a.union(b);
  assert.equal(u.composition().length, 3, 'NeuAc+Gal subtree fully adopted');
  const gal = u.root.children.find(c => c.identifier === 'Gal');
  assert.ok(gal, 'Gal present');
  assert.equal(gal.children[0].identifier, 'NeuAc', 'NeuAc child of Gal');
});
