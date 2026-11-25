/*global QUnit*/

import { chairGeometry, chairStickEnd } from '../../js/Haworth/ChairLayout.js';

QUnit.module('ChairLayout - chairGeometry', {});

QUnit.test('6 ring vertices (5 carbons + the ring oxygen), front arc bold, back arc thin', function(assert) {
  const { vertices, bonds } = chairGeometry();
  assert.deepEqual(Object.keys(vertices).sort(), ['C1', 'C2', 'C3', 'C4', 'C5', 'O5'].sort());

  const widthOf = (from, to) => bonds.find((b) => b.from === from && b.to === to)?.width;
  // C1-C2-C3-C4 (front, nearer the viewer) bold; C4-C5-O5-C1 (back) thin --
  // C1 and C4 are the ring's own "flap" vertices, shared between both arcs.
  assert.equal(widthOf('C1', 'C2'), 'bold');
  assert.equal(widthOf('C2', 'C3'), 'bold');
  assert.equal(widthOf('C3', 'C4'), 'bold');
  assert.equal(widthOf('C4', 'C5'), 'thin');
  assert.equal(widthOf('C5', 'O5'), 'thin');
  assert.equal(widthOf('O5', 'C1'), 'thin');

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

QUnit.test('equatorial sticks at ADJACENT positions point in clearly different directions, not converging (the bug this geometry replaced an ad hoc "outward from ring center" heuristic over)', function(assert) {
  const { vertices } = chairGeometry();
  // C3 and C4 are adjacent ring carbons; both equatorial, opposite faces
  // (real chair alternation) -- their sticks must read as clearly
  // separate, not crowd into the same small region.
  const c3 = chairStickEnd(vertices, 3, 'up', 'eq');
  const c4 = chairStickEnd(vertices, 4, 'down', 'eq');
  const dist = Math.hypot(c3.x - c4.x, c3.y - c4.y);
  assert.ok(dist > 35, `C3/C4's equatorial stick endpoints are clearly separated (got ${dist.toFixed(1)}px apart)`);
});

QUnit.test('equatorial respects the same orientation face as axial would at that position', function(assert) {
  const { vertices } = chairGeometry();
  const up = chairStickEnd(vertices, 3, 'up', 'eq');
  const down = chairStickEnd(vertices, 3, 'down', 'eq');
  assert.ok(up.y < vertices.C3.y, '"up" equatorial still leans upward overall');
  assert.ok(down.y > vertices.C3.y, '"down" equatorial still leans downward overall');
});

QUnit.test('every position (1-5) and the exocyclic position-6 remap produce a real, finite stick endpoint', function(assert) {
  const { vertices } = chairGeometry();
  for (const position of [1, 2, 3, 4, 5, 6]) {
    for (const axEq of ['ax', 'eq']) {
      const end = chairStickEnd(vertices, position, 'up', axEq);
      assert.ok(Number.isFinite(end.x) && Number.isFinite(end.y), `position ${position} (${axEq}) is finite`);
    }
  }
  // Position 6 has no ring vertex of its own -- same remap onto C5 as
  // HaworthSVG.js's own vertexForPosition.
  const pos5 = chairStickEnd(vertices, 5, 'up', 'ax');
  const pos6 = chairStickEnd(vertices, 6, 'up', 'ax');
  assert.deepEqual(pos6, pos5, 'position 6 resolves to the same vertex (C5) as position 5');
});
