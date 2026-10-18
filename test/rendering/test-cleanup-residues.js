/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';
import { Mass } from '../../js/Mass';
import SugarAwareLayout from '../../js/SugarAwareLayout';
import SVGRenderer from '../../js/SVGRenderer';

class IupacSugar extends Iupac(Sugar) {}

// Mass(base)'s MonosaccharideMass is a real `class MonosaccharideMass
// extends base.Monosaccharide`, so this mixin alone can't reproduce the bug
// below in-process (this test bundle only ever has one copy of
// Monosaccharide.js) - it's exercised here mainly as a sanity check that
// Mass-mixed sugars render/cleanup normally.
class IupacSugarMass extends Iupac(Mass(Sugar)) {}

QUnit.module('Test residue cleanup on redraw', {
});

QUnit.test('switching to a new sequence removes the previous residues from the DOM', function(assert) {
  let sugar = new IupacSugar();
  sugar.sequence = 'GalNAc(a1-O)Ser';

  let renderer = new SVGRenderer(document.createElement('div'),SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  sugar.sequence = 'Man(a1-O)Ser';
  renderer.refresh();

  let identifiers = [...renderer.element.canvas.querySelectorAll('use')]
    .map((el) => el.getAttributeNS('https://glycocode.com/glycanjs','identifier'));
  assert.deepEqual(identifiers.sort(), ['Man','Ser'], 'only the current sequence\'s residues remain');
});

QUnit.test('Mass-mixed sugars (MonosaccharideMass residues) also get cleaned up on redraw', function(assert) {
  let sugar = new IupacSugarMass();
  sugar.sequence = 'GalNAc(a1-O)Ser';

  let renderer = new SVGRenderer(document.createElement('div'),SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  sugar.sequence = 'Man(a1-O)Ser';
  renderer.refresh();

  let identifiers = [...renderer.element.canvas.querySelectorAll('use')]
    .map((el) => el.getAttributeNS('https://glycocode.com/glycanjs','identifier'));
  assert.deepEqual(identifiers.sort(), ['Man','Ser'], 'only the current sequence\'s residues remain, not the GalNAc leftover');
});

QUnit.test('cleanup does not depend on a residue passing instanceof Monosaccharide', function(assert) {
  // A bundler can end up with two separate copies of Monosaccharide.js for
  // one dependency (e.g. a symlinked package resolved via two different
  // real/symlinked paths) - when that happens, a perfectly real residue
  // subclass (like Mass(base)'s MonosaccharideMass) fails
  // `instanceof Monosaccharide` even though it genuinely extends it. That
  // can't be reproduced within a single webpack bundle (there's only ever
  // one copy of the module here), so this simulates it directly: a plain
  // object standing in for a leftover residue whose prototype chain simply
  // isn't Monosaccharide. cleanup_residues must still remove it because
  // it isn't one of the renderer's own tracked sugars - not because of its
  // prototype chain.
  let sugar = new IupacSugar();
  sugar.sequence = 'GalNAc(a1-O)Ser';

  let renderer = new SVGRenderer(document.createElement('div'),SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  let fakeResidueEl = renderer.element.canvas.ownerDocument.createElementNS('http://www.w3.org/2000/svg','use');
  renderer.element.canvas.appendChild(fakeResidueEl);
  let fakeResidue = {};
  renderer.rendered.set(fakeResidue, { residue: { element: fakeResidueEl }, linkage: null });

  sugar.sequence = 'Man(a1-O)Ser';
  renderer.refresh();

  assert.notOk(renderer.rendered.has(fakeResidue), 'the fake stale residue entry was cleaned up');
  assert.strictEqual(fakeResidueEl.parentNode, null, 'its element was removed from the DOM');
});
