/*global */
'use strict';

const torender = Symbol('torender');

class RenderTree {
  constructor() {
    this[torender] = [];
  }

  get torender() {
    return this[torender];
  }

  appendChild(el) {
    if (el.parent) {
      el.parent.torender.splice(el.parent.torender.indexOf(el),1);
    }
    el.parent = this;
    this.torender.push(el);
  }

  sendToBack(el) {
    el.parent.torender.unshift(el.parent.torender.splice(el.parent.torender.indexOf(el),1)[0]);
    return el;
  }

  sendToFront(el) {
    el.parent.torender.push(el.parent.torender.splice(el.parent.torender.indexOf(el),1)[0]);
    return el;
  }

  remove(el) {
    this.torender.splice(this.torender.indexOf(el),1);
  }

}

const render_text = function(canvas){
  let ctx = canvas.getContext('2d');
  ctx.font = `${this.options['font-size'] || 25}px Helvetica`;
  ctx.textAlign = 'left';
  if (this.options['text-anchor']) {
    ctx.textAlign = this.options['text-anchor'];
  }
  ctx.textBaseline = 'top';
  if (this.options.dy) {
    ctx.textBaseline = 'middle';
  }
  ctx.fillStyle = '#111';
  ctx.fillText(this.text, this.x, this.y);
};

const render_line = function(canvas){
  let ctx = canvas.getContext('2d');
  if (this.options['stroke-width']) {
    ctx.lineWidth = this.options['stroke-width'];
  }
  if (this.options.stroke) {
    ctx.strokeStyle = this.options.stroke;
  }
  ctx.beginPath();
  ctx.moveTo(this.x,this.y);
  ctx.lineTo(this.x2, this.y2);
  ctx.stroke();
};

const ICONS_CACHE = new Map();

// Tracks, per destination <canvas> element, every icon draw issued during
// the current render pass that's still waiting on its (possibly still-
// loading, for a never-before-seen icon type) Image. iconsReady(canvas)
// lets a caller (see CanvasRenderer.js's render()/paint()) know when a
// frame's icons have actually finished drawing - render_icon() itself is
// synchronous from perform_rendering()'s point of view, but the real
// ctx.drawImage() only happens once the Image's 'load' event fires, which
// can be well after paint() has already returned for an icon type drawn
// for the first time (later uses hit ICONS_CACHE and resolve immediately).
const PENDING_ICON_DRAWS = new WeakMap();

const render_icon = function(canvas) {
  let ctx = canvas.getContext('2d');
  var image =  ICONS_CACHE.get(this.src);

  if ( ! image ) {
    image = new Image();
    image.src = this.src;
    image.loaded = new Promise((resolve) => {
      image.addEventListener('load',resolve );
    });
  }

  ICONS_CACHE.set(this.src,image);
  const drawn = image.loaded.then( () => {
    // this.rotate (degrees, same convention as SVGRenderer's setIconPosition
    // - see glycan.js/js/SVGRenderer.js - rotating around the icon's own
    // center) is set by CanvasRenderer.js's setIconPosition() but was never
    // actually applied here - invisible for a symmetric icon (circle,
    // square), but very visible for one that isn't (e.g. GlcA's two-tone
    // split-hexagon symbol), which just drew unrotated regardless of
    // horizontal-mode layout.
    if (this.rotate) {
      const cx = this.x + this.width/2;
      const cy = this.y + this.height/2;
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(this.rotate * Math.PI / 180);
      ctx.translate(-cx,-cy);
      ctx.drawImage(image, this.x, this.y,this.width,this.height);
      ctx.restore();
    } else {
      ctx.drawImage(image, this.x, this.y,this.width,this.height);
    }
  });
  if ( ! PENDING_ICON_DRAWS.has(canvas) ) {
    PENDING_ICON_DRAWS.set(canvas,[]);
  }
  PENDING_ICON_DRAWS.get(canvas).push(drawn);
};

// Resolves once every icon draw issued for `canvas` since the last call to
// resetIconsReady(canvas) has actually painted. Call after a render pass
// completes (synchronously) to await the asynchronous tail of it.
const iconsReady = function(canvas) {
  return Promise.all(PENDING_ICON_DRAWS.get(canvas) || []);
};

// Starts a fresh batch for iconsReady() to track - call before a render
// pass begins, so a later iconsReady() call only waits on THIS pass's
// icons, not also every earlier pass's (already-resolved, but still
// accumulating forever otherwise) promises.
const resetIconsReady = function(canvas) {
  PENDING_ICON_DRAWS.set(canvas,[]);
};

class Canvas extends RenderTree {
  constructor(canvas) {
    super();
    if ( canvas ) {
      this.canvas = canvas;
    }
  }

  createElement(tag,doc=this.canvas.ownerDocument) {
    return doc.createElement(tag);
  }

  group(a_g) {
    if ( ! a_g ) {
      a_g = new Canvas();
      this.appendChild(a_g);
    }
    return a_g;
  }

  use(ref,x,y,width,height) {
    let icon = { icon: ref, x, y, width, height, render: render_icon };
    this.appendChild(icon);
    return icon;
  }

  rect() {
  }

  line(x,y,x2,y2,options={}) {
    let a_line = {x,y,x2,y2,options, render: render_line};
    this.appendChild(a_line);
    return a_line;
  }

  text(x,y,text,options={}) {
    let a_text = { x,y,text,options, render: render_text };
    this.appendChild(a_text);
    return a_text;
  }

}

export default Canvas;
export { iconsReady, resetIconsReady };