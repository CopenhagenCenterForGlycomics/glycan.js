'use strict';

import debug from './Debug';
import MixedTupleMap from '../lib/MixedTupleMap';

const module_string='glycanjs:searching';

const log = debug(module_string);

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

let match_fixed_paths = function(sugar,pattern,comparator) {
  let paths = sugar.paths();
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
  return wanted_roots;
};

let map_leaf_originals = function(trees,wildcard_symbol) {
  let result = new WeakMap();
  for (let tree of trees) {
    for (let leaf of tree.leaves()) {
      if (leaf.getTag(wildcard_symbol)) {
        log.info('Wildcard position is',leaf.original.identifier);
        result.set(leaf.original,tree);
        if (leaf.parent) {
          result.set(leaf.parent.original,tree);
        }
      }
    }
  }
  return result;
};

let match_wildcard_paths = function(sugar,pattern,comparator) {
  const wildcard_symbol = Symbol('wildcard');

  log.info('Wildcard matching',sugar.sequence,pattern.sequence);
  let wildcard_residues = pattern.composition().filter( res => res.identifier === '*' );

  let wildcard_subtrees = wildcard_residues.map( wildcard => wildcard.children.map( kid => {
    let new_sugar = kid.toSugar(pattern.constructor);
    new_sugar.linkage = wildcard.linkageOf(kid);
    new_sugar.parent_link = wildcard.parent ? wildcard.parent.linkageOf(wildcard) : 0;
    return new_sugar;
  }));

  let root_sugar = pattern.clone();

  root_sugar.composition().filter( res => res.identifier === '*').forEach( wildcard => {
    wildcard.children.map( kid => wildcard.removeChild(wildcard.linkageOf(kid),kid));
    wildcard.setTag(wildcard_symbol,true);
  });

  wildcard_subtrees.forEach( subtree_set => subtree_set.forEach( subtree => {
    let mono_class = subtree.constructor.Monosaccharide;
    let new_root = new mono_class('*');
    new_root.addChild(subtree.linkage,subtree.root);
    subtree.root = new_root;
    log.info('Subtree search',subtree.sequence);
  }));
  log.info('Wildcard matching root',sugar.sequence,root_sugar.sequence);
  let root_result = match_fixed_paths(sugar,root_sugar, comparator);

  // Get a set of subtrees for the matches
  // for the matched root
  let root_trees = flatten(root_result.map( root => {
    return sugar.trace(root_sugar, root, comparator);
  }));
  log.info('Sequences of root sequence matched',root_trees.map( rt => rt.sequence ));
  root_trees.forEach( rt => {
    let wildcard = rt.composition_for_tag(wildcard_symbol)[0];
    log.info('Wildcard for root tree is',wildcard,'with parent',wildcard.parent ? wildcard.parent.identifier : '(No root)');
  });
  // Grab the original leaves for the root match subtrees
  let root_trees_by_leaf_original = map_leaf_originals(root_trees,wildcard_symbol);
  let result = wildcard_subtrees.map( subtree_set => {
    return subtree_set.map( subtree => {
      let roots = match_fixed_paths(sugar,subtree, comparator);
      log.info('Subtree match roots',subtree.linkage,subtree.sequence,roots.map( r => r.identifier ));
      roots = roots.filter(root => ((! root.parent) || subtree.parent_link == 0 || (root.parent.linkageOf(root) == subtree.parent_link)) )
                   .map( root => {
                      let parents = [...sugar.residues_to_root(root)];
                      for (let parent of parents) {
                        if (root_trees_by_leaf_original.get(parent)) {
                          return { root: root, parent_leaf: parent };
                        }
                      }
                   })
                   .filter( r => r );
      log.info('Subtrees that are a parent of a root match',roots);
      let result_trees = roots.map( root_pair => {
        let subtree_results = sugar.trace(subtree, root_pair.root, comparator );
        let traced_parent = root_trees_by_leaf_original.get(root_pair.parent_leaf);
        let wildcard_res = root_sugar.composition_for_tag(wildcard_symbol)[0];
        let grafted_results = [];
        for (let traced_subtree of subtree_results) {
          let result_tree = traced_parent.clone();
          let graft_residue = result_tree.composition_for_tag(wildcard_symbol)[0];
          let mono_class = result_tree.constructor.Monosaccharide;
          let new_wildcard = new mono_class(wildcard_res);
          traced_subtree.root.original = new_wildcard;
          if (graft_residue === result_tree.root) {
            result_tree.root = traced_subtree.root;
          } else {
            graft_residue.parent.replaceChild(graft_residue,traced_subtree.root,0);
          }
          grafted_results.push(result_tree);
        }
        return grafted_results;
      });
      return flatten(result_trees);
    });
  });
  return flatten(flatten(result));
};

class Searcher {
  static search(source,pattern,comparator) {
    if (pattern.composition().filter( res => res.identifier === '*' ).length > 0) {
      return this.search_wildcard_paths(source,pattern,comparator);
    }
    return this.search_fixed_paths(source,pattern,comparator);
  }
  static search_wildcard_paths(source,pattern,comparator) {
    return match_wildcard_paths(source,pattern,comparator);
  }
  static search_fixed_paths(source,pattern,comparator) {
    return match_fixed_paths(source,pattern,comparator);
  }

}

const cache_symbol = Symbol('cache_symbol');

const WILDCARD = { type: 'wildcard'};
const FIXED = { type: 'fixed'};

class CachingSearcher extends Searcher {

  static get Cache() {
    if ( ! this[cache_symbol] ) {
      this[cache_symbol] = new MixedTupleMap();
    }
    return this[cache_symbol];
  }

  static search_wildcard_paths(source,pattern,comparator) {
    if (! Object.isFrozen(source) || ! Object.isFrozen(pattern) ) {
      return super.search_wildcard_paths(source,pattern,comparator);
    }
    const tuple = [ source, pattern, comparator, WILDCARD ];

    if (this.Cache.has(tuple)) {
      return this.Cache.get(tuple);
    }
    this.Cache.set(tuple, super.search_wildcard_paths(source,pattern,comparator));
    return this.Cache.get( tuple );
  }
  static search_fixed_paths(source,pattern,comparator) {
    if (! Object.isFrozen(source) || ! Object.isFrozen(pattern) ) {
      return super.search_fixed_paths(source,pattern,comparator);
    }
    const tuple = [ source, pattern, comparator, FIXED ];
    if (this.Cache.has(tuple)) {
      return this.Cache.get(tuple);
    }
    this.Cache.set(tuple,  super.search_fixed_paths(source,pattern,comparator));
    return this.Cache.get( tuple );
  }
}

export { CachingSearcher, Searcher };