/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can make a sugar immutable', {
});

QUnit.test( 'Freezing a sugar' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  sugar.freeze();
  assert.ok( Object.isFrozen(sugar) );

  for (let res of sugar.breadth_first_traversal()) {
    assert.ok( Object.isFrozen(res), 'Residue is frozen' );
  }

});

QUnit.test( 'Freezing a sugar prevents sequence modification' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  sugar.freeze();
  assert.throws(() => sugar.sequence = 'Gal(b1-4)GlcNAc', TypeError, 'Throws a type error when modifying a frozen sugar');
  assert.ok(sugar.sequence == 'Gal(b1-3)GlcNAc','Sequence doesnt get accidentally modified');
});

QUnit.test( 'Freezing a sugar prevents removal of residues' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  sugar.freeze();
  assert.throws(() => sugar.root.removeChild(3,sugar.root.childAt(3)), TypeError, 'Throws a type error when removing a monosaccharide from a frozen sugar');
  assert.ok(sugar.sequence == 'Gal(b1-3)GlcNAc','Sequence doesnt get accidentally modified');
});

QUnit.test( 'Freezing a sugar prevents addition of residues' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  sugar.freeze();
  var bar = new IupacSugar.Monosaccharide('Glc');
  assert.throws(() => sugar.root.addChild(3,bar), TypeError, 'Throws a type error when adding a monosaccharide to a frozen sugar');
  assert.ok(sugar.sequence == 'Gal(b1-3)GlcNAc','Sequence doesnt get accidentally modified');
});


QUnit.test( 'Freezing a sugar prevents balancing of residues' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)Gal(b1-3)Gal(b1-?)GlcNAc';
  let bar = new IupacSugar.Monosaccharide('Fuc');
  bar.anomer = 'b';
  bar.parent_linkage = 1;
  let baz = new IupacSugar.Monosaccharide('Fuc');
  baz.anomer = 'b';
  baz.parent_linkage = 1;
  bar.addChild(3,baz);
  sugar.root.addChild(0,bar);
  sugar.freeze();
  assert.throws(() => sugar.root.balance(), TypeError, 'Throws a type error when adding a monosaccharide to a frozen sugar');
  assert.ok(sugar.sequence == 'Gal(b1-3)Gal(b1-3)Gal(b1-?)[Fuc(b1-3)Fuc(b1-?)]GlcNAc','Sequence doesnt get accidentally modified');
});
