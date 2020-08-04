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
    configurable: true,
    enumerable: true,
    get : () => {
      const max_count = repeat.mode === MODE_EXPAND ? repeat.max : repeat.mode === MODE_MINIMAL ? repeat.min : 1;
      let parent = get_wrapped_residue(repeat.constructor.Monosaccharide, repeat, repeat[last_residue],null,max_count);
      return parent;
    }
  });
};

let copy_children_skipping_residue;

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

  addChild(linkage,child) {
    if (this.repeat.mode === MODE_EXPAND && (! this.endsRepeatUnit || this.counter < this.repeat.max )) {
      return super.addChild(linkage,child);
    }
    if (this.repeat[child_residue_symbol].children.indexOf(child) < 0) {
      this.repeat[child_residue_symbol].addChild(linkage,child);
      patch_parent(child,this.repeat);
    }
  }

  donateChildrenTo(parent) {
    if (this.counter === this.repeat.max && this.endsRepeatUnit) {
      for (let kid of this.repeat.children) {
        delete kid.parent;
        parent.graft(kid);
      }
    } else {
      copy_children_skipping_residue(this,parent);
    }
  }

  replaceChild(child,new_child,override_position) {
    if (this.repeat.mode === MODE_EXPAND) {
      return super.replaceChild(child,new_child,override_position);
    }
    if (! (child instanceof RepeatMonosaccharide)) {
      return super.replaceChild(child,new_child,override_position);
    }
    if (this.repeat[last_residue] === child.original) {
      this.repeat[last_residue] = new_child;
    }
    let replacement = this.original.replaceChild(child.original,new_child,override_position);
    return replacement;
  }

  removeChild(linkage,child) {
    if (this.repeat.mode === MODE_EXPAND) {

      // If this is the end of a repeat, we simply remove the child from the 
      // child of the repeat unit
      if (this.endsRepeatUnit && this.counter === this.repeat.max) {
        return this.repeat[child_residue_symbol].removeChild(linkage,child);
      } else {

        // Children added on to expanded repeat units aren't
        // controlled by the RepeatMonosaccharide children code

        if ( ! (child instanceof RepeatMonosaccharide) ) {
          return super.removeChild(linkage,child);
        } else {

          // We are going to break the repeat by
          // cloning residues up to the end of the
          // last repeatUnit and grafting them 
          // onto the parent

          // Copy repeat from parent of child up to start of repeat
          // and then add to the repeat, grafting across children
          // when needed
          let parent = this;
          while ( parent && (parent instanceof RepeatMonosaccharide) && ! parent.endsRepeatUnit ) {
            parent = parent.parent;
          }

          let res_class = this.original.constructor;
          let new_root = new res_class('temp_root');
          let clone_map = copy_children_skipping_residue(parent,new_root,child);
          if ( ! clone_map.get(this) ) {
            clone_map.set(this,this);
          }
          let replaced_parent = clone_map.get(this);
          if (replaced_parent !== this) {
            this.balance = () => {
              return replaced_parent.balance();
            };
            replaced_parent.renderer = this.renderer;
          }

          if ( parent instanceof RepeatMonosaccharide ) {
            parent.repeat.max = parent.counter;
            parent.repeat.children = [...new_root.children];
          } else {
            for (let repeat_kid of parent.children.filter( res => (res instanceof RepeatMonosaccharide))) {
              parent.removeChild(parent.linkageOf(repeat_kid),repeat_kid);
            }
            for (let child of new_root.children) {
              parent.graft(child);
            }
          }
          return replaced_parent;
        }
      }
    }

    if (this.repeat.mode === MODE_MINIMAL) {
      if (child instanceof RepeatMonosaccharide) {
        if (child.endsRepeatUnit) {
          child.original.parent.removeChild(child.original.parent.linkageOf(child.original),child.original);
          child.repeat.root.parent.replaceChild(child.repeat.root, child.repeat.root.original);
          return;
        }
        child.original.parent.removeChild(child.original.parent.linkageOf(child.original),child.original);
        return;
      } else {
        if (this.repeat.children.indexOf(child) >= 0 ) {
          this.repeat[child_residue_symbol].removeChild(linkage,child);
          delete child.parent;
          return;
        }
        throw new Error('REPEAT_UNREACHABLE');
      }
    }

    if ( ! this.endsRepeatUnit ) {
      throw new Error('Removing a child that isnt at the end of a repeat');
    }

  }

  get endsRepeatUnit() {
    return this.original === this.repeat[last_residue];
  }

  get parent() {
    if (this[parent_symbol]) {
      return this[parent_symbol];
    }
    return super.parent;
  }

  linkageOf(child) {
    if ((child instanceof RepeatMonosaccharide) && child.repeat === this.repeat) {
      if (this.endsRepeatUnit && child.repeat === this.repeat && child.counter !== this.counter && child.original === this.repeat.root.original ) {
        return this.repeat.root.parent.linkageOf(this.repeat.root);
      }
      return this.original.linkageOf(child.original);
    } else if (this.endsRepeatUnit && this.repeat.children.indexOf(child) >= 0) {
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

    if (this.endsRepeatUnit && this.counter >= max_count) {
      repeat_end_kids = this.repeat.children;
    }

    let results = [];

    if (this.endsRepeatUnit && this.counter < max_count ) {
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

copy_children_skipping_residue = (parent,newroot,toskip) => {
  let parent_repeat_kids = parent.children.filter( res => res !== toskip );
  let cloned_map = new Map();
  const graft_cloner = (newparent,res) => {
    let old_parent = res.parent;
    let linkage = old_parent.linkageOf(res);
    let toadd = (res instanceof RepeatMonosaccharide) ? res.original.clone() : res;
    if ((old_parent instanceof RepeatMonosaccharide) && old_parent.repeat[child_residue_symbol].children.indexOf(res) >= 0) {
      old_parent.repeat[child_residue_symbol].removeChild(linkage,res);
      delete res.parent;
    }
    cloned_map.set(res,toadd);
    if (newparent.children.indexOf(toadd) < 0) {
      newparent.addChild(linkage, toadd);
    }
  };
  parent_repeat_kids.forEach( graft_cloner.bind(null,newroot) );
  for (let kid of parent_repeat_kids) {
    cloned_map = new Map( [...cloned_map, ...copy_children_skipping_residue(kid, cloned_map.get(kid), toskip )]);
  }
  return cloned_map;
};

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

    this[min_repeats] = min;
    this[max_repeats] = max;
    this[child_residue_symbol] = new Monosaccharide('Root');

  }

  clone() {
    let cloned = new this.constructor(this[template_sugar],this[last_residue],this.min,this.max);
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

    if (parent instanceof RepeatMonosaccharide) {
      let new_start = start.clone();
      for (let kid of start.children) {
        new_start.graft(kid);
      }
      start = new_start;
    }

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
    return this.template.location_for_monosaccharide(this[last_residue]);
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
    for (let kid of root.children.filter( kid => children.indexOf(kid) < 0 )) {
      root.removeChild(root.linkageOf(kid),kid);
    }
    for (let residue of children.filter( kid => root.children.indexOf(kid) < 0)) {
      if (residue.parent) {
        root.graft(residue);
      } else {
        root.addChild(0,residue);
      }
      patch_parent(residue,this);
    }
  }

}