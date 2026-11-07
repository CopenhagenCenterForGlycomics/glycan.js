'use strict';

import debug from './Debug.js';

const module_string='glycanjs:svgcanvas';

const log = debug(module_string);

const SVGNS = 'http://www.w3.org/2000/svg';

const PRECISION = 1;

const str = (num) => num.toFixed(PRECISION);

// Lazy symbol copies. A renderer's canvas used to receive a copy of every
// symbol in sugars.svg (~200 nodes) to draw the handful a glycan uses.
// Canvases that opt in instead keep a reference to the shared, parsed
// symbol sets (see SVGRenderer.AppendSymbols) and copy a symbol into their
// own <defs> the first time use() references it.
//
// Opt-in is per class, through an *own* static LAZY_SYMBOLS getter, so a
// subclass that looks symbols up in the canvas DOM itself (e.g.
// rough-glycan.js's RoughSVGCanvas) keeps getting the full copy until it
// declares LAZY_SYMBOLS and calls findSymbol() instead.
const lazy_canvases = new WeakMap();   // <svg> element -> its SVGCanvas
const lazy_state = Symbol('lazy_symbols');

// Per parsed symbol set (a detached <defs>): id -> <symbol>, built once.
const symbol_indexes = new WeakMap();

const symbol_index = (source) => {
    let index = symbol_indexes.get(source);
    if (! index) {
        index = new Map();
        for (const symbol of source.children) {
            const id = symbol.getAttribute('id');
            if (id && ! index.has(id)) {
                index.set(id, symbol);
            }
        }
        symbol_indexes.set(source, index);
    }
    return index;
};

class SVGCanvas {
  constructor(container) {
    log.info('Creating canvas element');
    let is_defs = container.nodeName === 'DEFS';
    this.canvas = this.createElement(is_defs ? 'symbol' : 'svg',container.ownerDocument);
    this.canvas.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
    container.appendChild(this.canvas);
    if (Object.prototype.hasOwnProperty.call(this.constructor, 'LAZY_SYMBOLS')) {
      // One object, only ever mutated: group() hands out Object.create(this)
      // proxies, and assigning a field through one would land on the proxy.
      this[lazy_state] = { sources: [], copies: new Map(), defs: null, wanted: new Set() };
      lazy_canvases.set(this.canvas, this);
    }
  }

  static get LAZY_SYMBOLS() {
    return true;
  }

  // The lazily-copying SVGCanvas drawing into `element`, if there is one.
  static lazyCanvasFor(element) {
    return lazy_canvases.get(element);
  }

  // Registers a parsed symbol set. Symbols already referenced by use()
  // before it arrived (AppendSymbols is async) are copied in now.
  addSymbolSource(source) {
    const state = this[lazy_state];
    if (state.sources.includes(source)) {
      return;
    }
    state.sources.push(source);
    for (const id of state.wanted) {
      this.findSymbol(id);
    }
  }

  // The <symbol> for `ref` ("#id" or "id") in this canvas, copying it in
  // from the registered symbol sets on first use. Earlier sources win,
  // matching document order when every set was copied in full.
  // Cost: a Map lookup when already copied; one deep clone the first time.
  findSymbol(ref) {
    const id = ref.replace(/^#/, '');
    const state = this[lazy_state];
    // No registered set: either no lazy state, or AppendSymbols ran from a
    // different copy of glycan.js (nested node_modules) and copied the full
    // set into the DOM instead - look there.
    if (! state || state.sources.length === 0) {
      let found = null;
      try {
        found = this.canvas.querySelector(`#${id}`);
      } catch (ex) {
        found = null;
      }
      if (! found && state) {
        // Drawn before AppendSymbols resolved: copy it in once it does.
        state.wanted.add(id);
      }
      return found;
    }
    const copy = state.copies.get(id);
    if (copy && this.canvas.contains(copy)) {
      return copy;
    }
    for (const source of state.sources) {
      const symbol = symbol_index(source).get(id);
      if (! symbol) {
        continue;
      }
      if (! state.defs || ! this.canvas.contains(state.defs)) {
        state.defs = this.createElement('defs');
        this.canvas.appendChild(state.defs);
      }
      const imported = this.canvas.ownerDocument.importNode(symbol, true);
      state.defs.appendChild(imported);
      state.copies.set(id, imported);
      state.wanted.delete(id);
      return imported;
    }
    state.wanted.add(id);
    return null;
  }

  createElement(tag,doc=this.canvas.ownerDocument) {
    return doc.createElementNS(SVGNS,tag);
  }

  appendChild(element) {
    this.canvas.appendChild(element);
  }

  group(a_g) {
    if ( ! a_g ) {
      a_g = this.canvas.ownerDocument.createElementNS(SVGNS,'g');
      this.appendChild(a_g);
    }
    return Object.create(this,{
      appendChild: { value: el => a_g.appendChild(el) },
      setAttribute: { value: (name,val) => a_g.setAttribute(name,val) },
      setAttributeNS: { value: (ns,name,val) => a_g.setAttributeNS(ns,name,val) },
      element: { value: a_g }
    });
  }

  use(ref,x,y,width,height) {
    if (this[lazy_state]) {
      this.findSymbol(ref);
    }
    let a_use = this.canvas.ownerDocument.createElementNS(SVGNS,'use');
    a_use.setAttribute('x', str(x));
    a_use.setAttribute('y', str(y));
    a_use.setAttribute('width', str(width));
    a_use.setAttribute('height', str(height));
    a_use.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',ref);
    this.appendChild(a_use);
    return a_use;
  }

  rect(x,y,width,height) {
    let a_rect = this.canvas.ownerDocument.createElementNS(SVGNS,'rect');
    a_rect.setAttribute('x', str(x));
    a_rect.setAttribute('y', str(y));
    a_rect.setAttribute('width', str(width));
    a_rect.setAttribute('height', str(height));
    this.appendChild(a_rect);
    return a_rect;
  }

  line(x,y,x2,y2,options={}) {
    let a_line = this.canvas.ownerDocument.createElementNS(SVGNS,'line');
    a_line.setAttribute('x1', str(x));
    a_line.setAttribute('y1', str(y));
    a_line.setAttribute('x2', str(x2));
    a_line.setAttribute('y2', str(y2));
    for (let key of Object.keys(options)) {
      a_line.setAttribute(key,options[key]);
    }
    let [fill_style,stroke_style,stroke_width] = [ options.fill ? `fill: var(--fill-color,${options.fill});` : '',
      options.stroke ? `stroke: var(--stroke-color,${options.stroke});` : '',
      options['stroke-width'] ? `stroke-width: var(--stroke-width,${options['stroke-width']})` : ''
    ];
    a_line.setAttribute('style',`${fill_style}${stroke_style}${stroke_width}`);
    a_line.setAttribute('stroke-linecap','round');
    this.appendChild(a_line);
    return a_line;
  }

  text(x,y,text,options={}) {
    let a_text = this.canvas.ownerDocument.createElementNS(SVGNS,'text');
    let a_tspan = this.canvas.ownerDocument.createElementNS(SVGNS, 'tspan');
    if (typeof text != 'string') {
      a_text.appendChild(text);
    } else {
      a_text.appendChild(a_tspan);
      a_tspan.textContent = text;
      a_tspan.setAttribute('dy','0');
    }
    a_text.style.fontFamily = 'Helvetica, Verdana, Arial, Sans-serif';
    a_text.setAttribute('x',str(x));
    a_text.setAttribute('y',str(y));
    for (let optkey of ['font-size','text-anchor']) {
      if (options[optkey]) {
        a_text.setAttribute(optkey,options[optkey]);
      }
    }
    for (let optkey of ['dy','dx']) {
      if (options[optkey]) {
        a_tspan.setAttribute(optkey,options[optkey]);
      }
    }

    this.appendChild(a_text);
    return a_text;
  }


  sendToBack(element) {
    if (element.element) {
      element = element.element;
    }
    let parent = element.parentNode;
    parent.insertBefore(element,parent.firstChild);
    return element;
  }

  sendToFront(element) {
    if (element.element) {
      element = element.element;
    }
    let parent = element.parentNode;
    parent.insertBefore(element,null);
    return element;
  }

}

export default SVGCanvas;