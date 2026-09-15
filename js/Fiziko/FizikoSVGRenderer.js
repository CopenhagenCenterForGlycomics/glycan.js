'use strict';

import SVGRenderer from '../SVGRenderer.js';
import FizikoSVGCanvas from './FizikoSVGCanvas.js';

// Mirrors rough-glycan.js's RoughCanvasRenderer (swap in a differently
// drawing canvas for `this.element`, inherit everything else from the base
// renderer unchanged), with one difference: CanvasCanvas.js's `Canvas` just
// wraps an *existing* <canvas> element, so RoughCanvasRenderer could reuse
// `this.element.canvas` directly. SVGCanvas always creates and appends a
// brand-new <svg>/<symbol>, so doing the same here would leave two SVG
// roots in the container. Instead, let SVGRenderer's constructor finish (it
// also sets a module-private container tag and glycanjs namespace this
// class can't see), then discard the SVG element it created and build the
// real one - a one-time, negligible DOM cost.
//
// Known gap: SVGRenderer's own mouse/touch event wiring is attached to the
// discarded element and is private to SVGRenderer.js, so it is NOT
// re-attached here. Wire it again on `this.element.canvas` after
// construction if interactivity is needed, or fold this swap into
// SVGRenderer.js itself (e.g. a small overridable `createCanvas(container)`
// method) when integrating.
class FizikoSVGRenderer extends SVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    if (container && layout) {
      const previousCanvas = this.element.canvas;
      previousCanvas.parentNode.removeChild(previousCanvas);
      this.element = new FizikoSVGCanvas(container);
      this.element.canvas.setAttribute('xmlns:glycanjs', 'https://glycocode.com/glycanjs');
    }
  }
}

export default FizikoSVGRenderer;
