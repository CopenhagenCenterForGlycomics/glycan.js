'use strict';

import * as debug from 'debug-any-level';

import Monosaccharide from './Monosaccharide';

const module_string='glycanjs:renderer';

const log = debug(module_string);

const canvas_symbol = Symbol('canvas');

const layout_cache = Symbol('cached_layout');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const rendered_symbol = Symbol('rendered_elements');

const group_tag_symbol = Symbol('group_tag');

const rotate_symbol = Symbol('rotate');

const SCALE = 100;

const PRECISION = 1;

const FULL_REFRESH = true;

const str = (num) => num.toFixed(PRECISION);

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

const generic_long_axis_size = (res) => res.height;
const generic_short_axis_size = (res) => res.width;

const render_link_label = function(anomer,linkage,child_pos,parent_pos,canvas) {

  const ROTATE = this.rotate;

  let get_long_axis_size = ROTATE ? generic_short_axis_size : generic_long_axis_size;
  let get_short_axis_size = ROTATE ? generic_long_axis_size : generic_short_axis_size;


  let fancy_anomer = '?';
  if (anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (anomer === 'a') { fancy_anomer = '\u03B1'; }

  linkage = linkage || '?';
  if (linkage < 0) {
    linkage='';
  }
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

  let label = this.renderLinkageLabel( ROTATE ? long_axis_coord : short_axis_coord, ROTATE ? short_axis_coord : long_axis_coord, fancy_anomer+linkage );

  canvas.sendToBack(label);
  return label;
};

const render_linkage = function(child_pos,parent_pos,child,parent,sugar,canvas,show_labels = true) {
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
  canvas.sendToBack(group);
  group.line(...positions, { 'stroke-width': str(SCALE/100), 'stroke': '#333' });

  if ( show_labels ) {
    render_link_label.call(this,child.anomer,parent.linkageOf(child),child_pos,parent_pos,group);
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
};

const cleanup_residues = function(active_residues) {
  let active = new Set(active_residues);
  for (let res of this.rendered.keys()) {
    if ( ! (res instanceof Monosaccharide) ) {
      continue;
    }
    if (! active.has(res)) {
      let elements = this.rendered.get(res);
      this.removeRendered(elements);
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

  const ROTATE = this.rotate;

  // Setup container and set up tagging

  container = this.setupContainer(container,sugar);


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
      // Render icon
      icon = this.renderIcon( container, residue, sugar );
      current = { residue: icon, linkage: null };
      this.rendered.set(residue, current);
    } else {
      icon = current.residue;
    }

    if (position.z !== 1) {
      zindices.push({ z: position.z, icon: icon });
    }
    let show_labels = this[layout_engine].LINKS == true;
    if ( current.linkage ) {
      // Remove linkage
      this.removeRendered({linkage: current.linkage });
    }

    // Render linkage
    current.linkage = render_linkage.call(this, position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, sugar, container, show_labels );

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

  if (this.groupTag && container.tagGroup) {
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

  return container;
};

class Renderer {
  constructor(container,layout) {
    if (container && layout) {
      this[layout_engine] = layout;
      this[layout_cache] = new WeakMap();
    }
    this[rendered_sugars_symbol] = [];
    this[rendered_symbol] = new Map();
  }

  get LayoutEngine() {
    return this[layout_engine];
  }

  set LayoutEngine(engine) {
    this[layout_engine] = engine;
    return this[layout_engine];
  }


  static get GLOBAL_SCALE() {
    return SCALE;
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

  setupContainer() {
  }

  removeRendered() {
  }

  renderIcon() {
  }

  renderLinkageLabel() {
  }

  get horizontal() {
    return this[rotate_symbol];
  }

  set horizontal(flag) {
    if (flag) {
      this[rotate_symbol] = true;
    } else {
      this[rotate_symbol] = false;
    }
  }

}


export default Renderer;