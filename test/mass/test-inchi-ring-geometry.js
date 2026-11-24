/*global QUnit*/

import { deriveAxialEquatorial, deriveHaworthOrientation, shapeNeedsMirrorFlip, parseCLayer, elementRanges, ringWalk } from '../../js/InChIRingGeometry.js';
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

QUnit.module('InChIRingGeometry - deriveHaworthOrientation', {});

// Textbook Haworth facts (standard reference orientation, ring O at back
// right, numbered clockwise): D-glucose is down/up/down at C2/C3/C4 with
// CH2OH up at C5 -- note this is NOT the same alternation as "all
// equatorial" would naively suggest; Haworth up/down is a different
// partition from axial/equatorial, flattening out the chair's alternating
// pucker.
QUnit.test('Glc: down, up, down, up (C2, C3, C4, C5/CH2OH)', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveHaworthOrientation(layers, t, 2), 'down', 'C2 down');
  assert.equal(deriveHaworthOrientation(layers, t, 3), 'up', 'C3 up');
  assert.equal(deriveHaworthOrientation(layers, t, 4), 'down', 'C4 down');
  assert.equal(deriveHaworthOrientation(layers, t, 5), 'up', 'C5 (CH2OH) up');
});

// Gal is the C4 epimer of Glc: only C4 flips (down -> up).
QUnit.test('Gal: down, up, up, up (C4 flipped vs Glc)', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveHaworthOrientation(layers, t, 2), 'down', 'C2 down');
  assert.equal(deriveHaworthOrientation(layers, t, 3), 'up', 'C3 up');
  assert.equal(deriveHaworthOrientation(layers, t, 4), 'up', 'C4 up (epimerised)');
  assert.equal(deriveHaworthOrientation(layers, t, 5), 'up', 'C5 (CH2OH) up');
});

// Man is the C2 epimer of Glc: only C2 flips (down -> up).
QUnit.test('Man: up, up, down, up (C2 flipped vs Glc)', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5+,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveHaworthOrientation(layers, t, 2), 'up', 'C2 up (epimerised)');
  assert.equal(deriveHaworthOrientation(layers, t, 3), 'up', 'C3 up');
  assert.equal(deriveHaworthOrientation(layers, t, 4), 'down', 'C4 down');
  assert.equal(deriveHaworthOrientation(layers, t, 5), 'up', 'C5 (CH2OH) up');
});

QUnit.module('InChIRingGeometry - shapeNeedsMirrorFlip', {});

// The /m-layer mirror flip that's correct for a plain hexose (Gal/Glc/Man,
// confirmed above) is NOT a universal rule -- it's specific to ring shapes
// where ring position 5's exocyclic substituent has further heavy-atom
// neighbors (CH2OH, COOH). A deoxyhexose's C5 bears a terminal CH3 instead,
// and does not need the flip at all; applying it anyway gives the exact
// inverse of the correct answer (caught by cross-checking Fuc, 6-deoxy-L-
// galactose, against D-galactose's own axial/equatorial pattern, which must
// match since that classification is invariant under D/L mirroring).
QUnit.test('plain hexose (Gal): needs the mirror flip', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1');
  assert.equal(shapeNeedsMirrorFlip(layers), true);
});

QUnit.test('deoxyhexose (Fuc): does NOT need the mirror flip', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3+,4+,5-,6?/m0/s1');
  assert.equal(shapeNeedsMirrorFlip(layers), false);
});

// Fuc and Rha (both 6-deoxyhexoses, both /m0) must derive DIFFERENT
// patterns from each other (they're different compounds: fucose is
// 6-deoxy-L-galactose, rhamnose is 6-deoxy-L-mannose), each matching its
// D-series counterpart's axial/equatorial pattern exactly -- not sharing
// one hardcoded string between them, and not inverted from it either.
QUnit.test('Fuc matches Gal\'s pattern; Rha matches Man\'s -- not inverted, not identical to each other', function(assert) {
  const fuc = parseInChI('InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3+,4+,5-,6?/m0/s1');
  const rha = parseInChI('InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3-,4+,5+,6?/m0/s1');
  const fucT = parseTLayer(fuc.t);
  const rhaT = parseTLayer(rha.t);

  // Gal: eq, eq, ax (C2, C3, C4) -- Fuc must match.
  assert.equal(deriveAxialEquatorial(fuc, fucT, 2), 'eq');
  assert.equal(deriveAxialEquatorial(fuc, fucT, 3), 'eq');
  assert.equal(deriveAxialEquatorial(fuc, fucT, 4), 'ax');

  // Man: ax, eq, eq (C2, C3, C4) -- Rha must match.
  assert.equal(deriveAxialEquatorial(rha, rhaT, 2), 'ax');
  assert.equal(deriveAxialEquatorial(rha, rhaT, 3), 'eq');
  assert.equal(deriveAxialEquatorial(rha, rhaT, 4), 'eq');
});

QUnit.module('InChIRingGeometry - dideoxyhexoses (3,6-dideoxyhexose ring shape)', {});

// Each 3,6-dideoxyhexose is a known parent hexose with C3 and C6 both
// deoxygenated -- removing those oxygens doesn't touch C2 or C4, so each
// one's C2/C4 axial/equatorial pattern must match its own parent's exactly
// (confirmed via each compound's own PubChem synonyms, e.g. "3,6-dideoxy-
// D-mannopyranose" for Tyvelose). This caught a real bug in the historical
// hardcoded terminii: it gave Tyvelose the same "2eq" as the other three,
// but Tyvelose is mannose-configured (ax at C2), not glucose-configured.
QUnit.test('Tyv matches Man (ax,eq) -- the historical override wrongly had it match Glc instead', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O4/c1-3-4(7)2-5(8)6(9)10-3/h3-9H,2H2,1H3/t3-,4+,5+,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'ax', 'C2 ax, matching D-mannose');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'eq', 'C4 eq, matching D-mannose');
});

QUnit.test('Abe matches Gal (eq,ax)', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O4/c1-3-4(7)2-5(8)6(9)10-3/h3-9H,2H2,1H3/t3-,4-,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq, matching D-galactose');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'ax', 'C4 ax, matching D-galactose');
});

QUnit.test('Par matches Glc (eq,eq)', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O4/c1-3-4(7)2-5(8)6(9)10-3/h3-9H,2H2,1H3/t3-,4+,5-,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq, matching D-glucose');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'eq', 'C4 eq, matching D-glucose');
});

QUnit.test('Col matches Gal (eq,ax) -- L-series, same pattern as Abe since ax/eq is D/L-invariant', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O4/c1-3-4(7)2-5(8)6(9)10-3/h3-9H,2H2,1H3/t3-,4-,5-,6?/m0/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 2), 'eq', 'C2 eq, matching D/L-galactose');
  assert.equal(deriveAxialEquatorial(layers, t, 4), 'ax', 'C4 ax, matching D/L-galactose');
});

QUnit.test('ring position 3 (the deoxy CH2) is not a stereocentre: null, not a guessed value', function(assert) {
  const layers = parseInChI('InChI=1S/C6H12O4/c1-3-4(7)2-5(8)6(9)10-3/h3-9H,2H2,1H3/t3-,4+,5+,6?/m1/s1');
  const t = parseTLayer(layers.t);
  assert.equal(deriveAxialEquatorial(layers, t, 3), null, 'no /t entry exists for a plain CH2, so nothing to derive');
});
