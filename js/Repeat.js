'use strict';

const template_sugar = Symbol('template_sugar');

const last_residue = Symbol('last_residue');

const min_repeats = Symbol('min_repeats');
const max_repeats = Symbol('max_repeats');

const identifier_symbol = Symbol('identifier');

const active_mode = Symbol('active_mode');

const MODE_EXPAND = Symbol('MODE_EXPAND');
const MODE_MINIMAL = Symbol('MODE_MINIMAL');

const parent_symbol = Symbol('parent');

const sort_order_symbol = Symbol('sort_order');

const child_residue_symbol = Symbol('child_residue');

const repeat_symbol = Symbol('repeat');

const counter_symbol = Symbol('counter');

const attachment_symbol = Symbol('attachment');

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

const get_wrapped_residue = (clazz,repeat,monosaccharide,parent,counter) => {
  let id_tuple = [repeat,Counter.get(counter),monosaccharide];
  if ( ! repeat_wraps.has(id_tuple) ) {
    repeat_wraps.set(id_tuple, new clazz(monosaccharide,parent,repeat,counter));
  }
  return repeat_wraps.get(id_tuple);
};

const patch_parent = (residue,repeat) => {
  Object.defineProperty(residue,'parent', {
    get : () => {
      const max_count = repeat.mode === MODE_EXPAND ? repeat.max : repeat.mode === MODE_MINIMAL ? repeat.min : 1;
      let parent = get_wrapped_residue(repeat.constructor.Monosaccharide, repeat, repeat[last_residue],null,max_count);
      return parent;
    }
  });
};

class RepeatMonosaccharide extends TracedMonosaccharide {

    constructor(original,parent,repeat,counter) {
      super(original);
      this[parent_symbol] = parent;
      this[repeat_symbol] = repeat;
      this[counter_symbol] = counter;
      return this;
    }

    static is_wrapped(r) {
      return r instanceof RepeatMonosaccharide;
    }

    static is_not_wrapped(r) {
      return ! RepeatMonosaccharide.is_wrapped(r);
    }


    clone() {
      let result = new this.constructor(this.original,this[parent_symbol],this[repeat_symbol].clone(),this[counter_symbol]);
      result.copyTagsFrom(this);
      return result;
    }

    get repeat() {
      return this[repeat_symbol];
    }

    get counter() {
      return this[counter_symbol];
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

    graft() {
      // No-op
    }

    addChild(linkage,child) {
      if (this.repeat.mode === MODE_EXPAND && (! this.endsRepeat || this.counter < this.repeat.max )) {
        return super.addChild(linkage,child);
      }
      if (this.repeat[child_residue_symbol].children.indexOf(child) < 0) {
        this.repeat[child_residue_symbol].addChild(linkage,child);
        patch_parent(child,this.repeat);
      }
    }

    removeChild(linkage,child) {

      if (this.repeat.mode === MODE_EXPAND) {
        return super.removeChild(linkage,child);
      }

      if (! this.endsRepeat) {
        throw new Error('Removing a child that isnt at the end of a repeat');
      }

      return this.repeat[child_residue_symbol].removeChild(linkage,child);
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
        if (this.endsRepeat && child.repeat === this.repeat && child.counter !== this.counter && child.original === this.repeat.root.original ) {
          return this.repeat.root.parent.linkageOf(this.repeat.root);
        }
        return this.original.linkageOf(child.original);
      } else if (this.endsRepeat && this.repeat.children.indexOf(child) >= 0) {
        return this.repeat[child_residue_symbol].linkageOf(child);
      } else {
        return (new Monosaccharide(' ')).linkageOf.call(this,child);
      }
    }

    get child_linkages() {
      let linkage_map = super.child_linkages;
      let results = new Map();
      for (let link of linkage_map.keys()) {
        for (let res of linkage_map.get(link).filter( RepeatMonosaccharide.is_wrapped )) {
          let wrapped_link = res.original.parent.linkageOf(res.original);
          results.set( wrapped_link , (results.get(wrapped_link) || []).concat(res) );
        }
        for (let res of linkage_map.get(link).filter( RepeatMonosaccharide.is_not_wrapped )) {
          results.set( link, (results.get(link) || []).concat(res) );
        }
      }
      return results;
    }

    get children() {

      const max_count = this.repeat.mode === MODE_EXPAND ? this.repeat.max : this.repeat.mode === MODE_MINIMAL ? this.repeat.min : 1;

      let original_kids = this.original.children;
      let self_kids = super.children;

      let repeat_end_kids = [];

      if (this.repeat.mode === MODE_MINIMAL) {
        self_kids = [];
      }

      if (this.endsRepeat && this.counter >= max_count) {
        repeat_end_kids = this.repeat.children;
      }

      let results = [];

      if (this.endsRepeat && this.counter < max_count ) {
        results.push(get_wrapped_residue(this.constructor, this.repeat, this.repeat.root.original, this, this.counter + 1));
      }
      const wrapped_original = original_kids.map( child => get_wrapped_residue(this.constructor,this.repeat, child, this, this.counter ));
      const mapped = Object.freeze([self_kids,repeat_end_kids,results].reduce( (curr,newarr) => curr.concat(newarr), wrapped_original ));
      if (mapped.length > 0 && mapped.every( child => child[sort_order_symbol])) {
        let sorted_mapped = Object.freeze(mapped.slice().sort( (a,b) => a[sort_order_symbol] - b[sort_order_symbol] ));
        return sorted_mapped;
      } else {
        return mapped;
      }
    }

}

export default class Repeat {

  constructor(sugar,attachment,min=1,max=1) {
    this[template_sugar] = sugar;

    let main_branch_residue = sugar.leaves()[0];

    if (sugar.root.identifier === 'Root') {
      sugar.root = sugar.root.children[0];
    }

    this[last_residue] = main_branch_residue;

    if ( ! attachment ) {
      if (sugar.leaves.length !== 1) {
        throw new Error('Too many leaves on repeat without defined attachment site');
      }
    } else {
      this[last_residue] = ((typeof attachment === 'string') && ! (attachment instanceof Monosaccharide)) ? sugar.locate_monosaccharide(attachment) : attachment;
    }

    if (typeof attachment !== 'string') {
      attachment = sugar.location_for_monosaccharide(this[last_residue]);
    }

    this[attachment_symbol] = attachment;

    this[min_repeats] = min;
    this[max_repeats] = max;
    this[child_residue_symbol] = new Monosaccharide('Root');

  }

  clone() {
    let cloned = new this.constructor(this[template_sugar],this[last_residue],this.min,this.max);
    cloned[attachment_symbol] = this[attachment_symbol];
    cloned.identifier = this.identifier;
    if (this.mode) {
      cloned.mode = this.mode;
    }
    return cloned;
  }

  get off_main() {
    return this[last_residue] !== this[template_sugar].leaves()[0];
  }

  static get Monosaccharide() {
    return RepeatMonosaccharide;
  }

  static addToSugar(sugar,start,end,mode,min=1,max=1) {
    if (! (start instanceof Monosaccharide) && (typeof start === 'string')) {
      start = sugar.locate_monosaccharide(start);
    }
    if (! (end instanceof Monosaccharide) && (typeof end === 'string')) {
      end = sugar.locate_monosaccharide(end);
    }

    let temp_end = new Monosaccharide('Root');
    for (let kid of end.children) {
      temp_end.graft(kid);
    }

    let parent = start.parent;
    let parent_link = parent.linkageOf(start);
    parent.removeChild(parent_link,start);

    let temp_sugar = new sugar.constructor();
    temp_sugar.root = new Monosaccharide('Root');
    temp_sugar.root.addChild(parent_link,start);
    let repeat = new Repeat(temp_sugar,end,min,max);
    repeat.mode = mode;
    for (let kid of temp_end.children) {
      repeat[child_residue_symbol].graft(kid);
      patch_parent(kid,repeat);
    }
    parent.addChild(parent_link,repeat.root);
    return repeat;
  }


  static get MODE_EXPAND() {
    return MODE_EXPAND;
  }

  static get MODE_MINIMAL() {
    return MODE_MINIMAL;
  }

  get template() {
    return this[template_sugar];
  }

  get root() {
    let root = get_wrapped_residue(RepeatMonosaccharide,this,this[template_sugar].root,null,this.min);
    if (this[template_sugar].root.parent && ! root.parent ) {
      let target_linkage = this[template_sugar].root.parent.linkageOf(this[template_sugar].root);
      let placeholder = this[template_sugar].root.parent.clone();
      placeholder.removeChild(target_linkage,this[template_sugar].root);
      placeholder.addChild(target_linkage,root);
    }
    return root;
  }

  get attachment() {
    return this[attachment_symbol];
  }

  get identifier() {
    return this[identifier_symbol] || '';
  }

  set identifier(id) {
    this[identifier_symbol] = id;
  }

  get mode() {
    return this[active_mode];
  }

  set mode(mode) {
    if ( [MODE_MINIMAL,MODE_EXPAND].indexOf(mode) < 0 ) {
      throw new Error('Invalid mode');
    }
    this[active_mode] = mode;
  }

  get min() {
    return this[min_repeats];
  }

  get max() {
    return this[max_repeats];
  }

  set max(max) {
    this[max_repeats] = max;
  }

  get children() {
    return this[child_residue_symbol].children;
  }

  set children(children) {
    let root = this[child_residue_symbol];
    for (let kid of root.children) {
      root.removeChild(root.linkageOf(kid),kid);
    }
    for (let residue of children) {
      if (residue.parent) {
        root.graft(residue);
      } else {
        root.addChild(0,residue);
      }
      patch_parent(residue,this);
    }
  }

}