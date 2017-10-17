'use strict';
import Monosaccharide from './Monosaccharide';

let root_symbol = Symbol('root');

let getPropertyDescriptor = function(object,descriptor) {
  let retval = null;
  while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

let onlyUnique = function(value, index, self) {
  return self.indexOf(value) === index;
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

  // FIXME - Matching residues (given a prototype, which residues match)

  // Positional description
  // FIXME - linkage + residue path from given residue to root - optional return residues also
  // FIXME - get path to root

  // FIXME - paths (all paths from leaves to root)
  paths(root=this.root,start=this.leaves(root)) {
    let self = this;
    return [].concat(start).map((leaf) => Array.from(self.residues_to_root(leaf)));
  }

  leaves(root=this.root) {
    return this.composition(root).filter( mono => mono.children.length === 0);
  }

  locate_monosaccharide(location) {
    let [,depth,branch] = location.match(/[a-zA-Z]+|[0-9]+/g);
    depth = parseInt(depth);
    branch = branch.charCodeAt(0) - 'a'.charCodeAt(0);
    let depth_residues = this.paths().map( path => path.reverse()[depth - 1] ).filter( residue => residue ).filter(onlyUnique);
    if ( depth_residues.length == 1 && depth_residues[0] === this.root ){
      return this.root;
    }
    return depth_residues[branch];
/*
    let linkage_paths = this.paths(this.root,depth_residues)
                            .map( path => path.filter( res => res.parent )
                                              .map( res => { return { res: res , link: res.parent.linkageOf(res) }; } )
                                )
                            .filter( linkages => linkages.length > 0 );
    let linkage_strings = linkage_paths.map( linkages => { return { leaf: linkages[0].res, value: linkages.map( link => link.link ).reverse().join('')  }; } );
    let sorted_linkages = linkage_strings.sort( (a,b) => a.value.localeCompare(b.value) );
    return sorted_linkages[branch] ? sorted_linkages[branch].leaf : null;
*/
  }


  // FIXME to use a well defined traversal alogirthm (DFS or BFS)
  composition(root=this.root) {
    let self = this;
    let return_value = [ [root] ].concat(root.children.map(child => self.composition(child)));
    return return_value.reduce( (a,b) => a.concat(b) );
  }

  clone() {
    let cloned = new WeakMap();
    let nodes = this.breadth_first_traversal();
    for (let node of nodes) {
      if ( ! cloned.has(node) ) {
        cloned.set(node,node.clone());
      }
      let node_clone = cloned.get(node);
      if (node.parent) {
        cloned.get(node.parent).addChild(node.parent.linkageOf(node),node_clone);
      }
    }
    let new_sugar = new this.constructor();
    new_sugar.root = cloned.get(this.root);
    return new_sugar;
  }

  *breadth_first_traversal(start=this.root) {
    let queue = [];
    queue.push(start);
    while (queue.length > 0) {
      let curr = queue.shift();
      queue = queue.concat(curr.children);
      yield curr;
    }
  }

  // Math functions
  // FIXME - Compare by block - run the closure across the sugar,
  //      given a traversal algorithm
  // FIXME - Union - Create a union sugar from two sugars
  // FIXME - Subtract - Get residues that aren't common
  // FIXME - Intersect - Find the residues that match with given sugar

  // Search methods
  // FIXME - Find residue by linkage path
  // FIXME - Find residue by linkage and residue identifier pair path
  //      Specify the start residues to start looking from.
  //      Allow wildcards for the residue identifier

  // Traversal methods
  // FIXME - Depth first traversal
  // FIXME - Node to root traversal
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
        return parser_function.call(this,sequence);
      }
    };
  }
}
