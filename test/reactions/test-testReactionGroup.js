/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';
import Monosaccharide from '../../js/Monosaccharide';

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

QUnit.test( 'Test negative reaction for bisecting GlcNAc' , function( assert ) {
  let sequence = `GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"!{Fuc(a1-6)}@y1a"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.negative, 'Reaction is a negative reaction');
  let reaction_positive = new IupacReaction();
  reaction_positive.sequence = `GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"{Fuc(a1-6)}@y1a"`;
  let reactionset = new ReactionSet();
  reactionset.addReactionRule(reaction_positive);
  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';


  let test_sugar_positive = new IupacSugar();
  test_sugar_positive.sequence = 'GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));
  assert.ok(supported.length == 0,'No supported residues for negative sequence');

  supported = test_sugar_positive.composition_for_tag(reactiongroup.supportLinkages(test_sugar_positive));

  assert.ok(supported.length == 1,'Supported residues for positive sequence');

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
  assert.deepEqual(result.anomer,[]);
  assert.deepEqual(result.linkage,[]);
  result = reactiongroup.supportsLinkageAt(test_sugar,'New',4,test_sugar.leaves()[0].parent);
  assert.deepEqual(result.anomer,[]);
  assert.deepEqual(result.linkage,[]);
  assert.deepEqual(result.substrate,[]);
});


QUnit.test( 'Test if we can add in N links' , function( assert ) {
  let base_sequence = 'Asn';
  let search_sequence = 'Asn';
  let delta_sequence = 'GlcNAc(b1-N)';
  let position = 'y1a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;

  let result = reactiongroup.supportsLinkageAt(test_sugar,'GlcNAc');
  assert.deepEqual(result.anomer,['b']);
  assert.deepEqual(result.linkage,[Monosaccharide.LINKAGES.N]);
});