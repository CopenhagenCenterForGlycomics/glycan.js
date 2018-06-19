/*global Image*/
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
  ctx.font = '25px Helvetica';
  ctx.textAlign = 'left';
  if (this['text-anchor']) {
    ctx.textAlign = this['text-anchor'];
  }
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'black';
  ctx.fillText(this.text, this.x, this.y);
};

const render_line = function(canvas){
  let ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.moveTo(this.x,this.y);
  ctx.lineTo(this.x2, this.y2);
  ctx.stroke();
};

const ICONS_CACHE = new Map();

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
  image.loaded.then( () => {
    ctx.drawImage(image, this.x, this.y,this.width,this.height);
  });
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

  text(x,y,text) {
    let a_text = { x,y,text, render: render_text };
    this.appendChild(a_text);
    return a_text;
  }

}

export default Canvas;