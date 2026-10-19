'use strict';

import FizikoSVGRenderer from '../Fiziko/FizikoSVGRenderer.js';
import HeraldicSVGCanvas from './HeraldicSVGCanvas.js';
import { tinctureForColor } from './heraldicTincture.js';

// Reuses FizikoSVGRenderer/FizikoSVGCanvas wholesale (same clip-path "ink"
// machinery, same icon-extraction/caching) - the things this renderer
// changes are: *which* texture each shape gets (not a fixed
// per-monosaccharide choice like FIZIKO_TEXTURES in FizikoSVGRenderer.js,
// but whichever heraldic tincture that shape's own SNFG color is nearest to
// - hatchForColor), and which font residue/linkage labels use
// (HeraldicSVGCanvas, Fondamento instead of Routed Gothic).
class SNFGHeraldic extends FizikoSVGRenderer {
  createCanvas(container) {
    return new HeraldicSVGCanvas(container);
  }

  constructor(container, layout) {
    super(container, layout);
    // Placeholder non-solid texture so FizikoSVGCanvas.use() takes the
    // textured code path at all - hatchForColor below replaces it per
    // shape with the real tincture pattern before anything is drawn.
    this.element.textureFor = () => ({
      texture: 'hatch',
      hatchAngle: 0,
      hatchWeight: 2,
      spacing: 4,
      jitter: 0,
      roughness: 1,
      strokeWidth: 2.5
    });
    this.element.hatchForColor = (color) => tinctureForColor(color);
  }
}

export { SNFGHeraldic };
export default SNFGHeraldic;
