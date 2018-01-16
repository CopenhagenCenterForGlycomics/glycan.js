/* globals document,HTMLElement,customElements */
'use strict';

import * as debug from 'debug-any-level';

const module_string='glycanjs:piemenu';

const log = debug(module_string);

const PRECISION = 1;

const tmpl = document.createElement('template');

tmpl.innerHTML = `
  <style>
    :host {
      padding: 0;
      display: block;
      position: relative;
    }
    :host *::slotted(*) {
      display: block;
      background: #eee;
      border: 0;
      color: black;
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      clip-path: url(#sector);
      transform: scale(0.01);
    }
  </style>
  <style id="angles">
  </style>
  <svg id="sectorsvg" width="0" height="0">
  <defs>
  <clipPath id="sector" clipPathUnits="objectBoundingBox">
    <path fill="none" stroke="#111" stroke-width="0.01" d="M0.5,0.5 m0.2,0 l0.3,0 A0.5,0.5 0 0,0 0.75,0.06699 L0.6,0.326 A0.5,0.5 0 0,1 0.7,0.5 z"></path>
  </clipPath>
  </defs>
  </svg>
  <slot id="items"></slot>
`;

const str = (num) => num.toFixed(PRECISION);
const ang = (num) => num.toFixed(3);


const upgrade_elements = function(slot) {
  let items = slot.assignedNodes();
  let transition_delay = 0;
  let max_time = 0.3;
  let angle = 0;
  let all_styles = [];
  let all_items = items.filter( item => item instanceof HTMLElement );
  let start_angle = -60;
  let end_angle = 60;
  let delta = (end_angle - start_angle) / all_items.length;
  angle = start_angle;
  const notch = 0.2;
  if (items.length > 0) {
    this.sectorpath.setAttribute('d',`M0.5,0.5 m${notch},0 l${0.5-notch},0 A0.5,0.5 0 0,0 ${ang(0.5+0.5*Math.cos(Math.PI/180*delta))},${ang(0.5-0.5*Math.sin(Math.PI/180*delta))} L${ang(0.5+(notch)*Math.cos(Math.PI/180*delta))},${ang(0.5-(notch)*Math.sin(Math.PI/180*delta))} A0.5,0.5 0 0,1 ${0.5+notch},0.5 z`);
  }

  let icon_x_offset = str(50+(100*Math.cos((Math.PI/180)*delta*0.5)*(0.5 - 0.2)));
  let icon_y_offset = str(50+(100*Math.sin((Math.PI/180)*delta*0.5)*(0.5 - 0.2)));


  for(let item of all_items) {
    if (item.firstChild && item.firstChild.setAttribute) {
      item.firstChild.style.bottom = `calc(${icon_y_offset}% - 0px)`;
      item.firstChild.style.left = `calc(${icon_x_offset}% + 0px)`;
      item.firstChild.style.position  ='absolute';
      item.firstChild.style.transform = `rotate(${str(angle)}deg)`;
    }
    if (! item.style) {
      continue;
    }
    item.style.transitionDelay = `${str(transition_delay)}s`;
    item.style.transition = `transform ${str(max_time)}s`;
    transition_delay+= 0.1;
    max_time -= 0.1;
    let classname = `rot${str(angle)}`;
    classname = classname.replace(/[-\.]/g,'x');
    item.setAttribute('class',classname);

    let basic_styles = `:host([active]) *::slotted(.${classname}) { transform: rotate(${str(-1*angle)}deg); }`;
    all_styles.push(basic_styles);
    angle += delta;
  }
  this.hoverstyles.innerHTML = all_styles.join('\n');
};

function WrapHTML() { return Reflect.construct(HTMLElement, [], Object.getPrototypeOf(this).constructor); }
Object.setPrototypeOf(WrapHTML.prototype, HTMLElement.prototype);
Object.setPrototypeOf(WrapHTML, HTMLElement);

class PieMenu extends WrapHTML {
  constructor() {
    super();
    log('Initiating custom PieMenu element');
    let shadowRoot = this.attachShadow({mode: 'open'});
    shadowRoot.appendChild(tmpl.content.cloneNode(true));
    let sectorsvg = shadowRoot.getElementById('sectorsvg');
    let targetsector = this.ownerDocument.body.appendChild(this.ownerDocument.importNode(sectorsvg,true));
    this.sectorpath = targetsector.firstElementChild.firstElementChild.firstElementChild;
    this.hoverstyles = shadowRoot.getElementById('angles');
    let slot = shadowRoot.getElementById('items');
    slot.addEventListener('slotchange', upgrade_elements.bind(this,slot));
    upgrade_elements.bind(this)(slot);
  }
}

customElements.define('x-piemenu',PieMenu);

export default PieMenu;
