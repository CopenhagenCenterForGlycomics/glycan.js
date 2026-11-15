'use strict';

// Pure geometry for the Haeckel renderer (no DOM): hand-drawn ink strokes
// and stippled tone. Deterministic given an rng (fizikoTextures.mulberry32).

import { variableWidthBand } from '../Fiziko/fizikoTextures.js';

// `points` resampled to `samples` points evenly spaced along their length
// (the loop back to the start included when `closed`). Open lines keep both
// endpoints exactly. O(points + samples).
const resampleByLength = (points, samples, closed) => {
    const loop = closed ? [...points, points[0]] : points;
    const cumulative = [0];
    for (let i = 1; i < loop.length; i++) {
        cumulative.push(cumulative[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
    }
    const total = cumulative[cumulative.length - 1] || 1;
    const count = closed ? samples : samples + 1;
    const out = [];
    let seg = 1;
    for (let k = 0; k < count; k++) {
        const target = total * k / samples;
        while (seg < loop.length - 1 && cumulative[seg] < target) {
            seg++;
        }
        const span = cumulative[seg] - cumulative[seg - 1] || 1;
        const t = Math.min(1, Math.max(0, (target - cumulative[seg - 1]) / span));
        const [x0, y0] = loop[seg - 1];
        const [x1, y1] = loop[seg];
        out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
    if (!closed) {
        out[out.length - 1] = [...points[points.length - 1]];
        out[0] = [...points[0]];
    }
    return out;
};

// A smooth, low-frequency wobble along t in [0, 1]: a sum of three sines
// with random phases and whole-number frequencies (so a closed loop joins
// up), scaled to about `amplitude`. Not jitter: neighbouring samples move
// together, as a pen drifts.
const lowFrequencyNoise = (rng, amplitude) => {
    const waves = [1, 2, 3].map((base) => ({
        frequency: base + Math.floor(rng() * 2),
        phase: rng() * Math.PI * 2,
        weight: 1 / base
    }));
    const norm = waves.reduce((s, w) => s + w.weight, 0);
    return (t) => amplitude * waves.reduce((s, w) => s + w.weight * Math.sin(2 * Math.PI * w.frequency * t + w.phase), 0) / norm;
};

// A pen stroke along `points` as the SVG path of a filled band
// (variableWidthBand): resampled by length to `samples` points, displaced
// along the normal by a low-frequency wobble, its width swelling mid-stroke
// and tapering towards the ends (to `taper` of the full width) for open
// strokes, gently varying around closed ones. Open strokes keep both
// endpoints exactly (the wobble fades out as sin(pi t)).
// Cost: O(points + samples); one path.
const handDrawnStroke = (points, { width = 2, wobble = 0.6, taper = 0.3, closed = false, samples = 32, rng }) => {
    const centre = resampleByLength(points, samples, closed);
    const n = centre.length;
    const noise = lowFrequencyNoise(rng, wobble);
    const pressureNoise = lowFrequencyNoise(rng, 0.12);
    const displaced = [];
    const widths = [];
    for (let i = 0; i < n; i++) {
        const t = closed ? i / n : i / (n - 1);
        const prev = centre[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
        const next = centre[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
        const len = Math.hypot(next[0] - prev[0], next[1] - prev[1]) || 1;
        const nx = -(next[1] - prev[1]) / len;
        const ny = (next[0] - prev[0]) / len;
        const offset = noise(t) * (closed ? 1 : Math.sin(Math.PI * t));
        displaced.push([centre[i][0] + nx * offset, centre[i][1] + ny * offset]);
        const pressure = closed ? 1 : taper + (1 - taper) * Math.pow(Math.sin(Math.PI * t), 0.7);
        widths.push(width * pressure * (1 + pressureNoise(t)));
    }
    return variableWidthBand(displaced, widths, closed);
};

// Stipple dots over `bbox`: one candidate per `spacing` cell, jittered
// anywhere within its cell (no visible grid), kept with probability
// `density(x, y)` in [0, 1]. Darker tone = denser dots.
// Cost: O(bbox area / spacing^2) rng calls; about density x that many dots.
const stipplePoints = (bbox, { spacing = 4, density, rng }) => {
    const dots = [];
    for (let y = bbox.y; y < bbox.y + bbox.height; y += spacing) {
        for (let x = bbox.x; x < bbox.x + bbox.width; x += spacing) {
            const px = x + rng() * spacing;
            const py = y + rng() * spacing;
            if (rng() < density(px, py)) {
                dots.push([px, py]);
            }
        }
    }
    return dots;
};

// Dots as one path of tiny circles (two arcs each): a single SVG node for
// a whole stipple layer instead of one <circle> per dot. O(dots).
const dotsPath = (dots, radiusFor) => dots.map(([x, y], i) => {
    const r = radiusFor(i).toFixed(2);
    return `M${(x - r).toFixed(2)},${y.toFixed(2)}a${r},${r} 0 1,0 ${(2 * r).toFixed(2)},0a${r},${r} 0 1,0 ${(-2 * r).toFixed(2)},0`;
}).join('');

// Whether (x, y) lies within the ellipse { cx, cy, a, b } (semi-axes a
// along x, b along y).
const inEllipse = ({ cx, cy, a, b }, x, y) => ((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1;

// `samples` points around the ellipse { cx, cy, a, b }. O(samples).
const ellipsePoints = ({ cx, cy, a, b }, samples = 96) => Array.from({ length: samples }, (_, i) => {
    const t = (2 * Math.PI * i) / samples;
    return [cx + a * Math.cos(t), cy + b * Math.sin(t)];
});

// The ellipse a capsule draws round `points` (residue centres): centred
// on their bounding box, with that box's proportions, grown until every
// point lies inside, then by `pad` all round. Axes are at least `minAxis`
// (a linear glycan's box has no width). Cost: O(points).
const fitEllipse = (points, { pad = 0, minAxis = 1 } = {}) => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const a0 = Math.max(minAxis, (Math.max(...xs) - Math.min(...xs)) / 2);
    const b0 = Math.max(minAxis, (Math.max(...ys) - Math.min(...ys)) / 2);
    const k = Math.max(1, ...points.map(([x, y]) => Math.hypot((x - cx) / a0, (y - cy) / b0)));
    return { cx, cy, a: a0 * k + pad, b: b0 * k + pad };
};

// A radiolarian net: a honeycomb of hexagons (circumradius `cell`) filling
// the ellipse { cx, cy, a, b }, every corner nudged by up to `jitter` of a
// cell (shared corners move together, so cells stay joined), keeping the
// edges with both ends inside. Returns edges ([[x1, y1], [x2, y2]], each
// once) and vertices. Cost: O(a b / cell^2): about 1.2 a b / cell^2 cells,
// 2 vertices and 3 edges per cell.
const hexLattice = (ellipse, { cell, jitter = 0.18, rng }) => {
    const center = { x: ellipse.cx, y: ellipse.cy };
    const width = Math.sqrt(3) * cell;
    const rows = Math.ceil(ellipse.b / (1.5 * cell)) + 1;
    const cols = Math.ceil(ellipse.a / width) + 1;
    const corners = new Map();
    const corner = (x, y) => {
        const key = `${Math.round(x * 100 / cell)},${Math.round(y * 100 / cell)}`;
        if (!corners.has(key)) {
            const jx = x + (rng() - 0.5) * 2 * jitter * cell;
            const jy = y + (rng() - 0.5) * 2 * jitter * cell;
            corners.set(key, { key, at: inEllipse(ellipse, jx, jy) ? [jx, jy] : null });
        }
        return corners.get(key);
    };
    const edges = new Map();
    for (let row = -rows; row <= rows; row++) {
        for (let col = -cols; col <= cols; col++) {
            const cx = center.x + col * width + (row % 2 ? width / 2 : 0);
            const cy = center.y + row * 1.5 * cell;
            const ring = [0, 1, 2, 3, 4, 5].map((k) => {
                const a = (60 * k + 30) * Math.PI / 180;
                return corner(cx + cell * Math.cos(a), cy + cell * Math.sin(a));
            });
            ring.forEach((a, k) => {
                const b = ring[(k + 1) % 6];
                const key = a.key < b.key ? `${a.key}|${b.key}` : `${b.key}|${a.key}`;
                if (a.at && b.at && !edges.has(key)) {
                    edges.set(key, [a.at, b.at]);
                }
            });
        }
    }
    return { edges: [...edges.values()], vertices: [...corners.values()].map((c) => c.at).filter(Boolean) };
};

// A spine: from `start`, heading `angle` (radians) for `length`, curving
// gently to one side. Returns its centreline points and its tip.
// Cost: O(samples).
const spine = (start, angle, length, { curl = 0.25, samples = 8, rng }) => {
    const bend = (rng() - 0.5) * 2 * curl;
    const points = [];
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const heading = angle + bend * t;
        const r = length * t;
        points.push([start[0] + r * Math.cos(heading), start[1] + r * Math.sin(heading)]);
    }
    return { points, tip: points[points.length - 1], heading: angle + bend };
};

// Halo stipple: up to `count` dots in the band from the ellipse
// { cx, cy, a, b } out to `depth` beyond it, thinning out with distance
// (density falls as the square of how far out in the band a dot is).
// Cost: O(count / acceptance) rng calls, at most 4 x count.
const haloDots = ({ cx, cy, a, b }, depth, { count = 400, rng }) => {
    const dots = [];
    for (let tries = 0; dots.length < count && tries < count * 4; tries++) {
        const angle = rng() * Math.PI * 2;
        const along = rng();
        if (rng() < (1 - along) * (1 - along)) {
            const out = depth * along;
            dots.push([cx + (a + out) * Math.cos(angle), cy + (b + out) * Math.sin(angle)]);
        }
    }
    return dots;
};

export { resampleByLength, handDrawnStroke, stipplePoints, dotsPath, inEllipse, ellipsePoints, fitEllipse, hexLattice, spine, haloDots };
