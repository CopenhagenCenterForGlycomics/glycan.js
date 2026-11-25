/**
 * Geometry for a chair-conformation drawing -- a sibling to
 * HaworthLayout.js, reusing its chemistry 100% unchanged (layoutSubstituents/
 * layoutSialicSubstituents, the InChI-derived orientation AND axEq per
 * position -- see that file's own module docstring). What a chair drawing
 * adds on top is purely geometric:
 *
 *  - A different ring OUTLINE: not the flattened Haworth ellipse, but the
 *    standard "two offset zigzag rails" silhouette every organic chemistry
 *    text draws by hand (oxygen at the top right; C1-C2-C3-C4 the front/
 *    bold arc, C4-C5-O5-C1 the back/thin arc -- C1 and C4 are the ring's
 *    two "flap" vertices where front meets back, the same 1,4 pair that's
 *    always the flap pair in any real chair).
 *  - A substituent stick that isn't always vertical: AXIAL is vertical
 *    (exactly Haworth's own up/down direction -- a Haworth projection is a
 *    simplification of the chair that specifically preserves this).
 *    EQUATORIAL points outward from the ring instead, at the angle real
 *    tetrahedral geometry actually gives it -- found by feeding this
 *    drawing's own ring-vertex positions, PLUS a small synthetic
 *    alternating z (the real chair's pucker: a perfectly flat, z=0 ring
 *    can't distinguish axial from equatorial direction at all -- tried
 *    first, and tetrahedralOtherTwo returned the SAME in-plane direction
 *    for both, only differing in a z-component this 2D drawing doesn't
 *    use), into InChIRingGeometry.js's own tetrahedralOtherTwo (the exact
 *    function deriveAxialEquatorial/deriveHaworthOrientation already
 *    resolve every position's real chemistry against). This is what
 *    actually keeps adjacent equatorial substituents from converging
 *    toward each other the way a naive "outward from ring center"
 *    approximation does (also tried first) -- confirmed by comparing
 *    adjacent positions' stick endpoints are clearly separated, not just
 *    by eye.
 *
 * Scoped to the hexose/sialic shapes only (both reuse this same hexagon) --
 * a real chair conformation doesn't meaningfully apply to a 5-membered
 * furanose ring (those are drawn as an envelope/twist, a different
 * geometry entirely, not attempted here).
 */

import { Vec3, tetrahedralOtherTwo } from '../InChIRingGeometry.js';

const STICK_LENGTH = 24;

// Ring-bond order (matches chairGeometry's own bonds array, going around
// once) -- used both for the equatorial-angle computation below and (via
// RING_Z) to give each vertex a synthetic out-of-plane pucker for that
// computation only (never used for anything actually drawn -- the ring
// itself stays flat 2D, same as every other shape this renderer draws).
const RING_ORDER = ['O5', 'C1', 'C2', 'C3', 'C4', 'C5'];
const RING_Z = Object.fromEntries(RING_ORDER.map((key, i) => [key, i % 2 === 0 ? 0.3 : -0.3]));

/**
 * The classic hand-drawn chair silhouette: 6 ring vertices (5 carbons + the
 * ring oxygen), centered on (0,0). Matches HaworthLayout.js's own
 * ringGeometry() in overall scale (same ballpark rx/ry) and vertex naming
 * (C1..C5, O5), so the two are drop-in alternatives from a caller's
 * perspective.
 *
 * Unlike ringGeometry()'s tapered front-face wedge (a plain SVG stroke
 * can't vary width along its own length, so Haworth fakes the perspective
 * with a filled polygon), a chair's front/back distinction is a real,
 * uniform bold-vs-thin split per EDGE -- every edge drawn here has the same
 * width at both ends, so a renderer can always draw a plain line, never a
 * polygon.
 */
export function chairGeometry() {
  // Found by visual check against a published chair diagram
  // (chemistrysteps.com's "Converting Haworth to a Chair of glucose"), not
  // derived from any formula -- there isn't one, this is just the
  // conventional hand-drawn shape. Centered on the hexagon's own centroid.
  const vertices = {
    O5: { x: 22, y: -42 },
    C1: { x: 64, y: 3 },
    C2: { x: 33, y: 53 },
    C3: { x: -25, y: 39 },
    C4: { x: -65, y: -4 },
    C5: { x: -31, y: -48 },
  };
  const bonds = [
    { from: 'O5', to: 'C1', width: 'thin' },
    { from: 'C1', to: 'C2', width: 'bold' },
    { from: 'C2', to: 'C3', width: 'bold' },
    { from: 'C3', to: 'C4', width: 'bold' },
    { from: 'C4', to: 'C5', width: 'thin' },
    { from: 'C5', to: 'O5', width: 'thin' },
  ];
  return { vertices, bonds };
}

function normalize(x, y) {
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function vertexKeyForPosition(position) {
  // Position 6 has no ring vertex of its own (the exocyclic C6 group hangs
  // off C5) -- same remap HaworthSVG.js's own vertexForPosition uses.
  return position === 6 ? 'C5' : `C${position}`;
}

/**
 * A substituent stick's own far endpoint -- the chair-specific counterpart
 * to HaworthSVG.js's substituentStickEnd (which is always vertical; this
 * is only vertical for an axial substituent).
 *
 * `axEq` picks the direction family: 'ax' is a pure vertical stick (same
 * up/down convention as Haworth -- up is negative y). 'eq' takes
 * InChIRingGeometry.js's own tetrahedralOtherTwo, fed this ring's actual
 * 2D vertex positions (plus the synthetic pucker in RING_Z, needed only so
 * axial and equatorial come out as genuinely different directions -- see
 * this module's own docstring), and uses that real tetrahedral
 * equatorial direction's own in-plane (x,y) lean -- not a hand-tuned
 * approximation. Either way, the SIGN (which of the two up/down
 * possibilities to use) is fixed by matching `orientation` -- same
 * "up stays up" rule for axial and equatorial alike. `axEq` missing/null
 * (shouldn't normally happen -- see HaworthLayout.js's own axEq docs)
 * falls back to equatorial, the more common case.
 */
export function chairStickEnd(vertices, position, orientation, axEq) {
  const key = vertexKeyForPosition(position);
  const vertex = vertices[key];
  const verticalSign = orientation === 'up' ? -1 : 1;
  if (axEq === 'ax') {
    return { x: vertex.x, y: vertex.y + verticalSign * STICK_LENGTH };
  }

  const n = RING_ORDER.length;
  const i = RING_ORDER.indexOf(key);
  const toVec3 = (k) => new Vec3(vertices[k].x, vertices[k].y, RING_Z[k]);
  const { equatorial } = tetrahedralOtherTwo(toVec3(key), toVec3(RING_ORDER[(i - 1 + n) % n]), toVec3(RING_ORDER[(i + 1) % n]));
  let dir = normalize(equatorial.x, equatorial.y);
  if (dir.y * verticalSign < 0) dir = { x: -dir.x, y: -dir.y };
  return { x: vertex.x + dir.x * STICK_LENGTH, y: vertex.y + dir.y * STICK_LENGTH };
}

export { STICK_LENGTH };
