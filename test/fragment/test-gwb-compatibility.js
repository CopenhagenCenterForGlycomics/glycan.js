/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass, UNDERIVATISED, PERMETHYLATED, REDUCING_END_2AB, REDUCING_END_REDUCED, NA } from '../../js/Mass';

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

  assert.close( fragments[types.indexOf('1,3-x1a/z2a')].mass , 549.2787, 2e-04, 'Generator fragment 1,3-x1a/z2a mass is correct');

  let specific_frag = Fragmentor.getFragment(sugar,'1,3-x1a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment 1,3-x1a/z2a mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'1,3-x0a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment 1,3-x0a/z2a mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'0,2-a4a/z2a');
  assert.close( specific_frag.mass , 549.2787, 2e-04, 'Fragment 0,2-a4a/z2a mass is correct' );


});


const test_fragment = (assert,sugar,fragment,mass) => {
  let specific_frag = Fragmentor.getFragment(sugar,fragment);
  assert.close( specific_frag.mass , mass, 1e-04, `Fragment ${fragment} mass is correct` );
}

QUnit.test( 'GWB_output_2ab 2AB fragments work' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-4)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;

  test_fragment(assert,sugar,'b2b',162.0528);
  test_fragment(assert,sugar,'c2b',180.0634);
  test_fragment(assert,sugar,'b1a',291.0954);
  test_fragment(assert,sugar,'z1a',323.1481);
  test_fragment(assert,sugar,'y1a',341.1587);
  test_fragment(assert,sugar,'b3b',365.1322);
  test_fragment(assert,sugar,'c3b',383.1428);
  test_fragment(assert,sugar,'b2a',453.1482);
  test_fragment(assert,sugar,'c2a',471.1588);
  test_fragment(assert,sugar,'z2a',526.2275);
  test_fragment(assert,sugar,'c4b',545.1956);
  test_fragment(assert,sugar,'b3a',656.2276);
  test_fragment(assert,sugar,'c3a',674.2382);
  test_fragment(assert,sugar,'b4a',818.2804);
  test_fragment(assert,sugar,'c4a',836.2910);
  test_fragment(assert,sugar,'z3a',1215.4653);
  test_fragment(assert,sugar,'y3a',1233.4759);
  test_fragment(assert,sugar,'z4a',1377.5181);
  test_fragment(assert,sugar,'y4a',1395.5287);
  test_fragment(assert,sugar,'z3b',1506.5607);
  test_fragment(assert,sugar,'b5a',1507.5182);
  test_fragment(assert,sugar,'y3b',1524.5713);
  test_fragment(assert,sugar,'c5a',1525.5288);
  test_fragment(assert,sugar,'z5a',1580.5975);
  test_fragment(assert,sugar,'y5a',1598.6081);
  test_fragment(assert,sugar,'z4b',1668.6135);
  test_fragment(assert,sugar,'y4b',1686.6241);
  test_fragment(assert,sugar,'c6a',1728.6082);
  test_fragment(assert,sugar,'z6a',1742.6503);
  test_fragment(assert,sugar,'y6a',1760.6609);
  test_fragment(assert,sugar,'z5b',1871.6929);
  test_fragment(assert,sugar,'y5b',1889.7035);

  assert.close(sugar.mass,2051.7563,1e-04,'Full sugar mass is correct');


});


QUnit.test( 'GWB_output_reduced REDUCED fragments work' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-4)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_REDUCED;

  test_fragment(assert,sugar,'b2b',162.0528);
  test_fragment(assert,sugar,'c2b',180.0634);
  test_fragment(assert,sugar,'z1a',205.0950);
  test_fragment(assert,sugar,'y1a',223.1056);
  test_fragment(assert,sugar,'b1a',291.0954);
  test_fragment(assert,sugar,'c1a',309.1060);
  test_fragment(assert,sugar,'b3b',365.1322);
  test_fragment(assert,sugar,'c3b',383.1428);
  test_fragment(assert,sugar,'z2a',408.1744);
  test_fragment(assert,sugar,'y2a',426.1850);
  test_fragment(assert,sugar,'b2a',453.1482);
  test_fragment(assert,sugar,'c2a',471.1588);
  test_fragment(assert,sugar,'b4b',527.1850);
  test_fragment(assert,sugar,'c4b',545.1956);
  test_fragment(assert,sugar,'b3a',656.2276);
  test_fragment(assert,sugar,'c3a',674.2382);
  test_fragment(assert,sugar,'b4a',818.2804);
  test_fragment(assert,sugar,'c4a',836.2910);
  test_fragment(assert,sugar,'z3a',1097.4122);
  test_fragment(assert,sugar,'y3a',1115.4228);
  test_fragment(assert,sugar,'y4a',1277.4756);
  test_fragment(assert,sugar,'z3b',1388.5076);
  test_fragment(assert,sugar,'y3b',1406.5182);
  test_fragment(assert,sugar,'z5a',1462.5444);
  test_fragment(assert,sugar,'y5a',1480.5550);
  test_fragment(assert,sugar,'b5a',1507.5182);
  test_fragment(assert,sugar,'c5a',1525.5288);

  test_fragment(assert,sugar,'z4b',1550.5604);
  test_fragment(assert,sugar,'y4b',1568.5710);
  test_fragment(assert,sugar,'z6a',1624.5972);
  test_fragment(assert,sugar,'y6a',1642.6078);

  test_fragment(assert,sugar,'b6a',1710.5976);
  test_fragment(assert,sugar,'c6a',1728.6082);
  test_fragment(assert,sugar,'z5b',1753.6398);
  test_fragment(assert,sugar,'y5b',1771.6504);

  assert.close(sugar.mass,1933.7032,1e-04,'Full sugar mass is correct');

});