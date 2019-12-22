/*global document,requestAnimationFrame*/
'use strict';

import CanvasCanvas from './CanvasCanvas';
import CanvasRenderer from './CanvasRenderer';

import Legra from 'legra/lib/legra.umd.js';

import { onTick } from 'es6-tween';

class LegraCanvasRenderer extends CanvasRenderer {
  constructor(container,layout) {
    super(container,layout);
    this.offscreen = document.createElement('canvas');
    container.appendChild(this.offscreen);

    this.onscreen = this.element.canvas;

    this.offscreen.offscreen = true;

    this.offscreen.width = this.element.canvas.width;
    this.offscreen.height = this.element.canvas.height;
    this.offscreen.style.pointerEvents = 'none';
    this.offscreen.style.position = 'absolute';
    this.offscreen.style.top = '0';
    this.offscreen.style.left = '0';    
    this.element = new CanvasCanvas(this.onscreen);
    const legra = new Legra(this.offscreen.getContext('2d'),16);
    this.legra = legra;
    onTick( () => {
        if (this.animating) {
            setTimeout(() => {
                requestAnimationFrame( () => {
                    let imgdata = this.onscreen.getContext('2d').getImageData(0, 0, this.onscreen.width, this.onscreen.height);
                    for (let i = 0; i < imgdata.data.length; i += 4) {
                        if (imgdata.data[i + 3] === 0) {
                            imgdata.data[i] = 220;
                            imgdata.data[i+1] = 220;
                            imgdata.data[i+2] = 230;
                            imgdata.data[i+3] = 255;
                        }
                    }
                    this.onscreen.getContext('2d').putImageData(imgdata,0,0);
                    this.offscreen.width = this.onscreen.width;
                    this.offscreen.height = this.onscreen.height;
                    this.legra.drawImage(this.onscreen,[0,0]);
                });
            },0);
        }
    });
  }

  renderLinkage(child_pos,parent_pos,child,parent,sugar,canvas) {
    return this.renderLinkageGroup(canvas);
  }

  async refresh() {
    await CanvasRenderer.prototype.refresh.call(this);
    setTimeout(() => {
        requestAnimationFrame( () => {
            let imgdata = this.onscreen.getContext('2d').getImageData(0, 0, this.onscreen.width, this.onscreen.height);
            for (let i = 0; i < imgdata.data.length; i += 4) {
                if (imgdata.data[i + 3] === 0) {
                    imgdata.data[i] = 220;
                    imgdata.data[i+1] = 220;
                    imgdata.data[i+2] = 230;
                    imgdata.data[i+3] = 255;
                }
            }
            this.onscreen.getContext('2d').putImageData(imgdata,0,0);
            this.offscreen.width = this.onscreen.width;
            this.offscreen.height = this.onscreen.height;
            this.legra.drawImage(this.onscreen,[0,0]);
        });
    },0);
  }
}

export default LegraCanvasRenderer;