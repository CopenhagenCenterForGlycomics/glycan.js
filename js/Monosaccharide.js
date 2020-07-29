'use strict';

const LINKAGES = { 'O' : -100, 'N' : -200 };

let anomer_symbol = Symbol('anomer');
let identifier_symbol = Symbol('identifier');
let parent_linkage_symbol = Symbol('parent_linkage');
let parent_symbol = Symbol('parent');

const unknown_count_symbol = Symbol('unknown_count');
const MAX_KNOWN_LINKAGE = 100;

const only_unique = (v, i, s) => s.indexOf(v) === i;


const leaves_of_residue = function(residue) {
  if (residue.children.length == 0) {
    return [residue];
  }
  return Array.prototype.concat.apply([],residue.children.map(leaves_of_residue));
};

const get_path_to_root = function(roots,residue) {
  let result = [residue];
  while ( roots.indexOf(result[0]) < 0 ) {
    result.unshift( result[0].parent );
  }
  return result;
};

const residue_sorter = function(a,b) {
  if (a.parent.linkageOf(a) !== b.parent.linkageOf(b)) {
    return a.parent.linkageOf(a) - b.parent.linkageOf(b);
  }
  if (a.identifier !== b.identifier) {
    return (a.identifier.toUpperCase() < b.identifier.toUpperCase() ? -1 : 1);
  }
  return 0;
};

const path_sorter = function(path_a,path_b) {
  let path_a_loop = [].concat(path_a);
  let path_b_loop = [].concat(path_b);

  while ( path_a_loop.length > 0 && path_b_loop.length > 0 ) {
    let a = path_a_loop.shift();
    let b = path_b_loop.shift();
    let res = residue_sorter(a,b);
    if (res) {
      return res;
    }
  }
  // We want the longest path length, therefore -1 * diff
  return -1*(path_a_loop.length - path_b_loop.length);
};

const reorder_kids = function(children) {
  let leaves = [];
  for (let child of children) {
    leaves = leaves.concat(leaves_of_residue(child));
  }
  let paths = leaves.map( get_path_to_root.bind(null,children) );
  let sorted_kids = paths.sort(path_sorter);
  return sorted_kids.map( path => path[0] ).filter( only_unique );
};

export { reorder_kids as calculateSiblingOrder };

/*   We basically want a barebones Monosacharide class that uses
  some common set of identifiers for each of the monosaccharide
  units. We can then mixin things like mass and sequence
  translation to edit the actual functionality for the sugar.
  Can even have a 'strict mode' sugar mixin that enforces
  rules.
*/

let linkage_map = new WeakMap();
let children_map = new WeakMap();
let tag_map = new WeakMap();

export default class Monosaccharide {
  static get LINKAGES() {
    return LINKAGES;
  }
  constructor(identifier) {
    if ( ! identifier ) {
      throw new Error('Missing identifier');
    }
    // Accept any identifier - we can do
    // checking on validity of identifiers
    // via mixins.
    this[identifier_symbol] = identifier;
  }

  get depth() {
    let start = this;
    let count = 1;
    while (start.parent) {
      count++;
      start = start.parent;
    }
    return count;
  }

  get identifier() {
    return this[identifier_symbol];
  }

  get anomer() {
    return this[anomer_symbol];
  }
  // This should be a tristate variable a/b/?
  set anomer(anomer) {
    this[anomer_symbol] = anomer;
  }

  // parent linkage
  get parent_linkage() {
    return this[parent_linkage_symbol];
  }

  // Accept any number for the parent linkage. Also accept null for
  // unknown linkage
  set parent_linkage(linkage) {
    this[parent_linkage_symbol] = linkage;
  }

  get parent() {
    return this[parent_symbol];
  }

  // This should spit out an immutable array - force usage of the api
  // to add/remove children.
  get children() {
    return Object.freeze([].concat(children_map.get(this) || []));
  }

  get child_linkages() {
    var results = new Map();
    this.children.forEach(function(mono) {
      let position = linkage_map.get(mono);
      let real_position = position;

      if (position > MAX_KNOWN_LINKAGE) {
        real_position = 0;
      }

      let kids = results.get( real_position );
      if ( ! kids ) {
        kids = [];
        results.set( real_position, kids );
      }
      kids.push(mono);
    });
    return results;
  }

  get siblings() {
    var self = this;
    if ( ! this.parent ) {
      return [];
    }
    return this.parent.children.filter(mono => mono !== self);
  }

  balance(ascend=true) {
    if (Object.isFrozen(this)) {
      throw new TypeError('Cannot balance child ordering of frozen monosaccharide');
    }
    let child_order = reorder_kids(this.children);
    this[unknown_count_symbol] = 0;
    let unknown_count = 0;
    for (let child of child_order) {
      if (linkage_map.get(child) > MAX_KNOWN_LINKAGE) {
        unknown_count += 1;
        linkage_map.set(child,MAX_KNOWN_LINKAGE+1+unknown_count);
      }
    }
    this[unknown_count_symbol] = unknown_count;
    children_map.set(this,child_order);
    let parent = this;
    if ( ! ascend ) {
      return;
    }
    while (parent && parent.parent) {
      let parent_link = parent.parent.linkageOf(parent);
      if (parent.parent.child_linkages.get(parent_link).length > 0) {
        parent.parent.balance(false);
      }
      parent = parent.parent;
    }
  }

  // child linkages

  // methods:
  // add child
  addChild(linkage,child) {
    if (Object.isFrozen(this) || Object.isFrozen(child)) {
      throw new TypeError('Cannot add child on frozen monosaccharide');
    }

    if ((typeof linkage) !== 'number') {
      throw new Error('Linkage must be number');
    }

    if (linkage > MAX_KNOWN_LINKAGE) {
      throw new Error(`Cannot set defined linkage greater than ${MAX_KNOWN_LINKAGE}`);
    }

    if (linkage == 0) {
      this[unknown_count_symbol] = (this[unknown_count_symbol] || 0);
      let unknown_count =  this[unknown_count_symbol];
      this[unknown_count_symbol] = unknown_count+1;
      linkage = MAX_KNOWN_LINKAGE+1+unknown_count;
    }

    // When we read in the sugar from
    // a sequence, we want to make addChild inaccessible
    // so that we can protect the ordering of the branches
    // and we can save some processing (especially since
    // IUPAC condensed delivers branch ordering as part
    // of the format).

    // BUT.. when we have a sugar that we are adding to
    // like when drawing, or programattically building a sugar
    // we should trigger branch ordering routines that
    // maintain the true ordering of branches.

    let insert_index = 0;

    for (let existing_child of this.children) {
      if (linkage_map.get(existing_child) <= linkage) {
        insert_index += 1;
      } else {
        break;
      }
    }

    linkage_map.set(child,linkage);


    // We should insert this child at the correct position in the children
    // map
    let current_children = children_map.get(this) || [];

    current_children.splice(insert_index, 0, child);

    children_map.set(this, current_children);

    // Each child references its parent.
    // When you clear this, you don't
    // have any strong references to this monosaccharide
    // and all its kids, so they will get GC'ed
    child[parent_symbol] = this;

    // jshint +W027

  }

  // remove child
  removeChild(new_linkage,target) {
    var self = this;
    if (Object.isFrozen(self)) {
      throw new TypeError('Cannot remove child on frozen monosaccharide');
    }

    var kids = children_map.get(self);

    let remover = (child) => {
      kids.splice(kids.indexOf(child),1);
      linkage_map.delete(child);
      child[parent_symbol] = null;
      if (new_linkage == 0) {
        this[unknown_count_symbol] -= 1;
      }
    };

    let target_matcher = (kid) => target ? (kid === target) : true;

    for (let [linkage,children] of this.child_linkages) {
      if (new_linkage == linkage) {
        children.filter( target_matcher ).forEach(remover);
      }
    }
  }

  replaceChild(child,new_child,override_position) {
    if (Object.isFrozen(this) || Object.isFrozen(new_child) || Object.isFrozen(child)) {
      throw new TypeError('Cannot replace child on frozen monosaccharide');
    }

    let position = this.linkageOf(child);
    let parent_pos = child.parent_linkage;
    let anomer = child.anomer;

    this.removeChild(position,child);
    new_child.parent_linkage = parent_pos;
    new_child.anomer = anomer;
    if (typeof override_position !== 'undefined') {
      this.addChild(override_position,new_child);
    } else {
      this.addChild(position,new_child);
    }
  }

  linkageOf(child) {
    let linkages = this.child_linkages.entries();
    let curr;
    for (curr of linkages) {
      if (curr[1].indexOf(child) >= 0) {
        return curr[0];
      }
    }
  }

  graft(child) {
    if (Object.isFrozen(this) || Object.isFrozen(child)) {
      throw new TypeError('Cannot graft child on frozen monosaccharide');
    }

    let old_parent = child.parent;
    let linkage = old_parent.linkageOf(child);
    old_parent.removeChild(linkage,child);
    this.addChild(linkage,child);
  }

  childAt(linkage) {
    let kids = this.child_linkages.get(linkage);
    return kids ? kids[0] : kids;
  }

  toString() {
    return this.identifier;
  }

  valueOf() {
    return this.identifier;
  }

  setTag(tagname,value) {
    if (! tag_map.has(this) ) {
      tag_map.set(this, new Map());
    }
    let tag_set = tag_map.get(this);
    let tag_symbol = (typeof tagname === 'symbol') ? tagname : Symbol(tagname);
    tag_set.set(tag_symbol,(typeof value !== 'undefined') ? value : true );
    if (value === null) {
      tag_set.delete(tag_symbol);
    }
    return tag_symbol;
  }

  getTag(tag) {
    if (! tag_map.has(this) ) {
      return;
    }
    let tag_set = tag_map.get(this);
    return tag_set.get(tag);
  }

  copyTagsFrom(residue) {
    if (! tag_map.has(this) ) {
      tag_map.set(this, new Map());
    }
    let tag_set = tag_map.get(this);

    for (const tag of (tag_map.get(residue) || new Map()).keys() ) {
      tag_set.set(tag, tag_map.get(residue).get(tag));
    }
  }

  clone() {
    let result = new this.constructor(this.identifier);
    result[anomer_symbol] = this[anomer_symbol];
    result[parent_linkage_symbol] = this[parent_linkage_symbol];
    result.copyTagsFrom(this);
    return result;
  }

  toSugar(sugarclass) {
    let temp_sugar = new sugarclass();
    temp_sugar.root = this;
    let return_value = temp_sugar.clone();
    temp_sugar.root = null;
    return return_value;
  }

  // cast to sugar (make monosaccharide a sugar/glycan class)
}

let StrictLinkages = (superclass) => class extends superclass {
  addChild(linkage,child) {
    if (this.childAt(linkage)) {
      this.removeChild(linkage);
    }
    return super.addChild(linkage,child);
  }
};

export class StrictMonosaccharide extends StrictLinkages(Monosaccharide) {}
