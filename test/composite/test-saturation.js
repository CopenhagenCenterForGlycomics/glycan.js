/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import { compose } from '../../js/Compositor';
import * as Composite from '../../js/Composite';

class IupacSugar extends Iupac(Sugar) {}

QUnit.assert.closeTo = function(actual, expected, delta, message) {
  const ok = typeof actual === 'number' && Math.abs(actual - expected) <= delta;
  this.pushResult({ result: ok, actual, expected: `${expected} ± ${delta}`, message });
};

QUnit.module('Saturation arithmetic', {});

QUnit.test('residue in all structures: saturation = 1', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 3 },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 7 },
  ], { SugarClass: IupacSugar });

  for (const res of c.composition()) {
    assert.closeTo(res.getTag(Composite.SATURATION).default, 1.0, 1e-9,
      `${res.identifier} sat=1`);
  }
});

QUnit.test('residue in half the weight: saturation = 0.5', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc',            weight: 5 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 5 },
  ], { SugarClass: IupacSugar });

  const neuac = c.composition().find(r => r.identifier === 'NeuAc');
  assert.ok(neuac, 'NeuAc present');
  assert.closeTo(neuac.getTag(Composite.SATURATION).default, 0.5, 1e-9);
});

QUnit.test('residue in one of three structures: saturation = weight_i / total', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc',            weight: 3 },
    { sequence: 'Gal(b1-4)GlcNAc',            weight: 3 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 4 },
  ], { SugarClass: IupacSugar });

  const neuac = c.composition().find(r => r.identifier === 'NeuAc');
  // NeuAc only in structure 3 (weight 4), total = 10
  assert.closeTo(neuac.getTag(Composite.SATURATION).default, 4 / 10, 1e-9);
});

QUnit.test('saturation is per-condition with multi-condition weights', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc',            weights: { ctrl: 10, treated: 0 } },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weights: { ctrl:  0, treated: 8 } },
  ], { SugarClass: IupacSugar });

  const neuac = c.composition().find(r => r.identifier === 'NeuAc');
  const sat = neuac.getTag(Composite.SATURATION);
  // ctrl total=10, NeuAc ctrl weight=0 → sat.ctrl = 0
  assert.closeTo(sat.ctrl, 0, 1e-9, 'NeuAc ctrl saturation = 0');
  // treated total=8, NeuAc treated weight=8 → sat.treated = 1
  assert.closeTo(sat.treated, 1.0, 1e-9, 'NeuAc treated saturation = 1');
});

QUnit.test('saturation is always in [0, 1]', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 100 },
  ], { SugarClass: IupacSugar });

  for (const res of c.composition()) {
    const sat = res.getTag(Composite.SATURATION);
    for (const [cond, s] of Object.entries(sat)) {
      assert.ok(s >= 0 && s <= 1, `${res.identifier}[${cond}] saturation ${s} in [0,1]`);
    }
  }
});

QUnit.test('root saturation equals 1 regardless of weights', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 99 },
  ], { SugarClass: IupacSugar });

  const rootSat = c.root.getTag(Composite.SATURATION).default;
  assert.closeTo(rootSat, 1.0, 1e-9, 'root always 100% saturated');
});

QUnit.test('WEIGHT values sum correctly across overlapping structures', (assert) => {
  const c = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 3 },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 7 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 5 },
  ], { SugarClass: IupacSugar });

  // GlcNAc appears in all 3 → total weight = 15
  assert.equal(c.root.getTag(Composite.WEIGHT).default, 15);
  // NeuAc only in structure 3 → weight = 5
  const gal = c.root.children.find(r => r.identifier === 'Gal');
  const neuac = gal && gal.children.find(r => r.identifier === 'NeuAc');
  assert.equal(neuac.getTag(Composite.WEIGHT).default, 5);
});
