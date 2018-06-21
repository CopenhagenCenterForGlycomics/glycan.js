'use strict';

import RoughCanvas from './RoughCanvas';
import CanvasRenderer from './CanvasRenderer';

class RoughCanvasRenderer extends CanvasRenderer {
  constructor(container,layout) {
    super(container,layout);
    this.element = new RoughCanvas(this.element.canvas);
  }
}

export default RoughCanvasRenderer;