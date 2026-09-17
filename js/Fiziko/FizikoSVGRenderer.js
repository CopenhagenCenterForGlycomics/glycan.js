'use strict';

import SVGRenderer from '../SVGRenderer.js';
import FizikoSVGCanvas from './FizikoSVGCanvas.js';

import SYMBOLS_DEF from '../../sugars.svg';


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
      SVGRenderer.AppendSymbols(this,SYMBOLS_DEF);
      this.element.canvas.setAttribute('xmlns:glycanjs', 'https://glycocode.com/glycanjs');
    }
  }
}

const FIZIKO_ANGLE = 40;

const FIZIKO_TEXTURES = {
  'galnac' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 5, roughness: 1 },
  'glcnac' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 5, roughness: 1 },
  'neuac' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 5, roughness: 1 },
  'neugc' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 5, roughness: 1 },
  'man' : { texture: 'latitude', lightAngle: FIZIKO_ANGLE, axisTilt: 75, rings: 20, roughness: 1 },
  'gal' : { texture: 'longitude', lightAngle: FIZIKO_ANGLE, axisTilt: 75, rings: 14, roughness: 1 },
  'glc' : { texture: 'latitude', lightAngle: FIZIKO_ANGLE, axisTilt: 75, rings: 20, roughness: 1 },
  'glca' : { texture: 'latitude', lightAngle: FIZIKO_ANGLE, rings: 20, roughness: 1 },
  'gala' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 2, roughness: 1 },
  'idoa' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 2, roughness: 1 },
  'fuc' : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 3, roughness: 1 },
  'xyl' : { texture: 'latitude', lightAngle: FIZIKO_ANGLE, axisTilt: 75, rings: 30, roughness: 1 },
  'p'   : { texture: 'shaded', lightAngle: FIZIKO_ANGLE, rings: 3, roughness: 1 },
  'rbo' : { texture: 'latitude', lightAngle: FIZIKO_ANGLE, axisTilt: 75, rings: 50, roughness: 1 },
}

class SNFGFiziko extends FizikoSVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    this.element.textureFor = (ref) => {
      const clean_ref = ref.replace(/^#/,'');
      const wanted_texture = FIZIKO_TEXTURES[clean_ref] || { texture: 'shaded' };
      return wanted_texture;
    };
    //this.element.fillOverride = '#000';
  }
}

export { SNFGFiziko };

export default FizikoSVGRenderer;
