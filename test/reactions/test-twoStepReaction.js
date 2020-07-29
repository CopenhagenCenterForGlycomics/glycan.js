/*global QUnit*/

import Reaction from '../../js/Reaction';
import Sugar from '../../js/Sugar';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can create Reactions from string representations', {
});

QUnit.test( 'Can replace a residue' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)GlcNAc';
  let delta_sequence = 'Man(b1-4)Gal';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  reaction.execute(test_sugar);
  assert.equal(test_sugar.sequence,'Gal(b1-2)[Man(b1-4)]Gal(b1-3)GlcNAc');
});

QUnit.test( 'Can find linkages that reaction supports' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)GlcNAc';
  let delta_sequence = 'New(b1-4)Gal';
  let search_sequence = 'Gal(b1-2)[New(b1-4)]Gal(b1-3)GlcNAc';

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
  console.log(supported_tag,'xx');
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 1);
  assert.equal(supported.map( res => res.identifier ).join(','),'New');
});

// Possibly do a two-step with epimerases FIRST and then noting it can have mutiple identifiers?
// Can't match the base_sequence in the search_sequence - possibly need to subclass reaction to have new behaviour
// Apply epimerase to base first, and test for support of epimerised base_sequence
// Then mark attachment point as maybe epimerised so we can play with the comparator 
