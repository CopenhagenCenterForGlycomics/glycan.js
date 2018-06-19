/*global window*/
'use strict';

import Canvas from './CanvasCanvas';

const render_icon = function(canvas) {
  let ctx = canvas.getContext('2d');

  if (this.paths && this.paths.length > 0) {
    let rough = window.rough;
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.scale(this.width/100,this.height/100);
    let rc = rough.canvas(canvas);
    for(let path of this.paths) {

      if (path.rotate) {
        ctx.save();
        ctx.translate(path.rotate.cx,path.rotate.cy);
        ctx.rotate(path.rotate.angle);
        ctx.translate(-1*path.rotate.cx,-1*path.rotate.cy);
      }

      if (path.d) {
        rc.path(path.d,{ fill: path.fill, roughness: 2, fillStyle: 'cross-hatch' });
      }
      if (path.cx) {
        rc.circle(path.cx,path.cy,2*path.r, {fill: path.fill, roughness: 2, fillStyle: 'cross-hatch' });
      }
      if (path.rotate) {
        ctx.restore();
      }
    }
    ctx.restore();
  }
};

class RoughCanvas extends Canvas {
  use(ref,x,y,width,height) {
    let icon = { icon: ref, x, y, width, height, render: render_icon };
    this.appendChild(icon);
    return icon;
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