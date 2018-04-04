/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can execute ReactionGroups', {
});

QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'New(b1-4)Gal(b1-2)Man(b1-3)[Test(b1-3)Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.ok(supported.length === 1);
  assert.ok(supported.map( res => res.identifier ).join(',') === 'New');
});

QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'New(b1-4)Gal(b1-2)Man(b1-3)[New(b1-4)Gal(b1-2)New(b1-4)Gal(b1-2)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.ok(supported.length === 3);
  assert.ok(supported.map( res => res.identifier ).join(',') === 'New,New,New');
});


QUnit.test( 'We can check if a group supports an operation' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'New(b1-4)Gal(b1-2)Man(b1-3)[New(b1-4)Gal(b1-2)New(b1-4)Gal(b1-2)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let reaction_b = new IupacReaction();
  reaction_b.sequence = `${base_sequence}+"{New(b1-5)}@${position}"`;


  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  reactiongroup.addReactionSet(reaction_b);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;

  let result = reactiongroup.supportsLinkageAt(test_sugar,'New');
  assert.deepEqual(result.anomer,['b']);
  assert.deepEqual(result.linkage,[4,5]);
  result = reactiongroup.supportsLinkageAt(test_sugar,'New',4);
  assert.deepEqual(result.anomer,['b']);
  assert.deepEqual(result.linkage,[4]);
  result = reactiongroup.supportsLinkageAt(test_sugar,'New',4,test_sugar.leaves()[0].parent);
  assert.deepEqual(result.anomer,['b']);
  assert.deepEqual(result.linkage,[4]);
  assert.deepEqual(result.substrate,[ test_sugar.leaves()[0].parent ]);
});
