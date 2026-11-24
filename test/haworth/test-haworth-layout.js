/*global QUnit*/

import {
  layoutSubstituents,
  parseTerminii,
  layoutFuranoseSubstituents,
  furanoseGeometry,
  layoutSialicSubstituents,
  ringGeometry,
} from '../../js/Haworth/HaworthLayout.js';

QUnit.module('HaworthLayout - parseTerminii', {});

QUnit.test('parses ring positions and the exocyclic C6 label separately', function(assert) {
  const { positions, c6Label } = parseTerminii('r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH');
  assert.equal(positions.get(1).label, 'OH');
  assert.equal(positions.get(2).axEq, 'eq');
  assert.equal(positions.get(4).axEq, 'ax');
  assert.equal(c6Label, 'HOH');
});

QUnit.module('HaworthLayout - ringGeometry', {});

// The front face (nearest the viewer) is a tapered wedge -- thin at C1,
// full thickness through C2, tapering back to thin at C4 -- rather than a
// flat bold/thin split, per visual feedback on the rendered rings.
QUnit.test('front face tapers thin-bold-thin across C1-C2-C3-C4, not a flat two-edge bold split', function(assert) {
  const { bonds } = ringGeometry();
  const byPair = (from, to) => bonds.find((b) => b.from === from && b.to === to);
  assert.deepEqual([byPair('C1', 'C2').widthFrom, byPair('C1', 'C2').widthTo], ['thin', 'bold'], 'C1-C2 tapers up to full thickness');
  assert.deepEqual([byPair('C2', 'C3').widthFrom, byPair('C2', 'C3').widthTo], ['bold', 'bold'], 'C2-C3 is the uniform middle');
  assert.deepEqual([byPair('C3', 'C4').widthFrom, byPair('C3', 'C4').widthTo], ['bold', 'thin'], 'C3-C4 tapers back down');
  for (const [from, to] of [['O5', 'C1'], ['C4', 'C5'], ['C5', 'O5']]) {
    const b = byPair(from, to);
    assert.deepEqual([b.widthFrom, b.widthTo], ['thin', 'thin'], `${from}-${to} stays uniformly thin`);
  }
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

QUnit.module('HaworthLayout - furanoseGeometry', {});

// Regression test for a tracing error caught by comparing against a
// second, clearer published reference (alpha/beta-D-glucofuranose) after
// the first one (alpha-D-ribofuranose) was misread as having a third bold
// edge.
QUnit.test('pentagon: 5 vertices (4 ring carbons + the ring oxygen, O4), 2 bold front edges (same as the hexose ring)', function(assert) {
  const { vertices, bonds } = furanoseGeometry();
  assert.deepEqual(Object.keys(vertices).sort(), ['C1', 'C2', 'C3', 'C4', 'O4'].sort());
  const bold = bonds.filter((b) => b.widthFrom === 'bold' && b.widthTo === 'bold');
  assert.equal(bold.length, 2, 'only C1-C2 and C2-C3 are uniformly bold -- matches published alpha/beta-D-ribofuranose and alpha/beta-D-glucofuranose structures');
  assert.ok(bold.some((b) => b.from === 'C1' && b.to === 'C2'));
  assert.ok(bold.some((b) => b.from === 'C2' && b.to === 'C3'));
  assert.equal(bonds.length, 5, '5 ring bonds total');
});

QUnit.module('HaworthLayout - layoutFuranoseSubstituents (Galf/Glcf/Manf)', {});

// Galf's terminii (r1:OH;2eq:OH;3ax:OH;4ax:CHOHCHHOH) are hand-authored
// literals, not InChI-derived -- see InChITerminii.js. This uses the same
// even/odd position-parity rule as the hexose shape; D-series only, so the
// D/L correction isn't exercised here (see layoutFuranoseSubstituents'
// own docstring).
const GALF_TERMINII = 'r1:OH;2eq:OH;3ax:OH;4ax:CHOHCHHOH';

QUnit.test('beta-D-Galf: up, down, down, up (C1-C4) -- the composite C5-C6 tail reads as one label', function(assert) {
  const { substituents } = layoutFuranoseSubstituents(GALF_TERMINII, { anomer: 'b' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s]));
  assert.equal(byPos[1].orientation, 'up', 'C1 (beta) up');
  assert.equal(byPos[2].orientation, 'down');
  assert.equal(byPos[3].orientation, 'down');
  assert.equal(byPos[4].orientation, 'up');
  assert.equal(byPos[4].label, 'CH(OH)CH₂OH', 'the C5-C6 tail drawn as one composite label, like the hexose shape\'s C6 group');
});

QUnit.test('alpha-D-Galf: only C1 flips relative to beta', function(assert) {
  const { substituents } = layoutFuranoseSubstituents(GALF_TERMINII, { anomer: 'a' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'down');
  assert.equal(byPos[2], 'down');
  assert.equal(byPos[3], 'down');
  assert.equal(byPos[4], 'up');
});

// Regression test matching published alpha/beta-D-glucofuranose Haworth
// structures directly (a hexose in furanose form -- the same ring shape
// and the same 2-carbon C5-C6 tail Galf/Glcf/Manf use, unlike
// ribofuranose's plain CH2OH): C1 down for alpha / up for beta (only
// position that changes), C2 down, C3 up, C4 (tail) up, for both anomers.
const GLCF_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:CHOHCHHOH';

QUnit.test('alpha-D-Glcf matches the published alpha-D-glucofuranose structure', function(assert) {
  const { substituents } = layoutFuranoseSubstituents(GLCF_TERMINII, { anomer: 'a' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'down');
  assert.equal(byPos[2], 'down');
  assert.equal(byPos[3], 'up');
  assert.equal(byPos[4], 'up');
});

QUnit.test('beta-D-Glcf matches the published beta-D-glucofuranose structure (only C1 flips)', function(assert) {
  const { substituents } = layoutFuranoseSubstituents(GLCF_TERMINII, { anomer: 'b' });
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s.orientation]));
  assert.equal(byPos[1], 'up');
  assert.equal(byPos[2], 'down');
  assert.equal(byPos[3], 'up');
  assert.equal(byPos[4], 'up');
});

QUnit.module('HaworthLayout - layoutSialicSubstituents (NeuAc/NeuGc/NeuAc9Ac)', {});

// NeuAc's terminii (1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH)
// use sialic's own numbering (see InChITerminii.js's buildSialic), remapped
// internally onto the SAME hexagon the hexose shape uses: sialic C2
// (anomeric) = hexagon C1, sialic C4/C5/C6 = hexagon C3/C4/C5. Sialic C3
// (a plain CH2, not a stereocentre) has nothing to derive and is correctly
// absent from the output; the C7-C8-C9 glycerol tail is one composite
// label hanging off hexagon C5, the same position the hexose shape's own
// C6 group hangs off.
const NEUAC_INCHI = 'InChI=1S/C11H19NO9/c1-4(14)12-7-5(15)2-11(20,10(18)19)21-9(7)8(17)6(16)3-13/h5-9,13,15-17,20H,2-3H2,1H3,(H,12,14)(H,18,19)/t5-,6+,7+,8+,9+,11?/m0/s1';
const NEUAC_TERMINII = '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH';

QUnit.test('alpha-NeuAc: the anomeric OH and the exocyclic COOH are a complementary pair at hexagon C1', function(assert) {
  const { substituents } = layoutSialicSubstituents(NEUAC_TERMINII, NEUAC_INCHI, { anomer: 'a' });
  const atC1 = substituents.filter((s) => s.position === 1);
  assert.equal(atC1.length, 2, 'both the OH and the COOH are reported, both at hexagon C1');
  const oh = atC1.find((s) => s.label === 'OH');
  const cooh = atC1.find((s) => s.label === 'COOH');
  assert.ok(oh && cooh, 'one is the anomeric OH, the other the exocyclic COOH');
  assert.notEqual(oh.orientation, cooh.orientation, 'complementary faces -- never both up or both down');
  assert.ok(cooh.neverSuppress, 'COOH must survive a glycosidic-bond suppression at position 1 (that only replaces the OH)');

  assert.equal(substituents.find((s) => s.position === 2), undefined, 'sialic C3 (hexagon C2, a plain CH2) has nothing to derive, so nothing is drawn there');

  // Sialic C4/C5/C6 (hexagon C3/C4/C5): real, InChI-derived stereocentres,
  // matching the well-documented 2C5 conformation (equatorial C4/C5/C6).
  const byPos = Object.fromEntries(substituents.map((s) => [s.position, s]));
  assert.equal(byPos[3].orientation, 'down', 'sialic C4');
  assert.equal(byPos[4].orientation, 'up', 'sialic C5');
  assert.equal(byPos[5].orientation, 'down', 'sialic C6 (where the tail hangs)');
  assert.equal(byPos[5].label, 'CH(OH)CH(OH)CH₂OH', 'the C7-C8-C9 tail drawn as one composite label');
});

QUnit.test('beta-NeuAc: only the anomeric OH/COOH pair flips relative to alpha; the real ring stereocentres do not', function(assert) {
  const alpha = layoutSialicSubstituents(NEUAC_TERMINII, NEUAC_INCHI, { anomer: 'a' }).substituents;
  const beta = layoutSialicSubstituents(NEUAC_TERMINII, NEUAC_INCHI, { anomer: 'b' }).substituents;
  const at = (subs, pos, label) => subs.find((s) => s.position === pos && (!label || s.label === label));

  assert.notEqual(at(alpha, 1, 'OH').orientation, at(beta, 1, 'OH').orientation);
  assert.notEqual(at(alpha, 1, 'COOH').orientation, at(beta, 1, 'COOH').orientation);
  for (const pos of [3, 4, 5]) {
    assert.equal(at(alpha, pos).orientation, at(beta, pos).orientation, `position ${pos} unaffected by anomer`);
  }
});
