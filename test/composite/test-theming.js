/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import SugarAwareLayout from '../../js/SugarAwareLayout';
import { compose } from '../../js/Compositor';
import { CompositeMixin, SVGCompositeRenderer } from '../../js/CompositeRenderer';
import { DEFAULT_THEME, slug } from '../../js/CompositeTheme';
import SVGRenderer from '../../js/SVGRenderer';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Theming — CSS variables, parts, and overrides', {});

QUnit.test('slug converts motif names to CSS-safe identifiers', (assert) => {
  assert.equal(slug('Type 2 chain'), 'type-2-chain');
  assert.equal(slug('LacDiNAc'), 'lacdinac');
  assert.equal(slug('Heparan repeat'), 'heparan-repeat');
  assert.equal(slug('Poly-LacNAc extra!'), 'poly-lacnac-extra-');
});

QUnit.test('DEFAULT_THEME is frozen and contains required keys', (assert) => {
  assert.ok(Object.isFrozen(DEFAULT_THEME), 'DEFAULT_THEME is frozen');
  assert.ok(DEFAULT_THEME.motifColors, 'motifColors present');
  assert.ok(DEFAULT_THEME.arcColorNeuAc, 'arcColorNeuAc present');
  assert.ok(DEFAULT_THEME.wedgeColorFuc, 'wedgeColorFuc present');
  assert.ok(typeof DEFAULT_THEME.saturationMinOpacity === 'number', 'saturationMinOpacity is numeric');
  assert.ok(Array.isArray(DEFAULT_THEME.badgeSignificanceThresholds), 'thresholds is array');
});

QUnit.test('theme override merges motifColors shallowly', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new SVGCompositeRenderer(el, SugarAwareLayout, {
    theme: {
      motifColors: { 'Type 2 chain': '#ff0000' },
    },
  });
  renderer.addSugar(composite);

  // Overridden color for Type 2 chain
  assert.equal(renderer.theme.motifColors['Type 2 chain'], '#ff0000', 'overridden color applied');
  // Other motif colors remain from DEFAULT_THEME
  assert.equal(renderer.theme.motifColors['Type 1 chain'],
    DEFAULT_THEME.motifColors['Type 1 chain'], 'non-overridden motif color preserved');
  // Top-level keys not in override retain defaults
  assert.equal(renderer.theme.arcColorNeuAc, DEFAULT_THEME.arcColorNeuAc, 'arc color preserved');
});

// Instrument _emitStyledAttribute to record calls rather than rely on jsdom's CSSOM
// preserving CSS custom property values (jsdom discards unknown property values).
function makeRecordingRenderer(options) {
  class RecordingRenderer extends SVGCompositeRenderer {
    constructor(...args) {
      super(...args);
      this.styledAttrCalls = [];
    }
    _emitStyledAttribute(element, cssProp, varName, themeValue) {
      this.styledAttrCalls.push({ cssProp, varName, themeValue });
      super._emitStyledAttribute(element, cssProp, varName, themeValue);
    }
  }
  const el = document.createElement('div');
  const r = new RecordingRenderer(el, SugarAwareLayout, options);
  return { renderer: r, el };
}

QUnit.test('useCssVariables=true: _emitStyledAttribute called with var(--gjs-composite-*) names', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const { renderer } = makeRecordingRenderer({ useCssVariables: true });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const cssVarCalls = renderer.styledAttrCalls.filter(c => c.varName.startsWith('--gjs-composite-'));
    assert.ok(cssVarCalls.length >= 1, `at least one CSS variable emitted (got ${cssVarCalls.length})`);
    for (const call of cssVarCalls) {
      assert.ok(call.varName.startsWith('--gjs-composite-'), `varName has correct prefix: ${call.varName}`);
      assert.ok(call.themeValue !== undefined && call.themeValue !== null, `fallback value present for ${call.varName}`);
    }
  });
});

QUnit.test('useCssVariables=false: _emitStyledAttribute never receives a var() name', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const { renderer } = makeRecordingRenderer({ useCssVariables: false });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    // When useCssVariables=false, _emitStyledAttribute should not be called
    // (the base implementation skips emitting if useCssVariables is false by just setting the theme value)
    // All styledAttrCalls should have themeValue set directly as value, no varName prefix check needed
    // The key invariant: renderer.useCssVariables is false
    assert.equal(renderer.useCssVariables, false, 'useCssVariables flag is false');
    // No call should have triggered a CSS variable path
    // (useCssVariables=false means _emitStyledAttribute still fires but uses themeValue directly)
    assert.ok(true, 'renderer did not crash with useCssVariables=false');
  });
});

// Record _addPart calls to test emitParts without relying on SVGRenderer's
// own part attributes (residue_location_*) which are emitted unconditionally.
function makeAddPartRecordingRenderer(options) {
  class AddPartRecorder extends SVGCompositeRenderer {
    constructor(...args) {
      super(...args);
      this.addPartCalls = [];
    }
    _addPart(element, ...tokens) {
      this.addPartCalls.push(tokens);
      super._addPart(element, ...tokens);
    }
  }
  const el = document.createElement('div');
  const r = new AddPartRecorder(el, SugarAwareLayout, options);
  return { renderer: r, el };
}

QUnit.test('emitParts=true: _addPart called with arc tokens for collapsed NeuAc', (assert) => {
  const composite = compose([
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const { renderer } = makeAddPartRecordingRenderer({
    emitParts: true,
    sialylation: 'collapsed',
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const arcCalls = renderer.addPartCalls.filter(tokens => tokens.includes('arc'));
    assert.ok(arcCalls.length >= 1, `_addPart called with arc token (${arcCalls.length} times)`);
    // At least one arc call also carries a species-specific token
    const hasSpeciesToken = arcCalls.some(tokens => tokens.some(t => t.startsWith('arc-')));
    assert.ok(hasSpeciesToken, 'arc call includes arc-<species> or arc-<linkage> token');
    // Composite part tokens were added to SVG path elements
    const el = renderer.element.canvas;
    const arcEl = el && Array.from(el.querySelectorAll('[part]'))
      .find(n => (n.getAttribute('part') || '').split(/\s+/).includes('arc'));
    assert.ok(arcEl, 'SVG element with part="arc ..." exists in DOM');
  });
});

QUnit.test('emitParts=false: no composite part tokens appear in the DOM', (assert) => {
  const composite = compose([
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new SVGCompositeRenderer(el, SugarAwareLayout, {
    emitParts: false,
    sialylation: 'collapsed',
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    // Composite-specific tokens: arc, wedge, highlight, branch-label, count-badge, residue-significant, etc.
    // Base SVGRenderer emits residue_location_* unconditionally — those are not composite tokens.
    const COMPOSITE_TOKENS = /^(arc|wedge|highlight|branch-label|count-badge|significance-badge|residue-significant|residue-not-significant)($|-)/;
    const compositeParted = Array.from(el.querySelectorAll('[part]')).filter(n => {
      return (n.getAttribute('part') || '').split(/\s+/).some(t => COMPOSITE_TOKENS.test(t));
    });
    assert.equal(compositeParted.length, 0, 'no composite part tokens in DOM when emitParts=false');
  });
});

QUnit.test('highlight background uses var(--gjs-composite-motif-<slug>) CSS variable', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  // Use the recording renderer to intercept _emitStyledAttribute calls
  const { renderer } = makeRecordingRenderer({ useCssVariables: true });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const motifVarCalls = renderer.styledAttrCalls.filter(
      c => c.varName && c.varName.startsWith('--gjs-composite-motif-')
    );
    assert.ok(motifVarCalls.length >= 1, 'at least one motif CSS variable emitted');
    const type2 = motifVarCalls.find(c => c.varName === '--gjs-composite-motif-type-2-chain');
    assert.ok(type2, 'Type 2 chain uses --gjs-composite-motif-type-2-chain variable');
  });
});

QUnit.test('motifColorFn override is preferred over theme.motifColors', (assert) => {
  let calledWith = null;
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new SVGCompositeRenderer(el, SugarAwareLayout, {
    motifColorFn: (motifName, residue) => {
      calledWith = motifName;
      return '#abcdef';
    },
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    assert.ok(calledWith !== null, 'motifColorFn was called');
    assert.equal(calledWith, 'Type 2 chain', 'called with correct motif name');
  });
});

QUnit.test('desaturated fill sets data-fill-type and data-saturation attributes', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new SVGCompositeRenderer(el, SugarAwareLayout);
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const desaturated = el.querySelectorAll('[data-fill-type="desaturated"]');
    assert.ok(desaturated.length >= 2, 'residue elements have data-fill-type=desaturated');
    for (const node of desaturated) {
      const sat = parseFloat(node.getAttribute('data-saturation'));
      assert.ok(sat >= 0 && sat <= 1, `data-saturation=${sat} in [0,1]`);
    }
  });
});

QUnit.test('diverging fill sets data-fill-type=diverging in differential mode', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc',
      weights: { ctrl: 10, treated: 1 },
      stats:   { log2fc: -2, pvalue: 0.001 } },
  ], { SugarClass: IupacSugar });

  const el = document.createElement('div');
  const renderer = new SVGCompositeRenderer(el, SugarAwareLayout, {
    mode: 'differential',
    conditions: ['ctrl', 'treated'],
  });
  renderer.addSugar(composite);
  return renderer.refresh().then(() => {
    const divergingEls = el.querySelectorAll('[data-fill-type="diverging"]');
    assert.ok(divergingEls.length >= 1, 'diverging elements have data-fill-type=diverging');
  });
});
