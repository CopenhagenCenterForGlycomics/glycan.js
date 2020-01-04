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
QUnit.test( 'Make sure repeat unit is balanced' , function( assert ) {
  let sequence = 'Gal(b1-3){GlcNAc(b1-3)Gal(b1-3)}3GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = sugar.repeats[0];
  repeat.mode = Repeat.MODE_MINIMAL;
  let new_child = new Monosaccharide('Fuc');
  new_child.anomer = 'a';
  new_child.parent_linkage = 1;
  assert.equal(repeat.attachment,'y3a');
  sugar.locate_monosaccharide('y7a').original.addChild(2,new_child);
  assert.equal(repeat.attachment,'y3b');
  assert.equal(sugar.sequence,'Gal(b1-3){Fuc(a1-2)[GlcNAc(b1-3)]Gal(b1-3)@y3b}3GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn', 'Has repeat generated sequence');
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

QUnit.test( 'Turn repeat back into regular residues' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,2);
  repeat.mode = Repeat.MODE_EXPAND;
  repeat.identifier = '1';
  repeat.max = 1;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence');
  let removing_res = sugar.leaves().filter( res => res.identifier == 'Glc')[0];
  removing_res.parent.removeChild(4,removing_res);
  assert.equal(sugar.sequence,'Fuc(a1-8)Man(b1-5)GlcNAc', 'Has repeat generated sequence removing a residue');
});


QUnit.test( 'Turn repeat back into regular residues keeping a repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,2);
  repeat.mode = Repeat.MODE_EXPAND;
  repeat.identifier = '1';
  repeat.max = 3;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence');
  let removing_res = sugar.leaves().filter( res => res.identifier == 'Glc')[0];
  removing_res.parent.removeChild(4,removing_res);
  repeat.identifier = repeat.max+'';
  assert.equal(sugar.sequence,'Fuc(a1-8)Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence removing a residue');
});


QUnit.test( 'Turn repeat back into regular residues keeping multipe repeats' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,2);
  repeat.mode = Repeat.MODE_EXPAND;
  repeat.max = 4;
  sugar.root.graft(repeat.root);
  assert.equal(sugar.sequence,'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)Glc(b1-4)[Fuc(a1-8)]Man(b1-5)GlcNAc', 'Has repeat generated sequence');
  let removing_res = sugar.leaves().filter( res => res.identifier == 'Glc')[0];
  removing_res.parent.removeChild(4,removing_res);
  repeat.mode = Repeat.MODE_MINIMAL;
  repeat.identifier = repeat.max+'';
  assert.equal(sugar.sequence,'Fuc(a1-8)Man(b1-5){Glc(b1-4)[Fuc(a1-8)]Man(b1-5)}3GlcNAc', 'Has repeat generated sequence removing a residue');
});

QUnit.test( 'Remove end residue from repeat' , function( assert ) {
  let sequence = '{GlcNAc(b1-3)Gal(b1-3)}3GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  let repeat = sugar.repeats[0];
  repeat.mode = Repeat.MODE_EXPAND;
  assert.equal(sugar.sequence,'GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn', 'Has repeat generated sequence');
  let removing_res = sugar.leaves().filter( res => res.identifier == 'GlcNAc')[0];
  removing_res.parent.removeChild(3,removing_res);
  repeat.identifier = repeat.max+'';
  assert.equal(sugar.sequence,'Gal(b1-3)GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-3)Gal(b1-3)GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn', 'Has repeat generated sequence removing a residue');
  repeat.mode = Repeat.MODE_MINIMAL;
  assert.equal(sugar.sequence,'Gal(b1-3){GlcNAc(b1-3)Gal(b1-3)}2GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn', 'Has repeat generated sequence removing a residue');
});