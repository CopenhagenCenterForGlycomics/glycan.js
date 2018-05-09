/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}


let get_first_sibling = (node) => {
  let curr = node;
  while (curr.parent) {
    let curr_siblings = curr.parent.children;
    let next_sibling = curr_siblings[ curr_siblings.indexOf(curr) + 1 ];
    if (next_sibling) {
      return next_sibling;
    } else {
      curr = curr.parent;
    }
  }
  return null;
};

let get_residue_pairs = (sugar) => {
  let node_order = [...sugar.depth_first_traversal()];
  console.log('Node order',node_order.map( res => res.identifier ));
  let curridx = 0;
  while (curridx < node_order.length) {
    let curr = node_order[curridx];
    let next_sibling = get_first_sibling(curr);
    if ( ! next_sibling ) {
      console.log('No next sibling for',curr.identifier);
      next_sibling = curr;
    } else {
      console.log('Next sibling for',curr.identifier,'is',next_sibling.identifier);
    }
    let endidx = node_order.indexOf(next_sibling);
    let reducing_end_pairs = node_order.slice(curridx+1,endidx);
    let nonreducing_pairs = node_order.slice(endidx === curridx ? (endidx + 1) : endidx);
    if (endidx === curridx) {
      console.log('Pair',curr.identifier,'with',nonreducing_pairs.map( res => res.identifier ),'(reducing)');
    } else {
      console.log('Pair',curr.identifier,'with',reducing_end_pairs.map( res => res.identifier ),'(reducing)');
      console.log('Pair',curr.identifier,'with',nonreducing_pairs.map( res => res.identifier ));      
    }
    curridx += 1;
  }
};

/*

Reduing end pairs:
AB
AC
AD
AE
AF
AG
BC
BD
BE
BF
BG
CD
CE
CF
DE


Non-reducing pairs
CG
DF
DG
EF
EG
FG

*/

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Depth first search traversal works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[G(a1-3)]B(a1-2)A';
  get_residue_pairs(sugar);
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G'],'More complex dfs works');
});
