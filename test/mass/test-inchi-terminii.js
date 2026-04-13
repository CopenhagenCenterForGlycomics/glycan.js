/*global QUnit*/

import { inchiToTerminii, parseInChI, parseFormula, parseTLayer, classifyMonosaccharide } from '../../js/InChITerminii.js';

QUnit.module('InChITerminii - parsers', {});

QUnit.test('parseInChI splits layers correctly', function(assert) {
  const inchi = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12/h1-6,7-12H/t2-,3+,4+,5-/m1/s1';
  const layers = parseInChI(inchi);
  assert.equal(layers.formula, 'C6H12O6', 'formula layer');
  assert.ok(layers.t, 'has t layer');
  assert.equal(layers.m, '1', 'm layer (D-series)');
  assert.equal(layers.s, '1', 's layer');
});

QUnit.test('parseFormula counts atoms correctly', function(assert) {
  const f = parseFormula('C6H12O6');
  assert.equal(f.C, 6, 'C=6');
  assert.equal(f.H, 12, 'H=12');
  assert.equal(f.O, 6, 'O=6');
});

QUnit.test('parseTLayer parses stereocentres', function(assert) {
  const t = parseTLayer('2-,3+,4+,5-');
  assert.equal(t.get(2), '-', 'pos 2 = minus');
  assert.equal(t.get(3), '+', 'pos 3 = plus');
  assert.equal(t.get(4), '+', 'pos 4 = plus');
  assert.equal(t.get(5), '-', 'pos 5 = minus');
});

QUnit.test('parseTLayer handles empty/null', function(assert) {
  assert.equal(parseTLayer(null).size, 0, 'null → empty map');
  assert.equal(parseTLayer('').size, 0, 'empty string → empty map');
});

QUnit.module('InChITerminii - classifyMonosaccharide', {});

QUnit.test('classifies D-hexose', function(assert) {
  // Free hexose: C6H12O6 = O6 (e.g. Glc, Gal, Man)
  assert.equal(classifyMonosaccharide({ C: 6, H: 12, O: 6 }, '1'), 'D_hexose');
});

QUnit.test('classifies L-hexose', function(assert) {
  assert.equal(classifyMonosaccharide({ C: 6, H: 12, O: 6 }, '0'), 'L_hexose');
});

QUnit.test('classifies HexNAc', function(assert) {
  assert.equal(classifyMonosaccharide({ C: 8, H: 15, N: 1, O: 5 }, '1'), 'hexnac');
});

QUnit.test('classifies sialic', function(assert) {
  assert.equal(classifyMonosaccharide({ C: 11, H: 19, N: 1, O: 8 }, '0'), 'sialic');
});

QUnit.test('classifies L-deoxyhex', function(assert) {
  // 6-deoxyhexose: C6H12O5 = O5 (e.g. Fuc, Rha)
  assert.equal(classifyMonosaccharide({ C: 6, H: 12, O: 5 }, '0'), 'L_deoxyhex');
});

QUnit.test('classifies pentose', function(assert) {
  assert.equal(classifyMonosaccharide({ C: 5, H: 10, O: 4 }, '1'), 'D_pentose');
});

QUnit.test('classifies uronic acid', function(assert) {
  // Uronic acid: C6H10O7 = O7 (e.g. GlcA, IdoA)
  assert.equal(classifyMonosaccharide({ C: 6, H: 10, O: 7 }, '1'), 'D_hexA');
});

QUnit.module('InChITerminii - inchiToTerminii round-trips', {});

// Use verified PubChem InChI strings
const GLC_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-/m1/s1';
const GAL_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4-,5+/m1/s1';
const MAN_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3-,4+,5-/m1/s1';
const GLCNAC_INCHI = 'InChI=1S/C8H15NO6/c1-3(11)9-5-7(13)6(12)4(2-10)15-8(5)14/h4-8,10,12-14H,2H2,1H3,(H,9,11)/t4-,5+,6+,7-/m1/s1';
const FUC_INCHI = 'InChI=1S/C6H12O5/c1-3-4(7)5(8)6(9)2-10-3/h3-9H,2H2,1H3/t3-,4+,5+,6-/m0/s1';
const XYL_INCHI = 'InChI=1S/C5H10O5/c6-1-2-3(7)4(8)5(9)10-2/h2-9H,1H2/t2-,3+,4-,5+/m1/s1';
const NEUAC_INCHI = 'InChI=1S/C11H19NO9/c1-4(14)12-7-5(15)2-11(20,10(18)19)9(17)8(7)16-6(3-13)21-11/h5-10,13,15-17H,2-3H2,1H3,(H,12,14)(H,18,19)/t5-,6+,7+,8-,9-,10+,11-/m0/s1';
const GLCN_INCHI = 'InChI=1S/C6H13NO5/c7-3-5(10)4(9)2(1-8)12-6(3)11/h2-6,8-11H,1,7H2/t2-,3+,4+,5-/m1/s1';

// Glucose: D-hexose, C2/C3/C4 all eq in 4C1
QUnit.test('Glc round-trip', function(assert) {
  const { terminii, warnings } = inchiToTerminii('Glc', GLC_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH', 'Glc terminii');
  assert.equal(warnings.length, 0, 'No warnings');
});

// Galactose: C4=ax
QUnit.test('Gal round-trip', function(assert) {
  const { terminii } = inchiToTerminii('Gal', GAL_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH', 'Gal terminii');
});

// Mannose: DEFINITIONS has C2=ax (same as strict 4C1 chemistry for Man)
QUnit.test('Man round-trip', function(assert) {
  const { terminii } = inchiToTerminii('Man', MAN_INCHI);
  assert.equal(terminii, 'r1:OH;2ax:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH', 'Man terminii');
});

// GlcNAc
QUnit.test('GlcNAc round-trip', function(assert) {
  const { terminii } = inchiToTerminii('GlcNAc', GLCNAC_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH', 'GlcNAc terminii');
});

// Fucose (L-deoxyhex, 1C4)
QUnit.test('Fuc round-trip', function(assert) {
  const { terminii, conformation } = inchiToTerminii('Fuc', FUC_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH', 'Fuc terminii');
  assert.equal(conformation, '1C4', 'Fuc conformation');
});

// Xylose (D-pentose)
QUnit.test('Xyl round-trip', function(assert) {
  const { terminii } = inchiToTerminii('Xyl', XYL_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H', 'Xyl terminii');
});

// NeuAc (sialic)
QUnit.test('NeuAc round-trip', function(assert) {
  const { terminii } = inchiToTerminii('NeuAc', NEUAC_INCHI);
  assert.equal(terminii, '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH', 'NeuAc terminii');
});

// NeuAc9Ac (9-O-acetylneuraminic acid)
const NEUAC9AC_INCHI = 'InChI=1S/C13H21NO10/c1-5(15)14-9-7(17)3-13(22,12(20)21)24-11(9)10(19)8(18)4-23-6(2)16/h7-11,17-19,22H,3-4H2,1-2H3,(H,14,15)(H,20,21)/t7-,8+,9+,10+,11+,13?/m0/s1';
QUnit.test('NeuAc9Ac round-trip', function(assert) {
  const { terminii } = inchiToTerminii('NeuAc9Ac', NEUAC9AC_INCHI);
  assert.equal(terminii, '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOHAc', 'NeuAc9Ac terminii');
});

// Prokaryotic override test
QUnit.test('Kdo uses override', function(assert) {
  // Any InChI — override should take precedence
  const { terminii, source } = inchiToTerminii('Kdo', 'InChI=1S/C8H14O8/dummy');
  assert.equal(source, 'override', 'Uses override path');
  assert.ok(terminii.startsWith('1ax:OO'), 'Kdo terminii starts with carboxylic acid');
});

QUnit.test('GlcN round-trip', function(assert) {
  const { terminii } = inchiToTerminii('GlcN', GLCN_INCHI);
  assert.equal(terminii, 'r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH', 'GlcN terminii');
});
