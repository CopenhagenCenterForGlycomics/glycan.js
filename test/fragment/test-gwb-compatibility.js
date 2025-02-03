/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass, UNDERIVATISED, PERMETHYLATED, NA } from '../../js/Mass';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Mass(Iupac(Sugar)) {}

/**
 * Compare numbers taking in account an error
 *
 * @param  {Float} number
 * @param  {Float} expected
 * @param  {Float} error    Optional
 * @param  {String} message  Optional
 */
QUnit.assert.close = function(number, expected, error=1e-04, message) {
  if (error === void 0 || error === null) {
    error = 0.00001 // default error
  }

  var result = number == expected || (number < expected + error && number > expected - error) || false

  this.pushResult({ result, actual: number.toFixed(4), expected: `${expected.toFixed(4)} +/- ${error}`, message});
}

QUnit.module('Test that we can fragment permethylated sugars', {
});

QUnit.test( 'Fragmentation is idempotent' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';
  sugar.derivatise(PERMETHYLATED);

  let fragment_ref = Fragmentor.getFragment(sugar,'z2a');

  let fragment = Fragmentor.getFragment(sugar,'z2a/z2a');
  assert.close( fragment.mass, fragment_ref.mass, 0, 'Multiple fragments of the same type should give the same result' )

});



QUnit.test( 'Cross ring dual reducing end fragments works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';
  sugar.derivatise(PERMETHYLATED);

  const fragments = [...Fragmentor.fragment(sugar,2)]
  const types = fragments.map( frag => frag.type);

  // The bug here is that dual cross-ring types are not valid types generated

  assert.ok( types.indexOf('1,3-x1a/z2a') >= 0, 'Generates a x/z fragment' );

  assert.close( fragments[types.indexOf('1,3-x1a/z2a')].mass , 549.2787, 2e-04, 'Generator fragment mass is correct');

  let specific_frag = Fragmentor.getFragment(sugar,'1,3-x1a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'1,3-x0a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'0,2-a4a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment mass is correct' );


});