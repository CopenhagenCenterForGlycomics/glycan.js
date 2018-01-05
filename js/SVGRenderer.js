'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const ROTATE = false;

const SCALE = 100;

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
  let line = canvas.sendToBack(canvas.line(...positions));
  line.setAttribute('stroke-width',str(SCALE/100));
  line.setAttribute('stroke','#333');

  render_link_label(child.anomer,parent.linkageOf(child),child_pos,parent_pos,canvas);
};

const render_sugar = function(sugar,layout_engine,canvas) {
  log.info('Laying out',sugar.sequence);
  let layout = layout_engine.PerformLayout(sugar);
  let xvals = [];
  let yvals = [];
  let container = canvas.group();
  container.setAttributeNS(GLYCANJSNS,'glycanjs:sequence',sugar.sequence);
  for (let residue of sugar.composition()) {
    let position = layout.get(residue);
    xvals.push(position.x);
    xvals.push(position.x+position.width);
    yvals.push(position.y);
    yvals.push(position.y+position.height);
    render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, container );

    let icon = container.use(`sugars.svg#${residue.identifier.toLowerCase()}`,position.x*SCALE,position.y*SCALE,position.width*SCALE,position.height*SCALE);
    let rotate_angle = 0;
    if (position.rotate) {
      rotate_angle = position.rotate;
    }
    if (ROTATE) {
      rotate_angle += 90;
    }
    if (rotate_angle !== 0) {
      icon.setAttribute('transform',`rotate(${rotate_angle},${SCALE*(position.x + position.width/2)},${SCALE*(position.y + position.height/2)})`);
    }
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:identifier',residue.identifier);
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:parent', residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
  }
  let min_x = Math.min(...xvals);
  let min_y = Math.min(...yvals);
  let width = Math.max(...xvals) - min_x;
  let height = Math.max(...yvals) - min_y;

  container.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);
  canvas.canvas.setAttribute('viewBox',`${SCALE*min_x} ${SCALE*min_y} ${SCALE*width} ${SCALE*height}`);
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
  }
  addSugar(sugar) {
    this[rendered_sugars_symbol].push(sugar);
  }
  refresh() {
    for (let sugar of this[rendered_sugars_symbol]) {
      render_sugar(sugar, this[layout_engine], this[canvas_symbol]);
    }
  }
}


export default SVGRenderer;