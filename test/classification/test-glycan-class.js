/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';
import { classifyGlycan } from '../../js/GlycanClass';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Classifying glycans by structural type', {
});

// [sequence, expected type (or family, for families without types)]
const CASES = [
  ['Man(a1-2)Man(a1-2)Man(a1-3)[Man(a1-3)[Man(a1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'high-mannose'],
  ['Man(a1-3)[Man(a1-3)[Man(a1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'high-mannose'],
  ['Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc', 'paucimannose'],
  ['Man(a1-6)Man(b1-4)GlcNAc(b1-4)GlcNAc', 'paucimannose'],
  ['Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Man(a1-3)[Man(a1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'hybrid'],
  ['NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc', 'complex'],
  ['GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'complex'],
  ['GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-4)][GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'complex'],
  ['Gal(b1-?)GlcNAc(b1-?)Man(a1-?)[Man(a1-?)]Man(b1-4)GlcNAc(b1-4)GlcNAc', 'complex'],
  ['GlcNAc(b1-4)GlcNAc', 'truncated'],
  ['GlcNAc', 'O-GlcNAc'],
  ['GalNAc', 'Tn'],
  ['NeuAc(a2-6)GalNAc', 'Tn'],
  ['Gal(b1-3)GalNAc', 'core 1'],
  ['NeuAc(a2-3)Gal(b1-3)[NeuAc(a2-6)]GalNAc', 'core 1'],
  ['Gal(b1-3)[GlcNAc(b1-6)]GalNAc', 'core 2'],
  ['Gal(b1-3)[Gal(b1-4)GlcNAc(b1-6)]GalNAc', 'core 2'],
  ['GlcNAc(b1-3)GalNAc', 'core 3'],
  ['GlcNAc(b1-3)[GlcNAc(b1-6)]GalNAc', 'core 4'],
  ['GalNAc(a1-3)GalNAc', 'core 5'],
  ['GlcNAc(b1-6)GalNAc', 'core 6'],
  ['GalNAc(a1-6)GalNAc', 'core 7'],
  ['Gal(a1-3)GalNAc', 'core 8'],
  ['Gal(b1-?)GalNAc', 'core 1'],
  ['Man', 'core M0'],
  ['GlcNAc(b1-2)Man', 'core M1'],
  ['Gal(b1-4)GlcNAc(b1-2)[GlcNAc(b1-6)]Man', 'core M2'],
  ['GalNAc(b1-3)GlcNAc(b1-4)Man', 'core M3'],
  ['Fuc', 'O-Fuc'],
  ['Xyl(a1-3)Glc', 'O-Glc'],
  ['Gal(b1-4)Glc', 'Lac'],
  ['Gal(b1-3)Gal(b1-4)Xyl', 'O-Xyl'],
  ['Gal', 'other'],
];

for (const [sequence, expected] of CASES) {
  QUnit.test(`${expected}: ${sequence}`, function(assert) {
    const sugar = new IupacSugar();
    sugar.sequence = sequence;
    const result = classifyGlycan(sugar);
    assert.ok(result.type === expected || result.family === expected, `classified as ${result.label}`);
    assert.ok(typeof result.label === 'string' && result.label.length > 0, 'has a label');
  });
}

QUnit.test('No sugar is "other"', function(assert) {
  assert.equal(classifyGlycan(null).family, 'other');
  assert.equal(classifyGlycan(new IupacSugar()).family, 'other');
});
