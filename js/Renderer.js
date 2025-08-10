'use strict';

import debug from './Debug';

import Monosaccharide from './Monosaccharide';

import Repeat from './Repeat';

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

const BRACKET_STROKE_DEFAULT_COLOR = 'rgba(153,153,153,1)';
const LINKAGE_STROKE_DEFAULT_COLOR = 'rgba(51,51,51,1)';

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
  const LTR = this.leftToRight;

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

  const ratio = 1;

  let child_distance = residue_distance*ratio;

  if (Math.abs(residue_distance) >= (long_axis_size/2) ) {
    residue_distance -= long_axis_size/2;
    child_distance = residue_distance*ratio + get_long_axis_size(parent_pos)/2;
  } else if (residue_distance == 0) {
    child_distance = 0.425*Math.abs(short_axis);
  }
  let short_axis_pos = ( gradient * child_distance );
  if (short_axis_pos === 0) {
    short_axis_pos += get_short_axis_size(child_pos)/10;
  }

  let short_axis_coord = SCALE*(short_axis_base + short_axis_pos);
  let long_axis_coord = SCALE*(long_axis_base + (LTR ? 0 : 1)*get_long_axis_size(child_pos));

  if (long_axis_direction === 0) {
    long_axis_coord = SCALE*(long_axis_base + get_long_axis_size(child_pos)/8);
    if ( long_axis_coord > SCALE/4 ) {
      long_axis_coord = SCALE/4;
    }
  }

  let label = this.renderLinkageLabel( canvas,
    ROTATE ? long_axis_coord : short_axis_coord,
    ROTATE ? short_axis_coord : long_axis_coord,
    fancy_anomer+linkage,
    ROTATE,
    short_axis_pos,
    Math.abs(gradient) < 1 ? LTR : false );

  canvas.sendToBack(label);
  return label;
};

const point_along_line = (x0,y0,x1,y1,t) => {
  return [(1-t)*x0 + t*x1, (1-t)*y0 + t*y1 ];
};

const perpendicular_line = (x0,y0,x1,y1,length) => {
  let x = y0 - y1; // as vector at 90 deg to the line
  let y = x1 - x0;
  const len = length / Math.hypot(x, y);
  x *= len;
  y *= len;
  return [x0 + x, y0 + y, x0 - x, y0 - y];
};

const half_perpendicular_line = (x0,y0,x1,y1,length) => {
  let x = y0 - y1; // as vector at 90 deg to the line
  let y = x1 - x0;
  const len = length / Math.hypot(x, y);
  x *= len;
  y *= len;
  return [x0 - x, y0 - y, x0, y0];
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
  let group = this.renderLinkageGroup(canvas,sugar,child);
  canvas.sendToBack(group);
  group.line(...positions, { 'stroke-width': str(SCALE/100), 'stroke': LINKAGE_STROKE_DEFAULT_COLOR });

  if ( show_labels ) {
    render_link_label.call(this,child.anomer,parent.linkageOf(child),child_pos,parent_pos,group);
  }

  const child_repeat = (child instanceof Repeat.Monosaccharide) && child.repeat.mode !== Repeat.MODE_EXPAND;
  const parent_repeat = (parent instanceof Repeat.Monosaccharide) && parent.repeat.mode !== Repeat.MODE_EXPAND;
  const different_repeats = child_repeat && parent_repeat && child.repeat !== parent.repeat;

  if (child_repeat && child.endsRepeatUnit && child.children.filter( res => ['Fuc','HSO3'].indexOf(res.identifier) < 0 ).length === 0 ) {
    const extents = [
      SCALE*(child_pos.x + child_pos.width / 2),
      SCALE*(child_pos.y + child_pos.height / 2),
      SCALE*(parent_pos.x + parent_pos.width / 2),
      SCALE*(parent_pos.y + parent_pos.height / 2)
    ];
    const reverse_cap = -1;

    let bracket_scale = 0.25;

    if (child_pos.x - parent_pos.x !== 0 && child_pos.y - parent_pos.y !== 0 ) {
      bracket_scale = 1/4;
    }

    const bracket_position = point_along_line(...extents, -0.5 );
    const perpendicular = perpendicular_line( bracket_position[0],bracket_position[1], extents[2],extents[3] , SCALE * child_pos.width * bracket_scale );
    const cap = half_perpendicular_line( ...perpendicular , reverse_cap*SCALE * child_pos.width / 8 );
    const cap_end = half_perpendicular_line( perpendicular[2],perpendicular[3],perpendicular[0],perpendicular[1] , reverse_cap*-1*SCALE * child_pos.width / 8 );

    group.line(...perpendicular, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });
    group.line(...cap, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });
    group.line(...cap_end, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });

  }


  if ( child_repeat ? (! parent_repeat || different_repeats) : parent_repeat ) {


    // This line should go to the edges of the icons along the long (y-axis)
    const extents = [
      SCALE*(child_pos.x + child_pos.width / 2),
      SCALE*(child_pos.y + child_pos.height / 2),
      SCALE*(parent_pos.x + parent_pos.width / 2),
      SCALE*(parent_pos.y + parent_pos.height / 2)
    ];

    const reverse_cap = child_repeat ? 1 : -1;

    let bracket_scale = 0.25;
    if (child_pos.x - parent_pos.x !== 0 && child_pos.y - parent_pos.y !== 0 ) {
      bracket_scale = 1/4;
    }
    const bracket_position = point_along_line(...extents, reverse_cap > 0 ? 0.55 : 0.5 );
    const perpendicular = perpendicular_line( bracket_position[0],bracket_position[1], extents[2],extents[3] , SCALE * child_pos.width * bracket_scale );
    const cap = half_perpendicular_line( ...perpendicular , reverse_cap*SCALE * child_pos.width / 8 );
    const cap_end = half_perpendicular_line( perpendicular[2],perpendicular[3],perpendicular[0],perpendicular[1] , reverse_cap*-1*SCALE * child_pos.width / 8 );

    group.line(...perpendicular, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });
    group.line(...cap, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });
    group.line(...cap_end, { 'stroke-width': str(5*SCALE/100), 'stroke': BRACKET_STROKE_DEFAULT_COLOR });

    if (child_repeat) {
      group.text( cap[2] , cap[3], child.repeat.identifier, { 'font-size' : str(Math.floor(SCALE/3)), 'text-anchor' : this.rotate ? 'middle' : 'end', 'dy' : this.rotate ? '1em':'0.25em', 'dx' : this.rotate ? '-0.25em' : '-0.25em' } );
    }
  }

  return group;
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
  layout.calculateIdentifier = layout_engine.CalculateIdentifier;
  return layout;
};

const render_sugar = function(sugar,layout,new_residues=sugar.composition()) {
  let xvals = [];
  let yvals = [];
  let container = this.rendered.get(sugar);

  const ROTATE = this.rotate;
  const LTR = this.leftToRight;

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
      position.x = LTR? -1*(yval + position.height) : yval;
      position.y = LTR? xval : -1*(xval + position.width);
    }

    xvals.push(position.x);
    xvals.push(position.x+position.width);
    yvals.push(position.y);
    yvals.push(position.y+position.height);

    let icon = null;

    let current = this.rendered.get(residue);

    if ( ! current ) {
      // Render icon
      icon = this.renderIcon( container, layout.calculateIdentifier(residue) , residue, sugar );
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
    current.linkage = this.renderLinkage(position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, sugar, container, show_labels && residue.identifier !== 'HSO3' );

    let rotate_angle = 0;
    if (position.rotate) {
      rotate_angle = position.rotate;
    }

    if (ROTATE && ! position.keep_horizontal) {
      rotate_angle -= (LTR ? -90 : 90);
    }

    this.setIconPosition(icon,position.x*SCALE,position.y*SCALE,position.width*SCALE,position.height*SCALE,rotate_angle);
  }
  let correct_order = zindices.map( z => z.icon.element )
    .map( el => [...el.parentNode.children].indexOf(el) )
    .map( (v,i,a) => v - (a[i-1] || 0) )
    .map( v => v >= 0 )
    .reduce( (curr,next) => curr && next, true);
  if ( ! correct_order ) {
    for (let zindex of zindices.sort( (a,b) => a.z - b.z ) ) {
      container.sendToFront(zindex.icon);
    }
  }

  if (this.groupTag && container.tagGroup) {
    let els_to_render = [];
    for (let residue of sugar.composition_for_tag(this.groupTag) ) {
      let rendered_els = this.rendered.get(residue);
      if ( ! rendered_els ) {
        continue;
      }
      if (rendered_els.linkage) {
        container.tagGroup.appendChild(rendered_els.linkage);
      }
      els_to_render.push(rendered_els.residue);
    }
    for (let el of els_to_render) {
      container.tagGroup.appendChild(el.element);
    }


  }
  return container;
};

class Renderer {
  constructor(container,layout) {
    if (container && layout) {
      this.LayoutEngine = layout;
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
  }


  static get GLOBAL_SCALE() {
    return SCALE;
  }

  get element() {
    return this[canvas_symbol];
  }

  set element(el) {
    this[canvas_symbol] = el;
  }


  get rendered() {
    return this[rendered_symbol];
  }

  set groupTag(tag) {
    if ( tag !== this[group_tag_symbol]) {
      this.resetTags();
    }
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

  layoutFor(sugarElement) {
    if ( ! this.global_layout.has(sugarElement)) {
      return;
    }
    let {x,y,width,height} = this.global_layout.get(sugarElement);
    return {x,y,width,height};
  }

  refresh() {
    cleanup_residues.bind(this)(Array.prototype.concat(...this[rendered_sugars_symbol].map(sug => sug.composition())));
    this.global_layout = new WeakMap();
    for (let sugar of this[rendered_sugars_symbol]) {
      let layout = layout_sugar(sugar,this[layout_engine]);
      if ( layout ) {
        for (let sugarEl of [sugar,...sugar.composition()]) {
          this.global_layout.set(sugarEl,layout.get(sugarEl));
        }
      }
      let modified_residues = FULL_REFRESH ? sugar.composition() : sugar.composition().filter(calculate_moved_residues.bind(this,layout));
      render_sugar.bind(this)(sugar, layout,modified_residues);
    }
    return Promise.resolve();
  }

  setupContainer() {
  }

  resetTags() {
  }

  removeRendered() {
  }

  renderIcon() {
  }

  renderLinkageLabel() {
  }

  renderLinkage(...args) {
    return render_linkage.call(this,...args);
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

export { point_along_line, perpendicular_line, half_perpendicular_line, str };

export { BRACKET_STROKE_DEFAULT_COLOR, LINKAGE_STROKE_DEFAULT_COLOR };

export default Renderer;