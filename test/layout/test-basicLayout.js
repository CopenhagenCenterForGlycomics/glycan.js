/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';
import CondensedLayout from '../../js/CondensedLayout';


class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can perform basic layout on sugars', {
});

QUnit.test( 'Render disaccharide' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  CondensedLayout.PerformLayout(sugar);
  assert.ok(true,'noop');
});


QUnit.test( 'Render even branched multisugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)[Gal(b1-3)][Gal(b1-3)][Gal(b1-3)]GlcNAc';
  CondensedLayout.PerformLayout(sugar);
  assert.ok(true,'noop');
});


QUnit.test( 'Render odd branched multisugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)[Gal(b1-3)][Gal(b1-3)][Gal(b1-3)][Gal(b1-3)]GlcNAc';
  CondensedLayout.PerformLayout(sugar);
  assert.ok(true,'noop');
});


QUnit.test( 'Render tall branched sugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'G(b1-3)[H(b1-3)][I(b1-3)][J(b1-3)]E(b1-3)C(b1-3)A(b1-3)[K(b1-3)[L(b1-3)][M(b1-3)][N(b1-3)]F(b1-3)D(b1-3)B(b1-6)]R';
  CondensedLayout.PerformLayout(sugar);
  assert.ok(true,'noop');
});
