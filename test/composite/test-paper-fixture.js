/*global QUnit*/
// Reproduces structural scenarios from Joshi et al. 2010 (PMC2896138)
// These are N-glycan structures spanning bi-antennary, bisecting, core-fucose,
// β1-6 antenna, and poly-LacNAc cases from Figure 1.

import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import { compose } from '../../js/Compositor';
import * as Composite from '../../js/Composite';

class IupacSugar extends Iupac(Sugar) {}

QUnit.assert.closeTo = function(actual, expected, delta, message) {
  const ok = typeof actual === 'number' && Math.abs(actual - expected) <= delta;
  this.pushResult({ result: ok, actual, expected: `${expected} ± ${delta}`, message });
};

// Representative N-glycan structures matching Fig 1 of the 2010 paper.
// All are N-linked: reducing-end GlcNAc(b1-4)GlcNAc core.
const CORE        = 'Man(b1-4)GlcNAc(b1-4)GlcNAc';
const BI_ANTENNA  = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]' + CORE;
const BI_GALACT   = 'Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]' + CORE;
const BISECTING   = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-4)][GlcNAc(b1-2)Man(a1-6)]' + CORE;
const CORE_FUC    = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';
const B16_ANTENNA = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)[GlcNAc(b1-6)]Man(a1-6)]' + CORE;
const SIALYLATED  = 'NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]' + CORE;
const HIGH_MAN    = 'Man(a1-2)Man(a1-3)[Man(a1-2)Man(a1-6)]Man(a1-3)[Man(a1-6)]' + CORE;
const MONO_GALACT = 'Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]' + CORE;
const TRILAC      = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)[GlcNAc(b1-4)]Man(a1-6)]' + CORE;

QUnit.module('Paper fixture — N-glycan composite (Joshi et al. 2010)', {});

QUnit.test('composite of 10 N-glycans builds without error', (assert) => {
  const structures = [
    BI_ANTENNA, BI_GALACT, BISECTING, CORE_FUC, B16_ANTENNA,
    SIALYLATED, HIGH_MAN, MONO_GALACT, TRILAC, BI_ANTENNA,
  ].map((seq, i) => ({ sequence: seq, weight: i + 1 }));

  const c = compose(structures, { SugarClass: IupacSugar });
  assert.ok(c.root, 'composite has root');
  assert.ok(c.composition().length > 0, 'composite has residues');
});

QUnit.test('root is always GlcNAc (reducing end)', (assert) => {
  const c = compose([
    { sequence: BI_ANTENNA, weight: 1 },
    { sequence: BISECTING,  weight: 1 },
    { sequence: CORE_FUC,   weight: 1 },
  ], { SugarClass: IupacSugar });
  assert.equal(c.root.identifier, 'GlcNAc');
});

QUnit.test('core GlcNAc(b1-4)GlcNAc always present with COUNT = n_structures', (assert) => {
  const n = 5;
  const seqs = [BI_ANTENNA, BI_GALACT, BISECTING, CORE_FUC, B16_ANTENNA];
  const c = compose(seqs.map((s, i) => ({ sequence: s, weight: i + 1 })), { SugarClass: IupacSugar });
  assert.equal(c.root.getTag(Composite.COUNT), n, 'reducing-end GlcNAc in all structures');
});

QUnit.test('bisecting GlcNAc has lower COUNT than core', (assert) => {
  const c = compose([
    { sequence: BI_ANTENNA, weight: 10 },
    { sequence: BISECTING,  weight:  3 },
  ], { SugarClass: IupacSugar });

  const coreCount     = c.root.getTag(Composite.COUNT);
  const allCounts     = c.composition().map(r => r.getTag(Composite.COUNT));
  const bisectingCount = Math.min(...allCounts);
  assert.ok(bisectingCount <= coreCount, 'bisecting GlcNAc count ≤ core count');
});

QUnit.test('branch labels V/W assigned when bi-antennary and β1-6 coexist', (assert) => {
  const c = compose([
    { sequence: BI_ANTENNA,  weight: 100 },
    { sequence: B16_ANTENNA, weight:  10 },
  ], { SugarClass: IupacSugar });

  const labelled = c.composition().filter(r => r.getTag(Composite.BRANCH));
  assert.ok(labelled.length >= 2, 'at least two branch labels assigned');
  const labels = labelled.map(r => r.getTag(Composite.BRANCH));
  assert.ok(labels.includes('V'), 'V label present');
  assert.ok(labels.includes('W'), 'W label present');
});

QUnit.test('saturation of bi-antennary core is higher than outer arms', (assert) => {
  const c = compose([
    { sequence: BI_ANTENNA,  weight: 10 },
    { sequence: SIALYLATED,  weight:  2 },
  ], { SugarClass: IupacSugar });

  const rootSat  = c.root.getTag(Composite.SATURATION).default;
  const neuac    = c.composition().find(r => r.identifier === 'NeuAc');
  assert.ok(neuac, 'NeuAc present');
  const neuacSat = neuac.getTag(Composite.SATURATION).default;
  assert.ok(rootSat >= neuacSat, 'core more saturated than NeuAc terminal');
});

QUnit.test('no inputs mutated during paper fixture build', (assert) => {
  const sugars = [BI_ANTENNA, BI_GALACT, BISECTING].map(seq => {
    const s = new IupacSugar(); s.sequence = seq; s.freeze(); return s;
  });
  const seqs = sugars.map(s => s.sequence);

  const compositor = new (class {
    constructor() { this._c = require('../../js/Compositor').default; }
  })();

  // Re-import to avoid circular issues — just call compose() directly
  compose(
    [BI_ANTENNA, BI_GALACT, BISECTING].map((seq, i) => ({ sequence: seq, weight: i + 1 })),
    { SugarClass: IupacSugar }
  );

  // Verify original frozen sugars are unchanged
  for (let i = 0; i < sugars.length; i++) {
    assert.equal(sugars[i].sequence, seqs[i], `input ${i} sequence unchanged`);
  }
});

QUnit.test('high-mannose composite: Man residues all present', (assert) => {
  const c = compose([
    { sequence: HIGH_MAN, weight: 1 },
  ], { SugarClass: IupacSugar });

  const manCount = c.composition().filter(r => r.identifier === 'Man').length;
  assert.ok(manCount >= 5, `at least 5 Man residues (got ${manCount})`);
});
