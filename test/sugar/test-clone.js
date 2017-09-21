/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Cloning a Sugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  assert.ok(sugar.clone().sequence == sugar.sequence,'Clones simple disaccharide');
});
