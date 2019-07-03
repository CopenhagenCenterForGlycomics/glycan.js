/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}


QUnit.module('Test that we can create repeats on existing sugars', {
});

QUnit.test( 'Test creating a repeat on a sugar' , function( assert ) {
  let sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = Repeat.addToSugar(sugar,'y2a','y3a',Repeat.MODE_MINIMAL,1,4);
  repeat.identifier = 'j';
  assert.equal(sugar.sequence, '{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}jGlcNAc');
});

QUnit.test( 'Test creating a repeat on a sugar with an extra child' , function( assert ) {
  let sequence = 'Fuc(a1-6)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = Repeat.addToSugar(sugar,'y2a','y3a',Repeat.MODE_MINIMAL,1,4);
  repeat.identifier = 'j';
  assert.equal(sugar.sequence, 'Fuc(a1-6){Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}jGlcNAc');
});


QUnit.test( 'Test creating a repeat on a sugar off the major branch' , function( assert ) {
  let sequence = 'GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]GlcNAc(b1-4)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = Repeat.addToSugar(sugar,'y5a','y6a',Repeat.MODE_MINIMAL,1,4);
  repeat.identifier = 'j';
  let new_res = new IupacSugar.Monosaccharide('Fuc');
  new_res.parent_linkage = 1;
  new_res.anomer = 'a';
  sugar.leaves()[0].original.addChild(4,new_res);
  assert.equal(sugar.sequence, '{Fuc(a1-4)GlcNAc(b1-3)Gal(b1-3)@y3a}jGlcNAc(b1-2)Man(a1-3)[Man(a1-6)]GlcNAc(b1-4)GlcNAc');
});

QUnit.test( 'Test creating a repeat on a sugar off the major branch with a child' , function( assert ) {
  let sequence = 'GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]GlcNAc(b1-4)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = Repeat.addToSugar(sugar,'y5a','y6a',Repeat.MODE_MINIMAL,1,4);
  repeat.identifier = 'j';
  let new_res = new IupacSugar.Monosaccharide('Fuc');
  new_res.parent_linkage = 1;
  new_res.anomer = 'a';
  sugar.leaves()[0].original.addChild(4,new_res);
  assert.equal(sugar.sequence, '{Fuc(a1-4)GlcNAc(b1-3)Gal(b1-3)@y3a}jGlcNAc(b1-2)Man(a1-3)[Man(a1-6)]GlcNAc(b1-4)GlcNAc');

  new_res = new IupacSugar.Monosaccharide('Glc');
  new_res.parent_linkage = 1;
  new_res.anomer = 'b';
  let target = sugar.leaves()[0].parent;
  assert.equal(target.identifier,'GlcNAc');
  target.addChild(3,new_res);
  assert.equal(sugar.sequence, 'Glc(b1-3){Fuc(a1-4)GlcNAc(b1-3)Gal(b1-3)@y3a}jGlcNAc(b1-2)Man(a1-3)[Man(a1-6)]GlcNAc(b1-4)GlcNAc');
});

QUnit.test( 'Test creating a repeat on a sugar with many children' , function( assert ) {
  let sequence = 'NeuAc(a2-3)[Fuc(a1-6)]Gal(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = Repeat.addToSugar(sugar,'y2a','y3a',Repeat.MODE_MINIMAL,1,4);
  repeat.identifier = 'j';
  assert.equal(sugar.sequence, 'NeuAc(a2-3)[Fuc(a1-6)]{Gal(b1-4)[Fuc(a1-8)]Man(b1-5)}jGlcNAc');
});
