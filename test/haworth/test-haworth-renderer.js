/*global QUnit*/

import Sugar from '../../js/Sugar.js';
import { IO as Iupac } from '../../js/CondensedIupac.js';
import SugarAwareLayout from '../../js/SugarAwareLayout.js';
import HaworthRenderer from '../../js/Haworth/HaworthRenderer.js';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('HaworthRenderer - plugged into the generic icon-based Renderer framework', {});

QUnit.test('renders Gal-(b1-4)-GlcNAc: one ring icon per residue, one glycosidic bond with an inline O', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-4)GlcNAc';

  const renderer = new HaworthRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;

  // One real ring icon per residue -- each tagged with its own location,
  // same convention every other renderer's icon uses.
  const locations = [...svg.querySelectorAll('g[glycanjs\\:location]')].map((g) =>
    g.getAttributeNS('https://glycocode.com/glycanjs', 'location')
  );
  assert.equal(new Set(locations).size, 2, 'two distinct residue locations tagged');

  // Each ring icon actually drew something (bonds/sticks), not an empty group.
  for (const g of svg.querySelectorAll('g[glycanjs\\:location]')) {
    assert.ok(g.querySelector('line, polygon'), 'residue icon has real ring/stick markup, not an empty group');
  }

  // The one glycosidic bond: two line segments (stroke-width 1.8) either
  // side of an inline "O" -- same convention renderGlycanSVG's own
  // glycosidic-bond loop uses.
  const bondLines = [...svg.querySelectorAll('line[stroke-width="1.8"]')];
  assert.equal(bondLines.length, 2, 'two glycosidic bond segments (either side of the inline O)');

  const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
  assert.ok(texts.includes('O'), 'an inline bridging O label is drawn for the one linkage');
});

QUnit.test('renders the N-glycan trimannosyl core, horizontal, as 6 real ring icons and 5 bonds', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';

  // Matches sviewer's own `this.renderer.rotate = this.hasAttribute('horizontal')`
  // wiring (lite.js) -- the "horizontal SugarAwareLayout" the renderer is
  // meant to roughly follow lays the reducing end out to the right with
  // this flag set, not in its default (vertical, reducing end at the
  // bottom) orientation.
  const renderer = new HaworthRenderer(document.body, SugarAwareLayout);
  renderer.rotate = true;
  renderer.leftToRight = false;
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const icons = [...svg.querySelectorAll('g[glycanjs\\:identifier]')];
  assert.equal(icons.length, 6, 'all 6 residues (2 GlcNAc, 2 Man branch, 1 Man branch-point, 1 Fuc) got a real ring icon');
  for (const icon of icons) {
    assert.ok(icon.querySelector('line, polygon'), `${icon.getAttributeNS('https://glycocode.com/glycanjs', 'identifier')}'s icon has real ring/stick markup`);
  }

  // 5 linkages (one per non-root residue) -> 5 bonds, each 2 segments.
  assert.equal(svg.querySelectorAll('line[stroke-width="1.8"]').length, 10, '5 glycosidic bonds, 2 segments each');

  // Horizontal, reducing end on the right (leftToRight = false): every
  // non-root residue on the MAIN CHAIN sits to the LEFT of the root GlcNAc
  // (whose own translate is always (0,0) -- see setIconPosition/
  // layoutResidue's own (0,0)-centered local frame). Fuc is deliberately
  // excluded -- SugarAwareLayout special-cases a lone Fuc/NeuAc sibling as
  // a rotated "stub" placed directly above/below its parent
  // (x=0) rather than out to the side, which is SugarAwareLayout's own
  // layout choice, not something this renderer overrides.
  const mainChainX = icons
    .filter((icon) => icon.getAttributeNS('https://glycocode.com/glycanjs', 'parent') !== ''
      && icon.getAttributeNS('https://glycocode.com/glycanjs', 'identifier') !== 'Fuc')
    .map((icon) => Number(icon.getAttribute('transform').match(/translate\(([-\d.]+),/)[1]));
  assert.ok(mainChainX.every((x) => x < 0), 'every main-chain residue sits left of the reducing end');
});

QUnit.test('an unsupported residue shape falls back to a plain line, not a crash', function(assert) {
  // 'P' (phosphate) has no hexose/furanose/sialic terminii shape -- this
  // exercises residueHaworthLayout's null branch (both in renderIcon, via
  // placeholderSVGParts, and in renderLinkage, via the plain-line fallback)
  // rather than asserting on anything it draws cosmetically.
  const sugar = new IupacSugar();
  sugar.sequence = 'P(1-6)Man';

  const renderer = new HaworthRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();
  assert.ok(true, 'does not throw on a residue shape this renderer cannot draw as a real ring');
});
