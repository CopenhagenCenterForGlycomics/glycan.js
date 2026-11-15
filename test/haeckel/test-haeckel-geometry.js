/*global QUnit*/
'use strict';

import { mulberry32 } from '../../js/Fiziko/fizikoTextures.js';
import { handDrawnStroke, stipplePoints, resampleByLength, hexLattice, haloDots, fitEllipse, inEllipse } from '../../js/Haeckel/haeckelGeometry.js';

QUnit.module('Haeckel geometry', {
});

// The band variableWidthBand draws for an open stroke runs out along one
// side and back along the other, so the stroke's own ends sit midway
// between its first and last points on each side.
const bandPoints = (d) => d.replace(/[MZ]/g, '').trim().split(/\s*L\s*/).map((p) => p.split(',').map(Number));

QUnit.test('an open stroke ends exactly where it was asked to', function(assert) {
    const points = [[0, 0], [30, 10], [60, 0]];
    const band = bandPoints(handDrawnStroke(points, { width: 2, wobble: 1.5, samples: 16, rng: mulberry32(7) }));
    const n = band.length / 2;
    const start = [(band[0][0] + band[band.length - 1][0]) / 2, (band[0][1] + band[band.length - 1][1]) / 2];
    const end = [(band[n - 1][0] + band[n][0]) / 2, (band[n - 1][1] + band[n][1]) / 2];
    assert.ok(Math.hypot(start[0], start[1]) < 0.02, `start ${start}`);
    assert.ok(Math.hypot(end[0] - 60, end[1]) < 0.02, `end ${end}`);
});

QUnit.test('strokes and stipple are the same for the same seed', function(assert) {
    const loop = [[0, 0], [10, 0], [10, 10], [0, 10]];
    const stroke = (seed) => handDrawnStroke(loop, { closed: true, samples: 24, rng: mulberry32(seed) });
    assert.equal(stroke(3), stroke(3));
    assert.notEqual(stroke(3), stroke(4));
    const dots = (seed) => JSON.stringify(stipplePoints({ x: 0, y: 0, width: 40, height: 40 }, { spacing: 4, density: () => 0.5, rng: mulberry32(seed) }));
    assert.equal(dots(9), dots(9));
});

QUnit.test('stipple gets denser as the ink density rises', function(assert) {
    const bbox = { x: 0, y: 0, width: 100, height: 100 };
    const counts = [0.1, 0.4, 0.8].map((d) => stipplePoints(bbox, { spacing: 4, density: () => d, rng: mulberry32(1) }).length);
    assert.ok(counts[0] < counts[1] && counts[1] < counts[2], `counts ${counts}`);
});

QUnit.test('resampling keeps an open line\'s endpoints and spaces points evenly', function(assert) {
    const out = resampleByLength([[0, 0], [10, 0], [10, 10]], 4, false);
    assert.deepEqual(out[0], [0, 0]);
    assert.deepEqual(out[out.length - 1], [10, 10]);
    assert.equal(out.length, 5);
    assert.deepEqual(out[2].map((v) => Math.round(v * 100) / 100), [10, 0]);
});

QUnit.test('the lattice stays inside its ellipse, joined and the same for a seed', function(assert) {
    const ellipse = { cx: 0, cy: 0, a: 140, b: 100 };
    const make = (seed) => hexLattice(ellipse, { cell: 12, rng: mulberry32(seed) });
    const lattice = make(5);
    assert.ok(lattice.edges.length > 100, `${lattice.edges.length} edges`);
    assert.ok(lattice.edges.every(([a, b]) => inEllipse(ellipse, ...a) && inEllipse(ellipse, ...b)), 'within the ellipse');
    // Joined: inner corners are shared by three edges of the honeycomb.
    const degree = new Map();
    for (const [a, b] of lattice.edges) {
        for (const p of [a, b]) {
            degree.set(p, (degree.get(p) ?? 0) + 1);
        }
    }
    const inner = [...degree.entries()].filter(([p]) => Math.hypot(...p) < 60);
    assert.ok(inner.every(([, d]) => d === 3), 'inner corners join three edges');
    assert.equal(JSON.stringify(make(5)), JSON.stringify(lattice));
});

QUnit.test('the halo keeps outside its ellipse, within its depth, and to its cap', function(assert) {
    const ellipse = { cx: 0, cy: 0, a: 50, b: 50 };
    const dots = haloDots(ellipse, 30, { count: 200, rng: mulberry32(2) });
    assert.ok(dots.length <= 200 && dots.length > 50, `${dots.length} dots`);
    assert.ok(dots.every(([x, y]) => Math.hypot(x, y) >= 50 - 1e-9 && Math.hypot(x, y) <= 80 + 1e-9), 'within the band');
});

QUnit.test('the fitted ellipse holds every point, with its padding, and follows their spread', function(assert) {
    const points = [[0, 0], [300, 0], [150, 40], [150, -60], [20, 30]];
    const e = fitEllipse(points, { pad: 10 });
    assert.ok(points.every(([x, y]) => inEllipse({ ...e, a: e.a - 10, b: e.b - 10 }, x, y)), 'all inside before padding');
    assert.ok(e.a > e.b, 'wider than tall, like the points');
    const line = fitEllipse([[0, 0], [0, 100]], { minAxis: 5 });
    assert.ok(line.a >= 5, 'a line still gets some width');
});
