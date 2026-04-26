/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import SugarAwareLayout from '../../js/SugarAwareLayout';
import { compose } from '../../js/Compositor';
import { CompositeMixin, SVGCompositeRenderer } from '../../js/CompositeRenderer';
import SVGRenderer from '../../js/SVGRenderer';
import Renderer from '../../js/Renderer';

class IupacSugar extends Iupac(Sugar) {}

// Instrument a renderer class to record abstract primitive calls.
function recordingMixin(BaseClass) {
  return class extends BaseClass {
    constructor(...args) {
      super(...args);
      this.primitiveCalls = [];
    }
    renderArc(container, position, opts) {
      this.primitiveCalls.push({ method: 'renderArc', fillFraction: opts.fillFraction, direction: opts.direction, species: opts.species });
      super.renderArc(container, position, opts);
    }
    renderWedge(container, position, opts) {
      this.primitiveCalls.push({ method: 'renderWedge', fillFraction: opts.fillFraction, direction: opts.direction });
      super.renderWedge(container, position, opts);
    }
    renderHighlightBackground(container, positions, opts) {
      this.primitiveCalls.push({ method: 'renderHighlightBackground', motifName: opts.motifName });
      super.renderHighlightBackground(container, positions, opts);
    }
    renderResidueBadge(container, position, text, corner, opts) {
      this.primitiveCalls.push({ method: 'renderResidueBadge', kind: opts.kind, text });
      super.renderResidueBadge(container, position, text, corner, opts);
    }
    setResidueFill(icon, fillSpec) {
      this.primitiveCalls.push({ method: 'setResidueFill', type: fillSpec.type });
      super.setResidueFill(icon, fillSpec);
    }
  };
}

const RecordingSVGRenderer = recordingMixin(SVGCompositeRenderer);

QUnit.module('Renderer parity — abstract primitive calls', {});

QUnit.test('SVGCompositeRenderer calls setResidueFill for each non-suppressed residue', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout);
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const fillCalls = renderer.primitiveCalls.filter(c => c.method === 'setResidueFill');
    assert.ok(fillCalls.length >= 2, `setResidueFill called for each residue (${fillCalls.length})`);
    for (const call of fillCalls) {
      assert.ok(call.type, 'fill type is set');
    }
  });
});

QUnit.test('collapsed NeuAc triggers renderArc, not setResidueFill', (assert) => {
  const composite = compose([
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout, {
    sialylation: 'collapsed',
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const arcCalls  = renderer.primitiveCalls.filter(c => c.method === 'renderArc');
    const fillCalls = renderer.primitiveCalls.filter(c => c.method === 'setResidueFill');
    assert.ok(arcCalls.length >= 1, 'arc rendered for NeuAc');
    // NeuAc itself is suppressed — fill should not be called for it
    const neuacFill = fillCalls.filter(c => c.type === 'desaturated');
    // Gal and GlcNAc get desaturated fill; NeuAc is suppressed
    assert.equal(neuacFill.length, 2, 'fill called for Gal and GlcNAc only');
  });
});

QUnit.test('explicit sialylation: no arc, NeuAc gets fill', (assert) => {
  const composite = compose([
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout, {
    sialylation: 'explicit',
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const arcCalls  = renderer.primitiveCalls.filter(c => c.method === 'renderArc');
    const fillCalls = renderer.primitiveCalls.filter(c => c.method === 'setResidueFill');
    assert.equal(arcCalls.length, 0, 'no arc in explicit mode');
    assert.ok(fillCalls.length >= 3, 'fill called for all 3 residues');
  });
});

QUnit.test('motif highlight triggers renderHighlightBackground', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout);
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const bgCalls = renderer.primitiveCalls.filter(c => c.method === 'renderHighlightBackground');
    assert.ok(bgCalls.length >= 1, 'highlight background rendered for Type 2 chain');
    assert.equal(bgCalls[0].motifName, 'Type 2 chain');
  });
});

QUnit.test('branch label triggers renderResidueBadge with kind=branch-label', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-3)GlcNAc', weight: 1 },
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout);
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const badgeCalls = renderer.primitiveCalls.filter(c => c.method === 'renderResidueBadge' && c.kind === 'branch-label');
    assert.ok(badgeCalls.length >= 2, 'badge rendered for each branch-labelled residue');
  });
});

QUnit.test('differential mode: setResidueFill called with diverging type', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc',
      weights: { ctrl: 10, treated: 1 },
      stats:   { log2fc: -2, pvalue: 0.001 } },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new RecordingSVGRenderer(el, SugarAwareLayout, {
    mode: 'differential',
    conditions: ['ctrl', 'treated'],
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const divergingFills = renderer.primitiveCalls.filter(
      c => c.method === 'setResidueFill' && c.type === 'diverging'
    );
    assert.ok(divergingFills.length >= 1, 'diverging fill called in differential mode');
  });
});
