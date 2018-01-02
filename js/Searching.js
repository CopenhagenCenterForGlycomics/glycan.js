'use strict';

import * as debug from 'debug-any-level';

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

let match_wildcard_paths = function(sugar,pattern,comparator) {
  log.info('Wildcard matching',sugar.sequence,pattern.sequence);
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
  log.info('Wildcard matching root',sugar.sequence,root_sugar.sequence);
  let root_result = match_fixed_paths(sugar,root_sugar, comparator);
  let result = wildcard_subtrees.map( subtree_set => {
    return subtree_set.map( subtree => {
      let roots = match_fixed_paths(sugar,subtree, comparator);
      roots = roots.filter(root => ((! root.parent) || (root.parent.linkageOf(root) == subtree.linkage)) )
                   .map( root => {
                      let parents = [...sugar.residues_to_root(root)];
                      // In root_result we have an array of all the
                      // roots of a search that match the first part of the search
                      // We want to find the closest parent of this search
                      // result that matches with a root of the first part of the search
                      for (let parent of parents) {
                        if (root_result.indexOf(parent) >= 0) {
                          return { root: root, parent_root: parent };
                        }
                      }
                   })
                   .filter( r => r );
      let result_trees = roots.map( root_pair => {
        console.log(root_pair.root.identifier, root_pair.parent_root.identifier);
        let subtree_results = sugar.trace(subtree, root_pair.root, comparator );
        let parent_tree_results = sugar.trace( root_sugar, root_pair.parent_root, comparator );
        for (let traced_subtree of subtree_results) {
          for (let traced_parent of parent_tree_results) {
            console.log(traced_subtree.sequence, traced_parent.sequence);
          }
        }
        // Graft the subtree onto the parent_tree_result
      });
      console.log(result_trees.length);
      // which gets merged with sugar.trace( root_sugar, root.parent_root, comparator);
      // roots = roots.map( root => sugar.trace( subtree, root, comparator ));
      return [];
      // return flatten(roots);
    });
  });
  return flatten(flatten(result));
};

class Searcher {
  static search(source,pattern,comparator) {
    if (pattern.composition().filter( res => res.identifier === '*' ).length > 0) {
      return Searcher.search_wildcard_paths(source,pattern,comparator);
    }
    return Searcher.search_fixed_paths(source,pattern,comparator);
  }
  static search_wildcard_paths(source,pattern,comparator) {
    return match_wildcard_paths(source,pattern,comparator);
  }
  static search_fixed_paths(source,pattern,comparator) {
    return match_fixed_paths(source,pattern,comparator);
  }

}

export default Searcher;
