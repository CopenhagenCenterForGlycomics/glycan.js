/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import Compositor, { compose } from '../../js/Compositor';
import * as Composite from '../../js/Composite';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Compositor — tag accumulation', {});

QUnit.test('COUNT and WEIGHT sum correctly across structures', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc',            weight: 5 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 7 },
    { sequence: 'Gal(b1-4)GlcNAc',            weight: 2 },
  ], { SugarClass: IupacSugar });

  const root = composite.root;
  assert.equal(root.identifier, 'GlcNAc');
  assert.equal(root.getTag(Composite.COUNT), 3);
  assert.equal(root.getTag(Composite.WEIGHT).default, 14);
  assert.closeTo(root.getTag(Composite.SATURATION).default, 1.0, 1e-9);

  const gal = root.children.find(c => c.identifier === 'Gal');
  assert.ok(gal, 'Gal present');
  assert.equal(gal.getTag(Composite.COUNT), 3);
  assert.equal(gal.getTag(Composite.WEIGHT).default, 14);

  const neuac = gal && gal.children.find(c => c.identifier === 'NeuAc');
  assert.ok(neuac, 'NeuAc present');
  assert.equal(neuac.getTag(Composite.COUNT), 1);
  assert.equal(neuac.getTag(Composite.WEIGHT).default, 7);
  assert.closeTo(neuac.getTag(Composite.SATURATION).default, 7 / 14, 1e-9);
});

QUnit.assert.closeTo = function(actual, expected, delta, message) {
  const ok = Math.abs(actual - expected) <= delta;
  this.pushResult({ result: ok, actual, expected: `${expected} ± ${delta}`, message });
};

QUnit.test('SOURCES tracks which input indices contributed', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
    { sequence: 'Gal(b1-3)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const root = composite.root;
  assert.deepEqual([...root.getTag(Composite.SOURCES)].sort(), [0, 1]);

  const gals = root.children.filter(c => c.identifier === 'Gal');
  assert.equal(gals.length, 2);
  for (const g of gals) {
    assert.equal(g.getTag(Composite.SOURCES).size, 1);
  }
});

QUnit.test('single-input build produces COUNT=1, SATURATION=1', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 10 },
  ], { SugarClass: IupacSugar });

  for (const res of composite.composition()) {
    assert.equal(res.getTag(Composite.COUNT), 1);
    assert.closeTo(res.getTag(Composite.SATURATION).default, 1.0, 1e-9);
  }
});

QUnit.test('zero-input build returns empty composite', (assert) => {
  const compositor = new Compositor({ SugarClass: IupacSugar });
  const composite = compositor.build();
  assert.notOk(composite.root);
  assert.equal(composite.composition().length, 0);
});

QUnit.test('add() throws on missing weight', (assert) => {
  const compositor = new Compositor({ SugarClass: IupacSugar });
  const sugar = new IupacSugar(); sugar.sequence = 'Gal(b1-4)GlcNAc';
  assert.throws(() => compositor.add(sugar, {}), /weight/);
});

QUnit.test('add() throws on incompatible root', (assert) => {
  const compositor = new Compositor({ SugarClass: IupacSugar });
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'Glc';
  compositor.add(a, { weight: 1 });
  assert.throws(() => compositor.add(b, { weight: 1 }), /root/);
});

QUnit.test('inputs are not mutated by compose', (assert) => {
  const a = new IupacSugar(); a.sequence = 'Gal(b1-4)GlcNAc';
  const b = new IupacSugar(); b.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  a.freeze(); b.freeze();

  const origA = a.sequence;
  const origB = b.sequence;

  new Compositor({ SugarClass: IupacSugar })
    .add(a, { weight: 1 })
    .add(b, { weight: 1 })
    .build();

  assert.equal(a.sequence, origA);
  assert.equal(b.sequence, origB);
});

QUnit.test('multi-condition weights are tracked per condition', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weights: { ctrl: 10, treated: 2 } },
    { sequence: 'Gal(b1-4)GlcNAc', weights: { ctrl:  5, treated: 8 } },
  ], { SugarClass: IupacSugar });

  const root = composite.root;
  const w = root.getTag(Composite.WEIGHT);
  assert.equal(w.ctrl, 15);
  assert.equal(w.treated, 10);

  const s = root.getTag(Composite.SATURATION);
  assert.closeTo(s.ctrl,    1.0, 1e-9);
  assert.closeTo(s.treated, 1.0, 1e-9);
});
