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

// Canvas 2D's fillStyle/strokeStyle only take plain colours: a
// light-dark(...)/var(...) value (what sugars.svg and Renderer.js use so
// the SVG renderers follow the page theme) is silently ignored, leaving
// whatever colour was set before - black. resolveColor() lets the browser
// compute the value against the <canvas> element itself (its color-scheme
// and custom properties), returning '#rrggbb' (or rgba() when translucent).
// Cached per canvas and cleared at the start of each render pass
// (resetResolvedColors), so each distinct value costs one style recalc of
// the canvas element per pass, and a theme switch is picked up on the next
// pass. Plain values (no '(') skip all of that and are returned as-is.
const RESOLVED_COLORS = new WeakMap();

const to_hex = (rgb) => {
  const parts = rgb.match(/[\d.]+/g);
  if ( ! parts || parts.length < 3 || (parts.length > 3 && parseFloat(parts[3]) < 1)) {
    return rgb;
  }
  return '#' + parts.slice(0,3).map( v => (parseInt(v,10) | 0).toString(16).padStart(2,'0') ).join('');
};

const resolveColor = function(canvas,css) {
  if ( ! css || css.indexOf('(') < 0 || ! canvas || ! canvas.style ) {
    return css;
  }
  let cache = RESOLVED_COLORS.get(canvas);
  if ( ! cache ) {
    cache = new Map();
    RESOLVED_COLORS.set(canvas,cache);
  }
  if ( ! cache.has(css) ) {
    const previous = canvas.style.color;
    canvas.style.color = css;
    // A detached canvas (e.g. an offscreen buffer) has no computed style:
    // fall back to the light-theme default ink.
    const computed = canvas.isConnected ? getComputedStyle(canvas).color : '';
    canvas.style.color = previous;
    cache.set(css, computed ? to_hex(computed) : '#111');
  }
  return cache.get(css);
};

const resetResolvedColors = function(canvas) {
  RESOLVED_COLORS.delete(canvas);
};

const TEXT_COLOR = 'light-dark(#111, var(--text-color, #ddd))';

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
  ctx.fillStyle = resolveColor(canvas, this.options.fill || TEXT_COLOR);
  ctx.fillText(this.text, this.x, this.y);
};

const render_line = function(canvas){
  let ctx = canvas.getContext('2d');
  if (this.options['stroke-width']) {
    ctx.lineWidth = this.options['stroke-width'];
  }
  if (this.options.stroke) {
    ctx.strokeStyle = resolveColor(canvas, this.options.stroke);
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
  // Exposed for the canvas renderer packages (isomer/zdog/phoria-glycan.js),
  // which only reach this module through CanvasRenderer.Canvas.
  static resolveColor(canvas,css) {
    return resolveColor(canvas,css);
  }

  // For a canvas drawn outside CanvasRenderer's own render() pass (which
  // already clears its canvas's entry each pass), e.g. legra's onscreen one.
  static resetResolvedColors(canvas) {
    resetResolvedColors(canvas);
  }

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
export { iconsReady, resetIconsReady, resolveColor, resetResolvedColors };