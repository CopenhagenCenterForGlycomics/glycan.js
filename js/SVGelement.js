
import {Builder as IupacBuilder, Writer as IupacWriter} from './CondensedIupac';

let extract_sequence = function(element) {
  let seq = element.getAttribute('glycanjs:sequence');
  return seq;
};

let getPropertyDescriptor = function(object,descriptor) {
  let retval = null;
  while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

let Builder = function(superclass) {
  superclass = IupacBuilder(superclass);

  let getter = (getPropertyDescriptor(superclass.prototype, 'sequence') || { 'get' : null }).get;

  let iupac_setter = getPropertyDescriptor(superclass.prototype, 'sequence').set;

  let setter = function(element) {
    iupac_setter.call(this, extract_sequence.call(this,element));
  };

  let methods = {};
  if (getter) {
    methods.get = getter;
  }
  if (setter) {
    methods.set = setter;
  }
  Object.defineProperty(superclass.prototype, 'sequence', methods);

  return class extends superclass {
  };
};

let Writer = function(superclass) {
  return IupacWriter(superclass);
};

let anonymous_class = (superclass) => { return class extends superclass {}; };

let IO = (superclass) => Builder(Writer(anonymous_class(superclass)));

export {Builder,Writer,IO};