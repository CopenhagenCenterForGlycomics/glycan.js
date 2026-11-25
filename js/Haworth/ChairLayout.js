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
 *    always the flap pair in any real chair). Built as a genuine (if
 *    idealized) 3D chair -- 6 ring atoms on a circle, alternating +/-z
 *    pucker, same idea as InChIRingGeometry.js's own buildChair -- viewed
 *    from a fixed oblique angle (ROTATION below) and projected to 2D,
 *    rather than hand-placed: a hand-placed attempt, tuned purely by eye
 *    against a published reference image, kept crowding adjacent
 *    substituents together (their outward lean had no real geometric
 *    relationship to each other); a genuine rotated-3D projection gives
 *    every position's own lean a real geometric reason not to converge on
 *    its neighbour's.
 *  - A substituent stick that isn't always vertical: AXIAL is vertical
 *    (exactly Haworth's own up/down direction -- a Haworth projection is a
 *    simplification of the chair that specifically preserves this).
 *    EQUATORIAL points outward from the ring at the angle real tetrahedral
 *    geometry gives it -- InChIRingGeometry.js's own tetrahedralOtherTwo
 *    (the same function deriveAxialEquatorial/deriveHaworthOrientation
 *    already resolve every position's real chemistry against), fed this
 *    SAME idealized 3D ring's own real (not synthetic) pucker, then
 *    projected through the SAME rotation as the ring itself so a stick
 *    always reads as a continuation of its own ring vertex.
 *
 * Scoped to the hexose/sialic shapes only (both reuse this same hexagon) --
 * a real chair conformation doesn't meaningfully apply to a 5-membered
 * furanose ring (those are drawn as an envelope/twist, a different
 * geometry entirely, not attempted here).
 */

import { Vec3, tetrahedralOtherTwo } from '../InChIRingGeometry.js';

const STICK_LENGTH = 26;

// The idealized 3D chair: 6 ring atoms (sugar-position order, then the
// ring oxygen last -- same convention InChIRingGeometry.js's own
// resolveRingSubstituent uses for its own buildChair positions) on a
// circle, alternating +/-PUCKER. PHASE picks which atom sits at angle 0
// (purely a drawing choice -- rotating the whole ring in 3D before it's
// even projected); found by visual check against a published chair
// diagram (chemistrysteps.com's "Converting Haworth to a Chair of
// glucose") for the clearest, least-crowded zigzag, not derived from a
// formula -- there isn't one, any phase traces the same real ring, just
// facing a different way.
const RING_ORDER = ['O5', 'C1', 'C2', 'C3', 'C4', 'C5'];
const PHASE = (-135 * Math.PI) / 180;
const PUCKER = 0.4;
const RADIUS = 1;

// The viewing transform: tilt the ring by ROTATION_X (a rotation about the
// screen's own horizontal axis, bringing some of the ring's own "depth"
// extent and its z-pucker together into the screen's vertical axis -- a
// real oblique view, not an arbitrary additive fudge), then MIRROR
// (horizontal flip) so the ring oxygen lands top-right, matching the
// conventional orientation (same reference as above) rather than top-left,
// which the chosen PHASE/ROTATION_X pair happens to produce before
// mirroring. SCALE is this drawing's own overall size (same ballpark as
// HaworthLayout.js's own ringGeometry rx/ry).
const ROTATION_X = (45 * Math.PI) / 180;
const MIRROR = true;
const SCALE = 60;

function ring3D() {
  const points = {};
  RING_ORDER.forEach((key, i) => {
    const angle = PHASE + i * (Math.PI / 3);
    points[key] = new Vec3(RADIUS * Math.cos(angle), RADIUS * Math.sin(angle), i % 2 === 0 ? PUCKER : -PUCKER);
  });
  return points;
}

// Projects either a 3D ring POINT or a 3D direction VECTOR (same linear
// map works for both -- no translation involved) down to this drawing's
// 2D plane.
function project(v, scale = SCALE) {
  const y = v.y * Math.cos(ROTATION_X) - v.z * Math.sin(ROTATION_X);
  return { x: v.x * scale * (MIRROR ? -1 : 1), y: y * scale };
}

/**
 * The classic hand-drawn chair silhouette: 6 ring vertices (5 carbons + the
 * ring oxygen), centered on (0,0). Matches HaworthLayout.js's own
 * ringGeometry() in overall scale and vertex naming (C1..C5, O5), so the
 * two are drop-in alternatives from a caller's perspective.
 *
 * Unlike ringGeometry()'s tapered front-face wedge (a plain SVG stroke
 * can't vary width along its own length, so Haworth fakes the perspective
 * with a filled polygon), a chair's front/back distinction is a real,
 * uniform bold-vs-thin split per EDGE -- every edge drawn here has the same
 * width at both ends, so a renderer can always draw a plain line, never a
 * polygon.
 */
export function chairGeometry() {
  const points3d = ring3D();
  const vertices = {};
  for (const key of RING_ORDER) vertices[key] = project(points3d[key]);
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
 * is only vertical for an axial substituent). `vertices` must be the SAME
 * object chairGeometry() just returned for this residue.
 *
 * `axEq` picks the direction family: 'ax' is a pure vertical stick (same
 * up/down convention as Haworth -- up is negative y). 'eq' takes
 * InChIRingGeometry.js's own tetrahedralOtherTwo, fed this SAME idealized
 * 3D ring's own real neighbour positions (ring3D/PUCKER above -- a real
 * tetrahedral angle, not a hand-tuned approximation), and projects its
 * equatorial direction through the SAME viewing transform as the ring
 * itself. Either way, the SIGN (which of the two up/down possibilities to
 * use) is fixed by matching `orientation` -- same "up stays up" rule for
 * axial and equatorial alike. `axEq` missing/null (shouldn't normally
 * happen -- see HaworthLayout.js's own axEq docs) falls back to
 * equatorial, the more common case.
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
  const points3d = ring3D();
  const { equatorial } = tetrahedralOtherTwo(
    points3d[key],
    points3d[RING_ORDER[(i - 1 + n) % n]],
    points3d[RING_ORDER[(i + 1) % n]]
  );
  const projected = project(equatorial, 1); // a unit direction, not a point -- scaled separately below
  let dir = normalize(projected.x, projected.y);
  if (dir.y * verticalSign < 0) dir = { x: -dir.x, y: -dir.y };
  return { x: vertex.x + dir.x * STICK_LENGTH, y: vertex.y + dir.y * STICK_LENGTH };
}

export { STICK_LENGTH };
