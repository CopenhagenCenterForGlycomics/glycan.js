/*global QUnit*/

import { layoutSubstituents, parseTerminii } from '../../js/Haworth/HaworthLayout.js';

QUnit.module('HaworthLayout - parseTerminii', {});

QUnit.test('parses ring positions and the exocyclic C6 label separately', function(assert) {
  const { positions, c6Label } = parseTerminii('r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH');
  assert.equal(positions.get(1).label, 'OH');
  assert.equal(positions.get(2).axEq, 'eq');
  assert.equal(positions.get(4).axEq, 'ax');
  assert.equal(c6Label, 'HOH');
});

QUnit.module('HaworthLayout - layoutSubstituents', {});

const GLC_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5-,6?/m1/s1';
const GLC_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH';

QUnit.test('beta-D-Glc: down, up, down, up (C2,C3,C4,C5) -- textbook Haworth pattern', function(assert) {
  const { substituents } = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'b', isL: false });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'up', 'C1 (beta) up');
  assert.equal(byPos[2], 'down', 'C2 down');
  assert.equal(byPos[3], 'up', 'C3 up');
  assert.equal(byPos[4], 'down', 'C4 down');
  assert.equal(byPos[5], 'up', 'C5/CH2OH up');
});

// Regression test for the bug a user caught visually: Fuc's terminii ax/eq
// labels are a hardcoded literal in InChITerminii.js's buildDeoxyhex (see
// its comment -- InChI-based derivation was judged ambiguous for the
// L-series 1C4 case, so it just hardcodes a string matching a historical
// reference), not a genuine geometric derivation. The fix reads orientation
// from the real InChI directly instead of from terminii's ax/eq labels.
//
// Fuc = 6-deoxy-L-galactose, so its C2/C3/C4 must share D-galactose's
// axial/equatorial pattern (that classification is invariant under D/L
// mirroring) -- i.e. the same down/up/up Haworth pattern as Gal. Getting
// this right took two tries: the first fix (deriving via deriveHaworthOrientation
// with a /m-layer-driven flip) gave up/down/down here, which *looked*
// plausible but was still wrong -- it took this exact Fuc-vs-Gal check to
// catch that the /m flip itself doesn't generalize across ring shapes (see
// InChIRingGeometry.js's shapeNeedsMirrorFlip and PUBCHEM_CID_CORRECTIONS.md).
const FUC_INCHI = 'InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3+,4+,5-,6?/m0/s1';
const FUC_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH';

QUnit.test('alpha-L-Fuc: down, down, up, up, up (C1,C2,C3,C4,C5/CH3) -- matches Gal at C2/C3/C4', function(assert) {
  const { substituents } = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'a', isL: true });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'down', 'C1 (alpha-L) down -- matches alpha-D, not its mirror');
  assert.equal(byPos[2], 'down', 'C2 down');
  assert.equal(byPos[3], 'up', 'C3 up');
  assert.equal(byPos[4], 'up', 'C4 up');
  assert.equal(byPos[5], 'up', 'C5/CH3 up');
});

QUnit.test('beta-L-Fuc: only C1 flips relative to alpha-L', function(assert) {
  const { substituents } = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'b', isL: true });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'up', 'C1 (beta-L) up');
  assert.equal(byPos[2], 'down', 'C2 down');
  assert.equal(byPos[3], 'up', 'C3 up');
  assert.equal(byPos[4], 'up', 'C4 up');
});

// Anomer formula cross-checked against real anomer-specific InChI (not just
// internal self-consistency) for both D and L series -- see
// PUBCHEM_CID_CORRECTIONS.md. For a plain hexose (Glc), alpha-D and beta-L
// would share one ring face if the /m mirror flip applied to L-series here
// -- but it doesn't apply to the deoxyhexose shape at all (Fuc's own ring
// shape doesn't mirror the way Glc's does, confirmed by cross-checking Fuc
// against Gal), so alpha-L-Fuc instead matches alpha-D-Glc's face directly,
// and beta-L-Fuc matches beta-D-Glc's -- same as if Fuc's "L" label didn't
// flip anything at all for this particular ring shape.
QUnit.test('anomer/series relationship: for the deoxyhexose shape, L behaves like D (its /m mirror flip does not apply)', function(assert) {
  const glcAlpha = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'a', isL: false });
  const glcBeta = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'b', isL: false });
  const fucAlpha = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'a', isL: true });
  const fucBeta = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'b', isL: true });

  const c1 = (r) => r.substituents.find((s) => s.position === 1).orientation;
  assert.equal(c1(glcAlpha), 'down');
  assert.equal(c1(glcBeta), 'up');
  assert.equal(c1(fucAlpha), 'down', 'alpha-L-Fuc matches alpha-D-Glc, not its mirror');
  assert.equal(c1(fucBeta), 'up', 'beta-L-Fuc matches beta-D-Glc, not its mirror');
});
