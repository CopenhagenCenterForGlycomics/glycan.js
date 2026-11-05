'use strict';

import SVGRenderer from '../SVGRenderer.js';
import FizikoSVGCanvas from './FizikoSVGCanvas.js';

import SYMBOLS_DEF from '../../sugars.svg';


// SVGRenderer.js's createCanvas() hook (added for exactly this - swap in a
// differently-drawing SVGCanvas subclass while still getting the base
// constructor's glycanjs namespace and mouse/touch event wiring) does the
// canvas swap; this class just needs the symbol set loaded afterward, which
// SVGRenderer's own constructor has no reason to know about.
class FizikoSVGRenderer extends SVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    if (container && layout) {
      SVGRenderer.AppendSymbols(this,SYMBOLS_DEF);
    }
  }

  // Overridable so a subclass (e.g. SNFGHeraldic) can swap in a differently
  // skinned canvas - different embedded font, different texture set - while
  // reusing this constructor's canvas-swap/symbol-loading mechanics as-is.
  createCanvas(container) {
    return new FizikoSVGCanvas(container);
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
