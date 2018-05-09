/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Depth first search traversal works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'C(a1-2)[D(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D'],'Simple dfs works');
});


QUnit.test( 'Depth first search traversal works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[G(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G'],'More complex dfs works');
});
