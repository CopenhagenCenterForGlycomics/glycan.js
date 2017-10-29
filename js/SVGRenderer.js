'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

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

  let fancy_anomer = '?';
  if (child.anomer === 'b') { fancy_anomer = '\u03B2'; }
  if (child.anomer === 'a') { fancy_anomer = '\u03B1'; }

  let label = canvas.text( 10*(0.1 + child_pos.x + child_pos.width / 2), 10*(child_pos.y + child_pos.height + 0.1), fancy_anomer+parent.linkageOf(child));
  label.setAttribute('font-size','3');
  label.setAttribute('dominant-baseline','hanging');
  canvas.sendToBack(label);
};

const render_sugar = function(sugar,layout_engine,canvas) {
  log.info('Laying out',sugar.sequence);
  let layout = layout_engine.PerformLayout(sugar);
  for (let residue of sugar.composition()) {
    let position = layout.get(residue);

    render_linkage( position, residue.parent ? layout.get(residue.parent) : undefined, residue,residue.parent, canvas );

    canvas.use(`sugars.svg#${residue.identifier.toLowerCase()}`,position.x*10,position.y*10,position.width*10,position.height*10);
  }
};

class SVGRenderer {
  constructor(container,layout) {
    this[container_symbol] = container;
    this[layout_engine] = layout;
    this[canvas_symbol] = new SVGCanvas(container);
    this[canvas_symbol].canvas.setAttribute('viewBox','-20 -50 30 55');
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