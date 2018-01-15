'use strict';

import * as debug from 'debug-any-level';

const module_string='glycanjs:piemenu';

const log = debug(module_string);

const SVGNS = 'http://www.w3.org/2000/svg';

const PRECISION = 1;

const str = (num) => num.toFixed(PRECISION);

const append_sector = function(container) {
  let svg = container.parentDocument.createElementNS(SVGNS,'svg');
  let defs = svg.createElementNS(SVGNS,'defs');
  svg.appendChlid(defs);
  let clippath = svg.createElementNS(SVGNS,'clipPath');
  defs.appendChlid(clippath);
  clippath.setAttribute('clipPathUnits','objectBoundingBox');
  clippath.setAttribute('id','clip'+Math.random()*1000);
  let mask = svg.createElementNS(SVGNS,'path');
  mask.setAttribute('fill','none');
  mask.setAttribute('stroke','#111');
  mask.setAttribute('stroke-width','1');
  mask.setAttribute('d','');
  clippath.appendChlid(mask);
  container.parentNode.insertBefore(svg,container);
  return clippath.getAttribute('id');
};

const upgrade_elements = function(menu_container,sector_id) {
  log('Upgrading',menu_container);
  let items = menu_container.getElementsByTagName('li');
  for (let item of items) {
    item.style.position = 'absolute';
    item.style.top = str(0);
    item.style.left = str(0);
    item.style.width = '100%';
    item.style.height = '100%';
    item.style.clipPath = `url(#${sector_id})`;
    item.style.transform = 'scale(0.001)';
    if (item.firstChild) {
      item.firstChild.style.width = '100%';
      item.firstChild.style.height = '100%';
    }
  }
};

// https://codepen.io/anon/pen/dJjLRx

class PieMenu {
  constructor(container) {
    let sector_id = append_sector(container);
    upgrade_elements(container,sector_id);
  }
}

export default PieMenu;
