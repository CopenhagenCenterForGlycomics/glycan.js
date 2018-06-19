'use strict';
import * as debug from 'debug-any-level';

import SVGCanvas from './SVGCanvas';

import Renderer from './Renderer';

const module_string='glycanjs:svgrenderer';

const log = debug(module_string);

const container_symbol = Symbol('document_container');

const rendered_sugars_symbol = Symbol('rendered_sugars');

const SCALE = 100;

const GLYCANJSNS = 'https://glycocode.com/glycanjs';

const supported_events = 'mousemove mousedown mouseup click touchstart touchend touchmove drop dragover';

const PRECISION = 1;

let SYMBOLPATH = 'sugars.svg';

const str = (num) => num.toFixed(PRECISION);

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
      this.element = new SVGCanvas(container);
      this.element.canvas.setAttribute('xmlns:glycanjs',GLYCANJSNS);
      wire_canvas_events(this.element.canvas, handle_events.bind(this,this.element.canvas), {passive:true, capture: false } );
    }

  }

  static set SYMBOLSOURCE(url) {
    SYMBOLPATH = url;
  }

  static get SYMBOLSOURCE() {
    return SYMBOLPATH;
  }


  static get GLOBAL_SCALE() {
    return SCALE;
  }

  static fromSVGElement(element,sugar_class) {
    let renderer = new SVGRenderer();

    renderer[container_symbol] = element.parentNode;
    renderer.element = new SVGCanvas(element);

    wire_canvas_events(element, handle_events.bind(renderer,element), { passive:true, capture:false } );
    let sugar_elements = element.querySelectorAll('g');
    for (let group of sugar_elements) {
      if (! group.hasAttribute('glycanjs:sequence')) {
        continue;
      }
      let sugar = new sugar_class();
      sugar.sequence = group.getAttribute('glycanjs:sequence');
      renderer[rendered_sugars_symbol].push(sugar);
      renderer.rendered.set(sugar,renderer.element.group(group));
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
          renderer.element.sendToBack(link);
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

  renderLinkageGroup(canvas,sugar,residue) {
    let group = canvas.group();
    group.element.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
    return group;
  }

  renderLinkageLabel(canvas,x,y,text,ROTATE,short_axis_pos) {
    let label = canvas.text( x, y, text );
    label.setAttribute('font-size',str(Math.floor(SCALE/3)));
    label.firstChild.setAttribute('dy','0.75em');

    if (! ROTATE && short_axis_pos < 0) {
      label.setAttribute('text-anchor','end');
    }
    if (ROTATE && short_axis_pos < 0) {
      label.firstChild.setAttribute('dy','0em');
    }
    return label;
  }

  removeRendered(elements) {
    if (elements.residue) {
      elements.residue.parentNode.removeChild(elements.residue);
    }
    if (elements.linkage) {
      if (elements.linkage.element) {
        elements.linkage.element.parentNode.removeChild(elements.linkage.element);
      } else {
        elements.linkage.parentNode.removeChild(elements.linkage);
      }
    }
  }

  renderIcon(container,residue,sugar) {
    let icon = container.use(`${this.symbolpath || this.constructor.SYMBOLSOURCE}#${residue.identifier.toLowerCase()}`,0,0,1,1);
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:identifier',residue.identifier);
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:location',sugar.location_for_monosaccharide(residue));
    icon.setAttributeNS(GLYCANJSNS,'glycanjs:parent', residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
    return icon;
  }

  setIconPosition(element,x,y,width,height,rotate) {
    let rotate_str = '';
    if (rotate !== 0) {
      rotate_str = `rotate(${str(rotate)},${str(x + width/2)},${str(y + height/2)})`;
    }

    let transform = `${rotate_str} translate(${str(x)},${str(y)}) scale(${str(width)},${str(height)})`;
    element.setAttribute('transform',transform);
  }

  scaleToFit() {
    const PADDING=1;
    let svg = this.element.canvas;
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