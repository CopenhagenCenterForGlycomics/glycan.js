/*global document,requestAnimationFrame*/
'use strict';

import CanvasCanvas from './CanvasCanvas';
import CanvasRenderer from './CanvasRenderer';

import Legra from 'legra/lib/legra.umd.js';

import { onTick } from 'es6-tween';

const GRID_SIZE = 12.5;

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
    this.onscreen.style.opacity = 0;
    this.element = new CanvasCanvas(this.onscreen);
    const legra = new Legra(this.offscreen.getContext('2d'),GRID_SIZE);
    this.legra = legra;
    onTick( () => {
        if (this.animating) {
            setTimeout(() => {
                requestAnimationFrame( () => {
                    let actual_width = this.onscreen.width;
                    let actual_height = this.onscreen.height;
                    let target_width = Math.ceil(actual_width / GRID_SIZE) * GRID_SIZE;
                    let target_height = Math.ceil(actual_height / GRID_SIZE) * GRID_SIZE;
                    this.offscreen.width = target_width;
                    this.offscreen.height = target_height;
                    this.legra.drawImage(this.onscreen,[-0.5*(target_width - actual_width),-0.5*(target_height - actual_height)]);
                    let imgdata = this.offscreen.getContext('2d').getImageData(0, 0, this.onscreen.width, this.onscreen.height);
                    for (let i = 0; i < imgdata.data.length; i += 4) {
                        if (imgdata.data[i + 1] === 0 && imgdata.data[i + 2] === 0 && imgdata.data[i + 2] === 0) {
                            imgdata.data[i+3] = 0;
                        }
                    }
                    this.offscreen.getContext('2d').putImageData(imgdata,0,0);
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
            let actual_width = this.onscreen.width;
            let actual_height = this.onscreen.height;
            let target_width = Math.ceil(actual_width / GRID_SIZE) * GRID_SIZE;
            let target_height = Math.ceil(actual_height / GRID_SIZE) * GRID_SIZE;
            this.offscreen.width = target_width;
            this.offscreen.height = target_height;
            this.legra.drawImage(this.onscreen,[-0.5*(target_width - actual_width),-0.5*(target_height - actual_height)]);
            let imgdata = this.offscreen.getContext('2d').getImageData(0, 0, this.onscreen.width, this.onscreen.height);
            for (let i = 0; i < imgdata.data.length; i += 4) {
                if (imgdata.data[i + 1] === 0 && imgdata.data[i + 2] === 0 && imgdata.data[i + 2] === 0) {
                    imgdata.data[i+3] = 0;
                }
            }
            this.offscreen.getContext('2d').putImageData(imgdata,0,0);
        });
    },0);
  }
}

export default LegraCanvasRenderer;