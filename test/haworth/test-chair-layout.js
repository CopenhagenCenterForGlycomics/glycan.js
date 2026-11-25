/*global QUnit*/

import { chairGeometry, chairStickEnd, substituentZSignFor } from '../../js/Haworth/ChairLayout.js';

QUnit.module('ChairLayout - chairGeometry', {});

QUnit.test('6 ring vertices (5 carbons + the ring oxygen), front arc bold, back arc thin', function(assert) {
  const { vertices, bonds } = chairGeometry();
  assert.deepEqual(Object.keys(vertices).sort(), ['C1', 'C2', 'C3', 'C4', 'C5', 'O5'].sort());

  const widthOf = (from, to) => bonds.find((b) => b.from === from && b.to === to)?.width;
  // C1-C2-C3-C4 (front, nearer the viewer) bold; C4-C5-O5-C1 (back) thin --
  // C1 and C4 are shared between both arcs.
  assert.equal(widthOf('O5', 'C1'), 'thin');
  assert.equal(widthOf('C1', 'C2'), 'bold');
  assert.equal(widthOf('C2', 'C3'), 'medium', 'C2-C3 tapers very slightly relative to the two bold corners either side of it');
  assert.equal(widthOf('C3', 'C4'), 'bold');
  assert.equal(widthOf('C4', 'C5'), 'thin');
  assert.equal(widthOf('C5', 'O5'), 'thin');

  // Every bond is uniform-width (never tapered the way ringGeometry's own
  // hexose front face is) -- a chair's front/back split is a real,
  // per-edge fact, not a fading perspective cue.
  for (const bond of bonds) {
    assert.ok('width' in bond && !('widthFrom' in bond), `${bond.from}-${bond.to} is a plain uniform-width bond`);
  }
});

QUnit.module('ChairLayout - chairStickEnd', {});

QUnit.test('axial is a pure vertical stick, same up/down convention as Haworth', function(assert) {
  const { vertices } = chairGeometry();
  const up = chairStickEnd(vertices, 2, 'up', 'ax');
  const down = chairStickEnd(vertices, 2, 'down', 'ax');
  assert.equal(up.x, vertices.C2.x, 'no horizontal component');
  assert.equal(down.x, vertices.C2.x, 'no horizontal component');
  assert.ok(up.y < vertices.C2.y, '"up" extends upward (negative dy)');
  assert.ok(down.y > vertices.C2.y, '"down" extends downward (positive dy)');
});

// For 'eq', a single ring position's own tetrahedral direction is already
// fully fixed by its two ring-bond neighbours -- no independent up/down
// CHOICE left at that one position (unlike axial, which Haworth's own
// up/down convention drives directly). The one real degree of freedom is
// `zSign` -- which overall pucker handedness this RESIDUE needs (see
// substituentZSignFor's own docstring) -- resolved once per residue, not
// per position; these tests fix it explicitly rather than deriving it,
// to isolate what they're actually checking.

function distanceFromOrigin(p) {
  return Math.hypot(p.x, p.y);
}

QUnit.test('equatorial points OUTWARD from the ring, not into it, at every real position', function(assert) {
  const { vertices } = chairGeometry();
  // The actual bug report this guards against: an earlier version could
  // satisfy a position's required up/down face only by also flipping its
  // horizontal lean, since negating a real tetrahedral direction flips
  // both together -- landing some sticks pointing into the ring instead
  // of away from it. Checked here as "the stick end is farther from the
  // ring's own center than the bare vertex is", for every position and
  // both zSign choices (a real molecule could need either).
  for (const zSign of [1, -1]) {
    for (const position of [1, 2, 3, 4, 5]) {
      const vertex = vertices[`C${position}`];
      const end = chairStickEnd(vertices, position, 'up', 'eq', zSign);
      assert.ok(
        distanceFromOrigin(end) > distanceFromOrigin(vertex),
        `position ${position} (zSign=${zSign}) points outward, away from the ring center`
      );
    }
  }
});

QUnit.test('equatorial sticks at ADJACENT positions point in clearly different directions, not converging', function(assert) {
  const { vertices } = chairGeometry();
  // C3 and C4 are adjacent ring carbons -- their outward leans must read
  // as clearly separate, not crowd into the same small region (the
  // original "pretty bad chair" report: a hand-tuned outward
  // approximation had no real geometric relationship between
  // neighbours' own leans).
  const c3 = chairStickEnd(vertices, 3, 'up', 'eq', 1);
  const c4 = chairStickEnd(vertices, 4, 'up', 'eq', 1);
  const dist = Math.hypot(c3.x - c4.x, c3.y - c4.y);
  assert.ok(dist > 35, `C3/C4's equatorial stick endpoints are clearly separated (got ${dist.toFixed(1)}px apart)`);
});

QUnit.test('the two zSign choices give genuinely different directions at the same position', function(assert) {
  const { vertices } = chairGeometry();
  const plain = chairStickEnd(vertices, 3, 'up', 'eq', 1);
  const flipped = chairStickEnd(vertices, 3, 'up', 'eq', -1);
  // Not simply each other's negation (a real tetrahedral direction, not a
  // mirrored vector -- see substituentZSignFor's own docstring on why
  // that distinction matters), but a different real direction -- which
  // zSign a given residue actually needs is exercised end to end in
  // test-chair-svg.js's own Fuc regression test instead (a real molecule
  // with both axial and equatorial positions).
  const dist = Math.hypot(plain.x - flipped.x, plain.y - flipped.y);
  assert.ok(dist > 1, 'zSign actually changes the resulting direction');
});

QUnit.test('every position (1-5) and the exocyclic position-6 remap produce a real, finite stick endpoint', function(assert) {
  const { vertices } = chairGeometry();
  for (const position of [1, 2, 3, 4, 5, 6]) {
    for (const axEq of ['ax', 'eq']) {
      const end = chairStickEnd(vertices, position, 'up', axEq, 1);
      assert.ok(Number.isFinite(end.x) && Number.isFinite(end.y), `position ${position} (${axEq}) is finite`);
    }
  }
  // Position 6 has no ring vertex of its own -- same remap onto C5 as
  // HaworthSVG.js's own vertexForPosition.
  const pos5 = chairStickEnd(vertices, 5, 'up', 'ax', 1);
  const pos6 = chairStickEnd(vertices, 6, 'up', 'ax', 1);
  assert.deepEqual(pos6, pos5, 'position 6 resolves to the same vertex (C5) as position 5');
});

QUnit.module('ChairLayout - substituentZSignFor', {});

QUnit.test('flips between the two zSign choices depending on the reference orientation, for both ax and eq references', function(assert) {
  // A chair ring is rigid -- one residue has exactly one real zSign,
  // resolved from any single real substituent's own (position,
  // orientation, axEq). Flipping the reference's `orientation` (the one
  // thing that distinguishes two residues that are otherwise the same
  // shape, e.g. true D/L enantiomers) must flip the result.
  assert.notEqual(substituentZSignFor(2, 'up', 'ax'), substituentZSignFor(2, 'down', 'ax'));
  assert.notEqual(substituentZSignFor(3, 'up', 'eq'), substituentZSignFor(3, 'down', 'eq'));
});
