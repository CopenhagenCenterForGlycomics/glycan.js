'use strict';

import FizikoSVGRenderer from '../Fiziko/FizikoSVGRenderer.js';
import { tinctureForColor } from './heraldicTincture.js';

// Reuses FizikoSVGRenderer/FizikoSVGCanvas wholesale (same clip-path "ink"
// machinery, same icon-extraction/caching) - the only thing this renderer
// changes is *which* texture each shape gets: not a fixed per-monosaccharide
// choice (FIZIKO_TEXTURES in FizikoSVGRenderer.js), but whichever heraldic
// tincture that shape's own SNFG color is nearest to (hatchForColor).
class SNFGHeraldic extends FizikoSVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    // Placeholder non-solid texture so FizikoSVGCanvas.use() takes the
    // textured code path at all - hatchForColor below replaces it per
    // shape with the real tincture pattern before anything is drawn.
    this.element.textureFor = () => ({
      texture: 'hatch',
      hatchAngle: 0,
      spacing: 4,
      jitter: 0,
      roughness: 0,
      strokeWidth: 1.25
    });
    this.element.hatchForColor = (color) => tinctureForColor(color);
  }
}

export { SNFGHeraldic };
export default SNFGHeraldic;
