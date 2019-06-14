'use strict';

const template_sugar = Symbol('template_sugar');

const last_residue = Symbol('last_residue');

const min_repeats = Symbol('min_repeats');
const max_repeats = Symbol('max_repeats');

const active_mode = Symbol('active_mode');

const MODE_EXPAND = Symbol('MODE_EXPAND');
const MODE_MINIMAL = Symbol('MODE_MINIMAL');

const parent_symbol = Symbol('parent');

import { TracedMonosaccharide } from './Tracing';

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

  static get(counter) {
    if (! counter_map[counter]) {
      counter_map[counter] = new Counter();
    }
    return counter_map[counter];
  }
}

const get_wrapped_residue = (clazz,repeat,monosaccharide,parent,repeat_count) => {
  let id_tuple = [repeat,Counter.get(repeat_count),monosaccharide];
  if ( ! repeat_wraps.has(id_tuple) ) {
    repeat_wraps.set(id_tuple, new clazz(monosaccharide,parent,repeat,repeat_count));
  }
  return repeat_wraps.get(id_tuple);
};

class RepeatMonosaccharide extends TracedMonosaccharide {
    constructor(original,parent,repeat,count) {
      super(original);
      this[parent_symbol] = parent;
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

    graft() {
      // No-op
    }

    get parent() {
      if (this[parent_symbol]) {
        return this[parent_symbol];
      }
      return super.parent;
    }

    get child_linkages() {
      let original_kids = this.original.child_linkages;

      let results = new Map();

      if (this.original === this.repeat[last_residue] && this.repeat_count < this.repeat.max ) {

        const root_link = this.repeat.root.parent.linkageOf(this.repeat.root);
        const new_wrapped_root = get_wrapped_residue(this.constructor, this.repeat, this.repeat.root.original, this, this.repeat_count + 1);
        results.set( root_link, Object.freeze([ new_wrapped_root ]) );
        return results;
      }

      let kid_links = [...original_kids.keys()];

      for( const link of kid_links ) {
        const kids = original_kids.get(link);
        const mapped = Object.freeze(kids.map( child => get_wrapped_residue(this.constructor,this.repeat, child, this, this.repeat_count )));
        results.set(link,mapped);
      }
      return results;
    }

    get children() {
      if (this.original === this.repeat[last_residue] && this.repeat_count < this.repeat.max ) {
        const new_wrapped_root = get_wrapped_residue(this.constructor, this.repeat, this.repeat.root.original, this, this.repeat_count + 1);
        return Object.freeze([ new_wrapped_root ]);
      }
      const mapped_children = Object.freeze(this.original.children.map( child => get_wrapped_residue(this.constructor,this.repeat, child, this, this.repeat_count )));
      return mapped_children;
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

  get root() {
    return get_wrapped_residue(RepeatMonosaccharide,this,this[template_sugar].root,null,this.min); 
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