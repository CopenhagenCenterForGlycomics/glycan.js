/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can create Sugars with repeating units', {
});

QUnit.test( 'Create a simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,2);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);
  let repeat_seq = sugar.sequence;
  assert.ok(repeat_seq === 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence');
});