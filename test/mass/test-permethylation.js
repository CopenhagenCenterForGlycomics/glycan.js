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


QUnit.test( 'Calculate permethylated mass for disaccharide' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-4)GlcNAc';
  assert.ok(mass_diff(sugar.mass,383.1427546),'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.ok(mass_diff(sugar.mass,495.268),'Permethylation derivatisation calculated correctly');
});


QUnit.test( 'Calculate permethylated mass for trisaccharide' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-3)Gal(b1-4)GlcNAc';
  assert.ok(mass_diff(sugar.mass,674.2381546),'Underivatised mass is correct');
  sugar.derivatise(PERMETHYLATED);
  assert.ok(mass_diff(sugar.mass,856.4417),'Permethylation derivatisation calculated correctly');
});