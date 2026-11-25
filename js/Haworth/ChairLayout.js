/**
 * Geometry for a chair-conformation drawing -- a sibling to
 * HaworthLayout.js, reusing its chemistry 100% unchanged (layoutSubstituents/
 * layoutSialicSubstituents, the InChI-derived orientation AND axEq per
 * position -- see that file's own module docstring). What a chair drawing
 * adds on top is purely geometric:
 *
 *  - A different ring OUTLINE: not the flattened Haworth ellipse, but the
 *    standard "two offset zigzag rails" silhouette every organic chemistry
 *    text draws by hand (oxygen at the top right; C2-C3-C4-C5 the front/
 *    bold arc, C5-O5-C1-C2 the back/thin arc -- C2 and C5 are the ring's
 *    two "flap" vertices where front meets back, the same 2,5 pair that's
 *    always the flap pair in any real chair drawn at this phase/rotation).
 *    Built as a genuine (if
 *    idealized) 3D chair -- 6 ring atoms on a circle, alternating +/-z
 *    pucker, same idea as InChIRingGeometry.js's own buildChair -- viewed
 *    from a fixed oblique angle (ROTATION_X below) and projected to 2D,
 *    rather than hand-placed. The DRAWN ring is always this same shape,
 *    regardless of which real residue it's for -- see ringZSign below for
 *    why the drawing itself doesn't flip per residue even though the
 *    chemistry it carries does.
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
// RADIUS matches InChIRingGeometry.js's own buildChair (R=1.4); PUCKER is
// well beyond that function's own 0.25 (bumped up substantially on
// request, for a much more pronounced zigzag). At this ratio (0.7/1.4 =
// 0.5) tetrahedralOtherTwo's own axial/equatorial pair stops being cleanly
// opposite in raw z (checked numerically -- both end up the same sign,
// unlike the shallower ratio this module started with), so the
// axial/equatorial LABELS it returns are less chemically clean here.
// Checked (both numerically, against every test in this file, and
// visually) that this doesn't actually matter for what gets drawn: the
// equatorial stick's own direction never consults that z-sign distinction
// directly (only its outward projected x/y), and the one place z-sign IS
// consulted (substituentZSignFor, once per residue) still gives a
// consistent, correct answer. If PUCKER is tuned further, re-check
// test-chair-layout.js's own "points outward"/"anomer-independent" tests
// still pass -- they're what would actually catch a real break here.
const PUCKER = 0.7;
const RADIUS = 1.4;

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
const SCALE = 43; // 60 / 1.4 -- keeps the same overall rendered ring size now that RADIUS itself is 1.4 instead of 1

// `zSign` flips the pucker's own handedness (every z negated) -- see
// substituentZSignFor's own docstring for why this exists and why it's
// applied here, at the INPUT to the ring build, rather than by negating a
// computed direction afterwards.
function ring3D(zSign = 1) {
  const points = {};
  RING_ORDER.forEach((key, i) => {
    const angle = PHASE + i * (Math.PI / 3);
    points[key] = new Vec3(RADIUS * Math.cos(angle), RADIUS * Math.sin(angle), zSign * (i % 2 === 0 ? PUCKER : -PUCKER));
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
 * with a filled polygon), every edge here is uniform-width along its own
 * length -- a renderer can always draw a plain line, never a polygon --
 * just not all the SAME width: the front face (bold) tapers very slightly
 * through its own middle edge (see the bonds array's own comment).
 *
 * Always built at zSign=1 (see ring3D) -- the DRAWN ring looks the same
 * regardless of which real residue it's for; only substituentStickEnd's
 * own direction varies by residue (see substituentZSignFor).
 */
export function chairGeometry() {
  const points3d = ring3D();
  const vertices = {};
  for (const key of RING_ORDER) vertices[key] = project(points3d[key]);
  // Front face (nearer the viewer): bold at both ends (C2-C3, C4-C5), very
  // slightly lighter through the middle (C3-C4) -- a subtle taper (not
  // Haworth's own thin-to-bold wedge, just bold-to-slightly-less-bold)
  // conveying that C3-C4 recedes a little relative to the two corners
  // either side of it. Back face (O5-C1, C1-C2, C5-O5) stays plain/thin
  // throughout.
  const bonds = [
    { from: 'O5', to: 'C1', width: 'thin' },
    { from: 'C1', to: 'C2', width: 'thin' },
    { from: 'C2', to: 'C3', width: 'bold' },
    { from: 'C3', to: 'C4', width: 'medium' },
    { from: 'C4', to: 'C5', width: 'bold' },
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

function tetrahedralDirectionsAt(key, zSign) {
  const n = RING_ORDER.length;
  const i = RING_ORDER.indexOf(key);
  const points3d = ring3D(zSign);
  return tetrahedralOtherTwo(
    points3d[key],
    points3d[RING_ORDER[(i - 1 + n) % n]],
    points3d[RING_ORDER[(i + 1) % n]]
  );
}

/**
 * Which pucker handedness (ring3D's own `zSign`) this RESIDUE's real
 * chemistry needs -- the one real degree of freedom tetrahedralOtherTwo
 * doesn't resolve on its own (its axial/equatorial pair, at a single
 * position, is already fully fixed by that position's two ring-bond
 * neighbours -- see chairStickEnd's own docstring). A chair ring is rigid:
 * every position shares the SAME handedness, so this is computed ONCE per
 * residue, from any one position's own real (axEq, orientation).
 *
 * The reference must NOT be the anomeric position (1): its own orientation
 * AND axEq are set directly from the anomer label (alpha/beta), by real
 * chemistry, independently of the rest of the ring's own fixed handedness
 * (see HaworthLayout.js's own layoutSubstituents, position-1 branch) --
 * using it here as the reference confused "which anomer this is" with
 * "which handedness the ring itself has", so switching anomer flipped
 * every OTHER substituent's drawn direction too, not just the anomeric
 * one's (an actual reported bug, not a hypothetical). Positions 2-5 don't
 * depend on anomer at all, so any of those is a safe reference -- see
 * ChairSVG.js's own layoutChairResidue for which one it actually picks.
 *
 * Checked at zSign=1 (chairGeometry's own default): if that position's own
 * tetrahedral direction (whichever slot its real axEq names) already
 * projects to the real `orientation`'s face, zSign=1 is right for this
 * residue; otherwise it needs the other handedness, zSign=-1.
 *
 * An earlier version tried to resolve this per SUBSTITUENT instead, by
 * negating the computed direction outright whenever its sign didn't
 * match: wrong, found by checking the actual rendered angle, not just the
 * reasoning -- negating a real tetrahedral direction flips its outward
 * lean along with its up/down face (they aren't independent components of
 * one vector), so on a position where the default handedness gave the
 * wrong face, the "fix" pointed the stick into the ring instead of away
 * from it. Flipping the ring's own INPUT pucker instead (what this
 * function feeds tetrahedralDirectionsAt) recomputes a fresh, still
 * genuinely tetrahedral (and still outward) direction, confirmed
 * numerically: same projected x (still outward), flipped y (now the
 * right face) -- not assumed, checked.
 */
export function substituentZSignFor(referencePosition, referenceOrientation, referenceAxEq) {
  const key = vertexKeyForPosition(referencePosition);
  const { axial, equatorial } = tetrahedralDirectionsAt(key, 1);
  const dir = referenceAxEq === 'ax' ? axial : equatorial;
  // Raw z, not this module's own rotated/projected screen-y -- same
  // up/down convention InChIRingGeometry.js's own deriveHaworthOrientation
  // uses (z<0 means up), and confirmed (not assumed) to alternate cleanly
  // by position parity for BOTH axial and equatorial, across every
  // position -- unlike the projected screen-y, which mixes in the ring's
  // own x/y extent and does NOT reliably alternate the same simple way
  // (checked numerically; an earlier version compared the projected value
  // here instead, and got a per-position-inconsistent answer: right at
  // the one reference position by construction, wrong at others).
  const isUp = dir.z < 0;
  return isUp === (referenceOrientation === 'up') ? 1 : -1;
}

/**
 * A substituent stick's own far endpoint -- the chair-specific counterpart
 * to HaworthSVG.js's substituentStickEnd (which is always vertical; this
 * is only vertical for an axial substituent). `vertices` must be the SAME
 * object chairGeometry() just returned for this residue; `zSign` must be
 * the SAME residue's own substituentZSignFor result (computed once, from
 * any one of its real substituents -- see that function's own docstring),
 * reused here for every position of that residue.
 *
 * `axEq` picks the direction family: 'ax' is a pure vertical stick (same
 * up/down convention as Haworth -- up is negative y, via `orientation`
 * directly -- `zSign` plays no part here, Haworth's own up/down already
 * fully determines it). 'eq' takes InChIRingGeometry.js's own
 * tetrahedralOtherTwo, fed this SAME idealized 3D ring's own real
 * neighbour positions at the given `zSign`, projected through the SAME
 * viewing transform as the ring itself -- a real tetrahedral angle,
 * genuinely outward, not a hand-tuned approximation and not a post-hoc
 * flip of a computed vector (see substituentZSignFor's own docstring for
 * why that was wrong).
 */
export function chairStickEnd(vertices, position, orientation, axEq, zSign) {
  const key = vertexKeyForPosition(position);
  const vertex = vertices[key];
  if (axEq === 'ax') {
    const verticalSign = orientation === 'up' ? -1 : 1;
    return { x: vertex.x, y: vertex.y + verticalSign * STICK_LENGTH };
  }

  const { equatorial } = tetrahedralDirectionsAt(key, zSign);
  const projected = project(equatorial, 1); // a unit direction, not a point -- scaled separately below
  const dir = normalize(projected.x, projected.y);
  return { x: vertex.x + dir.x * STICK_LENGTH, y: vertex.y + dir.y * STICK_LENGTH };
}

export { STICK_LENGTH };
