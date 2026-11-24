/*global QUnit*/

import { deriveAxialEquatorial, parseCLayer, elementRanges, ringWalk } from '../../js/InChIRingGeometry.js';
import { parseInChI, parseTLayer } from '../../js/InChITerminii.js';

QUnit.module('InChIRingGeometry - parsing', {});

QUnit.test('parseCLayer builds adjacency from a branched connection table', function(assert) {
  const adj = parseCLayer('7-1-2-3(8)4(9)5(10)6(11)12-2');
  assert.ok(adj.get(1).has(7), '1-7 bonded');
  assert.ok(adj.get(1).has(2), '1-2 bonded');
  assert.ok(adj.get(3).has(8), 'branch 3-8 bonded');
  assert.ok(adj.get(12).has(2), 'ring closure 12-2 bonded');
});

QUnit.test('elementRanges orders C then N then O', function(assert) {
  const ranges = elementRanges('C8H15NO6');
  assert.deepEqual([...ranges.get('C')], [1, 2, 3, 4, 5, 6, 7, 8], 'carbons 1-8');
  assert.deepEqual([...ranges.get('N')], [9], 'nitrogen 9');
  assert.deepEqual([...ranges.get('O')], [10, 11, 12, 13, 14, 15], 'oxygens 10-15');
});

QUnit.module('InChIRingGeometry - ring walk', {});

QUnit.test('identifies the anomeric carbon by its exocyclic oxygen, walks C1..C5', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1');
  const walk = ringWalk(layers);
  assert.equal(walk.order.length, 6, 'six ring atoms (5C + O)');
  assert.equal(walk.order[0], 6, 'anomeric carbon identified by connectivity, not a fixed index');
});

QUnit.module('InChIRingGeometry - deriveAxialEquatorial', {});

// Glc: all-equatorial at C2/C3/C4 (the textbook "all-equatorial hexose")
QUnit.test('Glc: eq at C2 and C4', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'eq', 'C4 eq');
});

// Gal: C4 epimer of Glc -> axial at C4
QUnit.test('Gal: ax at C4', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'ax', 'C4 ax');
});

// Man: C2 epimer of Glc -> axial at C2
QUnit.test('Man: ax at C2', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5+,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'ax', 'C2 ax');
});

// GlcA: a hexuronic acid has a different canonical atom-numbering shape
// than a plain hexose (the exocyclic COOH vs CH2OH shifts which atom is
// which ring position) -- this is the case that exposed the original bug.
QUnit.test('GlcA: eq at C2/C3/C4 despite a different ring atom-numbering shape than Glc', function(assert) {
  const layers = parseInChI('InChI=1S/C6H10O7/c7-1-2(8)4(5(10)11)13-6(12)3(1)9/h1-4,6-9,12H,(H,10,11)/t1-,2-,3+,4-,6?/m0/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq');
  assert.equal(deriveAxialEquatorial(layers, t, 3), 'eq', 'C3 eq');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'eq', 'C4 eq (matches Glc; GlcA is just C6-oxidised Glc)');
});

// IdoA shares GlcA's connectivity shape but is L-series (/m0 vs Glc's /m1
// is independent of this -- both GlcA and IdoA are /m0 here); the /m-driven
// mirror flip must still land on the chemically correct answer.
QUnit.test('IdoA: eq at C2/C3/C4', function(assert) {
  const layers = parseInChI('InChI=1S/C6H10O7/c7-1-2(8)4(5(10)11)13-6(12)3(1)9/h1-4,6-9,12H,(H,10,11)/t1-,2-,3+,4+,6?/m0/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq');
  assert.equal(deriveAxialEquatorial(layers, t, 3), 'eq', 'C3 eq');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'eq', 'C4 eq');
});

QUnit.test('returns null for an undefined (not just unknown-sign) stereocentre', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 1), null, 'anomeric center (6?) is undefined, not derivable');
});
