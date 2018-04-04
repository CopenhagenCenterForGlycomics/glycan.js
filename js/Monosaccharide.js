'use strict';

let anomer_symbol = Symbol('anomer');
let identifier_symbol = Symbol('identifier');
let parent_linkage_symbol = Symbol('parent_linkage');
let parent_symbol = Symbol('parent');
let tags_symbol = Symbol('tags');

const unknown_count_symbol = Symbol('unknown_count');
const MAX_KNOWN_LINKAGE = 100;

/*   We basically want a barebones Monosacharide class that uses
  some common set of identifiers for each of the monosaccharide
  units. We can then mixin things like mass and sequence
  translation to edit the actual functionality for the sugar.
  Can even have a 'strict mode' sugar mixin that enforces
  rules.
*/

let linkage_map = new WeakMap();
let children_map = new WeakMap();

export default class Monosaccharide {
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
  // This should be a tristate variable a/b/?
  set parent(parent) {
    this[parent_symbol] = parent;
  }

  // This should spit out an immutable array - force usage of the api
  // to add/remove children.
  get children() {
    return children_map.get(this) || [];
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

  // child linkages

  // methods:
  // add child
  addChild(linkage,child) {
    if (linkage > MAX_KNOWN_LINKAGE) {
      throw new Error(`Cannot set defined linkage greater than ${MAX_KNOWN_LINKAGE}`);
    }

    if (linkage <= 0) {
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
    child.parent = this;

    // jshint +W027

  }

  // remove child
  removeChild(new_linkage,target) {
    var self = this;

    var kids = children_map.get(self);

    let remover = (child) => {
      kids.splice(kids.indexOf(child),1);
      linkage_map.delete(child);
      child.parent = null;
    };

    let target_matcher = (kid) => target ? (kid === target) : true;

    for (let [linkage,children] of this.child_linkages) {
      if (new_linkage == linkage) {
        children.filter( target_matcher ).forEach(remover);
      }
    }
  }

  replaceChild(child,new_child,override_position) {
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
    this[tags_symbol] = this[tags_symbol] || {};
    let tag_set = this[tags_symbol];
    let tag_symbol = (typeof tagname === 'symbol') ? tagname : Symbol(tagname);
    tag_set[tag_symbol] = (typeof value !== 'undefined') ? value : true;
    if (value === null) {
      delete tag_set[tag_symbol];
    }
    return tag_symbol;
  }

  getTag(tag) {
    if ( ! this[tags_symbol]) {
      return;
    }
    return this[tags_symbol][tag];
  }

  copyTagsFrom(residue) {
    this[tags_symbol] = this[tags_symbol] || {};
    for (const tag of Object.getOwnPropertySymbols(residue[tags_symbol] || {})) {
      this[tags_symbol][tag] = residue[tags_symbol][tag];
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
