/*global QUnit*/

import Sugar from '../../js/Sugar';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Generating single chords works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let frags = [...Fragmentor.fragment(sugar,2)].map( f => f.type ).join('\n');
  console.log(frags.length);
  assert.expect(0);
});
