'use strict';
import Sugar from '../Sugar.js';
import { IO as Iupac } from '../io/CondensedIupac.js';
import SugarAwareLayout from '../SugarAwareLayout.js';
import { compose } from '../Compositor.js';
import { SVGCompositeRenderer } from '../CompositeRenderer.js';
import SVGRenderer from '../SVGRenderer.js';

class IupacSugar extends Iupac(Sugar) {}

// Minimal shadow-DOM stylesheet — exposes the same CSS variables as dist/composite.css
// so that external stylesheets can override them and ::part() selectors work.
const SHADOW_CSS = `
:host {
  display: block;
  position: relative;
  --gjs-composite-arc-neuac-color:           #a64d79;
  --gjs-composite-arc-neugc-color:           #7daad8;
  --gjs-composite-arc-stroke-width:          3px;
  --gjs-composite-wedge-fuc-color:           #e74c3c;
  --gjs-composite-motif-opacity:             0.3;
  --gjs-composite-motif-type-1-chain:        #fde68a;
  --gjs-composite-motif-type-2-chain:        #bae6fd;
  --gjs-composite-motif-lacdinac:            #fecaca;
  --gjs-composite-motif-polylactosamine:     #7dd3fc;
  --gjs-composite-motif-matriglycan:         #d8b4fe;
  --gjs-composite-motif-heparan-repeat:      #a7f3d0;
  --gjs-composite-motif-chondroitin-repeat:  #86efac;
  --gjs-composite-motif-keratan-repeat:      #fbbf24;
  --gjs-composite-branch-label-color:        #222;
  --gjs-composite-branch-label-font-size:    12px;
  --gjs-composite-branch-label-font-family:  sans-serif;
  --gjs-composite-branch-label-font-weight:  bold;
  --gjs-composite-count-badge-color:         #0066cc;
  --gjs-composite-count-badge-font-size:     10px;
  --gjs-composite-sig-stroke-color:          #222;
  --gjs-composite-sig-stroke-width:          2px;
  --gjs-composite-nonsig-stroke-color:       #999;
  --gjs-composite-residue-opacity:           1;
}
.canvas {
  width: 100%;
  height: 100%;
}
`;

let _template = null;
function getTemplate() {
  if (!_template) {
    _template = document.createElement('template');
    _template.innerHTML = `<style>${SHADOW_CSS}</style><div class="canvas gjs-composite-renderer" part="canvas"></div>`;
  }
  return _template;
}

export class GlycoViewerElement extends HTMLElement {
  static get observedAttributes() {
    return [
      'mode', 'conditions', 'colormap',
      'significance-threshold', 'significance-field',
      'sialylation', 'fucosylation', 'badges',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot.appendChild(getTemplate().content.cloneNode(true));
    this._canvas   = this.shadowRoot.querySelector('.canvas');
    this._renderer = null;
    this._renderScheduled = false;

    // _explicitStructures: set via .structures property; takes priority over text content
    this._explicitStructures = null;
    // _explicitComposite: set via .composite property; bypasses compose() entirely
    this._explicitComposite  = null;
    this._theme              = undefined;

    // Watch for text-content changes on the light-DOM side
    this._observer = new MutationObserver(() => this._scheduleRender());
  }

  // ── Property API ────────────────────────────────────────────────────────────

  /** Set an array of {sequence, weight} or {sequence, weights, stats} objects. */
  set structures(value) {
    this._explicitStructures = (value && value.length > 0) ? value : null;
    this._explicitComposite  = null;
    this._scheduleRender();
  }
  get structures() { return this._explicitStructures; }

  /** Bypass compose() and supply a pre-built CompositeSugar directly. */
  set composite(value) {
    this._explicitComposite  = value || null;
    this._explicitStructures = null;
    this._scheduleRender();
  }
  get composite() { return this._explicitComposite; }

  /** Partial theme override merged on top of DEFAULT_THEME at construction time. */
  set theme(value) {
    this._theme = value;
    this._scheduleRender();
  }

  // ── Attribute reflection ─────────────────────────────────────────────────────

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal !== newVal) this._scheduleRender();
  }

  get mode()       { return this.getAttribute('mode') || 'single'; }
  set mode(v)      { this.setAttribute('mode', v); }

  get sialylation()  { return this.getAttribute('sialylation')  || 'collapsed'; }
  set sialylation(v) { this.setAttribute('sialylation', v); }

  get fucosylation()  { return this.getAttribute('fucosylation')  || 'collapsed'; }
  set fucosylation(v) { this.setAttribute('fucosylation', v); }

  get conditions() {
    const attr = this.getAttribute('conditions');
    return attr ? attr.split(/[,\s]+/).filter(Boolean) : null;
  }
  set conditions(v) {
    this.setAttribute('conditions', Array.isArray(v) ? v.join(',') : String(v));
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────────

  connectedCallback() {
    this._observer.observe(this, { childList: true, characterData: true, subtree: true });
    this._scheduleRender();
  }

  disconnectedCallback() {
    this._observer.disconnect();
    this._destroyRenderer();
  }

  // ── Text-content parsing ─────────────────────────────────────────────────────

  /**
   * Read whitespace-separated sequences from the element's text content.
   * Each non-empty line becomes {sequence, weight: 1}.
   */
  _parseTextStructures() {
    const text = this.textContent || '';
    return text
      .split(/\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map(sequence => ({ sequence, weight: 1 }));
  }

  // ── Render scheduling ────────────────────────────────────────────────────────

  _scheduleRender() {
    if (this._renderScheduled) return;
    this._renderScheduled = true;
    queueMicrotask(() => {
      this._renderScheduled = false;
      if (this.isConnected) this._render();
    });
  }

  async _render() {
    // Resolve composite
    let composite = this._explicitComposite;

    if (!composite) {
      const structures = this._explicitStructures || this._parseTextStructures();
      if (!structures || structures.length === 0) {
        this._destroyRenderer();
        return;
      }
      try {
        composite = compose(structures, { SugarClass: IupacSugar });
      } catch (err) {
        this._dispatchError(err);
        return;
      }
    }

    this._destroyRenderer();

    const options = {
      mode:                  this.mode,
      conditions:            this.conditions,
      colormap:              this.getAttribute('colormap')               || undefined,
      significanceThreshold: parseFloat(this.getAttribute('significance-threshold')) || 0.05,
      significanceField:     this.getAttribute('significance-field')     || 'qvalue',
      sialylation:           this.sialylation,
      fucosylation:          this.fucosylation,
      badges:                this.hasAttribute('badges'),
      theme:                 this._theme,
      emitParts:             true,
      useCssVariables:       true,
    };

    const renderer = new SVGCompositeRenderer(this._canvas, SugarAwareLayout,options);
    renderer.LayoutEngine = SugarAwareLayout;
    this._renderer = renderer;
    renderer.addSugar(composite);

    await renderer.constructor.SYMBOLS;

    await renderer.appendSymbols();

    const refreshP = renderer.refresh();

    renderer.scaleToFit();

    Promise.all([refreshP]).then(() => {
      if (this._renderer !== renderer) return; // superseded by a later render
      this.dispatchEvent(new CustomEvent('rendered', {
        detail: { composite },
        bubbles: true, composed: true,
      }));
    }).catch(err => this._dispatchError(err));
  }

  _destroyRenderer() {
    if (this._renderer) {
      this._renderer.removeAllSugars();
      this._renderer = null;
    }
    // Remove the SVG the renderer appended to _canvas
    while (this._canvas.firstChild) {
      this._canvas.removeChild(this._canvas.firstChild);
    }
  }

  _dispatchError(err) {
    // error events on media/resource elements don't bubble (matches <img>, <video> convention)
    this.dispatchEvent(new CustomEvent('error', {
      detail: { error: err },
      bubbles: false, composed: false,
    }));
  }
}

try {
  const _registry = (typeof window !== 'undefined' && window.customElements) || customElements;
  if (!_registry.get('glyco-viewer')) {
    _registry.define('glyco-viewer', GlycoViewerElement);
  }
} catch (_) {}

export default GlycoViewerElement;
