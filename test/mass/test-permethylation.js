/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, UNDERIVATISED, PERMETHYLATED } from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';


const mass_diff = (a,b,tolerance=1e-04) => {
	return Math.abs(a-b) <= tolerance
};

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that we can calculate permethylated masses', {
});

QUnit.test( 'Calculate permethylated mass for short sugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal';
  assert.ok(mass_diff(sugar.mass,180.063382),'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.ok(mass_diff(sugar.mass,250.1417),'Permethylation derivatisation calculated correctly');
});
