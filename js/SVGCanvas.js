'use strict';

import * as debug from 'debug-any-level';

const module_string='glycanjs:svgcanvas';

const log = debug(module_string);

const SVGNS = 'http://www.w3.org/2000/svg';

const PRECISION = 1;

const str = (num) => num.toFixed(PRECISION);

class SVGCanvas {
  constructor(container) {
    log.info('Creating canvas element');
    this.canvas = container.ownerDocument.createElementNS(SVGNS,'svg');
    container.appendChild(this.canvas);
  }

  appendChild(element) {
    this.canvas.appendChild(element);
  }

  use(ref,x,y,width,height) {
      var a_use = this.canvas.ownerDocument.createElementNS(SVGNS,'use');
      a_use.setAttribute('x', str(x));
      a_use.setAttribute('y', str(y));
      a_use.setAttribute('width', str(width));
      a_use.setAttribute('height', str(height));
      a_use.setAttributeNS('http://www.w3.org/1999/xlink','href',ref);
      this.appendChild(a_use);
      return a_use;        
  }

}

export default SVGCanvas;