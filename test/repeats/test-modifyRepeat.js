/*global QUnit*/

import Sugar from '../../js/Sugar';
import Monosaccharide from '../../js/Monosaccharide';

import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can modify repeat units in sugars', {
});

QUnit.test( 'Modify a simple repeat' , function( assert ) {
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
  let new_child = new Monosaccharide('Gal');
  new_child.anomer = 'a';
  new_child.parent_linkage = 1;
  sugar.locate_monosaccharide('y2a').original.addChild(6,new_child);
  assert.equal(sugar.sequence,'{Glc(b1-4)[Gal(a1-6)][Fuc(a1-8)]Man(b1-5)}GlcNAc', 'Has repeat generated sequence');

});

QUnit.test( 'Modify a simple repeat at the end' , function( assert ) {
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
  let new_child = new Monosaccharide('Gal');
  new_child.anomer = 'a';
  new_child.parent_linkage = 1;
  sugar.locate_monosaccharide('y3a').original.addChild(6,new_child);
  assert.equal(sugar.sequence,'{Gal(a1-6)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)@y3a}GlcNAc', 'Has repeat generated sequence');
});