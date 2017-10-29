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
    let a_use = this.canvas.ownerDocument.createElementNS(SVGNS,'use');
    a_use.setAttribute('x', str(x));
    a_use.setAttribute('y', str(y));
    a_use.setAttribute('width', str(width));
    a_use.setAttribute('height', str(height));
    a_use.setAttributeNS('http://www.w3.org/1999/xlink','href',ref);
    this.appendChild(a_use);
    return a_use;
  }

  line(x,y,x2,y2) {
    let a_line = this.canvas.ownerDocument.createElementNS(SVGNS,'line');
    a_line.setAttribute('x1', str(x));
    a_line.setAttribute('y1', str(y));
    a_line.setAttribute('x2', str(x2));
    a_line.setAttribute('y2', str(y2));
    this.appendChild(a_line);
    return a_line;
  }

  text(x,y,text) {
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
    this.appendChild(a_text);
    return a_text;
  }


  sendToBack(element) {
    let parent = element.parentNode;
    parent.insertBefore(element,parent.firstChild);
    return element;
  }

}

export default SVGCanvas;