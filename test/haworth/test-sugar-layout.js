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

QUnit.test('the root (reducing end) is the rightmost residue', function(assert) {
  const { root } = nGlycanCore();
  const { residues } = sugarToHaworthInput(root);
  const byNode = new Map(residues.map((r) => [r.id, r]));
  const rootX = byNode.get(root).x;
  assert.ok(residues.every((r) => r.x <= rootX), 'no residue sits to the right of the reducing end');
});

QUnit.test('an unresolvable or out-of-scope residue is reported and drawn as a placeholder, not crashed on', function(assert) {
  const root = new Monosaccharide('Gal');
  const sialic = new Monosaccharide('NeuAc'); // real compound, but a ketose shape this renderer doesn't handle yet
  sialic.anomer = 'a';
  root.addChild(6, sialic);
  const unknown = new Monosaccharide('TotallyMadeUp');
  root.addChild(3, unknown);

  const { residues, unsupported } = sugarToHaworthInput(root);
  assert.equal(unsupported.length, 2, 'both NeuAc (wrong ring shape) and the unknown identifier are flagged');
  const byNode = new Map(residues.map((r) => [r.id, r]));
  assert.ok(byNode.get(sialic).placeholder, 'NeuAc drawn as placeholder');
  assert.ok(byNode.get(unknown).placeholder, 'unknown identifier drawn as placeholder');
  assert.equal(byNode.get(sialic).terminii, null, 'no terminii fed to the renderer for a placeholder');

  // Must not throw despite the placeholders.
  const { svg } = renderSugarTreeSVG(root);
  assert.ok(svg.includes('<svg'), 'renders without error');
  assert.ok(svg.includes('stroke-dasharray'), 'placeholder residues drawn with a dashed circle');
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
