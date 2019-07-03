/*global QUnit*/

import Sugar from '../../js/Sugar';

import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can expand repeat units in sugars', {
});

QUnit.test( 'Expand a simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,1);
  repeat.mode = Repeat.MODE_MINIMAL;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

  repeat.mode = Repeat.MODE_EXPAND;

  assert.equal(sugar.sequence,'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can switch to expanded mode');

  repeat.max = 10;

  assert.equal(sugar.sequence,'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can lengthen expansion');

});


QUnit.test( 'Expand a simple repeat with an extension' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,2);
  repeat.mode = Repeat.MODE_MINIMAL;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

  let res = new sugar.constructor.Monosaccharide('Gal');
  res.anomer = 'b';
  res.parent_linkage = 1;
  sugar.leaves()[0].addChild(3,res);

  assert.equal(sugar.sequence,'Gal(b1-3){Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

  repeat.mode = Repeat.MODE_EXPAND;

  assert.equal(sugar.sequence,'Gal(b1-3)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can switch to expanded mode');

  repeat.max = 10;

  assert.equal(sugar.sequence,'Gal(b1-3)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can lengthen expansion');

});

QUnit.test( 'Expand a simple repeat with an extension and cloning' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,2);
  repeat.mode = Repeat.MODE_MINIMAL;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

  let res = new sugar.constructor.Monosaccharide('Gal');
  res.anomer = 'b';
  res.parent_linkage = 1;
  sugar.leaves()[0].addChild(3,res);

  assert.equal(sugar.sequence,'Gal(b1-3){Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

  repeat.mode = Repeat.MODE_EXPAND;

  assert.equal(sugar.sequence,'Gal(b1-3)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can switch to expanded mode');

  repeat.max = 10;

  let cloned = sugar.clone();

  assert.equal(cloned.sequence,'Gal(b1-3)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Can lengthen expansion');

});
