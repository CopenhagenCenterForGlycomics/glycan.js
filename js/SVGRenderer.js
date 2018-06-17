'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

import Renderer from './Renderer';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const canvas_symbol = Symbol('canvas');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const SCALE = 100;

const GLYCANJSNS = 'https://glycocode.com/glycanjs';

const supported_events = 'mousemove mousedown mouseup click touchstart touchend touchmove drop dragover';

const wire_canvas_events = function(canvas,callback) {
  for (let target of supported_events.split(' ')) {
    canvas.addEventListener( target, callback, { passive: true, capture: true } );
  }
};

const handle_events = function(svg,event) {
  const ROTATE = this.rotate;
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

class SVGRenderer extends Renderer {
  constructor(container,layout) {
    log('SVGRenderer');
    super(container,layout);

    if (container && layout) {
      this[container_symbol] = container;
      this[canvas_symbol] = new SVGCanvas(container);
      this[canvas_symbol].canvas.setAttribute('xmlns:glycanjs',GLYCANJSNS);
      wire_canvas_events(this[canvas_symbol].canvas, handle_events.bind(this,this[canvas_symbol].canvas), {passive:true, capture: false } );
    }

  }


  static get GLOBAL_SCALE() {
    return SCALE;
  }

  static fromSVGElement(element,sugar_class) {
    let renderer = new SVGRenderer();

    renderer[container_symbol] = element.parentNode;
    renderer[canvas_symbol] = new SVGCanvas(element);

    wire_canvas_events(element, handle_events.bind(renderer,element), { passive:true, capture:false } );
    let sugar_elements = element.querySelectorAll('g');
    for (let group of sugar_elements) {
      if (! group.hasAttribute('glycanjs:sequence')) {
        continue;
      }
      let sugar = new sugar_class();
      sugar.sequence = group.getAttribute('glycanjs:sequence');
      renderer[rendered_sugars_symbol].push(sugar);
      renderer.rendered.set(sugar,renderer[canvas_symbol].group(group));
      for (let icon of group.querySelectorAll('use')) {
        if ( ! icon.hasAttribute('glycanjs:location') ) {
          continue;
        }
        let rendered_data = { residue: icon };
        if (icon.parentNode !== group) {
          group.appendChild(icon);
        }
        renderer.rendered.set( sugar.locate_monosaccharide(icon.getAttribute('glycanjs:location')), rendered_data );
      }
      for (let link of group.querySelectorAll('g')) {
        if ( ! link.hasAttribute('glycanjs:location') ) {
          continue;
        }
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

  setupContainer(container,sugar) {
    const canvas = this.element;

    if ( ! container ) {
      container = canvas.group();
      container.setAttributeNS(null,'pointer-events','none');
      this.rendered.set(sugar,container);
    }

    container.setAttributeNS(GLYCANJSNS,'glycanjs:sequence',sugar.sequence);

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
    return container;
  }

  removeRendered(elements) {
    elements.residue.parentNode.removeChild(elements.residue);
    if (elements.linkage) {
      elements.linkage.parentNode.removeChild(elements.linkage);
    }
  }

  renderIcon(container,residue,sugar) {
    let icon = container.use(`${this.symbolpath}#${residue.identifier.toLowerCase()}`,0,0,1,1);
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:identifier',residue.identifier);
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:parent', residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
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