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
  const { substituents } = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'b' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'up', 'C1 (beta) up');
  assert.equal(byPos[2], 'down', 'C2 down');
  assert.equal(byPos[3], 'up', 'C3 up');
  assert.equal(byPos[4], 'down', 'C4 down');
  assert.equal(byPos[5], 'up', 'C5/CH2OH up');
});

// Regression tests for a bug caught visually TWICE on this same residue.
//
// First (see js/data/PUBCHEM_CID_CORRECTIONS.md): Fuc's terminii ax/eq
// labels used to be a hardcoded literal, not derived -- fixed by deriving
// orientation from the real InChI instead.
//
// Second, much deeper (see InChIRingGeometry.js's module docstring for the
// full story): a later rendering of beta-L-Fuc, compared directly against
// the published Wikimedia Commons structure (File:Beta-L-Fucopyranose.svg),
// showed every position inverted. True enantiomers (D-/L-fucopyranose
// share one /t string, only /m differs -- confirmed via PubChem), drawn in
// the SAME fixed ring frame this module and standard Haworth drawings both
// use, must invert at EVERY position -- axial/equatorial stays invariant
// (so Fuc's C2/C3/C4 ax/eq still shares D-galactose's pattern, Fuc being
// 6-deoxy-L-galactose), but Haworth up/down is an absolute-orientation
// fact and does not. This module used to compute positions 2-5 straight
// from the terminii string's ax/eq via a fixed parity rule with no D/L
// awareness at all (valid only because InChIRingGeometry.js's own
// derivation had the same missing correction at the time) -- it now
// applies the same D/L correction InChIRingGeometry.js's
// deriveHaworthOrientation does, to every position, C1 included.
const FUC_INCHI = 'InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3+,4+,5-,6?/m0/s1';
const FUC_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH';

QUnit.test('alpha-L-Fuc: up, up, down, down, down (C1,C2,C3,C4,C5/CH3) -- the full inverse of Gal, not a match', function(assert) {
  const { substituents } = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'a' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'up', 'C1 (alpha-L) up -- the full enantiomer inversion');
  assert.equal(byPos[2], 'up', 'C2 up (inverse of Gal\'s down)');
  assert.equal(byPos[3], 'down', 'C3 down (inverse of Gal\'s up)');
  assert.equal(byPos[4], 'down', 'C4 down (inverse of Gal\'s up)');
  assert.equal(byPos[5], 'down', 'C5/CH3 down (inverse of Gal\'s up)');
});

// Matches the published beta-L-fucopyranose Haworth structure directly
// (Wikimedia Commons, File:Beta-L-Fucopyranose.svg): C1 down, C2 up, C3
// down, C4 down, C5 (CH3) down. Only C1 differs from alpha-L above --
// anomeric configuration doesn't touch any other ring position.
QUnit.test('beta-L-Fuc: down, up, down, down, down -- matches the published Wikimedia Commons structure', function(assert) {
  const { substituents } = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'b' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'down', 'C1 (beta-L) down');
  assert.equal(byPos[2], 'up', 'C2 up');
  assert.equal(byPos[3], 'down', 'C3 down');
  assert.equal(byPos[4], 'down', 'C4 down');
  assert.equal(byPos[5], 'down', 'C5/CH3 down');
});

// Anomer formula cross-checked against real anomer-specific InChI for both
// D and L series (alpha/beta-D-glucose and alpha/beta-D/L-fucopyranose, all
// independently fetched from PubChem -- see InChIRingGeometry.js). D- and
// L-fucopyranose share one /t string with only /m differing: a true full
// enantiomer pair, so alpha-L and beta-L must be the FULL INVERSE of
// alpha-D and beta-D respectively, not match them.
QUnit.test('anomer/series relationship: true enantiomers (D-/L-fucopyranose) fully invert, including at C1', function(assert) {
  const glcAlpha = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'a' });
  const glcBeta = layoutSubstituents(GLC_TERMINII, GLC_INCHI, { anomer: 'b' });
  const fucAlpha = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'a' });
  const fucBeta = layoutSubstituents(FUC_TERMINII, FUC_INCHI, { anomer: 'b' });

  const c1 = (r) => r.substituents.find((s) => s.position === 1).orientation;
  assert.equal(c1(glcAlpha), 'down');
  assert.equal(c1(glcBeta), 'up');
  assert.equal(c1(fucAlpha), 'up', 'alpha-L-Fuc is the full inverse of alpha-D-Glc\'s face');
  assert.equal(c1(fucBeta), 'down', 'beta-L-Fuc is the full inverse of beta-D-Glc\'s face');
});
