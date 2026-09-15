'use strict';

// Pure geometry/math for fiziko-style textures. No DOM here, so this is
// safe to unit-test without a real browser (jsdom is fine).

// Deterministic PRNG (mulberry32) so a given seed always reproduces the
// same texture geometry. O(1) per call.
const mulberry32 = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// Turns arbitrary numbers (e.g. a shape's own geometry) into a stable seed,
// so callers who don't pass an explicit seed still get reproducible output.
const hashSeed = (...nums) => {
  let h = 2166136261;
  for (const n of nums) {
    h = Math.imul(h ^ (Math.round(n * 1000) | 0), 16777619);
  }
  return h >>> 0;
};

const stringHash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  }
  return h >>> 0;
};

const circlePoints = ({ cx, cy }, r, samples = 32) => {
  const points = [];
  for (let i = 0; i < samples; i++) {
    const theta = (i / samples) * 2 * Math.PI;
    points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
  }
  return points;
};

// `samples` points evenly distributed by arc length around a closed
// polygon - lets a polygon's own outline be resampled at any resolution,
// the same way circlePoints samples a circle. O(n + samples).
const polygonPerimeterPoints = (points, samples) => {
  const n = points.length;
  const edges = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    edges.push({ a, b, len });
    total += len;
  }
  const result = [];
  for (let s = 0; s < samples; s++) {
    let target = (s / samples) * total;
    let edge = edges[edges.length - 1];
    for (const e of edges) {
      if (target <= e.len) {
        edge = e;
        break;
      }
      target -= e.len;
    }
    const t = edge.len > 0 ? target / edge.len : 0;
    result.push([edge.a[0] + (edge.b[0] - edge.a[0]) * t, edge.a[1] + (edge.b[1] - edge.a[1]) * t]);
  }
  return result;
};

// Scales points toward (cx, cy) by `factor` - a cheap stylistic approximation
// of a polygon offset (not a true inward buffer), used to make a shape's
// "rings" follow its actual outline instead of assuming it's a circle.
const insetTo = (points, factor, cx, cy) => points.map(([x, y]) => [cx + (x - cx) * factor, cy + (y - cy) * factor]);

// A ring's sample positions for shape `geometry` at normalized radius
// `rNorm` (0..1): the shape's own outline scaled toward its center for a
// polygon, or a plain circle otherwise - so shading/latitude/longitude
// bands actually follow a square or hexagon's silhouette out to its
// corners, instead of a circle that only touches the middle of each edge
// (leaving the corners looking unfilled once clipped to the real outline).
const ringGeometry = (geometry, rNorm, samples) => {
  if (geometry.points) {
    const perimeter = geometry.perimeterPoints || (geometry.perimeterPoints = polygonPerimeterPoints(geometry.points, samples));
    const angles = geometry.perimeterAngles || (geometry.perimeterAngles = perimeter.map(
      ([x, y]) => Math.atan2(y - geometry.center.cy, x - geometry.center.cx)
    ));
    return { points: insetTo(perimeter, rNorm, geometry.center.cx, geometry.center.cy), angles };
  }
  const points = circlePoints(geometry.center, rNorm * geometry.radius, samples);
  const angles = points.map((_, i) => (i / samples) * 2 * Math.PI);
  return { points, angles };
};

// Segments tiling `bbox` at `angle`, spaced `spacing` apart, jittered for a
// hand-drawn feel. They deliberately run the full bbox diagonal rather than
// being trimmed to the shape - trimming happens for free via SVG clip-path,
// so there's no need to compute containment here. O(diagonal / spacing).
const hatchLines = (bbox, { angle = 45, spacing = 4, jitter = 0.5, rng }) => {
  const rad = angle * Math.PI / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const nx = -dy;
  const ny = dx;
  const diag = Math.hypot(bbox.width, bbox.height) || 1;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const segments = [];
  for (let d = -diag; d <= diag; d += spacing) {
    const jx = (rng() - 0.5) * jitter;
    const jy = (rng() - 0.5) * jitter;
    const px = cx + nx * d + jx;
    const py = cy + ny * d + jy;
    segments.push([
      px - dx * diag, py - dy * diag,
      px + dx * diag, py + dy * diag
    ]);
  }
  return segments;
};

// --- sphere shading, ported from fiziko.mp's sphere()/sphereLat() family ---
//
// fiziko's model: a point on a unit sphere has a 3D surface normal (equal
// to its own position); ink density there is `1 - normal . lightDir`,
// clamped to [0,1] - thin/no ink where the surface faces the light, thick
// ink where it faces away (normalVectorToLightness in fiziko.mp). A sphere
// is drawn as a set of circles on that surface (lines of latitude, or
// longitude/meridians - sphere() vs sphereLat() in fiziko.mp) rendered as
// real variable-width bands (variableWidthBand below), not uniformly
// stroked circles.

// A fixed elevation for the light source (degrees above the equatorial
// plane). fiziko exposes both an azimuth and an elevation
// (defineLightDirection); only the azimuth is exposed here as `lightAngle`
// to keep the option surface small.
const LIGHT_ELEVATION_DEG = 35;

const lightVector = (lightAngleDeg) => {
  const lightRad = lightAngleDeg * Math.PI / 180;
  const elevRad = LIGHT_ELEVATION_DEG * Math.PI / 180;
  const horizontal = Math.cos(elevRad);
  return [horizontal * Math.cos(lightRad), horizontal * Math.sin(lightRad), Math.sin(elevRad)];
};

const inkDensityAt = (normal, light) => {
  const dot = normal[0] * light[0] + normal[1] * light[1] + normal[2] * light[2];
  return Math.max(0, Math.min(1, 1 - dot));
};

// Orthonormal basis (axis, u, v) for a sphere whose pole is tilted
// `tiltDeg` forward/back from pointing straight at the viewer - at tilt 0
// this is exactly the axis shadedRings assumes (pole facing the viewer,
// latitude circles are plain concentric circles). u/v span the plane
// perpendicular to the axis; closed-form since the tilt is restricted to a
// single plane, which is enough for a convincing tilted-globe look without
// needing a general 3D orientation (and the cross-product code that would
// take).
const sphereBasis = (tiltDeg) => {
  const t = tiltDeg * Math.PI / 180;
  return {
    axis: [0, Math.sin(t), Math.cos(t)],
    u: [1, 0, 0],
    v: [0, Math.cos(t), -Math.sin(t)]
  };
};

// Splits a closed ring of samples (each `{ z }` giving depth toward the
// viewer) into the arcs where z >= 0 (the near, visible side of the
// sphere) - full circle if every sample is visible, no arcs if none are.
// Rotates the scan to start on a rising (invisible -> visible) edge first,
// so a run never needs to wrap across the array boundary. O(samples).
const visibleArcs = (samplePoints) => {
  const n = samplePoints.length;
  const visible = samplePoints.map((pt) => pt.z >= 0);
  if (visible.every((v) => v)) {
    return [{ points: samplePoints, closed: true }];
  }
  if (visible.every((v) => !v)) {
    return [];
  }
  let start = 0;
  for (let i = 0; i < n; i++) {
    if (visible[i] && !visible[(i - 1 + n) % n]) {
      start = i;
      break;
    }
  }
  const arcs = [];
  let current = [];
  for (let k = 0; k < n; k++) {
    const idx = (start + k) % n;
    if (visible[idx]) {
      current.push(samplePoints[idx]);
    } else if (current.length) {
      if (current.length >= 2) {
        arcs.push({ points: current, closed: false });
      }
      current = [];
    }
  }
  if (current.length >= 2) {
    arcs.push({ points: current, closed: false });
  }
  return arcs;
};

// fiziko's sphere(): rings at *fixed*, evenly disc-radius-spaced radii
// (pole pointing straight at the viewer, so every ring is fully visible -
// the tilt-0 special case of latitudeBands, kept as its own simpler
// function since it needs no arc-splitting). `cx/cy/r` is a circle, or
// pass `points` (a polygon) to have the rings follow that outline instead
// - lets shading fill a square or hexagon out to its corners rather than
// just clipping a circle in the middle of it. Each ring's *lighting* angle
// gets its own small random rotation - fiziko's sphere() macro literally
// does `rotated uniformdeviate(1/4pi)` per ring - because every ring's
// brightest point otherwise falls at the exact same absolute angle
// (the light's azimuth doesn't depend on ring radius), which lines every
// ring's thinnest point up into one continuous wedge-shaped gap from
// center to edge instead of a soft, natural-looking highlight. Returns
// ready-to-fill path `d` strings. O(rings * samples).
const shadedRings = ({ cx, cy, r, points }, { lightAngle = -45, rings = 12, samples = 64, rng }) => {
  const light = lightVector(lightAngle);
  const geometry = { center: { cx, cy }, radius: r, points };
  // Widths are sized relative to the *spacing between rings*, not the
  // overall shape radius r - sizing them off r let an inner ring's band
  // (up to 9% of r wide) exceed that ring's own (much smaller) radius,
  // self-intersecting into a wedge-shaped hole through the middle.
  const ringSpacing = r / (rings + 1);
  const minWidth = ringSpacing * 0.15;
  const maxWidth = ringSpacing * 0.9;
  const paths = [];
  for (let i = 0; i < rings; i++) {
    const rNorm = (i + 1) / (rings + 1);
    const nz = Math.sqrt(Math.max(0, 1 - rNorm * rNorm));
    const rotation = (rng() * 2 - 1) * (Math.PI / 4);
    const { points: centerline, angles } = ringGeometry(geometry, rNorm, samples);
    const widths = centerline.map((_, j) => {
      const theta = angles[j] + rotation;
      const normal = [rNorm * Math.cos(theta), rNorm * Math.sin(theta), nz];
      const jitter = 1 + (rng() - 0.5) * 0.2;
      return (minWidth + (maxWidth - minWidth) * inkDensityAt(normal, light)) * jitter;
    });
    paths.push(variableWidthBand(centerline, widths, true));
  }
  return paths;
};

// fiziko's sphereLat(): lines of latitude on a sphere whose pole is tilted
// by `axisTilt`, so each one is a circle on the sphere's surface that
// projects to an arc (only its near, z >= 0 side is visible) rather than a
// plain concentric circle. Same lightness model as shadedRings. Colatitude
// is spaced evenly across the *whole* sphere (both hemispheres), since a
// tilted pole makes bands from both visible at once. O(rings * samples).
const latitudeBands = ({ cx, cy, r }, { axisTilt = 25, lightAngle = -45, rings = 14, samples = 64, rng }) => {
  const { axis, u, v } = sphereBasis(axisTilt);
  const light = lightVector(lightAngle);
  // See shadedRings: width relative to ring spacing, not overall radius.
  const ringSpacing = r / rings;
  const minWidth = ringSpacing * 0.15;
  const maxWidth = ringSpacing * 0.9;
  const paths = [];
  for (let i = 0; i < rings; i++) {
    const colat = Math.PI * (i + 0.5) / rings;
    const height = Math.cos(colat);
    const radius = Math.sin(colat);
    // See shadedRings: a small per-ring rotation keeps every ring's
    // brightest point from lining up at the same absolute angle. Applied
    // only to a second, lighting-only normal - the actual drawn position
    // always comes from the true (unrotated) theta, so the ring's real
    // shape on the sphere is untouched; only which point along it reads as
    // "brightest" gets shuffled per ring.
    const rotation = (rng() * 2 - 1) * (Math.PI / 4);
    const samplePoints = [];
    for (let j = 0; j < samples; j++) {
      const theta = (j / samples) * 2 * Math.PI;
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      const normal = [
        height * axis[0] + radius * (c * u[0] + s * v[0]),
        height * axis[1] + radius * (c * u[1] + s * v[1]),
        height * axis[2] + radius * (c * u[2] + s * v[2])
      ];
      const lc = Math.cos(theta + rotation);
      const ls = Math.sin(theta + rotation);
      const lightingNormal = [
        height * axis[0] + radius * (lc * u[0] + ls * v[0]),
        height * axis[1] + radius * (lc * u[1] + ls * v[1]),
        height * axis[2] + radius * (lc * u[2] + ls * v[2])
      ];
      const jitter = 1 + (rng() - 0.5) * 0.2;
      const width = (minWidth + (maxWidth - minWidth) * inkDensityAt(lightingNormal, light)) * jitter;
      samplePoints.push({ p: [cx + normal[0] * r, cy + normal[1] * r], z: normal[2], w: width });
    }
    for (const arc of visibleArcs(samplePoints)) {
      paths.push(variableWidthBand(arc.points.map((pt) => pt.p), arc.points.map((pt) => pt.w), arc.closed));
    }
  }
  return paths;
};

// Lines of longitude (meridians) on the same tilted sphere as
// latitudeBands - each meridian is a full great circle through both poles,
// so `meridians` evenly-spaced azimuths in [0, pi) already cover every
// distinct one (an azimuth and its +pi twin are the same great circle
// plane). Same visibility/lightness handling as latitudeBands.
// O(meridians * samples).
const longitudeBands = ({ cx, cy, r }, { axisTilt = 25, lightAngle = -45, meridians = 10, samples = 64, rng }) => {
  const { axis, u, v } = sphereBasis(axisTilt);
  const light = lightVector(lightAngle);
  // See shadedRings: width relative to the spacing between meridians at
  // the equator, not the overall radius.
  const meridianSpacing = (Math.PI * r) / meridians;
  const minWidth = meridianSpacing * 0.15;
  const maxWidth = meridianSpacing * 0.6;
  const paths = [];
  for (let j = 0; j < meridians; j++) {
    const psi = Math.PI * j / meridians;
    const cp = Math.cos(psi);
    const sp = Math.sin(psi);
    const e = [cp * u[0] + sp * v[0], cp * u[1] + sp * v[1], cp * u[2] + sp * v[2]];
    const samplePoints = [];
    for (let k = 0; k < samples; k++) {
      const t = (k / samples) * 2 * Math.PI;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const normal = [c * axis[0] + s * e[0], c * axis[1] + s * e[1], c * axis[2] + s * e[2]];
      const jitter = 1 + (rng() - 0.5) * 0.2;
      const width = (minWidth + (maxWidth - minWidth) * inkDensityAt(normal, light)) * jitter;
      samplePoints.push({ p: [cx + normal[0] * r, cy + normal[1] * r], z: normal[2], w: width });
    }
    for (const arc of visibleArcs(samplePoints)) {
      paths.push(variableWidthBand(arc.points.map((pt) => pt.p), arc.points.map((pt) => pt.w), arc.closed));
    }
  }
  return paths;
};

// fiziko's real wood grain (wField/woodBlock/isoLines in fiziko.mp) is
// *not* concentric rings: its height field is dominated by a near-linear
// ramp across the wood block (`-(i*woodBlockYRdensity)/5`), so its isolines
// are roughly parallel lines - it's the scattered "knot" points added into
// that field that make nearby lines bow outward around them, giving the
// familiar cathedral-grain look. True isoline extraction over a 2D grid
// (marching-squares-style, plus knot placement and orientation search) is
// well beyond what a glyph-sized icon texture needs, so this ports the
// qualitative shape instead: start from hatchLines' straight, angled,
// evenly-spaced lines, scatter a few knot points across the bbox, and bow
// each line's sampled points away from every knot by an inverse-distance
// falloff (thicker near a knot, tapering with distance) - directly
// mirroring "isolines bulge around a knot", without a grid. Returns
// ready-to-fill path `d` strings. O(lines * samples * knots).
const woodgrainLines = (bbox, { angle = 15, spacing = 5, knots = 3, samples = 24, jitter = 0.3, rng }) => {
  const rad = angle * Math.PI / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const nx = -dy;
  const ny = dx;
  const diag = Math.hypot(bbox.width, bbox.height) || 1;
  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const minWidth = spacing * 0.12;
  const maxWidth = spacing * 0.32;

  const knotPoints = [];
  for (let k = 0; k < knots; k++) {
    knotPoints.push({
      x: bbox.x + rng() * bbox.width,
      y: bbox.y + rng() * bbox.height,
      // The influence radius controls how localized the knot is (a few
      // line spacings, not comparable to the whole shape - the earlier
      // version coupled this to the bulge magnitude itself and picked
      // values up to 85% of the shape size, throwing lines off it
      // entirely); strength is the displacement right at the knot center.
      radius: (1.3 + rng() * 0.7) * spacing,
      strength: (0.8 + rng() * 0.8) * spacing
    });
  }

  const paths = [];
  for (let d = -diag; d <= diag; d += spacing) {
    const centerline = [];
    const widths = [];
    for (let s = 0; s <= samples; s++) {
      const along = -diag + (2 * diag) * (s / samples);
      let px = cx + nx * d + dx * along;
      let py = cy + ny * d + dy * along;
      for (const knot of knotPoints) {
        // Push each point directly away from the knot (not sideways along
        // a fixed line direction), so grain lines visibly flow around it
        // - the "cathedral"/eye pattern real wood grain shows near a knot
        // - rather than a generic sideways kink. A quickly-decaying
        // falloff (inverse-square in distance) keeps the effect local to
        // `radius`, decoupled from how far the displacement itself pushes.
        const ddx = px - knot.x;
        const ddy = py - knot.y;
        const dist = Math.hypot(ddx, ddy) || 0.001;
        const falloff = (knot.radius * knot.radius) / (dist * dist + knot.radius * knot.radius);
        px += (ddx / dist) * knot.strength * falloff;
        py += (ddy / dist) * knot.strength * falloff;
      }
      centerline.push([px + (rng() - 0.5) * jitter, py + (rng() - 0.5) * jitter]);
      widths.push(minWidth + (maxWidth - minWidth) * (0.5 + 0.5 * Math.sin(s * 0.9 + d * 0.7)));
    }
    paths.push(variableWidthBand(centerline, widths, false));
  }
  return paths;
};

// Direct port of fiziko's core technique: a variable-thickness band built
// from two offset copies of a centerline (one shifted out by width/2, one
// shifted in), simplified to polyline offsets rather than true
// Bezier-offsets since callers already sample shapes as points. `widths`
// gives an explicit thickness per point (rather than a function of arc
// position) so callers that filter/reorder points, like the sphere-band
// visibility splitting above, don't need to reverse-engineer an index from
// a normalized position. `closed` wraps the centerline into a loop (a full
// ring) or leaves it open (a visible arc of one), using a one-sided
// tangent at the two open ends. The resulting band is always a closed 2D
// shape either way - even an open arc's band is a closed capsule outline.
// O(n).
const variableWidthBand = (points, widths, closed) => {
  const n = points.length;
  const forward = [];
  const backward = [];
  for (let i = 0; i < n; i++) {
    const prevIdx = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
    const nextIdx = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
    const prev = points[prevIdx];
    const next = points[nextIdx];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const w = widths[i] / 2;
    forward.push([points[i][0] + nx * w, points[i][1] + ny * w]);
    backward.push([points[i][0] - nx * w, points[i][1] - ny * w]);
  }
  if (closed) {
    // Two independent closed loops (outer boundary, inner boundary), not
    // one path joining them - joining forward[last] to backward[last] and
    // then backward[first] back to forward[first] (as an open band does)
    // cuts two radial seams into a *ring*, excising the thin wedge between
    // them from the fill. Needs fill-rule="evenodd" wherever this is
    // filled, so the inner loop actually punches a hole regardless of
    // which way each loop winds.
    return `${loopToPath(forward)} ${loopToPath(backward)}`;
  }
  return loopToPath([...forward, ...backward.reverse()]);
};

// Public helper kept for callers (and tests) that want a width *function*
// of normalized arc position rather than a precomputed per-point array.
const variableWidthOutline = (points, widthFn) => {
  const widths = points.map((_, i) => widthFn(i / points.length));
  return variableWidthBand(points, widths, true);
};

const loopToPath = (points) => `M${points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')} Z`;

export {
  mulberry32,
  hashSeed,
  stringHash,
  circlePoints,
  hatchLines,
  shadedRings,
  latitudeBands,
  longitudeBands,
  woodgrainLines,
  variableWidthOutline,
  loopToPath
};
