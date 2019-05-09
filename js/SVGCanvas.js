'use strict';

import debug from './Debug';

const module_string='glycanjs:svgcanvas';

const log = debug(module_string);

const SVGNS = 'http://www.w3.org/2000/svg';

const PRECISION = 1;

const str = (num) => num.toFixed(PRECISION);

class SVGCanvas {
  constructor(container) {
    log.info('Creating canvas element');
    let is_defs = container.nodeName === 'DEFS';
    this.canvas = this.createElement(is_defs ? 'symbol' : 'svg',container.ownerDocument);
    this.canvas.setAttribute('xmlns:xlink','http://www.w3.org/1999/xlink');
    container.appendChild(this.canvas);
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