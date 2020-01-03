/*global HTMLCanvasElement*/
'use strict';

import CanvasRenderer from './CanvasRenderer';

const CanvasCanvas = CanvasRenderer.Canvas;

import Legra from 'legra/lib/legra.umd.js';

const GRID_SIZE = 12.5;

const roundFloat = (value, toNearest, fixed) => {
  return parseFloat((Math.round(value / toNearest) * toNearest).toFixed(fixed));
};

const wrap_gridsize = (baselayout) => {
    return class extends baselayout {

        static PerformLayout(renderable) {
            let layout = baselayout.PerformLayout.call(this,renderable);
            for (let res of renderable.composition()) {
                let pos = layout.get(res);
                if ( ! pos ) {
                    continue;
                }
                pos.x = roundFloat(pos.x,GRID_SIZE/100,3);
                pos.y = roundFloat(pos.y,GRID_SIZE/100,3);
            }
            return layout;
        }
    };
};

class LegraCanvasRenderer extends CanvasRenderer {
  constructor(container,layout) {
    let onscreen;
    if (! (container instanceof HTMLCanvasElement)) {
        onscreen = container.ownerDocument.createElement('canvas');
        container.appendChild(onscreen);
    } else {
        onscreen = container;
    }

    let offscreen = container.ownerDocument.createElement('canvas');

    offscreen.offscreen = 'offscreen';
    onscreen.offscreen = 'onscreen';


    super(onscreen,wrap_gridsize(layout));

    this.offscreen = offscreen;
    this.onscreen = onscreen;
    Object.defineProperty(onscreen, 'screenToCanvasMatrix', {
      get: function() { return offscreen.screenToCanvasMatrix; }
    });
    Object.defineProperty(offscreen, 'getBoundingClientRect', {
      get: function() { return () => onscreen.getBoundingClientRect(); }
    });

    this.offscreen.width = '1px';
    this.offscreen.height = '1px';

    this.element = new CanvasCanvas(this.offscreen);

    const legra = new Legra(this.onscreen.getContext('2d'),GRID_SIZE);
    this.legra = legra;
  }

  renderLinkage(...args) {
    let retval = CanvasRenderer.prototype.renderLinkage.call(this,...args);
    if ( ! retval ) {
        return;
    }
    for (let obj of (retval.torender)) {
        if (obj.options && obj.options['stroke-width']) {
            obj.options['stroke-width'] = GRID_SIZE;
            obj.options.stroke = '#777';
        }
    }
    return retval;
  }

  paint() {
    CanvasRenderer.prototype.paint.call(this);
    setTimeout( () => {
        this.onscreen.getContext('2d').clearRect(0,0,this.onscreen.width,this.onscreen.height);
        let actual_width = this.offscreen.width;
        let actual_height = this.offscreen.height;
        let target_width = Math.ceil(actual_width / GRID_SIZE) * GRID_SIZE;
        let target_height = Math.ceil(actual_height / GRID_SIZE) * GRID_SIZE;
        this.onscreen.width = target_width;
        this.onscreen.height = target_height;
        this.legra.drawImage(this.offscreen,[-0.5*(target_width - actual_width),-0.5*(target_height - actual_height)]);
        let imgdata = this.onscreen.getContext('2d').getImageData(0, 0, this.onscreen.width, this.onscreen.height);
        for (let i = 0; i < imgdata.data.length; i += 4) {
            if ((imgdata.data[i] === 0) && (imgdata.data[i + 1] === 0) && (imgdata.data[i + 2] === 0) ) {
                imgdata.data[i+3] = 0;
            }
        }
        this.onscreen.getContext('2d').putImageData(imgdata,0,0);
    },0);
  }

}

export default LegraCanvasRenderer;