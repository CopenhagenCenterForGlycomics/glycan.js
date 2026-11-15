'use strict';

import FizikoSVGRenderer from '../Fiziko/FizikoSVGRenderer.js';
import UkiyoeSVGCanvas from './UkiyoeSVGCanvas.js';

// Ukiyo-e / woodblock-print renderer: FizikoSVGRenderer with the ukiyo-e
// canvas (UkiyoeSVGCanvas: bokashi fill with woodgrain, calligraphic ink
// outlines, tapered linkages). Every residue gets the same texture; the
// colour is the residue's own.
class SNFGUkiyoe extends FizikoSVGRenderer {
  createCanvas(container) {
    return new UkiyoeSVGCanvas(container);
  }

  constructor(container, layout) {
    super(container, layout);
    this.element.textureFor = () => ({
      texture: 'ukiyoe',
      roughness: 1,          // FizikoSVGCanvas draws buildWobblyOutline only when roughness > 0
      strokeWidth: 4.5,        // the outline at its broadest, in icon units (viewBox 0 0 100 100)
      spacing: 6,
      knots: 2,
      samples: 20,
      jitter: 0.3,
    });
  }
}

export { SNFGUkiyoe };
export default SNFGUkiyoe;
