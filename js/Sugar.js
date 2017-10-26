'use strict';
import Monosaccharide from './Monosaccharide';

import TracingWrapper from './SugarSearchResult';

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

let global_match_subpath = function(path_pattern,comparator,path) {
  let test_residue = null;
  let loop_pattern = [].concat(path_pattern);
  let loop_path = [].concat(path);
  while((test_residue = loop_pattern.shift())) {
    let pattern_residues_remaining = loop_pattern.length > 0;
    loop_path = loop_path.filter( comparator.bind(null,test_residue) );
    if (pattern_residues_remaining) {
      loop_path = loop_path.map( matched => matched.parent );
    }
    loop_path = loop_path.filter( residue => (residue !== null && typeof residue !== 'undefined') );
  }
  // We get back the elements of the paths where we match the pattern
  return loop_path.map(start => path.indexOf(start) )
                       .map(start_idx => path.slice( start_idx - path_pattern.length + 1, start_idx + 1 ));
};

let search_with_wildcards = function(sugar,pattern,comparator) {
  let wildcard_residues = pattern.composition().filter( res => res.identifier === '*' );

  let wildcard_subtrees = wildcard_residues.map( wildcard => wildcard.children.map( kid => {
    let new_sugar = kid.toSugar(pattern.constructor);
    new_sugar.linkage = wildcard.linkageOf(kid);
    return new_sugar;
  }));

  let root_sugar = pattern.clone();

  root_sugar.composition().filter( res => res.identifier === '*').forEach( wildcard => {
    wildcard.children.map( kid => wildcard.removeChild(wildcard.linkageOf(kid),kid));
  });

  wildcard_subtrees.forEach( subtree_set => subtree_set.forEach( subtree => {
    let mono_class = subtree.constructor.Monosaccharide;
    let new_root = new mono_class('*');
    new_root.addChild(subtree.linkage,subtree.root);
    subtree.root = new_root;
  }));

  let root_result = sugar.match_sugar_pattern(root_sugar, comparator, true);
  let result = wildcard_subtrees.map( subtree_set => {
    return subtree_set.map( subtree => {
      let roots = sugar.match_sugar_pattern( subtree, comparator, true );
      roots = roots.filter(root => root.parent.linkageOf(root) == subtree.linkage )
                   .filter( root => {
                      let parents = [...sugar.residues_to_root(root)];
                      return root_result.reduce((result,val) => result || parents.indexOf(val),false);
                   });
      return roots;
    });
  });
  return flatten(flatten(result));
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

  locate_monosaccharide(location,root=this.root) {
    let [,depth,branch] = location.match(/[a-zA-Z]+|[0-9]+/g);
    depth = parseInt(depth);
    branch = branch.charCodeAt(0) - 'a'.charCodeAt(0);
    let depth_residues = this.paths(root).map( path => path.reverse()[depth - 1] ).filter( residue => residue ).filter(onlyUnique);
    if ( depth_residues.length == 1 && depth_residues[0] === root ){
      return root;
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

  clone(visitor) {
    let cloned = new WeakMap();
    let nodes = this.breadth_first_traversal(this.root,visitor);
    for (let node of nodes) {
      if ( ! cloned.has(node) ) {
        cloned.set(node,node.clone());
      }
      let node_clone = cloned.get(node);
      if (node.parent && cloned.get(node.parent)) {
        cloned.get(node.parent).addChild(node.parent.linkageOf(node),node_clone);
      }
    }
    let new_sugar = new this.constructor();
    new_sugar.root = cloned.get(this.root);
    return new_sugar;
  }

  match_sugar_pattern(pattern,comparator,fixed) {
    if (! fixed && pattern.composition().filter( res => res.identifier === '*' ).length > 0) {
      return search_with_wildcards(this,pattern,comparator);
    }
    let paths = this.paths();
    let search_paths = pattern.paths();
    let potential_roots = [];
    let search_path_match_count = new WeakMap();
    let match_roots = match => match.map( residues => residues[residues.length - 1] );

    search_paths.forEach( search_path => {
      let matcher = global_match_subpath.bind(null,search_path,comparator);
      let subpaths = paths.map( matcher );
      potential_roots = potential_roots.concat(
                          flatten( subpaths.map( match_roots ) )
                        ).filter(onlyUnique);
      let matched_residues = flatten(flatten(subpaths)).filter(onlyUnique);
      matched_residues.forEach( res => {
        search_path_match_count.set(res, (search_path_match_count.get(res) || 0)+ 1 );
      });
    });
    let wanted_roots = potential_roots.filter( res => search_path_match_count.get(res) == pattern.leaves().length );
    let SearchResultSugar = TracingWrapper(this.constructor);
    console.log('New SearchResult',wanted_roots[0],pattern);
    let return_sugars = wanted_roots.map( root => new SearchResultSugar(this,root,pattern,comparator));
    return return_sugars.map( sug => sug.root.original );
  }

  *breadth_first_traversal(start=this.root,visitor=(x)=>x) {
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

  // Math functions
  // FIXME - Compare by block - run the closure across the sugar,
  //      given a traversal algorithm
  // FIXME - Union - Create a union sugar from two sugars
  // FIXME - Subtract - Get residues that aren't common

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
