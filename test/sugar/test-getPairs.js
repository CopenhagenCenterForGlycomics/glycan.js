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

// class foobar {
//   constructor() {

//   }
//   *generator() {

//   }
// };

let get_residue_pairs = function*(sugar) {
  let node_order = [...sugar.depth_first_traversal()];
  let curridx = 0;
  while (curridx < node_order.length) {
    let curr = node_order[curridx];
    let next_sibling = get_first_sibling(curr);
    if ( ! next_sibling ) {
      next_sibling = curr;
    }
    let endidx = node_order.indexOf(next_sibling);
    let reducing_end_pairs = node_order.slice(curridx+1,endidx);
    let nonreducing_pairs = node_order.slice(endidx === curridx ? (endidx + 1) : endidx);
    if (endidx === curridx) {
      for (let res of nonreducing_pairs) {
        yield { root: curr, chord: [ curr, res ] };
      }
     // console.log('Pair',curr.identifier,'with',nonreducing_pairs.map( res => res.identifier ),'(reducing)');
    } else {
      for (let res of nonreducing_pairs) {
        yield { root: sugar.root, chord: [ curr, res ] };
      }
      for (let res of reducing_end_pairs) {
        yield { root: curr, chord: [ curr, res ] };
      }

      // console.log('Pair',curr.identifier,'with',reducing_end_pairs.map( res => res.identifier ),'(reducing)');
      // console.log('Pair',curr.identifier,'with',nonreducing_pairs.map( res => res.identifier ));      
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

const RE_PAIRS = `AB
AC
AD
AE
AF
AG
AH
AI
AJ
BC
BD
BE
BF
BG
BH
BI
BJ
CD
CE
CF
DE
GH
GI
GJ
IJ`;

const NONRE_PAIRS = `CG
CH
CI
CJ
DF
DG
DH
DI
DJ
EF
EG
EH
EI
EJ
FG
FH
FI
FJ
HI
HJ`;

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Depth first search traversal works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G','H','I','J'],'More complex dfs works');

  let pairs = [...get_residue_pairs(sugar)];
  let reducing_end_pairs = pairs.filter( chord => chord.root !== sugar.root || chord.chord[0] === sugar.root ).map( chord => chord.chord[0].identifier+''+chord.chord[1].identifier );
  let nonreducing_end_pairs = pairs.filter( chord => chord.root === sugar.root && chord.chord[0] !== sugar.root ).map( chord => chord.chord[0].identifier+''+chord.chord[1].identifier );
  assert.deepEqual(reducing_end_pairs,RE_PAIRS.split('\n'));
  assert.deepEqual(nonreducing_end_pairs,NONRE_PAIRS.split('\n'));
});
