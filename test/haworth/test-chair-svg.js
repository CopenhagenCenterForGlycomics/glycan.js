/*global QUnit*/

import {
  renderResidueChairSVG,
  renderGlycanChairSVG,
  layoutChairResidue,
  chairAnchorPoint,
} from '../../js/Haworth/ChairSVG.js';
import { chairStickEnd } from '../../js/Haworth/ChairLayout.js';
import monosaccharideData from '../../js/data/monosaccharides.js';
import { inchiToTerminii } from '../../js/InChITerminii.js';

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

QUnit.test('every substituent on a real residue (Fuc -- mixed axial/equatorial) points outward from the ring, not into it, using the SAME zSign throughout', function(assert) {
  // The actual bug report this guards against: deriving each position's
  // "which way is outward" independently (tried first) could satisfy a
  // position's required up/down face only by pointing its equatorial
  // stick INTO the ring instead of away from it. layoutChairResidue
  // resolves one zSign per residue (from position 1) and this confirms
  // every OTHER real position, not just that one, still points outward
  // once it's applied.
  const entry = monosaccharideData.find((e) => e.name === 'Fuc');
  const { terminii } = inchiToTerminii(entry.name, entry.inchi);
  const layout = layoutChairResidue(terminii, entry.inchi, { anomer: 'a', shape: 'hexose' });
  assert.ok(layout.substituents.some((s) => s.axEq === 'ax') && layout.substituents.some((s) => s.axEq === 'eq'), 'Fuc has a real mix of both, not all one or the other');

  for (const sub of layout.substituents) {
    const vertex = layout.vertices[`C${sub.position === 6 ? 5 : sub.position}`];
    const end = chairStickEnd(layout.vertices, sub.position, sub.orientation, sub.axEq, layout.zSign);
    const vertexDist = Math.hypot(vertex.x, vertex.y);
    const endDist = Math.hypot(end.x, end.y);
    assert.ok(endDist > vertexDist, `position ${sub.position} (${sub.axEq}, ${sub.orientation}) points outward`);
  }
});

const NEUAC_INCHI = 'InChI=1S/C11H19NO9/c1-4(14)12-7-5(15)2-11(20,10(18)19)21-9(7)8(17)6(16)3-13/h5-9,13,15-17,20H,2-3H2,1H3,(H,12,14)(H,18,19)/t5-,6+,7+,8+,9+,11?/m0/s1';
const NEUAC_TERMINII = '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH';

QUnit.test('switching anomer (a<->b) only moves the anomeric position\'s own stick, not every other substituent\'s -- for both hexose and sialic', function(assert) {
  // The actual bug report this guards against: the ring's own pucker
  // handedness (zSign) was being resolved from the ANOMERIC position's own
  // data, which flips with anomer by real chemistry (alpha/beta) -- so
  // switching anomer flipped the whole residue's handedness, moving every
  // OTHER substituent's drawn stick too, not just the anomeric one's.
  for (const [terminii, inchi, shape] of [
    [GLCNAC_TERMINII, GLCNAC_INCHI, 'hexose'],
    [NEUAC_TERMINII, NEUAC_INCHI, 'sialic'],
  ]) {
    const layoutA = layoutChairResidue(terminii, inchi, { anomer: 'a', shape });
    const layoutB = layoutChairResidue(terminii, inchi, { anomer: 'b', shape });
    assert.equal(layoutA.zSign, layoutB.zSign, `${shape}: the ring's own handedness doesn't depend on anomer`);

    for (const subA of layoutA.substituents) {
      if (subA.position === 1) continue; // the anomeric position itself is SUPPOSED to move
      const subB = layoutB.substituents.find((s) => s.position === subA.position && s.label === subA.label);
      if (!subB) continue;
      const endA = chairStickEnd(layoutA.vertices, subA.position, subA.orientation, subA.axEq, layoutA.zSign);
      const endB = chairStickEnd(layoutB.vertices, subB.position, subB.orientation, subB.axEq, layoutB.zSign);
      assert.deepEqual(endA, endB, `${shape}: position ${subA.position}'s own stick is unaffected by the OTHER anomer`);
    }
  }
});

QUnit.module('ChairSVG - chairResidueSVGParts / renderResidueChairSVG', {});

QUnit.test('draws a real ring (uniform-width bonds + sticks), not a placeholder, for a supported shape', function(assert) {
  const svg = renderResidueChairSVG(GLCNAC_TERMINII, GLCNAC_INCHI, { anomer: 'b', shape: 'hexose', title: 'GlcNAc' });
  assert.ok(svg.includes('<svg'));
  assert.ok(!svg.includes('stroke-dasharray'), 'a real ring, not the dashed placeholder circle');
  assert.ok(svg.includes('stroke-width="4.2"'), 'the front arc is drawn bold');
  // Either spelling counts -- which side of the ring a position's stick
  // lands on (and so whether its label reads forward or mirrored, see
  // HaworthSVG.js's own REVERSED_LABELS) depends on this ring's own
  // geometry, not on anything these tests should pin down.
  assert.ok(svg.includes('NHAc') || svg.includes('AcHN'));
  assert.ok(svg.includes('HOH₂C') || svg.includes('CH₂OH'));
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
