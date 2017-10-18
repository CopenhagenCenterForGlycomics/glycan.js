/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can graft residues', {
});

QUnit.test( 'Finding basic monosaccharides' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)[B(a1-3)][C(a1-4)]R';

  var sugar_donor = new IupacSugar();
  sugar_donor.sequence = 'D(a1-2)R';

  assert.ok(sugar.locate_monosaccharide('y2a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2a').children.length === 0,'Has no children before graft');
  sugar.locate_monosaccharide('y2a').graft(sugar_donor.locate_monosaccharide('y2a'));
  assert.ok(sugar.locate_monosaccharide('y2a').children.length === 1,'Has extra child');
  assert.ok(sugar.sequence == 'D(a1-2)A(a1-2)[B(a1-3)][C(a1-4)]R');
});
