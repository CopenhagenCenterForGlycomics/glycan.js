/*global QUnit*/

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can read Sugars with repeating units', {
});

QUnit.test( 'Cloning a simple repeat' , function( assert ) {
  const sequence = '{Gal(b1-3)GlcNAc(b1-3)}jGal(b1-3)GlcNAc(b1-2)[Man(a1-6)]Man(a1-3)Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let cloned = sugar.clone();
  assert.equal(cloned.composition().length, sugar.composition().length,'Has the same number of residues');
  assert.equal(cloned.sequence,sugar.sequence,'Cloned sugar has the same sequence');
});


QUnit.test( 'Cloning a repeat with a child' , function( assert ) {
  const sequence = 'Fuc(a1-2){Gal(b1-3)GlcNAc(b1-3)}jGal(b1-3)GlcNAc(b1-2)[Man(a1-6)]Man(a1-3)Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let cloned = sugar.clone();
  assert.equal(cloned.composition().length, sugar.composition().length,'Has the same number of residues');
  assert.equal(cloned.sequence,sugar.sequence,'Cloned sugar has the same sequence');
});

QUnit.test( 'Repeat root is set up correctly' , function( assert ) {
  const sequence = 'Fuc(a1-2){Gal(b1-3)GlcNAc(b1-3)}jGal(b1-3)GlcNAc(b1-2)[Man(a1-6)]Man(a1-3)Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let cloned = sugar.clone();
  assert.equal( cloned.repeats[0].root.parent.linkageOf(cloned.repeats[0].root), sugar.repeats[0].root.parent.linkageOf(sugar.repeats[0].root) );
});