/*global window */
'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const rendered_symbol = Symbol('rendered_elements');

const ROTATE = false;

let SCALE = 100;

const PRECISION = 1;

const GLYCANJSNS = 'https://glycocode.com/glycanjs';

const str = (num) => num.toFixed(PRECISION);

const render_link_label = function(anomer,linkage,child_pos,parent_pos,canvas) {
  let fancy_anomer = '?';
  if (anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (anomer === 'a') { fancy_anomer = '\u03B1'; }

  linkage = linkage || '?';

  let gradient = ((child_pos.x + child_pos.width / 2) -
                 (parent_pos.x + parent_pos.width / 2)) /
                 ((child_pos.y + child_pos.height / 2) -
                 (parent_pos.y + parent_pos.height / 2));

  if (! isFinite(gradient)) {
    gradient = 2;
    if (child_pos.x > parent_pos.x) {
      gradient = -2;
    }
  }

  let xpos = ( gradient * ( 0.75*(child_pos.y - (parent_pos.height + parent_pos.y)) + (parent_pos.height / 2) ) );

  if (xpos === 0) {
    xpos += 0.1;
  }

  let xcoord = SCALE*(xpos + parent_pos.x + parent_pos.width / 2);
  let ycoord = SCALE*(child_pos.y + child_pos.height + 0.1);
  if (child_pos.y === parent_pos.y) {
    ycoord = SCALE*(child_pos.y + 0.125);// + child_pos.height - 0.125);
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
    // element.setAttribute('transform',`rotate(${str(rotate)},${str(x + width/2)},${str(y + height/2)})`);
  // } else {
  //   element.removeAttribute('transform');
  }

  let transform = `${rotate_str} translate(${str(x)},${str(y)}) scale(${str(width)},${str(height)})`;
  element.setAttribute('transform',transform);

  // element.setAttribute('x',str(x));
  // element.setAttribute('y',str(y));
  // element.setAttribute('width',str(width));
  // element.setAttribute('height',str(height));
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
    this.rendered.set(sugar,container);
  }

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

    if (current.linkage) {
      // current.linkage.parentNode.removeChild(current.linkage);
    } else {
      current.linkage = render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container );
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
  let min_x = Math.min(...xvals);
  let min_y = Math.min(...yvals);
  let width = Math.max(...xvals) - min_x;
  let height = Math.max(...yvals) - min_y;

  container.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);

  if ( ! container.laidOut ) {
    canvas.canvas.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);
    container.laidOut = true;
  }
  return container;
};

class SVGRenderer {
  constructor(container,layout) {
    this[container_symbol] = container;
    this[layout_engine] = layout;
    this[canvas_symbol] = new SVGCanvas(container);
    this[canvas_symbol].canvas.setAttribute('viewBox','-30 -60 60 100');
    this[canvas_symbol].canvas.setAttribute('xmlns:glycanjs',GLYCANJSNS);
    this[rendered_sugars_symbol] = [];
    this[rendered_symbol] = new WeakMap();
    let counter = 0;
    let before,now,fps;
    before=Date.now();
    fps=0;
    let looper = () => {
      now=Date.now();
      fps=Math.round(1000/(now-before));
      before=now;

      counter += Math.PI/50;
      SCALE = 100 + 90*Math.cos(counter);
      this.refresh();
      window.requestAnimationFrame(looper);
      // console.log(fps);
    };
    window.requestAnimationFrame(looper);
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
    for (let sugar of this[rendered_sugars_symbol]) {
      let layout = layout_sugar(sugar,this[layout_engine]);
      // let current_layout = this[layout_cache].get(sugar);
      // let modified_residues = calculate_moved_residues(layout,current_layout);
      render_sugar.bind(this)(sugar, layout);
    }
  }
}


export default SVGRenderer;