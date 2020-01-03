'use strict';

// https://www.html5rocks.com/en/tutorials/canvas/performance/#toc-pre-render

const CACHED_ICONS = new WeakMap();

import CanvasRenderer from './CanvasRenderer';

const Canvas = CanvasRenderer.Canvas;

import rough from 'roughjs/dist/rough.umd.js';

const draw_path = (path,ctx,rc) => {
  if (path.rotate) {
    ctx.save();
    ctx.translate(path.rotate.cx,path.rotate.cy);
    ctx.rotate(path.rotate.angle);
    ctx.translate(-1*path.rotate.cx,-1*path.rotate.cy);
  }

  if (path.d) {
    if (path.fill !== 'none') {
      rc.path(path.d,{ fill: '#fff', stroke: '#fff', roughness: 0, fillStyle: 'solid', strokeWidth: 0 });
      rc.path(path.d,{ fill: path.fill, roughness: 2, fillStyle: 'cross-hatch' });
    } else {
      rc.path(path.d,{ roughness: 2 });
    }
  }
  if (path.cx) {
    rc.circle(path.cx,path.cy,2*path.r, {fill: '#fff', stroke: '#fff', roughness: 0, fillStyle: 'solid' , strokeWidth: 0 });
    rc.circle(path.cx,path.cy,2*path.r, {fill: path.fill, roughness: 2, fillStyle: 'cross-hatch' });
  }
  if (path.fontSize) {
    ctx.font = `${path.fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = path.fill;
    ctx.fillText(path.text,path.x, path.y);
  }

  if (path.rotate) {
    ctx.restore();
  }
};

const render_icon = function(canvas) {
  let ctx = canvas.getContext('2d');

  if (this.paths && this.paths.length > 0) {
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.scale(this.width/100,this.height/100);

    if ( ! CACHED_ICONS.has(this) ) {
      let offscreen = canvas.ownerDocument.createElement('canvas');
      offscreen.width = 100;
      offscreen.height = 100;
      let offscreen_ctx = offscreen.getContext('2d');
      let rc = rough.canvas(offscreen);
      for(let path of this.paths.filter( path => ! path.text )) {
        draw_path(path,offscreen_ctx,rc);
      }
      CACHED_ICONS.set(this,offscreen);
    }

    ctx.save();

    ctx.translate(50,50);
    ctx.rotate(Math.PI / 180 * this.rotate );
    ctx.drawImage(CACHED_ICONS.get(this),-50,-50);

    ctx.restore();

    for (let path of this.paths.filter( path => path.text )) {
      draw_path(path,ctx,canvas);
    }

    ctx.restore();
  }
};

const render_line = function(canvas){
  let rc = rough.canvas(canvas);
  rc.line(this.x,this.y,this.x2,this.y2, {roughness: 3 });
};


class RoughCanvas extends Canvas {
  use(ref,x,y,width,height) {
    let icon = { icon: ref, x, y, width, height, render: render_icon };
    this.appendChild(icon);
    return icon;
  }
  line(x,y,x2,y2,options={}) {
    let a_line = {x,y,x2,y2,options, render: render_line};
    this.appendChild(a_line);
    return a_line;
  }
  group(a_g) {
    if ( ! a_g ) {
      a_g = new RoughCanvas();
      this.appendChild(a_g);
    }
    return a_g;
  }
}

export default RoughCanvas;