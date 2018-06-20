/*global document,fetch,Event*/
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
  coords.x = coords.x.map( (val,idx,arr) => { if ((idx % 2) === 0) { return 0.5*(val + arr[idx+1]); } }).filter( x => typeof x !== 'undefined');
  coords.y = coords.y.map( (val,idx,arr) => { if ((idx % 2) === 0) { return 0.5*(val + arr[idx+1]); } }).filter( x => typeof x !== 'undefined');
  let min_x = Math.min(...coords.x)-100;
  let max_x = Math.max(...coords.x)+100;
  let min_y = Math.min(...coords.y)-100;
  let max_y = Math.max(...coords.y)+100;

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

const populate_path = (element) => {
  let path = {};
  path.fill = element.getAttribute('fill');
  if (element.getAttribute('stroke-width') && parseFloat(element.getAttribute('stroke-width')) > 0) {
    path.stroke = element.getAttribute('stroke');
  }
  if (element.getAttribute('transform')) {
    let [match_str,angle,cx,cy] = element.getAttribute('transform').match(/rotate\((\d+),(\d+),(\d+)\)/);
    if (match_str.length > 0) {
      path.rotate = { angle, cx, cy };
    }
  }
  return path;
};

const extract_paths = (symbol) => {
  let paths = [];
  for (let path of symbol.querySelectorAll('path')) {
    let a_path = populate_path(path);
    a_path.d = path.getAttribute('d');
    paths.push(a_path);
  }
  for (let path of symbol.querySelectorAll('circle')) {
    let a_path = populate_path(path);
    a_path.cx = parseFloat(path.getAttribute('cx'));
    a_path.cy = parseFloat(path.getAttribute('cy'));
    a_path.r = parseFloat(path.getAttribute('r'));
    paths.push(a_path);
  }

  for (let path of symbol.querySelectorAll('rect')) {
    let a_path = populate_path(path);
    let x = path.getAttribute('x');
    let y = path.getAttribute('y');
    let x2 = parseFloat(path.getAttribute('x'))+parseFloat(path.getAttribute('width'));
    let y2 = parseFloat(path.getAttribute('y'))+parseFloat(path.getAttribute('height'));

    a_path.d = `M${x},${y} ${x2},${y} ${x2},${y2} ${x},${y2} z`;
    paths.push(a_path);
  }

  for (let path of symbol.querySelectorAll('polyline')) {
    let a_path = populate_path(path);
    a_path.d = 'M'+path.getAttribute('points')+'Z';
    paths.push(a_path);
  }

  return paths;
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
      let paths = extract_paths(symbol);
      let svg_text = `data:image/svg+xml;utf8,<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" x="0" y="0" width="100px" height="100px">${symboltext}</svg>`;
      this.symbols[symbol.getAttribute('id')] = { svg: svg_text, paths };
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

const inside_icon = (x,y,icon) => {
  x = x * SCALE;
  y = y * SCALE;
  return (x >= icon.x && x <= (icon.x + icon.width)) &&
    (y >= icon.y && y <= (icon.y + icon.height));
};

const proxy_bounds = (x,y) => {
  return { left: x, top: y, width: 0, height: 0 };
};

const retarget_event = function(ev) {
  let inside_icons = [...this.iconset].filter(inside_icon.bind(null,ev.sugarX,ev.sugarY));
  let target_type = ev.type;
  for (let icon of inside_icons) {
    if (icon.hasElement()) {
      ev.stopImmediatePropagation();

      let new_ev = new Event(target_type,{bubbles: true});
      icon.element.getBoundingClientRect = proxy_bounds.bind(null,ev.clientX,ev.clientY);
      icon.element.dispatchEvent(new_ev);

      if (target_type === 'dragover' && this.last_dragenter !== icon ) {
        new_ev = new Event('dragenter',{bubbles: true});
        icon.element.dispatchEvent(new_ev);
      }
      return;
    }
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
      log.info('Creating canvas element');
      let canvas = container.ownerDocument.createElement('canvas');
      canvas.setAttribute('width','1px');
      canvas.setAttribute('height','1px');
      container.appendChild(canvas);
      this.element = new Canvas(canvas);
      wire_canvas_events(this.element.canvas, handle_events.bind(this,this.element.canvas), {passive:true, capture: false } );
      for (let ev of ['click','dragover']) {
        this.element.canvas.addEventListener(ev,retarget_event.bind(this),{ capture: true });
      }
    }
  }

  set symbolpath(path) {
    this.ready = import_icons.call(this,path);
    this.symbpath = path;
  }

  get symbolpath() {
    return this.symbpath;
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
      if (elements.residue.element) {
        elements.residue.element.parentNode.removeChild(elements.residue.element);
      }
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
    icon.src = this.symbols[residue.identifier.toLowerCase()].svg;
    icon.paths = this.symbols[residue.identifier.toLowerCase()].paths;
    let canvas = this.element.canvas;
    Object.defineProperty(icon, 'element', {
      get: function() {
        if ( ! this._element ) {
          this._element = canvas.ownerDocument.createElement('button');
          canvas.appendChild(this._element);
        }
        return this._element;
      }
    });
    icon.hasElement = () => '_element' in icon;
    return icon;
  }

  scaleToFit() {
  }

  refresh() {
    return this.ready.then( () => {
      super.refresh();
      render(this.element.canvas,this.element);
    });
  }

}


export default CanvasRenderer;