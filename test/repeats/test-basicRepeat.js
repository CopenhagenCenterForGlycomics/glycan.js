/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

class IupacReaction extends Iupac(Reaction) {}
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

QUnit.test( 'Create a repeat with an extension at the end' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,2);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  sequence = 'NeuAc';
  let end_sugar = new IupacSugar();
  end_sugar.sequence = sequence;

  end_sugar.root.parent_linkage = 2;
  end_sugar.root.anomer = 'a';

  sugar.leaves()[0].addChild(8,end_sugar.root);

  let repeat_seq = sugar.sequence;
  assert.ok(repeat_seq === 'NeuAc(a2-8)Glc(b1-4)Man(b1-5)Glc(b1-4)Man(b1-5)GlcNAc', 'Has repeat generated sequence');
});

QUnit.test( 'Create a repeat with an extension in the middle' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,2);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  sequence = 'NeuAc';
  let end_sugar = new IupacSugar();
  end_sugar.sequence = sequence;

  end_sugar.root.parent_linkage = 2;
  end_sugar.root.anomer = 'a';

  const target = sugar.leaves()[0].parent.parent;

  target.addChild(8,end_sugar.root);

  let repeat_seq = sugar.sequence;
  assert.ok(repeat_seq === 'Glc(b1-4)Man(b1-5)[NeuAc(a2-8)]Glc(b1-4)Man(b1-5)GlcNAc', 'Has repeat generated sequence');
});

QUnit.test( 'Create a repeat with an extension in the middle that has correct branch order' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,2);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  sequence = 'NeuAc';
  let end_sugar = new IupacSugar();
  end_sugar.sequence = sequence;

  end_sugar.root.parent_linkage = 2;
  end_sugar.root.anomer = 'a';

  sugar.leaves()[0].parent.parent.addChild(3,end_sugar.root);

  let repeat_seq = sugar.sequence;
  assert.ok(repeat_seq === 'NeuAc(a2-3)[Glc(b1-4)Man(b1-5)]Glc(b1-4)Man(b1-5)GlcNAc', 'Has repeat generated sequence');
});

QUnit.test( 'Create a repeat with an extension in the middle that balances correctly' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,2);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  sequence = 'NeuAc';
  let end_sugar = new IupacSugar();
  end_sugar.sequence = sequence;

  end_sugar.root.parent_linkage = 2;
  end_sugar.root.anomer = 'a';

  let target = sugar.leaves()[0].parent.parent;

  target.addChild(5,end_sugar.root);
  target.balance();

  let target_seq = 'Glc(b1-4)Man(b1-5)[NeuAc(a2-5)]Glc(b1-4)Man(b1-5)GlcNAc';
  let target_sugar = new IupacSugar();
  target_sugar.sequence = target_seq;
  for (let leaf of target_sugar.leaves()) {
    leaf.balance();
  }


  let repeat_seq = sugar.sequence;
  assert.ok(repeat_seq === target_sugar.sequence, 'Has repeat generated sequence');
});

QUnit.test( 'Test reaction matching on simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  let repeat = new Repeat(repeat_sug,'y2a',1,4);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  let base_sequence = 'Glc(b1-4)Man(b1-5)*';
  let delta_sequence = 'Man(b1-5)';
  let position = 'y3a';
  sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);

  assert.ok(supported.length === 3);
  assert.ok(supported.map( res => res.identifier ).join(',') === 'Man,Man,Man');

});


QUnit.test( 'Test reaction matching on main branch of repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  const repeat_count = 4;

  let repeat = new Repeat(repeat_sug,'y2a',1,repeat_count);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  let base_sequence = 'Man(b1-5)*';
  let delta_sequence = 'Glc(b1-4)';
  let position = 'y2a';
  sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);

  assert.ok(supported.length === repeat_count);
  assert.ok(supported.map( res => res.identifier ).join(',') === Array(repeat_count).fill('Glc').join(','));

});

QUnit.test( 'Test reaction matching on branch of repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;
  repeat_sug.root.anomer = 'b';
  repeat_sug.root.parent_linkage = 1;

  const repeat_count = 4;

  let repeat = new Repeat(repeat_sug,'y2a',1,repeat_count);
  repeat.mode = Repeat.EXPAND;
  sugar.root.addChild(5,repeat.root);

  let base_sequence = 'Man(b1-5)*';
  let delta_sequence = 'Fuc(a1-8)';
  let position = 'y2a';
  sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  let supported_tag = reactiongroup.supportLinkages(sugar);
  let supported = sugar.composition_for_tag(supported_tag);

  assert.ok(supported.length === repeat_count);
  assert.ok(supported.map( res => res.identifier ).join(',') === Array(repeat_count).fill('Fuc').join(','));

});