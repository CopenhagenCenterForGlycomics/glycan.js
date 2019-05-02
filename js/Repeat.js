'use strict';

const template_sugar = Symbol('template_sugar');

const last_residue = Symbol('last_residue');

const min_repeats = Symbol('min_repeats');
const max_repeats = Symbol('max_repeats');

const active_mode = Symbol('active_mode');

const MODE_EXPAND = Symbol('MODE_EXPAND');
const MODE_MINIMAL = Symbol('MODE_MINIMAL');

import TracedMonosaccharide from './Tracing';

import MixedTupleMap from '../lib/MixedTupleMap';

/*

// Usage:
// Create repeat unit from a sequence

// When we add child to a monosaccharide
// of a repeat sugar, the monosaccharide
// that gets added on should not be repeated
// too

// When we match a repeat, there should be
// two modes: Expand and minimal. Expand
// expands the repeat out to the max 
// number of repeat units, and minimal
// only matches the minimal repeat unit

*/

const repeat_wraps = new MixedTupleMap();

const counter_map = {};

class Counter {
  constructor() {
  }

  static get get(counter) {
    if (! counter_map[counter]) {
      counter_map[counter] = new Counter();
    }
    return counter_map[counter];
  }
}

const get_wrapped_residue = (clazz,repeat,monosaccharide,repeat_count) => {
  let id_tuple = [repeat,Counter.get(repeat_count),monosaccharide];
  if ( ! repeat_wraps.has(id_tuple) ) {
    repeat_wraps.set(id_tuple, new clazz(monosaccharide,repeat,repeat_count));
  }
  return repeat_wraps.get(id_tuple);
};

class RepeatMonosaccharide extends TracedMonosaccharide {
    constructor(original,repeat,count) {
      super(original.identifier);
      this.repeat = repeat;
      this.repeat_count = count;
      return this;
    }

    get depth() {

    }

    balance() {
      // No-op
    }

    addChild() {
      // We should add a child to this, but leave it out of the repeat
      // Logic could be tricky for this one
    }

    removeChild() {
      // No-op this
    }

    linkageOf() {

    }

    graft() {
      // No-op
    }

    childAt() {
      
    }

    get child_linkages() {

    }

    get children() {
      if (this.original === this.repeat[last_residue] && this.repeat_count < this.repeat.max ) {
        return Object.freeze([ get_wrapped_residue(this.constructor,this.repeat.root.original,this.repeat_count + 1) ]);
      }
      return Object.freeze(super().map( child => get_wrapped_residue(this.constructor,child, this.repeat_count )));
    }

}

export default class Repeat {
  constructor(sugar,attachment,min=1,max=1) {
    this[template_sugar] = sugar;
    this[last_residue] = sugar.leaves[0];
    if ( ! attachment ) {
      if (sugar.leaves.length !== 1) {
        throw new Error('Too many leaves on repeat without defined attachment site');
      }
    } else {
      this[last_residue] = sugar.locate_monosaccharide(attachment);
    }
    this[min_repeats] = min;
    this[max_repeats] = max;
  }

  static get MODE_EXPAND() {
    return MODE_EXPAND;
  }

  static get MODE_MINIMAL() {
    return MODE_MINIMAL;
  }

  static get root() {
    return get_wrapped_residue(RepeatMonosaccharide,this,this[template_sugar].root,this.min); 
  }

  get mode() {
    return this[active_mode];
  }


  set mode(mode) {
    this[active_mode] = mode;
  }

  get min() {
    return this[min_repeats];
  }

  get max() {
    return this[max_repeats];
  }

}