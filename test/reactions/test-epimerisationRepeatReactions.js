/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}


QUnit.module('Test that we can test epimerisation reactions on Sugars with repeating units', {
});

QUnit.test( 'Test reaction matching on simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)New(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-5)*+"{New}@y2a"';

  let chain_synthesis_reaction = 'Glc(b1-4)*+"{Gal(b1-5)}@y2a"';

  let reactions = [ epimerisation_reaction, chain_synthesis_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }

  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);

  assert.equal(supported.length, 3);
  assert.deepEqual(supported.map( res => res.identifier ),['New','New','New']);

});

QUnit.test( 'Test reaction execution on simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Gal(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-5)*+"{New}@y2a"';

  let reaction = new IupacReaction();
  reaction.sequence = epimerisation_reaction;

  reaction.execute(sugar);
  assert.equal(sugar.sequence,'Glc(b1-4)New(b1-5)Glc(b1-4)New(b1-5)Glc(b1-4)New(b1-5)Glc(b1-4)New(b1-5)GlcNAc');

});

QUnit.test( 'Test reaction execution on simple collapsed repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Gal(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_MINIMAL;
  repeat.identifier = ''+repeat.max;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Glc(b1-4)*+"{New}@y2a"';

  let reaction = new IupacReaction();
  reaction.sequence = epimerisation_reaction;
  reaction.execute(sugar);
  assert.equal(sugar.sequence,'{New(b1-4)Gal(b1-5)}4GlcNAc');

});

QUnit.test( 'Test reaction execution on simple collapsed repeat first residue' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Gal(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_MINIMAL;
  repeat.identifier = ''+repeat.max;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-5)*+"{New}@y2a"';

  let reaction = new IupacReaction();
  reaction.sequence = epimerisation_reaction;
  reaction.execute(sugar);
  assert.equal(sugar.sequence,'{Glc(b1-4)New(b1-5)}4GlcNAc');

});

QUnit.test( 'Test reaction execution on simple collapsed repeat first residue adding branch' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Gal(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_MINIMAL;
  repeat.identifier = ''+repeat.max;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-5)*+"{Gal(b1-3)New}@y2a"';

  let reaction = new IupacReaction();
  reaction.sequence = epimerisation_reaction;
  reaction.execute(sugar);
  assert.equal(sugar.sequence,'{Gal(b1-3)[Glc(b1-4)]New(b1-5)@y3b}4GlcNAc');

});

QUnit.test( 'Test reaction matching on last residue of simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'New(b1-4)Glc(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-4)*+"{New}@y2a"';

  let chain_synthesis_reaction = 'Glc(b1-5)*+"{Gal(b1-4)}@y2a"';

  let reactions = [ epimerisation_reaction, chain_synthesis_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }

  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);

  assert.equal(supported.length, 4);
  assert.deepEqual(supported.map( res => res.identifier ),['New','New','New','New']);

});

QUnit.test('Test epimerisation reaction on sugar, replacing residues in repeat if needed', assert => {
  let sequence = '{GlcA(b1-4)GlcNAc(a1-4)}3GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  sugar.repeats[0].mode = Repeat.MODE_EXPAND;

  let epimerisation_reaction = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)Xyl(b1-O)Ser+"{HSO3(u?-N)GlcN}@y4a"';

  let reaction = new IupacReaction();

  let target_residue = sugar.locate_monosaccharide('y8a');

  reaction.sequence = epimerisation_reaction;

  reaction.execute(sugar,target_residue);

  sugar.locate_monosaccharide('y8a').balance();

  assert.equal(sugar.sequence,'HSO3(u?-N)[GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-4)]GlcN(a1-4)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');
});

QUnit.test('Test epimerisation reaction on repeat unit on sugar, replacing first entry of repeat', assert => {
  let sequence = '{GlcA(b1-4)GlcNAc(a1-4)}3GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  sugar.repeats[0].mode = Repeat.MODE_EXPAND;

  let epimerisation_reaction = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)Xyl(b1-O)Ser+"{HSO3(u?-N)GlcN}@y4a"';

  let reaction = new IupacReaction();

  let target_residue = sugar.locate_monosaccharide('y6a');

  reaction.sequence = epimerisation_reaction;

  reaction.execute(sugar,target_residue);

  sugar.locate_monosaccharide('y6a').balance();

  assert.equal(sugar.sequence,'HSO3(u?-N)[HSO3(u?-N)[HSO3(u?-N)[GlcA(b1-4)]GlcN(a1-4)GlcA(b1-4)]GlcN(a1-4)GlcA(b1-4)]GlcN(a1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');
});

QUnit.test( 'Test reaction matching on simple repeat with branch' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Child(a1-4)]New(b1-3)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

  let epimerisation_reaction = 'Gal(b1-3)*+"{Child(a1-4)New}@y2a"';

  let chain_synthesis_reaction = 'Glc(b1-4)*+"{Gal(b1-3)}@y2a"';

  let reactions = [ epimerisation_reaction, chain_synthesis_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }

  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length,7);
  assert.deepEqual(supported.map( res => res.identifier ),['New','New','New','Child','Child','Child','Child']);

});
