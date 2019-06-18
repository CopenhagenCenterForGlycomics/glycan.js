'use strict';

const template_sugar = Symbol('template_sugar');

const last_residue = Symbol('last_residue');

const min_repeats = Symbol('min_repeats');
const max_repeats = Symbol('max_repeats');

const active_mode = Symbol('active_mode');

const MODE_EXPAND = Symbol('MODE_EXPAND');
const MODE_MINIMAL = Symbol('MODE_MINIMAL');

const parent_symbol = Symbol('parent');

const sort_order_symbol = Symbol('sort_order');

const child_residue_symbol = Symbol('child_residue');

import { default as Monosaccharide, calculateSiblingOrder } from './Monosaccharide';

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

    balance() {
      const parent_linkages = this.children.map( res => {return { link: this.linkageOf(res), res: res }; });
      parent_linkages.sort( (a,b) => a.link - b.link );
      let all_children = parent_linkages.map( obj => obj.res );
      all_children = Object.freeze( calculateSiblingOrder(all_children) );
      all_children.forEach( (child,idx) => {
        child[sort_order_symbol] = idx+1;
      });
    }

    removeChild() {
      // No-op this
    }

    graft() {
      // No-op
    }

    get endsRepeat() {
      return this.original === this.repeat[last_residue];
    }

    get parent() {
      if (this[parent_symbol]) {
        return this[parent_symbol];
      }
      return super.parent;
    }

    linkageOf(child) {
      if (child instanceof RepeatMonosaccharide) {
        if (this.endsRepeat) {
          return this.repeat.root.parent.linkageOf(this.repeat.root);
        }
        return this.original.linkageOf(child.original);
      } else {
        // return super.linkageOf(child);
        return (new Monosaccharide(' ')).linkageOf.call(this,child);
      }
    }

    get child_linkages() {
      let original_kids = this.original.child_linkages;

      let self_children = super.child_linkages;
      let results = new Map([...self_children].filter( ([key,]) => (key === 0 || key) ));

      if (this.endsRepeat && this.repeat_count < this.repeat.max ) {

        const root_link = this.repeat.root.parent.linkageOf(this.repeat.root);
        const new_wrapped_root = get_wrapped_residue(this.constructor, this.repeat, this.repeat.root.original, this, this.repeat_count + 1);
        let self_kids = results.get( root_link ) || [];

        let mapped = Object.freeze(self_kids.concat( [ new_wrapped_root ] ) );
        if (mapped.length > 0 && mapped.every( child => child[sort_order_symbol])) {
          let sorted_mapped = Object.freeze(mapped.slice().sort( (a,b) => a[sort_order_symbol] - b[sort_order_symbol] ));
          results.set(root_link,sorted_mapped);
        } else {
          results.set( root_link, mapped);
        }
        return results;
      }

      if (this.endsRepeat && this.repeat_count >= this.repeat.max ) {
        return results;
      }

      let kid_links = [...original_kids.keys()];


      for( const link of kid_links ) {
        const kids = original_kids.get(link) || [];
        const current_kids = results.get(link) || [];
        const mapped = Object.freeze( current_kids.concat(kids.map( child => get_wrapped_residue(this.constructor,this.repeat, child, this, this.repeat_count ))) );
        if (mapped.length > 0) {
          if (mapped.every( child => child[sort_order_symbol] )) {
            let sorted_mapped = Object.freeze(mapped.slice().sort( (a,b) => a[sort_order_symbol] - b[sort_order_symbol] ));
            results.set(link,sorted_mapped);
          } else {
            results.set(link,mapped);
          }
        }
      }
      return results;
    }

    get children() {
      let self_kids = super.children;

      let all_children;
      if (this.endsRepeat && this.repeat_count < this.repeat.max ) {
        const new_wrapped_root = get_wrapped_residue(this.constructor, this.repeat, this.repeat.root.original, this, this.repeat_count + 1);
        all_children = Object.freeze(self_kids.concat([ new_wrapped_root ]));
      } else if (this.endsRepeat && this.repeat_count >= this.repeat.max) {
        all_children = Object.freeze( self_kids.concat( this.repeat[child_residue_symbol].children ) );
      } else {
        all_children = Object.freeze( self_kids.concat(this.original.children.map( child => get_wrapped_residue(this.constructor,this.repeat, child, this, this.repeat_count ))) );
      }

      if (all_children.every( child => child[sort_order_symbol] ) && all_children.length > 0) {
        all_children = Object.freeze(all_children.slice().sort( (a,b) => a[sort_order_symbol] - b[sort_order_symbol] ));
      }

      return all_children;
    }

}

export { RepeatMonosaccharide };

export default class Repeat {
  constructor(sugar,attachment,min=1,max=1) {
    this[template_sugar] = sugar;
    if (sugar.root.identifier === 'Root') {
      sugar.root = sugar.root.children[0];
    }
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
    this[child_residue_symbol] = new Monosaccharide('Root');

  }

  static get MODE_EXPAND() {
    return MODE_EXPAND;
  }

  static get MODE_MINIMAL() {
    return MODE_MINIMAL;
  }

  get root() {
    let root = get_wrapped_residue(RepeatMonosaccharide,this,this[template_sugar].root,null,this.min);
    if (this[template_sugar].root.parent && this[template_sugar].root.parent.children.indexOf(root) < 0) {
      let target_linkage = this[template_sugar].root.parent.linkageOf(this[template_sugar].root);
      let placeholder = this[template_sugar].root.parent;
      placeholder.removeChild(target_linkage,this[template_sugar].root);
      placeholder.addChild(target_linkage,root);
    }
    return root;
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

  get child() {
    return this[child_residue_symbol].children[0];
  }

  set child(residue) {
    let root = this[child_residue_symbol];
    for (let kid of root.children) {
      root.removeChild(root.linkageOf(kid),kid);
    }

    if (residue.parent) {
      root.graft(residue);
    } else {
      root.addChild(0,residue);
    }
  }

}