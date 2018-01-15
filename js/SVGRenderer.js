'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';
import Monosaccharide from './Monosaccharide';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const layout_cache = Symbol('cached_layout');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const rendered_symbol = Symbol('rendered_elements');

const ROTATE = false;

let SCALE = 100;

const PRECISION = 1;

const GLYCANJSNS = 'https://glycocode.com/glycanjs';

const FULL_REFRESH = true;

const str = (num) => num.toFixed(PRECISION);

const supported_events = 'mousemove mousedown mouseup click touchstart touchend touchmove drop dragover';

const wire_canvas_events = function(canvas,callback) {
  for (let target of supported_events.split(' ')) {
    canvas.addEventListener( target, callback, { passive: true, capture: true } );
  }
};

const handle_events = function(svg,event) {
  if (event.clientX) {
    var pt=svg.createSVGPoint();
    pt.x=event.clientX;
    pt.y=event.clientY;
    let transformed = pt.matrixTransform(svg.getScreenCTM().inverse());
    event.svgX = transformed.x / SCALE;
    event.svgY = transformed.y / SCALE;
  }
  // if (event.type !== 'mousemove') {
  //   console.log(event.type,event.target,event);
  // }
};

const calculate_moved_residues = function(layout,residue) {
  let current = this[layout_cache].get(residue);
  let updated = layout.get(residue);
  if ( ! current ) {
    this[layout_cache].set(residue,layout.get(residue));
    return true;
  }
  this[layout_cache].set(residue,updated);
  return ( ! ( current.x === updated.x &&
     current.y === updated.y &&
     current.width === updated.width &&
     current.height === updated.height &&
     current.z === updated.z ));
};

const render_link_label = function(anomer,linkage,child_pos,parent_pos,canvas) {
  let fancy_anomer = '?';
  if (anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (anomer === 'a') { fancy_anomer = '\u03B1'; }

  linkage = linkage || '?';
  let [child_cx,child_cy,parent_cx,parent_cy] = [child_pos.x+child_pos.width/2,
                                             child_pos.y+child_pos.height/2,
                                             parent_pos.x+parent_pos.width/2,
                                             parent_pos.y+parent_pos.height/2];

  let gradient = (child_cx -
                 parent_cx) /
                 (child_cy -
                 parent_cy);

  if (! isFinite(gradient)) {
    gradient = -1;
    if (child_pos.x > parent_pos.x) {
      gradient = 1;
    }
  }

  let residue_distance = child_cy - parent_cy;

  let child_distance = residue_distance*0.75;

  if (Math.abs(residue_distance) >= (child_pos.height + parent_pos.height)/2 ) {
    residue_distance -= (child_pos.height + parent_pos.height)/2;
    child_distance = residue_distance*0.75 + parent_pos.height/2;
  } else if (residue_distance == 0) {
    child_distance = 0.425*Math.abs(child_cx - parent_cx);
  }
  let xpos = ( gradient * child_distance );
  if (xpos === 0) {
    xpos += child_pos.width/10;
  }
  let xcoord = SCALE*(xpos + parent_cx);
  let ycoord = 0;
  if ((child_pos.y + 1.1*child_pos.height) < parent_pos.y) {
    ycoord = SCALE*(child_pos.y + 1.1 * child_pos.height);
  } else {
    ycoord = SCALE*(child_pos.y + 1*child_pos.height);
  }

  if (child_pos.y === parent_pos.y) {
    ycoord = SCALE*(child_pos.y + child_pos.height/8);
    if ( ycoord > SCALE/4 ) {
      ycoord = SCALE/4;
    }
  }
  let label = canvas.text( xcoord, ycoord, fancy_anomer+linkage);
  label.setAttribute('font-size',str(Math.floor(SCALE/3)));
  label.setAttribute('dominant-baseline','hanging');
  if (xpos < 0) {
    label.setAttribute('text-anchor','end');
  }

  if (ROTATE) {
    label.setAttribute('transform',`rotate(90,${xcoord},${ycoord})`);
    label.setAttribute('text-anchor','start');
    if (xpos >= 0) {
    label.setAttribute('dominant-baseline','auto');
    }
  }
  canvas.sendToBack(label);
  return label;
};

const render_linkage = function(child_pos,parent_pos,child,parent,canvas) {
  if ( ! parent_pos ) {
    return;
  }
  let positions = [
      SCALE*(child_pos.x + child_pos.width / 2),
      SCALE*(child_pos.y + child_pos.height / 2),
      SCALE*(parent_pos.x + parent_pos.width / 2),
      SCALE*(parent_pos.y + parent_pos.height / 2)
  ];
  let group = canvas.group();
  canvas.sendToBack(group.element);
  let line = group.line(...positions);
  line.setAttribute('stroke-width',str(SCALE/100));
  line.setAttribute('stroke','#333');

  render_link_label(child.anomer,parent.linkageOf(child),child_pos,parent_pos,group);
  return group.element;
};

const update_icon_position = function(element,x,y,width,height,rotate) {
  let rotate_str = '';
  if (rotate !== 0) {
    rotate_str = `rotate(${str(rotate)},${str(x + width/2)},${str(y + height/2)})`;
  }

  let transform = `${rotate_str} translate(${str(x)},${str(y)}) scale(${str(width)},${str(height)})`;
  element.setAttribute('transform',transform);

  // element.setAttribute('x',str(x));
  // element.setAttribute('y',str(y));
  // element.setAttribute('width',str(width));
  // element.setAttribute('height',str(height));
};

const cleanup_residues = function(active_residues) {
  let active = new Set(active_residues);
  for (let res of this.rendered.keys()) {
    if ( ! (res instanceof Monosaccharide) ) {
      continue;
    }
    if (! active.has(res)) {
      let elements = this.rendered.get(res);
      elements.residue.parentNode.removeChild(elements.residue);
      elements.linkage.parentNode.removeChild(elements.linkage);
      this.rendered.delete(res);
    }
  }
};

const layout_sugar = function(sugar,layout_engine) {
  log.info('Laying out',sugar.sequence);
  let layout = layout_engine.PerformLayout(sugar);
  return layout;
};

const render_sugar = function(sugar,layout,new_residues=sugar.composition()) {
  let xvals = [];
  let yvals = [];
  let container = this.rendered.get(sugar);
  const canvas = this.element;

  if ( ! container ) {
    container = canvas.group();
    container.setAttributeNS(GLYCANJSNS,'glycanjs:sequence',sugar.sequence);
    container.setAttributeNS(null,'pointer-events','none');
    this.rendered.set(sugar,container);
  }
  if (new_residues.length < 1) {
    return;
  }
  let zindices = [];

  for (let residue of new_residues) {

    let position = layout.get(residue);
    xvals.push(position.x);
    xvals.push(position.x+position.width);
    yvals.push(position.y);
    yvals.push(position.y+position.height);

    let icon = null;

    let current = this.rendered.get(residue);

    if ( ! current ) {
      icon = container.use(`sugars.svg#${residue.identifier.toLowerCase()}`,0,0,1,1);
      icon.setAttributeNS(GLYCANJSNS,'glycanjs:identifier',residue.identifier);
      icon.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
      icon.setAttributeNS(GLYCANJSNS,'glycanjs:parent', residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
      current = { residue: icon, linkage: null };
      this.rendered.set(residue, current);
    } else {
      icon = current.residue;
    }

    if (position.z !== 1) {
      zindices.push({ z: position.z, icon: icon });
    }

    if ( ! current.linkage ) {
      current.linkage = render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container );
    } else {
      current.linkage.parentNode.removeChild(current.linkage);
      current.linkage = render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container );
      // Do nothing
    }

    let rotate_angle = 0;
    if (position.rotate) {
      rotate_angle = position.rotate;
    }
    if (ROTATE) {
      rotate_angle += 90;
    }

    update_icon_position(icon,position.x*SCALE,position.y*SCALE,position.width*SCALE,position.height*SCALE,rotate_angle);
  }

  for (let zindex of zindices.sort( (a,b) => a.z - b.z ) ) {
    container.sendToFront(zindex.icon);
  }



  let min_x = Math.min(...xvals)-1;
  let min_y = Math.min(...yvals)-1;
  let width = Math.max(...xvals) - min_x + 1;
  let height = Math.max(...yvals) - min_y + 1;


  if (new_residues.length < sugar.composition().length) {
    let [curr_min_x,curr_min_y,curr_width,curr_height] = container.element.getAttribute('viewBox').split(' ').map(parseFloat).map(x => x/SCALE);
    let curr_max_x = curr_min_x + curr_width;
    let curr_max_y = curr_min_y + curr_height;
    let max_x = min_x + width;
    let max_y = min_y + height;
    if (curr_min_x < min_x) {
      min_x = curr_min_x;
    }
    if (curr_max_x > max_x) {
      max_x = curr_max_x;
    }
    width = max_x - min_x;

    if (curr_min_y < min_y) {
      min_y = curr_min_y;
    }
    if (curr_max_y > max_y) {
      max_y = curr_max_y;
    }
    height = max_y - min_y;
  }

  if ( isNaN(min_x + min_y+ width + height) ) {
    return container;
  }


  if ( ! container.laidOut ) {
    container.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);
    canvas.canvas.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);
    container.laidOut = true;
  }
  return container;
};

class SVGRenderer {
  constructor(container,layout) {
    this[container_symbol] = container;
    this[layout_engine] = layout;
    this[layout_cache] = new WeakMap();
    this[canvas_symbol] = new SVGCanvas(container);
    this[canvas_symbol].canvas.setAttribute('viewBox','-30 -60 60 100');
    this[canvas_symbol].canvas.setAttribute('xmlns:glycanjs',GLYCANJSNS);
    wire_canvas_events(this[canvas_symbol].canvas, handle_events.bind(this,this[canvas_symbol].canvas), {passive:true, capture: false } );
    this[rendered_sugars_symbol] = [];
    this[rendered_symbol] = new Map();
    // let counter = 0;
    // let before,now,fps;
    // before=Date.now();
    // fps=0;
    // let looper = () => {
    //   now=Date.now();
    //   fps=Math.round(1000/(now-before));
    //   before=now;

    //   counter += Math.PI/50;
    //   SCALE = 100 + 90*Math.cos(counter);
    //   this.refresh(true);
    //   window.requestAnimationFrame(looper);
    //   // console.log(fps);
    // };

    // window.requestAnimationFrame(looper);

  }
  get element() {
    return this[canvas_symbol];
  }
  get rendered() {
    return this[rendered_symbol];
  }
  addSugar(sugar) {
    this[rendered_sugars_symbol].push(sugar);
  }
  refresh() {
    cleanup_residues.bind(this)(Array.prototype.concat(...this[rendered_sugars_symbol].map(sug => sug.composition())));
    for (let sugar of this[rendered_sugars_symbol]) {
      let layout = layout_sugar(sugar,this[layout_engine]);
      let modified_residues = FULL_REFRESH ? sugar.composition() : sugar.composition().filter(calculate_moved_residues.bind(this,layout));
      render_sugar.bind(this)(sugar, layout,modified_residues);
    }
  }
}


export default SVGRenderer;