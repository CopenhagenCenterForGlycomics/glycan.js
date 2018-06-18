/*global document,fetch*/
'use strict';
import * as debug from 'debug-any-level';

import Renderer from './Renderer';
import Canvas from './CanvasCanvas';

const module_string='glycanjs:canvasrenderer';

const container_symbol = Symbol('document_container');

let SYMBOLPATH = 'sugars.svg';

const SCALE = 1;

const log = debug(module_string);

const extend_boundaries = (current,newcoords) => {
  current.x.push(newcoords[0]);
  current.y.push(newcoords[1]);
  return current;
};

const get_bounding_boxes = function(renderobj,boundaries={x:[],y:[]}) {
  if (renderobj.torender) {
    for (let el of renderobj.torender) {
      boundaries = get_bounding_boxes(el,boundaries);
    }
    return boundaries;
  }
  if (renderobj.x2) {
    extend_boundaries(boundaries,[renderobj.x,renderobj.y]);
    extend_boundaries(boundaries,[renderobj.x2,renderobj.y2]);
  }
  if (renderobj.width) {
    extend_boundaries(boundaries,[renderobj.x,renderobj.y]);
    extend_boundaries(boundaries,[renderobj.x+renderobj.width,renderobj.y+renderobj.height]);
  }
  if (renderobj.text) {
    extend_boundaries(boundaries,[renderobj.x,renderobj.y]);
  }
  return boundaries;
};

const perform_rendering = function(canvas,renderobj) {
  if (renderobj.torender) {
    for (let el of renderobj.torender) {
      perform_rendering(canvas,el);
    }
    return;
  }
  if (renderobj.render) {
    renderobj.render(canvas);
  }
};

const import_icons = function(sugarpath) {
  let icons = document.createElement('svg');
  this.symbols = {};
  return fetch(sugarpath)
  .then((response) => response.text())
  .then( (xml) => icons.innerHTML = xml )
  .then( () => {
    for (let symbol of icons.querySelectorAll('defs symbol')) {
      let symboltext = symbol.innerHTML.replace(/#/g,'%23');
      let svg_text = `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="100px" height="100px">${symboltext}</svg>`;
      this.symbols[symbol.getAttribute('id')] = svg_text;
    }
  });
};


class CanvasRenderer extends Renderer {
  constructor(container,layout) {
    log('CanvasRenderer');
    super(container,layout);

    if (container) {
      this[container_symbol] = container;
      this.element = new Canvas(container);
    }
    this.ready = import_icons.call(this,this.symbolpath || this.constructor.SYMBOLSOURCE);
  }

  static set SYMBOLSOURCE(url) {
    SYMBOLPATH = url;
  }

  static get SYMBOLSOURCE() {
    return SYMBOLPATH;
  }

  static get GLOBAL_SCALE() {
    return SCALE;
  }

  setupContainer(container,sugar) {
    const canvas = this.element;

    if ( ! container ) {
      container = canvas.group();
      this.rendered.set(sugar,container);
    }

    if (this.groupTag && ! container.tagGroup) {
      container.tagGroup = container.group();
    }

    // Move all nodes out of the group
    if (container.tagGroup) {
      for (let el of container.tagGroup.element.childNodes) {
        container.appendChild(el);
      }
    }
    return container;
  }

  renderLinkageGroup(canvas) {
    return canvas.group();
  }

  renderLinkageLabel(canvas,x,y,text,ROTATE,short_axis_pos) {
    let label = canvas.text( x, y, text );
    if (! ROTATE && short_axis_pos < 0) {
      label['text-anchor'] ='end';
    }
    return label;
  }

  removeRendered(elements) {
    if (elements.residue) {
      elements.residue.parent.remove(elements.residue);
    }
    if (elements.linkage) {
      elements.linkage.parent.remove(elements.linkage);
    }
  }

  setIconPosition(icon,x,y,width,height,rotate) {
    icon.x = x;
    icon.y = y;
    icon.width = width;
    icon.height = height;
    icon.rotate = rotate;
  }

  renderIcon(container,residue) {
    let icon = container.use(residue.identifier,0,0,1,1);
    icon.src = this.symbols[residue.identifier.toLowerCase()];
    return icon;
  }

  scaleToFit() {
  }

  refresh() {
    this.ready.then( () => {
      super.refresh();
      let coords = get_bounding_boxes(this.element);
      let min_x = Math.min(...coords.x);
      let max_x = Math.max(...coords.x);
      let min_y = Math.min(...coords.y);
      let max_y = Math.max(...coords.y);
      this.element.canvas.setAttribute('width',(max_x - min_x)+'px');
      this.element.canvas.setAttribute('height',(max_y - min_y)+'px');

      let ctx = this.element.canvas.getContext('2d');
      ctx.scale(0.5,0.5);
      ctx.translate(-1*min_x,-1*min_y);
      perform_rendering(this.element.canvas,this.element);
    });
  }

}


export default CanvasRenderer;