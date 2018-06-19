/*global document,fetch*/
'use strict';

import { Tween, autoPlay, onTick } from 'es6-tween';

import * as debug from 'debug-any-level';

import Renderer from './Renderer';
import Canvas from './CanvasCanvas';

import CanvasMouse from '../lib/canvas-mouse';

const module_string='glycanjs:canvasrenderer';

const container_symbol = Symbol('document_container');

let SYMBOLPATH = 'sugars.svg';

const SCALE = 100;

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

class CanvasMatrix {
  constructor(vals) {
    this._mat = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGMatrix();
    this._mat.a = vals[0];
    this._mat.b = vals[1];
    this._mat.c = vals[2];
    this._mat.d = vals[3];
    this._mat.e = vals[4];
    this._mat.f = vals[5];
  }
  applyToPoint(x,y) {
    let dompt = document.createElementNS('http://www.w3.org/2000/svg', 'svg').createSVGPoint();
    dompt.x = x;
    dompt.y = y;
    let inverted = dompt.matrixTransform(this._mat);
    return inverted;
  }
  inverse() {
    let mtrx = this._mat.inverse();
    let vals = [mtrx.a,mtrx.b,mtrx.c,mtrx.d,mtrx.e,mtrx.f];
    return new CanvasMatrix(vals);
  }
}

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

const render = function(canvas,renderobj) {
  let coords = get_bounding_boxes(renderobj);
  let min_x = Math.min(...coords.x);
  let max_x = Math.max(...coords.x);
  let min_y = Math.min(...coords.y);
  let max_y = Math.max(...coords.y);

  canvas.width = (max_x - min_x);
  canvas.height = (max_y - min_y);

  let ctx = canvas.getContext('2d');

  let scale = 1;

  ctx.setTransform(scale,0,0,scale,-1*min_x,-1*min_y);

  canvas.cm = new CanvasMouse(ctx, {
    handleScale: true,
    handleTransforms: true,
    matrix: new CanvasMatrix([scale,0,0,scale,-1*min_x,-1*min_y])
  });

  perform_rendering(canvas,renderobj);
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

const TweenMap = new WeakMap();

const supported_events = 'mousemove mousedown mouseup click touchstart touchend touchmove drop dragover';

const wire_canvas_events = function(canvas,callback) {
  for (let target of supported_events.split(' ')) {
    canvas.addEventListener( target, callback, { passive: true, capture: true } );
  }
};

const handle_events = function(canvas,event) {
  const ROTATE = this.rotate;
  if (event.clientX) {
    let transformed = canvas.cm.getPos(event);
    let xpos = transformed.x / SCALE;
    let ypos = transformed.y / SCALE;
    event.sugarX = ROTATE ? ((-1*ypos) + 1) : xpos;
    event.sugarY = ROTATE ? xpos : ypos;
  }
};


class CanvasRenderer extends Renderer {
  constructor(container,layout) {
    log('CanvasRenderer');
    super(container,layout);

    autoPlay(true);

    this.iconset = new Set();

    onTick( () => {
      for (let icon of this.iconset) {
        if (! icon.rendered ) {
          render(this.element.canvas,this.element);
          return;
        }
      }
    });


    if (container) {
      this[container_symbol] = container;
      this.element = new Canvas(container);
      wire_canvas_events(this.element.canvas, handle_events.bind(this,this.element.canvas), {passive:true, capture: false } );
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
    if ( ! TweenMap.get(icon) ) {
      TweenMap.set(icon,new Tween(icon));
    }
    let tween = TweenMap.get(icon);
    let timing = 200;
    icon.rendered = false;

    if (icon.x === x && icon.y === y && icon.width === width && icon.height === height) {
      icon.rendered = true;
      return;
    }

    if ( ! this.iconset.has(icon) ) {
      this.iconset.add(icon);
      icon.x = x;
      icon.y = y;
      icon.width = width;
      icon.height = height;
      icon.rotate = rotate;
      timing = 0;
      icon.rendered = true;
    }
    tween.to({x: x, y: y, width: width, height: height, rotate: rotate },timing)
    .on('complete', (icon) => {
      icon.rendered = true;
    })
    .start();
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
      render(this.element.canvas,this.element);
    });
  }

}


export default CanvasRenderer;