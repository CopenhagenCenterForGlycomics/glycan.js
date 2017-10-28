'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const layout_engine = Symbol('layout');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const render_sugar = function(sugar,layout_engine,canvas) {
  log.info('Laying out',sugar.sequence);
  let layout = layout_engine.PerformLayout(sugar);
  for (let residue of sugar.composition()) {
    let position = layout.get(residue);
    canvas.use(`sugars.svg#${residue.identifier.toLowerCase()}`,position.x*10,position.y*10,position.width*10,position.height*10);
  }
  // let serialiser = new XMLSerializer();
  // console.log(serialiser.serializeToString(canvas.canvas));
};

class SVGRenderer {
  constructor(container,layout) {
    this[container_symbol] = container;
    this[layout_engine] = layout;
    this[canvas_symbol] = new SVGCanvas(container);
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