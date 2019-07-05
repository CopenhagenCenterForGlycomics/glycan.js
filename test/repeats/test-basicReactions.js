/*global QUnit*/

import Sugar from '../../js/Sugar';
import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}


QUnit.module('Test that we can test reactions on Sugars with repeating units', {
});

QUnit.test( 'Test reaction matching on simple repeat' , function( assert ) {
  let sequence = 'GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  let repeat = new Repeat(repeat_sug,'y3a',1,4);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

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

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  const repeat_count = 4;

  let repeat = new Repeat(repeat_sug,'y3a',1,repeat_count);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

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

  sequence = 'Glc(b1-4)[Fuc(a1-8)]Man(b1-5)';
  let repeat_sug = new IupacSugar();
  repeat_sug.sequence = sequence;

  const repeat_count = 4;

  let repeat = new Repeat(repeat_sug,'y3a',1,repeat_count);
  repeat.mode = Repeat.MODE_EXPAND;
  sugar.root.graft(repeat.root);

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