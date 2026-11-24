/*global QUnit*/

import { renderGlycanSVG } from '../../js/Haworth/HaworthSVG.js';

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

  // Exactly one bridging bond line (stroke-width 1.8) and its O label.
  assert.equal((svg.match(/stroke-width="1\.8"/g) || []).length, 1, 'one glycosidic bond line');

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
