/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, UNDERIVATISED, PERMETHYLATED } from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';


const mass_diff = (a,b,tolerance=1e-04) => {
	return Math.abs(a-b) <= tolerance
};

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


QUnit.module('Test that we can calculate permethylated masses', {
});

QUnit.test( 'Calculate permethylated mass for short sugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal';
  assert.close(sugar.mass,180.063382,1e-04,'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.close(sugar.mass,250.1417,1e-04,'Permethylation derivatisation calculated correctly');
});


QUnit.test( 'Calculate permethylated mass for disaccharide' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-4)GlcNAc';
  assert.close(sugar.mass,383.1427546,1e-04,'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.close(sugar.mass,495.268,1e-04,'Permethylation derivatisation calculated correctly');
});


QUnit.test( 'Calculate permethylated mass for trisaccharide' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  assert.close(sugar.mass,674.2381546,1e-04,'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.close(sugar.mass,856.4417,1e-04,'Permethylation derivatisation calculated correctly');
});