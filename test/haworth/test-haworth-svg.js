/*global QUnit*/

import { renderGlycanSVG, layoutResidue, anchorPoint } from '../../js/Haworth/HaworthSVG.js';
import { ringGeometry, layoutSubstituents } from '../../js/Haworth/HaworthLayout.js';

QUnit.module('HaworthSVG - renderGlycanSVG', {});

const GLCNAC_INCHI = 'InChI=1S/C8H15NO6/c1-3(11)9-5-7(13)6(12)4(2-10)15-8(5)14/h4-8,10,12-14H,2H2,1H3,(H,9,11)/t4-,5-,6-,7-,8?/m1/s1';
const GLCNAC_TERMINII = 'r1:OH;2eq:NHAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH';
const GAL_INCHI = 'InChI=1S/C6H12O6/c7-1-2-3(8)4(9)5(10)6(11)12-2/h2-11H,1H2/t2-,3+,4+,5-,6?/m1/s1';
const GAL_TERMINII = 'r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH';

QUnit.test('Gal-(1->4)-GlcNAc: exactly one glycosidic bond, no stray OH at the linkage', function(assert) {
  const residues = [
    { id: 'glcnac', terminii: GLCNAC_TERMINII, inchi: GLCNAC_INCHI, anomer: 'b', x: 400, y: 150 },
    { id: 'gal', terminii: GAL_TERMINII, inchi: GAL_INCHI, anomer: 'b', x: 140, y: 130 },
  ];
  const linkages = [{ child: 'gal', parent: 'glcnac', parentPosition: 4 }];
  const svg = renderGlycanSVG(residues, linkages, { width: 560, height: 280 });

  // Exactly one bridging bond, drawn as two line segments (stroke-width
  // 1.8) either side of the inline "O" label's gap -- see HaworthSVG.js's
  // LINKAGE_LABEL_GAP.
  assert.equal((svg.match(/stroke-width="1\.8"/g) || []).length, 2, 'one glycosidic bond, drawn as two segments either side of its inline O');

  // GlcNAc keeps its free reducing-end C1 substituent (an OH stick+label)
  // since it isn't linked at that position.
  assert.ok(svg.includes('>OH<'), 'GlcNAc still shows its free anomeric OH');

  // Neither residue draws a normal OH stick at the linkage itself: GlcNAc's
  // C4 (OH) and Gal's C1 (OH) should each be suppressed, leaving exactly
  // GlcNAc's C1+C3 and Gal's C2+C3+C4 as plain hydroxyl labels (5 total) --
  // not the 7 there would be without suppression. Written as "OH" or "HO"
  // depending on which side of the ring the vertex is on (the bonded O
  // stays nearest its stick either way -- see HaworthSVG.js's orientLabel),
  // so both spellings count; either is an exact tag match, so neither also
  // matches inside "CH2OH" or "NHAc".
  const ohCount = (svg.match(/>OH<|>HO</g) || []).length;
  assert.equal(ohCount, 5, 'no extra OH label at either suppressed linkage position');
});

QUnit.test('the glycosidic bond starts from the child\'s own (unlabeled) anomeric stick, not the bare ring vertex', function(assert) {
  const residues = [
    { id: 'glcnac', terminii: GLCNAC_TERMINII, inchi: GLCNAC_INCHI, anomer: 'b', x: 400, y: 150 },
    { id: 'gal', terminii: GAL_TERMINII, inchi: GAL_INCHI, anomer: 'b', x: 140, y: 130 },
  ];
  const linkages = [{ child: 'gal', parent: 'glcnac', parentPosition: 4 }];
  const svg = renderGlycanSVG(residues, linkages, { width: 560, height: 280 });

  // Gal's own bare C1 vertex, in the same screen coordinates renderGlycanSVG
  // itself uses (local ring coordinates + the residue's own x/y offset).
  const { vertices } = ringGeometry();
  const bareC1 = { x: vertices.C1.x + 140, y: vertices.C1.y + 130 };

  // Gal's real anomeric (position 1) orientation, straight from the same
  // layout function the renderer itself uses -- confirms the direction the
  // stick should run, without hardcoding alpha/beta's up/down mapping here.
  const { substituents } = layoutSubstituents(GAL_TERMINII, GAL_INCHI, { anomer: 'b' });
  const c1 = substituents.find((s) => s.position === 1);
  assert.ok(c1, 'Gal has a real position-1 (anomeric) substituent entry to compare against');

  const bondLines = [...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"[^>]*stroke-width="1\.8"/g)];
  assert.equal(bondLines.length, 2, 'two glycosidic bond segments (either side of the inline O)');
  const nearGal = bondLines.find(([, x1, y1]) => Math.hypot(Number(x1) - bareC1.x, Number(y1) - bareC1.y) < 25);
  assert.ok(nearGal, 'one bond segment starts near Gal\'s own C1 corner');
  const [, x1, y1] = nearGal;
  const dy = Number(y1) - bareC1.y;
  assert.notEqual(Math.hypot(Number(x1) - bareC1.x, dy), 0, 'the bond does not start exactly on the bare ring vertex');
  assert.equal(Number(x1), bareC1.x, 'the stick (and the bond continuing from it) stays vertical, same x as the ring vertex');
  if (c1.orientation === 'up') {
    assert.ok(dy < 0, 'an "up" anomeric stick extends upward (negative dy) before the bond continues');
  } else {
    assert.ok(dy > 0, 'a "down" anomeric stick extends downward (positive dy) before the bond continues');
  }
});

QUnit.test('anchorPoint: the parent\'s own linked position (C4) resolves to its stick\'s endpoint, not the bare ring vertex', function(assert) {
  // Direct, unambiguous check on anchorPoint itself -- renderGlycanSVG's
  // own glycosidic-bond loop immediately pulls this raw point in by
  // LINKAGE_INSET *toward the child* afterward (see its `b =
  // shortenToward(rawA, rawB, LINKAGE_INSET)`), which moves it diagonally
  // rather than along GlcNAc's own local vertical stick direction -- not a
  // useful thing to assert on the rendered line coordinates themselves.
  const { vertices } = ringGeometry();
  const bareC4 = vertices.C4;

  const { substituents } = layoutSubstituents(GLCNAC_TERMINII, GLCNAC_INCHI, { anomer: 'b' });
  const c4 = substituents.find((s) => s.position === 4);
  assert.ok(c4, 'GlcNAc has a real position-4 substituent entry to compare against');

  const layout = layoutResidue(GLCNAC_TERMINII, GLCNAC_INCHI, {
    anomer: 'b',
    stickOnlyPositions: new Set([4]),
  });
  const point = anchorPoint(layout, 4, { x: 0, y: 0 });
  const dy = point.y - bareC4.y;

  assert.notEqual(dy, 0, 'anchorPoint does not return the bare ring vertex once C4 is stick-only');
  assert.equal(point.x, bareC4.x, 'the stick (and the bond continuing from it) stays vertical, same x as the ring vertex');
  if (c4.orientation === 'up') {
    assert.ok(dy < 0, 'an "up" C4 stick extends upward (negative dy) before the bond continues');
  } else {
    assert.ok(dy > 0, 'a "down" C4 stick extends downward (positive dy) before the bond continues');
  }
});
