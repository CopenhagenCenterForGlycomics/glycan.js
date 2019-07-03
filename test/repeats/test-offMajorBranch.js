/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can create Sugars with repeating units that are repeated away from major branch', {
});

QUnit.test( 'Create a repeat not repeating off major branch' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3b',1,2);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);
  let repeat_seq = sugar.sequence;
  assert.equal(repeat_seq,'Glc(b1-4)[Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence');
});


QUnit.test( 'Create a repeat not repeating off major branch that is not expanded' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3b',1,2);
  repeat.mode = Repeat.MODE_MINIMAL;
  sugar.root.graft(repeat.root);
  let repeat_seq = sugar.sequence;
  assert.equal(repeat_seq,'{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)@y3b}GlcNAc', 'Has repeat generated sequence');
});

QUnit.test( 'Reading and writing sequence' , function( assert ) {
  let sequence = '{Glc(b1-4)[Fuc(a1-8)]Man(b1-5)@y3b}kGlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  sugar.repeats[0].mode = Repeat.MODE_MINIMAL;
  let repeat_seq = sugar.sequence;
  assert.equal(repeat_seq,sequence, 'Has repeat generated sequence');
});