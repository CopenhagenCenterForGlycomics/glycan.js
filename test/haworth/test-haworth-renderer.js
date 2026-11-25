/*global QUnit*/

import Sugar from '../../js/Sugar.js';
import { IO as Iupac } from '../../js/CondensedIupac.js';
import SugarAwareLayout from '../../js/SugarAwareLayout.js';
import LinkageLayout from '../../js/LinkageLayout.js';
import HaworthRenderer from '../../js/Haworth/HaworthRenderer.js';
import { ringGeometry, layoutSubstituents, layoutSialicSubstituents } from '../../js/Haworth/HaworthLayout.js';
import { substituentStickEnd } from '../../js/Haworth/HaworthSVG.js';
import { resolveResidueData } from '../../js/Haworth/SugarLayout.js';

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

QUnit.test('a lone Fuc stub sits far enough from its parent for its own OH label to read as its own', function(assert) {
  // SugarAwareLayout.js's own "stub along a chain" case (a single Fuc
  // sibling) places it at a fixed, absolute 0.75-DELTA_X offset -- sized
  // for that framework's own small icons, not this renderer's much wider
  // ring+stick footprint. Checked here in the DEFAULT (non-rotated,
  // non-horizontal) orientation, where position.dx maps directly onto the
  // icon's own x-translate, so the offset can be read straight off it.
  const sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';

  const renderer = new HaworthRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const fuc = svg.querySelector('g[glycanjs\\:identifier="Fuc"]');
  const fucX = Math.abs(Number(fuc.getAttribute('transform').match(/translate\(([-\d.]+),/)[1]));

  // The ring alone is ~86px wide (rx=43 each side -- HaworthLayout.js's
  // ringGeometry), before any stick/label -- SugarAwareLayout's own
  // un-adjusted 0.75*DELTA_X (~105px here) already overlaps that once the
  // stub's own substituent sticks/labels are added on top; this renderer's
  // own FUC_STUB_SPACING (0.95*DELTA_X, ~138px) should clear it with room
  // to spare.
  assert.ok(fucX > 110, `Fuc sits clear of its parent ring's own ~86px width plus stick/label room (got ${fucX}px)`);
});

QUnit.test('LayoutEngine assignment decorates whatever is given, never mutating it (sviewer\'s own linkangles-toggle pattern)', function(assert) {
  // sviewer never hands a renderer the base layout class itself -- always a
  // fresh `class extends layout_class {}` per (class, element) pair (see
  // lite.js's get_layout_engine()). Mirrored here with our own throwaway
  // subclasses, standing in for that.
  class SugarAwareLayoutInstance extends SugarAwareLayout {}
  class LinkageLayoutInstance extends LinkageLayout {}

  const renderer = new HaworthRenderer(document.body, SugarAwareLayoutInstance);
  assert.equal(renderer.LayoutEngine.DELTA_X, 145 / 100, 'the layout engine given at construction time is wrapped with this renderer\'s own spacing');
  assert.notOk(
    Object.getOwnPropertyDescriptor(SugarAwareLayoutInstance, 'DELTA_X'),
    'the engine the caller gave us is never mutated -- the override lives only on the wrapper this renderer uses internally'
  );

  // e.g. lite.js's `linkangles` attribute handler: `this.renderer.LayoutEngine = this.LayoutEngine` with a different base class.
  renderer.LayoutEngine = LinkageLayoutInstance;
  assert.equal(renderer.LayoutEngine.DELTA_X, 145 / 100, 'a layout engine swapped in later is wrapped too, not left at its own default spacing');
  assert.notOk(
    Object.getOwnPropertyDescriptor(LinkageLayoutInstance, 'DELTA_X'),
    'the newly assigned engine isn\'t mutated either'
  );
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

QUnit.test('a sialic-acid child\'s glycosidic bond donates from its own real anomeric carbon (hexagon C1), not hexagon C2', function(assert) {
  // NeuAc(a2-6)Gal: NeuAc's own `parent_linkage` is sialic's REAL native
  // numbering (2, its own anomeric carbon) -- this renderer's hexagon
  // frame maps that to hexagon C1 (see HaworthLayout.js's own sialic
  // C2-equals-hexagon-C1 convention), not hexagon C2 (sialic's real C3, a
  // plain non-stereocentre CH2 with nothing drawn there). Using the raw
  // "2" directly as a hexagon position -- the bug this guards against --
  // anchored the bond at that bare, wrong vertex instead.
  const sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc';

  const renderer = new HaworthRenderer(document.body, SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();

  const svg = renderer.element.canvas;
  const { vertices } = ringGeometry();

  const offsetOf = (identifier) => {
    const icon = svg.querySelector(`g[glycanjs\\:identifier="${identifier}"]`);
    const [, tx, ty] = icon.getAttribute('transform').match(/translate\(([-\d.]+),([-\d.]+)\)/);
    return { x: Number(tx), y: Number(ty) };
  };
  const point = (vertex, orientation, offset) => {
    const local = substituentStickEnd(vertex, orientation);
    return { x: local.x + offset.x, y: local.y + offset.y };
  };
  const findLineNear = (p) =>
    [...svg.querySelectorAll('line[stroke-width="1.8"]')].find(
      (l) => Math.hypot(Number(l.getAttribute('x1')) - p.x, Number(l.getAttribute('y1')) - p.y) < 0.5
    );

  // NeuAc's own side: real sialic C2 (anomeric), hexagon C1, alpha -> 'down'
  // (see HaworthLayout.js's layoutSialicSubstituents / its own regression
  // test) -- NOT hexagon C2 (sialic's real C3, a plain CH2, the bug this
  // guards against).
  const neuacData = resolveResidueData('NeuAc');
  const { substituents: neuacSubs } = layoutSialicSubstituents(neuacData.terminii, neuacData.inchi, { anomer: 'a' });
  const neuacOh = neuacSubs.find((s) => s.position === 1 && s.label === 'OH');
  const neuacExpected = point(vertices.C1, neuacOh.orientation, offsetOf('NeuAc'));
  assert.ok(findLineNear(neuacExpected), 'the glycosidic bond starts exactly on NeuAc\'s own hexagon-C1 (real anomeric, sialic C2) stick -- flush, not near hexagon C2');

  // Gal's own side: acceptor position 6 (sialic links to Gal's own C6)
  // remaps to hexagon C5 (substituentPositionFor) -- its real up/down
  // orientation comes from Gal's own real InChI-derived data, same as the
  // renderer itself resolves.
  const galData = resolveResidueData('Gal');
  const { substituents: galSubs } = layoutSubstituents(galData.terminii, galData.inchi, { anomer: 'b' });
  const galTail = galSubs.find((s) => s.position === 5);
  const galExpected = point(vertices.C5, galTail.orientation, offsetOf('Gal'));
  assert.ok(findLineNear(galExpected), 'the same glycosidic bond\'s other end sits exactly on Gal\'s own hexagon-C5 (its real C6) stick -- flush, no gap');
});
