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

QUnit.test( 'Weird GAG sequence works' , function( assert ) {
  let search_sequence = 'HSO3(u1-3)[HSO3(u1-2)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)[HSO3(u1-4)]GalNAc(b1-4)GlcA(b1-3)[HSO3(u1-6)]GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)]GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';
  let sequence = "Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcA(b1-3)}@y4a\"";
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
  assert.ok(supported.map( res => res.identifier ).join(',') === 'GlcA');
});




QUnit.test( 'Test negative reaction for bisecting GlcNAc' , function( assert ) {
  let sequence = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"!{Fuc(a1-6)}@y1a"';
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.negative, 'Reaction is a negative reaction');
  let reaction_positive = new IupacReaction();
  reaction_positive.sequence = 'GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"{Fuc(a1-6)}@y1a"';
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
  let sequence = `${base_sequence}+"{New(b1-4)}@${position}"`;
  let reactionset = new ReactionSet();

  let reaction = new IupacReaction();
  reaction.sequence = sequence;

  reactionset.addReactionRule(reaction);


  let reaction_b = new IupacReaction();
  reaction_b.sequence = `${base_sequence}+"{New(b1-5)}@${position}"`;

  let reactionset_b = new ReactionSet();

  reactionset_b.addReactionRule(reaction_b);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  reactiongroup.addReactionSet(reactionset_b);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;

  let result = reactiongroup.supportsLinkageAt(test_sugar,'New');
  assert.deepEqual(result.anomer,['b'],'Single supported anomer for just donor');
  assert.deepEqual(result.linkage,[5],'Single supported linkage for just donor');
  result = reactiongroup.supportsLinkageAt(test_sugar,'New',4);
  assert.deepEqual(result.anomer,[],'No supported anomers for donor and linkage');
  assert.deepEqual(result.linkage,[],'No supported linkages for donor and linkage');
  result = reactiongroup.supportsLinkageAt(test_sugar,'New',4,test_sugar.leaves()[0].parent);
  assert.deepEqual(result.anomer,[],'No supported anomers for donor, linkage and substrate');
  assert.deepEqual(result.linkage,[],'No supported linkages for donor, linkage and substrate');
  assert.deepEqual(result.substrate,[],'No supported substrates for donor, linkage and substrate');

  result = reactiongroup.supportsLinkageAt(test_sugar,'New',5);
  assert.deepEqual(result.anomer,['b'],'Supported anomer for donor and linkage');
  assert.deepEqual(result.linkage,[5],'Supported linkage for donor and linkage');

  result = reactiongroup.supportsLinkageAt(test_sugar,'New',5,test_sugar.leaves()[0].parent);
  assert.deepEqual(result.anomer,['b'],'Supported anomer for donor, linkage and substrate');
  assert.deepEqual(result.linkage,[5],'Supported linkage for donor, linkage and substrate');
  assert.deepEqual(result.substrate,[test_sugar.leaves()[0].parent],'Supported substrate for donor, linkage and substrate');

});

QUnit.test( 'Test if we can support short reactions' , function( assert ) {
  let base_sequence = 'Gal(u?-?)*';
  let search_sequence = 'Gal(b1-3)GlcNAc(b1-3)Gal(b1-3)GalNAc(a1-O)Ser';
  let delta_sequence = 'GlcNAc(b1-3)';
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

  let result = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));
  assert.ok(result.length === 1,'Only one substrate');
  assert.ok(result[0].identifier === 'GlcNAc','Correct identifier');
  assert.ok(result[0].parent.identifier === 'Gal','Correct identifier for parent');
  assert.ok(result[0].parent.parent.identifier === 'GalNAc','Correct identifier for grandparent');
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