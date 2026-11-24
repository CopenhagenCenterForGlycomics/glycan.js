/*global QUnit*/

import Monosaccharide from '../../js/Monosaccharide.js';
import { sugarToHaworthInput } from '../../js/Haworth/SugarLayout.js';
import { renderSugarTreeSVG } from '../../js/Haworth/HaworthSVG.js';

QUnit.module('SugarLayout - sugarToHaworthInput', {});

// The N-glycan trimannosyl core's reducing-end chain, with its defining
// branch point: Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc. This is a
// real, commonly-drawn branched structure (not a synthetic test shape), and
// it happens to exercise a position-6 linkage too (Man(a1-6)Man), which has
// no ring vertex of its own in this hexagon layout -- see HaworthSVG.js.
function nGlycanCore() {
  const root = new Monosaccharide('GlcNAc');
  const glcnac2 = new Monosaccharide('GlcNAc');
  glcnac2.anomer = 'b';
  root.addChild(4, glcnac2);

  const man1 = new Monosaccharide('Man');
  man1.anomer = 'b';
  glcnac2.addChild(4, man1);

  const man3 = new Monosaccharide('Man');
  man3.anomer = 'a';
  man1.addChild(3, man3);

  const man6 = new Monosaccharide('Man');
  man6.anomer = 'a';
  man1.addChild(6, man6);

  return { root, glcnac2, man1, man3, man6 };
}

QUnit.test('every residue gets a real, derived terminii/InChI (none unsupported)', function(assert) {
  const { root } = nGlycanCore();
  const { residues, unsupported } = sugarToHaworthInput(root);
  assert.equal(residues.length, 5, 'all 5 residues present');
  assert.equal(unsupported.length, 0, 'Hex/HexNAc shapes are all supported');
  assert.ok(residues.every((r) => r.terminii && r.inchi), 'every residue got real terminii + InChI');
});

QUnit.test('one linkage per non-root residue, including the position-6 branch', function(assert) {
  const { root } = nGlycanCore();
  const { linkages } = sugarToHaworthInput(root);
  assert.equal(linkages.length, 4, '4 non-root residues, 4 linkages');
  const positions = linkages.map((l) => l.parentPosition).sort();
  assert.deepEqual(positions, [3, 4, 4, 6], 'includes the a1-3 and a1-6 branch positions');
});

QUnit.test('branches get distinct rows; the two Man(a1-3)/Man(a1-6) siblings share depth but not y', function(assert) {
  const { root, man1, man3, man6 } = nGlycanCore();
  const { residues } = sugarToHaworthInput(root);
  const byNode = new Map(residues.map((r) => [r.id, r]));
  const man1X = byNode.get(man1).x;
  assert.equal(byNode.get(man3).x, byNode.get(man6).x, 'both branch children sit at the same depth (same x)');
  assert.notEqual(byNode.get(man3).y, byNode.get(man6).y, 'but at different rows (no overlap)');
  assert.ok(byNode.get(man3).x < man1X, 'branch children sit left of their parent (non-reducing direction)');
});

// Regression test for a bug caught visually: the two branch bond lines
// crossed. Position 3's vertex sits BELOW its parent's ring center and
// position 6's (the exocyclic-group vertex) sits ABOVE it (see
// ringGeometry() -- position 3 is at 120 degrees, position 6 shares
// position 5's vertex at 240 degrees), so the 1-6 child must be placed
// above the 1-3 child for their bond lines not to cross -- regardless of
// which order addChild() happened to be called in (man1.children here
// returns [man3, man6] in insertion order, the wrong order for this).
QUnit.test('a position-6 branch is placed above a position-3 branch (matches where each actually bonds, not insertion order)', function(assert) {
  const { root, man3, man6 } = nGlycanCore();
  const { residues } = sugarToHaworthInput(root);
  const byNode = new Map(residues.map((r) => [r.id, r]));
  assert.ok(byNode.get(man6).y < byNode.get(man3).y, 'Man(a1-6) sits above Man(a1-3), not insertion order');
});

QUnit.test('the root (reducing end) is the rightmost residue', function(assert) {
  const { root } = nGlycanCore();
  const { residues } = sugarToHaworthInput(root);
  const byNode = new Map(residues.map((r) => [r.id, r]));
  const rootX = byNode.get(root).x;
  assert.ok(residues.every((r) => r.x <= rootX), 'no residue sits to the right of the reducing end');
});

QUnit.test('an unresolvable or out-of-scope residue is reported and drawn as a placeholder, not crashed on', function(assert) {
  const root = new Monosaccharide('Gal');
  const pentose = new Monosaccharide('Xyl'); // real compound, but a 5-part (no exocyclic C6) shape this renderer doesn't handle yet
  pentose.anomer = 'a';
  root.addChild(6, pentose);
  const unknown = new Monosaccharide('TotallyMadeUp');
  root.addChild(3, unknown);

  const { residues, unsupported } = sugarToHaworthInput(root);
  assert.equal(unsupported.length, 2, 'both Xyl (wrong ring shape) and the unknown identifier are flagged');
  const byNode = new Map(residues.map((r) => [r.id, r]));
  assert.ok(byNode.get(pentose).placeholder, 'Xyl drawn as placeholder');
  assert.ok(byNode.get(unknown).placeholder, 'unknown identifier drawn as placeholder');
  assert.equal(byNode.get(pentose).terminii, null, 'no terminii fed to the renderer for a placeholder');

  // Must not throw despite the placeholders.
  const { svg } = renderSugarTreeSVG(root);
  assert.ok(svg.includes('<svg'), 'renders without error');
  assert.ok(svg.includes('stroke-dasharray'), 'placeholder residues drawn with a dashed circle');
});

// Sialyl-lactosamine-like structure: NeuAc(a2-6)Gal(b1-4)GlcNAc -- a real,
// commonly-drawn motif, exercising a sialic-acid child (bonding via its own
// anomeric hexagon-C1, same as any other shape's child) and a furanose
// child in the same tree, both now real rings instead of placeholders.
function sialylLacNAc() {
  const glcNAc = new Monosaccharide('GlcNAc');
  const gal = new Monosaccharide('Gal');
  gal.anomer = 'b';
  glcNAc.addChild(4, gal);
  const neuAc = new Monosaccharide('NeuAc');
  neuAc.anomer = 'a';
  gal.addChild(6, neuAc);
  const galf = new Monosaccharide('Galf');
  galf.anomer = 'b';
  gal.addChild(3, galf);
  return { glcNAc, gal, neuAc, galf };
}

QUnit.test('NeuAc and Galf are real rings now, not placeholders, with the right shape tag', function(assert) {
  const { glcNAc, neuAc, galf } = sialylLacNAc();
  const { residues, unsupported, linkages } = sugarToHaworthInput(glcNAc);
  assert.equal(unsupported.length, 0, 'nothing unsupported in this tree');
  const byNode = new Map(residues.map((r) => [r.id, r]));
  assert.equal(byNode.get(neuAc).shape, 'sialic');
  assert.equal(byNode.get(galf).shape, 'furanose');
  assert.notOk(byNode.get(neuAc).placeholder);
  assert.notOk(byNode.get(galf).placeholder);
  assert.ok(byNode.get(neuAc).terminii && byNode.get(neuAc).inchi);
  assert.ok(byNode.get(galf).terminii && byNode.get(galf).inchi);

  // NeuAc links via its own anomeric centre (hexagon C1), same as any
  // other shape's child -- not sialic's native "C2" numbering.
  const neuAcLink = linkages.find((l) => l.child === neuAc);
  assert.ok(neuAcLink, 'NeuAc(a2-6)Gal recorded as a linkage');
  assert.equal(neuAcLink.parentPosition, 6);

  const { svg } = renderSugarTreeSVG(glcNAc);
  assert.ok(svg.includes('<svg'), 'renders the whole tree without error');
  assert.ok(!svg.includes('stroke-dasharray'), 'no placeholders left -- every residue is a real ring');
});

QUnit.module('HaworthSVG - renderSugarTreeSVG', {});

QUnit.test('renders the N-glycan core: 5 rings, 4 bonds, no overlap-induced self-intersection markers', function(assert) {
  const { root } = nGlycanCore();
  const { svg, unsupported } = renderSugarTreeSVG(root);
  assert.equal(unsupported.length, 0);
  assert.ok(svg.includes('<svg'));
  // One bridging-bond line (stroke-width 1.8) per linkage.
  assert.equal((svg.match(/stroke-width="1\.8"/g) || []).length, 4, 'one glycosidic bond per linkage');
});
