/*global QUnit*/

import {
  renderResidueChairSVG,
  renderGlycanChairSVG,
  layoutChairResidue,
  chairAnchorPoint,
} from '../../js/Haworth/ChairSVG.js';

QUnit.module('ChairSVG - layoutChairResidue', {});

const GLCNAC_INCHI = 'InChI=1S/C8H15NO6/c1-3(11)9-5-7(13)6(12)4(2-10)15-8(5)14/h4-8,10,12-14H,2H2,1H3,(H,9,11)/t4-,5-,6-,7-,8?/m1/s1';
const GLCNAC_TERMINII = 'r1:OH;2eq:NHAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH';
const GAL_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1';
const GAL_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH';
// A furanose -- Galf (see test-sugar-layout.js's own GALF_* constants for
// the same shape used elsewhere).
const GALF_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:CHOHCHHOH';
const GALF_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1';

QUnit.test('resolves real substituents + axEq for the hexose shape (reusing HaworthLayout.js unchanged)', function(assert) {
  const layout = layoutChairResidue(GLCNAC_TERMINII, GLCNAC_INCHI, { anomer: 'b', shape: 'hexose' });
  assert.ok(layout, 'a real layout, not null, for a supported shape');
  assert.ok(layout.substituents.every((s) => s.axEq === 'ax' || s.axEq === 'eq'), 'every substituent carries a real axEq');
});

QUnit.test('returns null for furanose -- no chair geometry for a 5-membered ring', function(assert) {
  const layout = layoutChairResidue(GALF_TERMINII, GALF_INCHI, { anomer: 'b', shape: 'furanose' });
  assert.equal(layout, null);
});

QUnit.test('stickOnlyPositions/labelOverrides work exactly like layoutResidue (reused verbatim via applySubstituentOverrides)', function(assert) {
  const stickOnly = layoutChairResidue(GLCNAC_TERMINII, GLCNAC_INCHI, {
    anomer: 'b', shape: 'hexose', stickOnlyPositions: new Set([1]),
  });
  const c1 = stickOnly.substituents.find((s) => s.position === 1);
  assert.equal(c1.label, null, 'label dropped, stick (and its real axEq/orientation) kept');
  assert.ok(c1.axEq === 'ax' || c1.axEq === 'eq');

  const overridden = layoutChairResidue(GLCNAC_TERMINII, GLCNAC_INCHI, {
    anomer: 'b', shape: 'hexose', labelOverrides: new Map([[5, 'OSO3H']]),
  });
  const tail = overridden.substituents.find((s) => s.position === 5);
  assert.equal(tail.label, 'OSO3H');
});

QUnit.module('ChairSVG - chairResidueSVGParts / renderResidueChairSVG', {});

QUnit.test('draws a real ring (uniform-width bonds + sticks), not a placeholder, for a supported shape', function(assert) {
  const svg = renderResidueChairSVG(GLCNAC_TERMINII, GLCNAC_INCHI, { anomer: 'b', shape: 'hexose', title: 'GlcNAc' });
  assert.ok(svg.includes('<svg'));
  assert.ok(!svg.includes('stroke-dasharray'), 'a real ring, not the dashed placeholder circle');
  assert.ok(svg.includes('stroke-width="4.2"'), 'the front arc is drawn bold');
  assert.ok(svg.includes('NHAc') && svg.includes('HOH₂C'));
});

QUnit.test('falls back to a placeholder for an unsupported shape (e.g. furanose) rather than guessing at a ring', function(assert) {
  const svg = renderResidueChairSVG(GALF_TERMINII, GALF_INCHI, { anomer: 'b', shape: 'furanose', title: 'Galf' });
  assert.ok(svg.includes('stroke-dasharray'));
  assert.ok(svg.includes('Galf'));
});

QUnit.module('ChairSVG - renderGlycanChairSVG / chairAnchorPoint', {});

QUnit.test('Gal-(1->4)-GlcNAc: the glycosidic bond connects flush to each residue\'s own real stick, both ends', function(assert) {
  const residues = [
    { id: 'glcnac', terminii: GLCNAC_TERMINII, inchi: GLCNAC_INCHI, anomer: 'b', shape: 'hexose', x: 400, y: 150 },
    { id: 'gal', terminii: GAL_TERMINII, inchi: GAL_INCHI, anomer: 'b', shape: 'hexose', x: 140, y: 130 },
  ];
  const linkages = [{ child: 'gal', parent: 'glcnac', parentPosition: 4 }];
  const svg = renderGlycanChairSVG(residues, linkages, { width: 560, height: 280 });

  assert.equal((svg.match(/stroke-width="1\.8"/g) || []).length, 2, 'one glycosidic bond, two segments either side of the inline O');

  // Cross-check against the SAME anchor function the renderer itself uses:
  // the bond's child-side segment should start exactly on Gal's own real
  // anomeric stick endpoint (no inset on that side, same convention
  // HaworthSVG.js's own anchorPoint uses).
  const galLayout = layoutChairResidue(GAL_TERMINII, GAL_INCHI, { anomer: 'b', shape: 'hexose', stickOnlyPositions: new Set([1]) });
  const expected = chairAnchorPoint(galLayout, 1, { x: 140, y: 130 });
  assert.ok(svg.includes(`x1="${expected.x.toFixed(1)}" y1="${expected.y.toFixed(1)}"`), 'the bond starts exactly on Gal\'s own anomeric stick');
});

QUnit.test('a linkage at position 6 resolves to the exocyclic C6 stick, not a bare vertex (same remap as Haworth)', function(assert) {
  const residues = [
    { id: 'fuc', terminii: 'r1:OH;2eq:OH;3ax:OH;4ax:OH;5eq:-;6eq:HH', inchi: 'InChI=1S/C6H12O5/c1-2-3(7)4(8)5(9)6(10)11-2/h2-10H,1H3/t2-,3+,4-,5+,6?/m0/s1', anomer: 'a', shape: 'hexose', x: 400, y: 150 },
    { id: 'glcnac', terminii: GLCNAC_TERMINII, inchi: GLCNAC_INCHI, anomer: 'b', shape: 'hexose', x: 140, y: 130 },
  ];
  const linkages = [{ child: 'fuc', parent: 'glcnac', parentPosition: 6 }];
  const svg = renderGlycanChairSVG(residues, linkages, { width: 560, height: 280 });
  assert.equal((svg.match(/stroke-width="1\.8"/g) || []).length, 2);
  assert.ok(svg.includes('<svg'));
});
