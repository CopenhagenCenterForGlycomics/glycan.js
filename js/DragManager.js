/* globals document,DragDropTouch,Event */
'use strict';

const shim_dispatch = function(e,type,target) {
  if (e && target) {
      var evt = document.createEvent('Event'), t = e.touches ? e.touches[0] : e;
      evt.initEvent(type, true, true);
      evt.button = 0;
      evt.which = evt.buttons = 1;
      this._copyProps(evt, e, DragDropTouch._kbdProps);
      this._copyProps(evt, t, DragDropTouch._ptProps);
      evt.dataTransfer = this._dataTransfer;
      target.dispatchEvent(evt);
      return evt;
  }
  return false;
};

const uuid =  function() {
  var uuid = '', i, random;
  for (i = 0; i < 32; i++) {
    random = Math.random() * 16 | 0;

    if (i == 8 || i == 12 || i == 16 || i == 20) {
      uuid += '-';
    }
    uuid += (i == 12 ? 4 : (i == 16 ? (random & 3 | 8) : random)).toString(16);
  }
  return uuid;
};

DragDropTouch.prototype._dispatchEvent = function(e,type,target) {
  if (e && target) {
    let new_ev = shim_dispatch.bind(this)(e,type,document.body);
    new_ev.shim = true;
    target.dispatchEvent(new_ev);
    return new_ev.defaultPrevented;
  }
  return false;
};

const global_drags = new Map();

const dragstart_event = function(e) {
  if ( ! e.isTrusted && ! e.shim ) {
    return;
  }

  let drag_id = 'drag/'+uuid();
  e.dataTransfer.setData(drag_id, '');
  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.dropEffect = 'copy';

  let target = e.target;
  var event = new Event('dragstart',{bubbles: false});
  event.dataTransfer = { types: [ drag_id ] };
  event.data = { };
  this.drags.set(drag_id,event.data);
  target.dispatchEvent(event);
  e.stopPropagation();
};

const populate_event_data = function(e) {
  let drag_id = e.dataTransfer.types.filter( type => type.match(/^drag\/\d+/))[0];
  e.data = this.drags.get(drag_id);
};

const wire_global_drag_events = function(parent) {
  parent.addEventListener('dragstart',dragstart_event.bind(this),{capture:true});
  for(let event of ['dragenter','dragover','drop','dragleave']) {
    parent.addEventListener(event,populate_event_data.bind(this));
  }
};

class DragManager {
  get drags() {
    return global_drags;
  }
  constructor(parent) {
    wire_global_drag_events.call(this,parent);
  }
}

export default DragManager;