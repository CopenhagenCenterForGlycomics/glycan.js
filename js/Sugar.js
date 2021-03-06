'use strict';
import Monosaccharide from './Monosaccharide';
import Repeat from './Repeat';

import { Tracer } from './Tracing';

import { CachingSearcher, CacheTrace } from './Searching';

import get_residue_chords from './residue_chords';

let root_symbol = Symbol('root');

let getPropertyDescriptor = function(object,descriptor) {
  let retval = null;
  while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

let flatten = array => [].concat.apply([], array);

let onlyUnique = function(value, index, self) {
  return self.indexOf(value) === index;
};

let has_tag = (tag,res) => res.getTag(tag);

const frozen_sequence_symbol = Symbol('frozen_sequence');
const frozen_composition_symbol = Symbol('frozen_composition');

const find_repeat_unit_for_original = function(start, counter, original) {
  for (let child of start.children.filter( res => res instanceof Repeat.Monosaccharide)) {
    if (child.counter == counter && child.original == original) {
      return child;
    }
    if (child.counter > counter ) {
      continue;
    }
    let child_result = find_repeat_unit_for_original(child,counter,original);
    if (child_result) {
      return child_result;
    }
  }
};

export default class Sugar {
  constructor() {
  }

  set root(residue) {
    this[root_symbol] = residue;
  }
  get root() {
    return this[root_symbol];
  }

  static get Monosaccharide() {
    return Monosaccharide;
  }

  freeze() {
    for (let res of this.breadth_first_traversal()) {
      Object.freeze(res);
    }
    this[frozen_sequence_symbol] = this.sequence;
    this[frozen_composition_symbol] = this.composition();

    Object.defineProperty(this,'composition', {
      value: (root=this.root) => {
        if (root === this.root) {
          return this[frozen_composition_symbol];
        } else {
          return this.constructor.prototype.composition.call(this,root);
        }
      }
    });


    Object.defineProperty(this,'sequence', {
      get: () => this[frozen_sequence_symbol]
    });
    Object.freeze(this);
  }

  get repeats() {
    let repeat_residues = this.composition(this.root).filter( res => res instanceof Repeat.Monosaccharide );
    return repeat_residues.map( res => res.repeat ).filter( (o,i,a) => a.indexOf(o) === i );
  }

  paths(root=this.root,start=this.leaves(root)) {
    let self = this;
    return [].concat(start).map((leaf) => Array.from(self.residues_to_root(leaf)));
  }

  leaves(root=this.root) {
    return this.composition(root).filter( mono => mono.children.length === 0);
  }

  locate_monosaccharide(location,root=this.root) {
    let [,depth,branch] = location.match(/[a-zA-Z]+|[0-9]+/g);
    depth = parseInt(depth);
    branch = branch.charCodeAt(0) - 'a'.charCodeAt(0);
    let depth_residues = this.paths(root).map( path => path.reverse()[depth - 1] ).filter( residue => residue ).filter(onlyUnique);
    if ( depth_residues.length == 1 && depth_residues[0] === root ){
      return root;
    }
    return depth_residues[branch];
  }

  location_for_monosaccharide(residue) {
    let depth_siblings = [...this.breadth_first_traversal()].filter( res => res.depth === residue.depth );
    let branch_position = depth_siblings.indexOf(residue);
    return 'y'+residue.depth+String.fromCharCode('a'.charCodeAt(0) + branch_position);
  }

  // FIXME to use a well defined traversal alogirthm (DFS or BFS)
  composition(root=this.root) {
    let self = this;
    if ( ! root ) {
      return [];
    }
    let return_value = [ [root] ].concat(root.children.map(child => self.composition(child)));
    return return_value.reduce( (a,b) => a.concat(b) );
  }

  composition_for_tag(tag) {
    return this.composition().filter( has_tag.bind(null,tag) );
  }

  clone(visitor) {
    let cloned = new WeakMap();
    let cloned_repeats = new WeakMap();
    let nodes = this.breadth_first_traversal(this.root,visitor);
    for (let node of nodes) {

      // When we are cloning, we are going to delegate the generation
      // of clones of repeat residues to the Repeat class, so we should
      // only clone the root of the repeat unit

      if ((node instanceof Repeat.Monosaccharide) && node.repeat.root !== node ) {
        continue;
      }

      if ( ! cloned.has(node) ) {
        cloned.set(node,node.clone());
      }

      let node_clone = cloned.get(node);

      // If this is the repeat root (the only time the code should reach this point)
      // we should set the clone residue to be the root of the repeat that
      // we generate when we do the cloning

      if (node_clone instanceof Repeat.Monosaccharide) {
        cloned_repeats.set( node.repeat, node_clone.repeat );
        cloned.set(node, node_clone.repeat.root );
        node_clone = cloned.get(node);
      }

      // If this is a child of a repeat, and this is a child at the end of the repeat
      // we should add them to the end of the new clone repeat

      if ((node.parent instanceof Repeat.Monosaccharide) && node.parent.repeat.children.indexOf(node) >= 0) {
        let repeat = cloned_repeats.get(node.parent.repeat);

        // We add the residue to a placeholder residue
        // so that there's a way to graft this residue and read
        // the linkage

        let res = new Monosaccharide('Root');
        res.addChild(node.parent.linkageOf(node),node_clone);
        repeat.children = repeat.children.concat( node_clone );
        continue;
      }

      // Add this child onto the parent
      if (node.parent && cloned.get(node.parent)) {
        cloned.get(node.parent).addChild(node.parent.linkageOf(node),node_clone);
        cloned.get(node.parent).balance();
      } else {

        // In the case where the parent is a repeat monosaccharide, and the
        // parent hasn't been cloned yet, we should look for the corresponding
        // repeat unit based on counter and the original monosaccharide

        if (node.parent && (node.parent instanceof Repeat.Monosaccharide)) {
          let new_repeat = cloned_repeats.get(node.parent.repeat);
          let res = find_repeat_unit_for_original(new_repeat.root, node.parent.counter, node.parent.original );
          res.addChild(node.parent.linkageOf(node),node_clone);
          res.balance();
        }
      }
    }
    let new_sugar = new this.constructor();
    new_sugar.root = cloned.get(this.root);
    return new_sugar;
  }

  match_sugar_pattern(pattern,comparator) {
    let return_roots = CachingSearcher.search(this,pattern,comparator);
    if (pattern.composition().map( res => res.identifier).filter( id => id === '*').length > 0) {
      return return_roots;
    }
    let return_sugars = flatten(return_roots.map( root => CacheTrace(this,pattern,root,comparator)));
    return return_sugars;
  }

  trace(template,start=this.root,comparator=(a,b) => true||a||b) {
    return Tracer.trace(this,start,template,comparator);
  }

  *breadth_first_traversal(start=this.root,visitor=(x)=>x) {
    if (! start) {
      return;
    }
    let queue = [];
    queue.push(start);
    while (queue.length > 0) {
      let curr = queue.shift();
      queue = queue.concat(curr.children);
      if (visitor) {
        curr = visitor(curr);
      }
      if (curr) {
        yield curr;
      }
    }
  }

  *depth_first_traversal(start=this.root,visitor=(x)=>x) {
    if ( ! start) {
      return;
    }
    let stack = [];
    stack.push(start);
    while (stack.length > 0) {
      let curr = stack.shift();
      let children = curr.children;

      stack = children.concat(stack);

      let visited = visitor ? visitor(curr) : curr;
      if (visited) {
        yield visited;
      }
    }
  }

  *chords(n=2) {
    yield *get_residue_chords(this,n);
  }

  // Math functions
  // FIXME - Union - Create a union sugar from two sugars
  // FIXME - Subtract - Get residues that aren't common

  *residues_to_root(start=this.root) {
    yield start;
    while(start.parent) {
      start = start.parent;
      yield start;
    }
  }

  static CopyIO(sugar) {
    // We want to copy the IO methods from
    // the given object, and apply them
    // to the current class (using an anonymous
    // class to deliver the functionality)
    let base = this;
    let parser_function = getPropertyDescriptor(sugar, 'sequence').set;
    let writer_function = getPropertyDescriptor(sugar, 'sequence').get;
    return class extends base {
      get sequence() {
        return writer_function.call(this);
      }
      set sequence(sequence) {
        parser_function.call(this,sequence);
      }
    };
  }
}
