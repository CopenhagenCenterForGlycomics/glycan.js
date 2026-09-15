/*global QUnit*/
'use strict';

import {
  mulberry32,
  hashSeed,
  stringHash,
  circlePoints,
  hatchLines,
  shadedRings,
  latitudeBands,
  longitudeBands,
  woodgrainLines,
  variableWidthOutline
} from '../../js/Fiziko/fizikoTextures';

QUnit.module('Test fiziko texture generators', {
});

QUnit.test('mulberry32 is deterministic for a given seed', function(assert) {
  const a = mulberry32(42);
  const b = mulberry32(42);
  const seqA = [a(), a(), a()];
  const seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
});

QUnit.test('mulberry32 differs across seeds', function(assert) {
  const a = mulberry32(1)();
  const b = mulberry32(2)();
  assert.notEqual(a, b);
});

QUnit.test('hashSeed and stringHash are stable for the same input', function(assert) {
  assert.equal(hashSeed(1, 2, 3), hashSeed(1, 2, 3));
  assert.equal(stringHash('#gal'), stringHash('#gal'));
  assert.notEqual(hashSeed(1, 2, 3), hashSeed(3, 2, 1));
});

QUnit.test('circlePoints stays on the circle', function(assert) {
  const points = circlePoints({ cx: 10, cy: 20 }, 5, 16);
  assert.equal(points.length, 16);
  for (const [x, y] of points) {
    assert.ok(Math.abs(Math.hypot(x - 10, y - 20) - 5) < 1e-6);
  }
});

QUnit.test('hatchLines is deterministic and covers the bbox diagonal', function(assert) {
  const bbox = { x: 0, y: 0, width: 20, height: 20 };
  const rngA = mulberry32(7);
  const rngB = mulberry32(7);
  const linesA = hatchLines(bbox, { angle: 45, spacing: 4, jitter: 0.5, rng: rngA });
  const linesB = hatchLines(bbox, { angle: 45, spacing: 4, jitter: 0.5, rng: rngB });
  assert.deepEqual(linesA, linesB);
  assert.ok(linesA.length > 0);
});

QUnit.test('shadedRings produces one filled band per ring and is seed-repeatable', function(assert) {
  const rngA = mulberry32(3);
  const rngB = mulberry32(3);
  const ringsA = shadedRings({ cx: 0, cy: 0, r: 10 }, { lightAngle: -45, rings: 5, samples: 8, rng: rngA });
  const ringsB = shadedRings({ cx: 0, cy: 0, r: 10 }, { lightAngle: -45, rings: 5, samples: 8, rng: rngB });
  assert.deepEqual(ringsA, ringsB);
  assert.equal(ringsA.length, 5);
  for (const d of ringsA) {
    assert.ok(d.startsWith('M') && d.trim().endsWith('Z'), 'each ring is a closed, filled band');
  }
});

QUnit.test('shadedRings keeps band widths sane relative to ring spacing, even for many rings', function(assert) {
  // Regression check for the wedge-shaped self-intersection bug: widths
  // used to be sized off the overall radius, so inner rings (whose own
  // radius can be much smaller) got bands wider than themselves.
  const rings = shadedRings({ cx: 0, cy: 0, r: 40 }, { lightAngle: -45, rings: 12, samples: 16, rng: mulberry32(4) });
  assert.equal(rings.length, 12);
  for (const d of rings) {
    assert.ok(d.startsWith('M') && d.trim().endsWith('Z'));
  }
});

QUnit.test('shadedRings follows a polygon outline toward its corners when given points', function(assert) {
  // Regression check: shading used to always generate a plain circle, so
  // a square only ever showed a circle clipped in its middle, with the
  // corners left flat/unshaded.
  const square = [[0, 0], [76, 0], [76, 76], [0, 76]];
  const rings = shadedRings({ cx: 38, cy: 38, r: 53.74, points: square }, { lightAngle: -40, rings: 10, samples: 32, rng: mulberry32(8) });
  const last = rings[rings.length - 1];
  const nums = last.replace(/[MLZ]/g, '').trim().split(/\s+/).filter(Boolean).map((p) => p.split(',').map(Number));
  const maxDist = Math.max(...nums.map(([x, y]) => Math.hypot(x - 38, y - 38)));
  // A circle inscribed in this square tops out at radius 38; a
  // polygon-following outer ring should reach further, toward the
  // corners (square half-diagonal ~53.7).
  assert.ok(maxDist > 45, `outer ring should reach toward the square's corners, got ${maxDist}`);
});

QUnit.test('woodgrainLines keeps knot bulges from throwing lines off the shape', function(assert) {
  // Regression check: knot "strength" used to scale with the whole shape
  // size, bulging every line completely off the shape before it ever
  // crossed it - leaving nothing for the clip-path to show.
  const bbox = { x: 0, y: 0, width: 90, height: 90 };
  const cx = 45;
  const cy = 45;
  const lines = woodgrainLines(bbox, { angle: 45, spacing: 5, knots: 3, samples: 24, rng: mulberry32(104) });
  let closeLines = 0;
  for (const d of lines) {
    const nums = d.replace(/[MLZ]/g, '').trim().split(/\s+/).filter(Boolean).map((p) => p.split(',').map(Number));
    const minDist = Math.min(...nums.map(([x, y]) => Math.hypot(x - cx, y - cy)));
    if (minDist < 45) {
      closeLines++;
    }
  }
  assert.ok(closeLines > lines.length / 4, 'a good share of lines should still pass near the shape, not be bulged entirely off it');
});

QUnit.test('latitudeBands and longitudeBands are seed-repeatable and only emit visible-side arcs', function(assert) {
  const latA = latitudeBands({ cx: 0, cy: 0, r: 10 }, { axisTilt: 30, lightAngle: -45, rings: 6, samples: 16, rng: mulberry32(2) });
  const latB = latitudeBands({ cx: 0, cy: 0, r: 10 }, { axisTilt: 30, lightAngle: -45, rings: 6, samples: 16, rng: mulberry32(2) });
  assert.deepEqual(latA, latB);
  assert.ok(latA.length > 0 && latA.length <= 6, 'no more than one visible arc per latitude ring here');

  const lonA = longitudeBands({ cx: 0, cy: 0, r: 10 }, { axisTilt: 30, lightAngle: -45, meridians: 5, samples: 16, rng: mulberry32(2) });
  const lonB = longitudeBands({ cx: 0, cy: 0, r: 10 }, { axisTilt: 30, lightAngle: -45, meridians: 5, samples: 16, rng: mulberry32(2) });
  assert.deepEqual(lonA, lonB);
  assert.ok(lonA.length > 0);
});

QUnit.test('woodgrainLines produces jittered parallel-ish bands, deterministic per seed', function(assert) {
  const bbox = { x: 0, y: 0, width: 40, height: 40 };
  const woodA = woodgrainLines(bbox, { angle: 15, spacing: 6, knots: 2, samples: 10, rng: mulberry32(9) });
  const woodB = woodgrainLines(bbox, { angle: 15, spacing: 6, knots: 2, samples: 10, rng: mulberry32(9) });
  assert.deepEqual(woodA, woodB);
  assert.ok(woodA.length > 0);
  for (const d of woodA) {
    assert.ok(d.startsWith('M') && d.trim().endsWith('Z'));
  }
});

QUnit.test('variableWidthOutline builds a closed path around a square', function(assert) {
  const square = [[0, 0], [10, 0], [10, 10], [0, 10]];
  const d = variableWidthOutline(square, () => 2);
  assert.ok(d.startsWith('M'));
  assert.ok(d.trim().endsWith('Z'));
});
