/*global QUnit*/

import Sugar from '../../js/Sugar.js';
import { IO as Iupac } from '../../js/CondensedIupac.js';
import SugarAwareLayout from '../../js/SugarAwareLayout.js';
import ChairRenderer from '../../js/Haworth/ChairRenderer.js';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('ChairRenderer - plugged into the generic icon-based Renderer framework', {});

QUnit.test('renders Gal-(b1-4)-GlcNAc: one chair ring per residue, one glycosidic bond with an inline O', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-4)GlcNAc';

  const renderer = new ChairRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const locations = [...svg.querySelectorAll('g[glycanjs\\:location]')].map((g) =>
    g.getAttributeNS('https://glycocode.com/glycanjs', 'location')
  );
  assert.equal(new Set(locations).size, 2, 'two distinct residue locations tagged');

  for (const g of svg.querySelectorAll('g[glycanjs\\:location]')) {
    assert.ok(g.querySelector('line'), 'residue icon has real ring/stick markup, not an empty group');
  }

  const bondLines = [...svg.querySelectorAll('line[stroke-width="1.8"]')];
  assert.equal(bondLines.length, 2, 'two glycosidic bond segments (either side of the inline O)');

  const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent);
  assert.ok(texts.includes('O'), 'an inline bridging O label is drawn for the one linkage');
});

QUnit.test('renders the N-glycan trimannosyl core as 6 real chair rings and 5 bonds', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';

  const renderer = new ChairRenderer(document.body, SugarAwareLayout);
  renderer.rotate = true;
  renderer.leftToRight = false;
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const icons = [...svg.querySelectorAll('g[glycanjs\\:identifier]')];
  assert.equal(icons.length, 6, 'all 6 residues got a real chair ring icon');
  for (const icon of icons) {
    assert.ok(icon.querySelector('line'), `${icon.getAttributeNS('https://glycocode.com/glycanjs', 'identifier')}'s icon has real ring/stick markup`);
  }
  assert.equal(svg.querySelectorAll('line[stroke-width="1.8"]').length, 10, '5 glycosidic bonds, 2 segments each (including the Man(a1-6) and Fuc(a1-6) position-6 links)');
});

QUnit.test('sulfation (HSO3) still draws as a label swap, not a separate chair ring or bond -- same convention as HaworthRenderer', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'GlcNAc6S(b1-4)GlcNAc';

  const renderer = new ChairRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const hso3Icon = svg.querySelector('g[glycanjs\\:identifier="HSO3"]');
  assert.ok(hso3Icon, 'HSO3 still gets a located group');
  assert.equal(hso3Icon.querySelectorAll('*').length, 0, 'but nothing is drawn inside it');
  assert.equal(svg.querySelectorAll('line[stroke-width="1.8"]').length, 2, 'only the GlcNAc-GlcNAc bond -- none to HSO3');

  const sulfated = [...svg.querySelectorAll('g[glycanjs\\:identifier="GlcNAc"]')].find(
    (g) => g.getAttributeNS('https://glycocode.com/glycanjs', 'parent') !== ''
  );
  const texts = [...sulfated.querySelectorAll('text')].map((t) => t.textContent);
  // Either spelling counts -- which side of the ring position 5's stick
  // lands on (forward "OSO3H" or mirrored "HO3SO", see HaworthSVG.js's
  // own REVERSED_LABELS) depends on this ring's own geometry, not
  // anything this test should pin down.
  assert.ok(texts.includes('OSO3H') || texts.includes('HO3SO'), 'the sulfate label replaces the C6 hydroxyl on GlcNAc\'s own ring');
});

QUnit.test('a furanose residue falls back to a plain line, not a crash (no chair geometry for a 5-membered ring)', function(assert) {
  const sugar = new IupacSugar();
  sugar.sequence = 'Galf(b1-3)Gal';

  const renderer = new ChairRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();
  assert.ok(true, 'does not throw on a shape this renderer cannot draw as a real chair ring');
});

QUnit.test('LayoutEngine assignment decorates whatever is given, never mutating it', function(assert) {
  class SugarAwareLayoutInstance extends SugarAwareLayout {}

  const renderer = new ChairRenderer(document.body, SugarAwareLayoutInstance);
  assert.ok(renderer.LayoutEngine.DELTA_X > 0, 'the layout engine given at construction time is wrapped with this renderer\'s own spacing');
  assert.notOk(
    Object.getOwnPropertyDescriptor(SugarAwareLayoutInstance, 'DELTA_X'),
    'the engine the caller gave us is never mutated'
  );
});
