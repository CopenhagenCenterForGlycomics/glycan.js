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

const render_link_label = function(anomer,linkage,child_pos,parent_pos,canvas) {
  let fancy_anomer = '?';
  if (anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (anomer === 'a') { fancy_anomer = '\u03B1'; }

  linkage = linkage || '?';

  let gradient = ((child_pos.x + child_pos.width / 2) -
                 (parent_pos.x + parent_pos.width / 2)) /
                 ((child_pos.y + child_pos.height / 2) -
                 (parent_pos.y + parent_pos.height / 2));


  let xpos = ( gradient * ( 0.75*(child_pos.y - (parent_pos.height + parent_pos.y)) + (parent_pos.height / 2) ) );

  if (xpos === 0) {
    xpos += 0.1;
  }

  let xcoord = 10*(xpos + parent_pos.x + parent_pos.width / 2);
  let ycoord = 10*(child_pos.y + child_pos.height + 0.1);
  let label = canvas.text( xcoord, ycoord, fancy_anomer+linkage);
  label.setAttribute('font-size','3');
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
      10*(child_pos.x + child_pos.width / 2),
      10*(child_pos.y + child_pos.height / 2),
      10*(parent_pos.x + parent_pos.width / 2),
      10*(parent_pos.y + parent_pos.height / 2)
  ];
  let line = canvas.sendToBack(canvas.line(...positions));
  line.setAttribute('stroke-width','0.3');
  line.setAttribute('stroke','#333');

  render_link_label(child.anomer,parent.linkageOf(child),child_pos,parent_pos,canvas);
};

const render_sugar = function(sugar,layout_engine,canvas) {
  log.info('Laying out',sugar.sequence);
  let layout = layout_engine.PerformLayout(sugar);
  let xvals = [];
  let yvals = [];
  for (let residue of sugar.composition()) {
    let position = layout.get(residue);
    xvals.push(position.x);
    xvals.push(position.x+position.width);
    yvals.push(position.y);
    yvals.push(position.y+position.height);
    render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, canvas );

    let icon = canvas.use(`sugars.svg#${residue.identifier.toLowerCase()}`,position.x*10,position.y*10,position.width*10,position.height*10);
    if (ROTATE) {
      icon.setAttribute('transform',`rotate(90,${10*(position.x + position.width/2)},${10*(position.y + position.height/2)})`);
    }
  }
  let min_x = Math.min(...xvals);
  let min_y = Math.min(...yvals);
  let width = Math.max(...xvals) - min_x;
  let height = Math.max(...yvals) - min_y;
  canvas.canvas.setAttribute('viewBox',`${10*min_x} ${10*min_y} ${10*width} ${10*height}`);
};

class SVGRenderer {
  constructor(container,layout) {
    this[container_symbol] = container;
    this[layout_engine] = layout;
    this[canvas_symbol] = new SVGCanvas(container);
    this[canvas_symbol].canvas.setAttribute('viewBox','-30 -60 60 100');
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