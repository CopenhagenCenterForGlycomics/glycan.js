/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';


import {IO as Iupac} from '../../js/CondensedIupac';

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

class IupacReaction extends Iupac(Reaction) {}
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

QUnit.test( 'Cloning a repeat gets the right child' , function( assert ) {

  let sequence = '{GlcA(b1-4)GlcNAc(a1-4)}3GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  sugar.repeats[0].mode = Repeat.MODE_EXPAND;

  let epimerisation_reaction = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)Xyl(b1-O)Ser+"{HSO3(u?-3)}@y4a"';

  let reaction = new IupacReaction();

  let target_residue = sugar.locate_monosaccharide('y8a');

  reaction.sequence = epimerisation_reaction;

  reaction.execute(sugar,target_residue);

  sugar.locate_monosaccharide('y8a').balance();

  assert.equal(sugar.sequence,'HSO3(u?-3)[GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-4)]GlcNAc(a1-4)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser','Cloned sugar has the same sequence');

  let cloned = sugar.clone();

  assert.equal(sugar.locate_monosaccharide('y9a').identifier, cloned.locate_monosaccharide('y9a').identifier);
});

QUnit.test( 'Repeat root is set up correctly' , function( assert ) {
  const sequence = 'Fuc(a1-2){Gal(b1-3)GlcNAc(b1-3)}jGal(b1-3)GlcNAc(b1-2)[Man(a1-6)]Man(a1-3)Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let cloned = sugar.clone();
  assert.equal( cloned.repeats[0].root.parent.linkageOf(cloned.repeats[0].root), sugar.repeats[0].root.parent.linkageOf(sugar.repeats[0].root) );
});