/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import { compose } from '../../js/Compositor';
import { GlycoViewerElement } from '../../js/elements/GlycoViewerElement';

class IupacSugar extends Iupac(Sugar) {}

// Helper: wait for `rendered` (resolve) or `error` (reject) with a timeout.
function waitForRender(el, ms = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('render timeout')), ms);
    el.addEventListener('rendered', e => { clearTimeout(timer); resolve(e.detail); }, { once: true });
    el.addEventListener('error',    e => { clearTimeout(timer); reject(e.detail.error); }, { once: true });
  });
}

// Helper: append to body, get a cleanup function.
function mount(el) {
  document.body.appendChild(el);
  return () => { if (el.parentNode) el.parentNode.removeChild(el); };
}

QUnit.module('<glyco-viewer> custom element', {});

// ── Registration ───────────────────────────────────────────────────────────────

QUnit.test('element is registered as glyco-viewer', (assert) => {
  // In karma-webpack, two webpack bundles can each bundle GlycoViewerElement,
  // making instanceof unreliable. Test functional behaviour instead.
  const el = document.createElement('glyco-viewer');
  assert.ok(el.shadowRoot, 'createElement("glyco-viewer") produces a custom element with shadow DOM');
  assert.equal(el.shadowRoot.mode, 'open', 'shadow root is open');
  // Also confirm the registry API when available (may be falsy in some environments)
  const registered = typeof customElements !== 'undefined' && customElements.get('glyco-viewer');
  if (registered) assert.ok(registered, 'customElements.get("glyco-viewer") returns a constructor');
});

QUnit.test('element has open shadow root', (assert) => {
  const el = document.createElement('glyco-viewer');
  assert.ok(el.shadowRoot, 'shadowRoot accessible');
  assert.equal(el.shadowRoot.mode, 'open');
});

// ── Text content ───────────────────────────────────────────────────────────────

QUnit.test('text content: one sequence per line, each gets weight=1', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc\nNeuAc(a2-3)Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  return waitForRender(el).then(({ composite }) => {
    cleanup();
    assert.ok(composite, 'composite built');
    assert.ok(composite.root, 'composite has root');
    assert.ok(composite.composition().length >= 2, 'at least 2 residues');
  });
});

QUnit.test('text content: blank lines and leading/trailing whitespace are ignored', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = '\n  Gal(b1-4)GlcNAc  \n\n';
  const cleanup = mount(el);
  return waitForRender(el).then(({ composite }) => {
    cleanup();
    assert.ok(composite.root, 'renders with stripped whitespace');
  });
});

QUnit.test('text content set after connect re-renders', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  return waitForRender(el).then(() => {
    // Change the text — should trigger a new render
    let secondRender = waitForRender(el);
    el.textContent = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
    return secondRender;
  }).then(({ composite }) => {
    cleanup();
    assert.ok(composite.composition().some(r => r.identifier === 'NeuAc'), 'new sequence rendered');
  });
});

// ── .structures property ───────────────────────────────────────────────────────

QUnit.test('.structures property renders the given structures', (assert) => {
  const el = document.createElement('glyco-viewer');
  const cleanup = mount(el);
  el.structures = [
    { sequence: 'Gal(b1-4)GlcNAc',              weight: 3 },
    { sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc',   weight: 1 },
  ];
  return waitForRender(el).then(({ composite }) => {
    cleanup();
    assert.ok(composite.root, 'composite rendered');
    assert.equal(composite.root.identifier, 'GlcNAc', 'root is GlcNAc');
    assert.ok(composite.composition().some(r => r.identifier === 'NeuAc'), 'NeuAc present');
  });
});

QUnit.test('.structures overrides text content', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  el.structures = [{ sequence: 'NeuAc(a2-3)Gal(b1-4)GlcNAc', weight: 1 }];
  return waitForRender(el).then(({ composite }) => {
    cleanup();
    assert.ok(composite.composition().some(r => r.identifier === 'NeuAc'), 'structures property wins');
  });
});

QUnit.test('.structures = [] clears the rendering', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.structures = [{ sequence: 'Gal(b1-4)GlcNAc', weight: 1 }];
  const cleanup = mount(el);
  return waitForRender(el).then(() => {
    el.structures = [];
    // No render event expected — just check the SVG is removed
    return new Promise(resolve => queueMicrotask(() => queueMicrotask(resolve)));
  }).then(() => {
    cleanup();
    const svg = el.shadowRoot.querySelector('svg');
    assert.notOk(svg, 'SVG removed when structures cleared');
  });
});

// ── .composite property ────────────────────────────────────────────────────────

QUnit.test('.composite property bypasses compose()', (assert) => {
  const el = document.createElement('glyco-viewer');
  const pre = compose([{ sequence: 'Gal(b1-4)GlcNAc', weight: 1 }], { SugarClass: IupacSugar });
  const cleanup = mount(el);
  el.composite = pre;
  return waitForRender(el).then(({ composite }) => {
    assert.strictEqual(composite, pre, 'emitted composite is the one supplied');
    assert.ok(el.shadowRoot.querySelector('svg'), 'SVG rendered');
    cleanup();
  });
});

// ── Attribute reflection ───────────────────────────────────────────────────────

QUnit.test('mode attribute defaults to "single"', (assert) => {
  const el = document.createElement('glyco-viewer');
  assert.equal(el.mode, 'single');
});

QUnit.test('mode attribute can be set and read back', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.setAttribute('mode', 'differential');
  assert.equal(el.mode, 'differential');
});

QUnit.test('conditions attribute parses comma-separated values', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.setAttribute('conditions', 'ctrl,treated');
  assert.deepEqual(el.conditions, ['ctrl', 'treated']);
});

QUnit.test('attribute change triggers re-render', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  return waitForRender(el).then(() => {
    const nextRender = waitForRender(el);
    el.setAttribute('sialylation', 'explicit');
    return nextRender;
  }).then(() => {
    cleanup();
    assert.ok(true, 're-render fired after attribute change');
  });
});

// ── SVG output ────────────────────────────────────────────────────────────────

QUnit.test('shadow DOM contains an SVG element after render', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  return waitForRender(el).then(() => {
    const svg = el.shadowRoot.querySelector('svg');
    assert.ok(svg, 'SVG element present in shadow DOM');
    cleanup();
  });
});

QUnit.test('canvas part attribute present on wrapper div', (assert) => {
  const el = document.createElement('glyco-viewer');
  const canvas = el.shadowRoot.querySelector('[part="canvas"]');
  assert.ok(canvas, 'wrapper div has part="canvas"');
});

QUnit.test('composite part tokens exposed in shadow DOM after render', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  const cleanup = mount(el);
  return waitForRender(el).then(() => {
    cleanup();
    // Residue icons from SVGRenderer always carry part=residue_location_*
    const parted = el.shadowRoot.querySelectorAll('[part]');
    assert.ok(parted.length >= 1, 'at least one element with part attribute');
  });
});

// ── Error handling ────────────────────────────────────────────────────────────

QUnit.test('incompatible sequences dispatch error event instead of throwing', (assert) => {
  const el = document.createElement('glyco-viewer');
  // Two sequences with incompatible roots cause compose() to throw
  el.textContent = 'Gal(b1-4)GlcNAc\nFuc(a1-2)Gal';
  const cleanup = mount(el);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new Error('no error event')); }, 2000);
    el.addEventListener('error', e => {
      clearTimeout(timer);
      cleanup();
      assert.ok(e.detail.error instanceof Error, 'error event detail has Error');
      resolve();
    }, { once: true });
    el.addEventListener('rendered', () => {
      clearTimeout(timer);
      cleanup();
      reject(new Error('should not have rendered'));
    }, { once: true });
  });
});

// ── Lifecycle ─────────────────────────────────────────────────────────────────

QUnit.test('disconnecting the element clears the renderer', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  document.body.appendChild(el);
  return waitForRender(el).then(() => {
    document.body.removeChild(el);
    // After disconnect, _renderer should be null and canvas empty
    assert.notOk(el._renderer, '_renderer cleared on disconnect');
    const svg = el.shadowRoot.querySelector('svg');
    assert.notOk(svg, 'SVG removed on disconnect');
  });
});

QUnit.test('re-connecting a disconnected element re-renders', (assert) => {
  const el = document.createElement('glyco-viewer');
  el.textContent = 'Gal(b1-4)GlcNAc';
  document.body.appendChild(el);
  return waitForRender(el).then(() => {
    document.body.removeChild(el);
    document.body.appendChild(el);
    return waitForRender(el);
  }).then(({ composite }) => {
    document.body.removeChild(el);
    assert.ok(composite.root, 're-rendered after reconnect');
  });
});
