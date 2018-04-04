/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can execute ReactionSets', {
});

QUnit.test( 'Can test a positive reaction' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  let reactionset = new ReactionSet();
  reactionset.addReactionRule(reaction);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  assert.ok(reactionset.worksOn(test_sugar));
});

QUnit.test( 'Can test a positive and negative reaction' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let negative_sequence = 'Man(b1-4)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';

  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  let reactionset = new ReactionSet();
  reactionset.addReactionRule(reaction);

  let negative = new IupacReaction();
  negative.sequence = `${base_sequence}+"!{${delta_sequence}}@${position}"`;

  reactionset.addReactionRule(negative);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  assert.ok(reactionset.worksOn(test_sugar));

  let negative_sugar = new IupacSugar();
  negative_sugar.sequence = negative_sequence;
  assert.ok(! reactionset.worksOn(negative_sugar));

});

QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Gal(b1-2)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let negative = new IupacReaction();
  negative.sequence = 'Gal+"!{Gal(b1-2)}@y1a';

  reactionset.addReactionRule(negative);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  assert.ok(reactionset.worksOn(test_sugar));
});

QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Test(b1-2)Gal(b1-2)Man(b1-3)[Test(b1-2)Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let negative = new IupacReaction();
  let negative_sequence = 'Gal(b1-2)*+"!{Test(b1-2)}@y2a"';
  negative.sequence = negative_sequence;

  reactionset.addReactionRule(negative);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  assert.ok(! reactionset.worksOn(test_sugar));
});


QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Test(b1-3)Gal(b1-2)Man(b1-3)[Test(b1-3)Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let negative = new IupacReaction();
  let negative_sequence = 'Gal(b1-2)*+"!{Test(b1-2)}@y2a"';
  negative.sequence = negative_sequence;

  reactionset.addReactionRule(negative);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  assert.ok(reactionset.worksOn(test_sugar));
});
