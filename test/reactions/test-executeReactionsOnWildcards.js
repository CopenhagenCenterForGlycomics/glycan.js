/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can create Reactions to run on wildcards', {
});

QUnit.test( 'Test against a wildcard in search sugar' , function( assert ) {
  let base_sequence = 'GlcNAc(b1-3)*';
  let delta_sequence = 'Gal(b1-3)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let group = new ReactionGroup();

  group.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();

  test_sugar.sequence = 'Gal(b1-3)GlcNAc(b1-3)*' ;

  assert.ok(test_sugar.composition_for_tag(group.supportLinkages(test_sugar)).length > 0,'Can support');

});

QUnit.test( 'Make reaction matching less specific' , function( assert ) {
  let base_sequence = 'GlcNAc(b1-3)Specific';
  let delta_sequence = 'Gal(b1-3)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let group = new ReactionGroup();

  group.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();

  test_sugar.sequence = 'Gal(b1-3)GlcNAc(b1-3)*' ;

  assert.ok(test_sugar.composition_for_tag(group.supportLinkages(test_sugar)).length > 0,'Can support');

});


QUnit.test( 'Reaction matching less specific with a wildcard' , function( assert ) {
  let base_sequence = 'GlcNAc(b1-3)*(u1-?)Specific';
  let delta_sequence = 'Gal(b1-3)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let group = new ReactionGroup();

  group.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();

  test_sugar.sequence = 'Gal(b1-3)GlcNAc(b1-3)*(u1-?)*' ;

  assert.ok(test_sugar.composition_for_tag(group.supportLinkages(test_sugar)).length > 0,'Can support with placeholders');

});
