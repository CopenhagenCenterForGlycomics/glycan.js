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

const group_tag_symbol = Symbol('group_tag');

const ROTATE = true;

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
    let xpos = transformed.x / SCALE;
    let ypos = transformed.y / SCALE;
    event.svgX = ROTATE ? ((-1*ypos) + 1) : xpos;
    event.svgY = ROTATE ? xpos : ypos;
  }
};

const calculate_moved_residues = function(layout,residue) {
  if (! layout ) {
    // We don't have a layout specified, so we
    // should skip moving any residues around!
    return false;
  }
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

const get_long_axis_size = res => ROTATE ? res.width : res.height;
const get_short_axis_size = res => ROTATE ? res.height : res.width;


const render_link_label = function(anomer,linkage,child_pos,parent_pos,canvas) {
  let fancy_anomer = '?';
  if (anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (anomer === 'a') { fancy_anomer = '\u03B1'; }

  linkage = linkage || '?';
  let [child_cx,child_cy,parent_cx,parent_cy] = [child_pos.x+child_pos.width/2,
                                             child_pos.y+child_pos.height/2,
                                             parent_pos.x+parent_pos.width/2,
                                             parent_pos.y+parent_pos.height/2];

  let long_axis = ROTATE ? child_cx - parent_cx : child_cy - parent_cy;
  let short_axis = ROTATE ? child_cy - parent_cy : child_cx - parent_cx;

  let long_axis_size = get_long_axis_size(child_pos) + get_long_axis_size(parent_pos);

  let short_axis_base = ROTATE ? parent_cy : parent_cx;
  let long_axis_base = ROTATE ? child_pos.x : child_pos.y;

  let short_axis_direction = ROTATE ? child_pos.y - parent_pos.y : child_pos.x - parent_pos.x;
  let long_axis_direction = ROTATE ? child_pos.x - parent_pos.x : child_pos.y - parent_pos.y;

  let gradient = short_axis /
                 long_axis;

  if (! isFinite(gradient)) {
    gradient = -1;
    if (short_axis_direction > 0) {
      gradient = 1;
    }
  }

  let residue_distance = long_axis;

  let child_distance = residue_distance*0.75;

  if (Math.abs(residue_distance) >= (long_axis_size/2) ) {
    residue_distance -= long_axis_size/2;
    child_distance = residue_distance*0.75 + get_long_axis_size(parent_pos)/2;
  } else if (residue_distance == 0) {
    child_distance = 0.425*Math.abs(short_axis);
  }
  let short_axis_pos = ( gradient * child_distance );
  if (short_axis_pos === 0) {
    short_axis_pos += get_short_axis_size(child_pos)/10;
  }

  let short_axis_coord = SCALE*(short_axis_base + short_axis_pos);
  let long_axis_coord = SCALE*(long_axis_base + 1*get_long_axis_size(child_pos));

  if (long_axis_direction === 0) {
    long_axis_coord = SCALE*(long_axis_base + get_long_axis_size(child_pos)/8);
    if ( long_axis_coord > SCALE/4 ) {
      long_axis_coord = SCALE/4;
    }
  }
  let label = canvas.text( ROTATE ? long_axis_coord : short_axis_coord, ROTATE ? short_axis_coord : long_axis_coord, fancy_anomer+linkage);
  label.setAttribute('font-size',str(Math.floor(SCALE/3)));
  label.setAttribute('dominant-baseline','hanging');
  if (! ROTATE && short_axis_pos < 0) {
    label.setAttribute('text-anchor','end');
  }
  if (ROTATE && short_axis_pos < 0) {
    label.removeAttribute('dominant-baseline');
  }

  canvas.sendToBack(label);
  return label;
};

const render_linkage = function(child_pos,parent_pos,child,parent,canvas, show_labels = true) {
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
  if ( show_labels ) {
    render_link_label(child.anomer,parent.linkageOf(child),child_pos,parent_pos,group);
  }
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
      if (elements.linkage) {
        elements.linkage.parentNode.removeChild(elements.linkage);
      }
      this.rendered.delete(res);
    }
  }
};

const layout_sugar = function(sugar,layout_engine) {
  if ( ! layout_engine ) {
    log.info('No layout engine specified, skipping layout');
    return;
  }
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
  } else {
    container.setAttributeNS(GLYCANJSNS,'glycanjs:sequence',sugar.sequence);
  }

  if (this.groupTag && ! container.tagGroup) {
    container.tagGroup = container.group();
    container.tagGroup.element.setAttribute('class','tagged');
  }

  // Move all nodes out of the group
  if (container.tagGroup) {
    for (let el of container.tagGroup.element.childNodes) {
      container.appendChild(el);
    }
  }

  if (new_residues.length < 1) {
    return;
  }

  let zindices = [];

  for (let residue of (layout ? new_residues : [])) {

    let position = layout.get(residue);
    let xval = position.x;
    let yval = position.y;
    if (ROTATE) {
      position.x = yval;
      position.y = -1*xval - position.width;
    }

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
    let show_labels = this[layout_engine].LINKS == true;
    if ( ! current.linkage ) {
      current.linkage = render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container, show_labels );
    } else {
      current.linkage.parentNode.removeChild(current.linkage);
      current.linkage = render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container, show_labels );
      // Do nothing
    }
    if (current.linkage) {
      current.linkage.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
    }

    let rotate_angle = 0;
    if (position.rotate) {
      rotate_angle = position.rotate;
    }
    if (ROTATE) {
      rotate_angle -= 90;
    }

    update_icon_position(icon,position.x*SCALE,position.y*SCALE,position.width*SCALE,position.height*SCALE,rotate_angle);
  }

  for (let zindex of zindices.sort( (a,b) => a.z - b.z ) ) {
    container.sendToFront(zindex.icon);
  }

  if (this.groupTag) {
    let els_to_render = [];
    for (let residue of sugar.composition_for_tag(this.groupTag) ) {
      let rendered_els = this.rendered.get(residue);
      if (rendered_els.linkage) {
        container.tagGroup.appendChild(rendered_els.linkage);
      }
      els_to_render.push(rendered_els.residue);
    }
    for (let el of els_to_render) {
      container.tagGroup.appendChild(el);
    }


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

  return container;
};

class SVGRenderer {
  constructor(container,layout) {
    if (container && layout) {
      this[container_symbol] = container;
      this[layout_engine] = layout;
      this[layout_cache] = new WeakMap();
      this[canvas_symbol] = new SVGCanvas(container);
      this[canvas_symbol].canvas.setAttribute('xmlns:glycanjs',GLYCANJSNS);

      wire_canvas_events(this[canvas_symbol].canvas, handle_events.bind(this,this[canvas_symbol].canvas), {passive:true, capture: false } );
    }
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

  static fromSVGElement(element,sugar_class) {
    let renderer = new SVGRenderer();

    renderer[container_symbol] = element.parentNode;
    renderer[canvas_symbol] = new SVGCanvas(element);

    wire_canvas_events(element, handle_events.bind(renderer,element), { passive:true, capture:false } );
    let sugar_elements = element.querySelectorAll('g[glycanjs\\:sequence]');
    for (let group of sugar_elements) {
      let sugar = new sugar_class();
      sugar.sequence = group.getAttribute('glycanjs:sequence');
      renderer[rendered_sugars_symbol].push(sugar);
      renderer.rendered.set(sugar,renderer[canvas_symbol].group(group));
      for (let icon of group.querySelectorAll('use[glycanjs\\:location]')) {
        let rendered_data = { residue: icon };
        if (icon.parentNode !== group) {
          group.appendChild(icon);
        }
        renderer.rendered.set( sugar.locate_monosaccharide(icon.getAttribute('glycanjs:location')), rendered_data );
      }
      for (let link of group.querySelectorAll('g[glycanjs\\:location]')) {
        if (link.parentNode !== group) {
          group.appendChild(link);
          renderer[canvas_symbol].sendToBack(link);
        }
        let rendered_data = renderer.rendered.get( sugar.locate_monosaccharide(link.getAttribute('glycanjs:location')) );
        rendered_data.linkage = link;
      }
    }
    return renderer;
  }

  get element() {
    return this[canvas_symbol];
  }

  get rendered() {
    return this[rendered_symbol];
  }

  set groupTag(tag) {
    this[group_tag_symbol] = tag;
  }

  get groupTag() {
    return this[group_tag_symbol];
  }

  addSugar(sugar) {
    this[rendered_sugars_symbol].push(sugar);
  }

  get sugars() {
    return Object.freeze([].concat( this[rendered_sugars_symbol] ));
  }

  refresh() {
    cleanup_residues.bind(this)(Array.prototype.concat(...this[rendered_sugars_symbol].map(sug => sug.composition())));
    for (let sugar of this[rendered_sugars_symbol]) {
      let layout = layout_sugar(sugar,this[layout_engine]);
      let modified_residues = FULL_REFRESH ? sugar.composition() : sugar.composition().filter(calculate_moved_residues.bind(this,layout));
      render_sugar.bind(this)(sugar, layout,modified_residues);
    }
  }

  scaleToFit() {
    const PADDING=1;
    let svg = this[canvas_symbol].canvas;
    let bb=svg.getBBox();
    let bbx=bb.x-(SCALE*PADDING);
    let bby=bb.y-(SCALE*PADDING);
    let bbw=bb.width+(2*SCALE*PADDING);
    let bbh=bb.height+(2*SCALE*PADDING);
    let vb=[bbx,bby,bbw,bbh];
    svg.setAttribute('viewBox', vb.join(' ') );
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  }
}


export default SVGRenderer;