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

QUnit.module('Stats aggregation', {});

QUnit.test('weighted-mean log2fc with two structures', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc',
      weights: { control: 100, treated: 10 },
      stats:   { log2fc: -3.32, pvalue: 0.001 } },
    { sequence: 'Gal(b1-4)GlcNAc',
      weights: { control: 5, treated: 20 },
      stats:   { log2fc: 2.0, pvalue: 0.01 } },
  ], { SugarClass: IupacSugar, statsAggregation: { log2fc: 'weighted-mean', pvalue: 'min' } });

  const root = composite.root;
  const log2fc = root.getTag(Composite.LOG2FC);
  const pvalue = root.getTag(Composite.PVALUE);

  assert.ok(log2fc !== null, 'LOG2FC set');
  assert.closeTo(pvalue, 0.001, 1e-9, 'pvalue is minimum');

  // Weighted mean: w1=100+10=110, w2=5+20=25
  const expected = (-3.32 * 110 + 2.0 * 25) / (110 + 25);
  assert.closeTo(log2fc, expected, 1e-6);
});

QUnit.test('min aggregation for pvalue', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { pvalue: 0.5 } },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { pvalue: 0.001 } },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { pvalue: 0.1 } },
  ], { SugarClass: IupacSugar });

  const pvalue = composite.root.getTag(Composite.PVALUE);
  assert.closeTo(pvalue, 0.001, 1e-9);
});

QUnit.test('mean aggregation for log2fc', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { log2fc: 2.0 } },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { log2fc: 4.0 } },
  ], { SugarClass: IupacSugar, statsAggregation: { log2fc: 'mean', pvalue: 'min' } });

  const log2fc = composite.root.getTag(Composite.LOG2FC);
  assert.closeTo(log2fc, 3.0, 1e-9);
});

QUnit.test('no stats → LOG2FC and PVALUE are null', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  assert.strictEqual(composite.root.getTag(Composite.LOG2FC), undefined);
  assert.strictEqual(composite.root.getTag(Composite.PVALUE), undefined);
});

QUnit.test('qvalue takes precedence over pvalue in aggregation', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1, stats: { pvalue: 0.001, qvalue: 0.05 } },
  ], { SugarClass: IupacSugar });

  const pvalue = composite.root.getTag(Composite.PVALUE);
  assert.closeTo(pvalue, 0.05, 1e-9, 'qvalue used when present');
});
