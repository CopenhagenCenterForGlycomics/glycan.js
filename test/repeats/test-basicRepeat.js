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

  sequence = 'Man';
  let repeat = new IupacSugar();
  repeat.root.anomer = 'b';
  repeat.root.parent_linkage = 1;

  repeat.sequence = sequence;
  repeat = new Repeat(repeat);
  repeat.min = 1;
  repeat.mode = Repeat.EXPAND;

  sugar.root.addChild(3,repeat.root);
  assert.ok(sugar.sequence === '', 'Has the same sequence');
});