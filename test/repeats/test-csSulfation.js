/*global QUnit*/

import Sugar from '../../js/Sugar';
import Monosaccharide from '../../js/Monosaccharide';

import Repeat from '../../js/Repeat';

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that sulfation reaction works on CS', {
});


QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let search_sequence = '{GlcA(b1-3)GalNAc(b1-4)}2GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  test_sugar.repeats[0].mode = Repeat.MODE_EXPAND;

  let sulfation_2_reaction = 'GlcA(u?-?)*+\"{HSO3(u?-2)}@y2a\"';
  let sulfation_3_reaction = 'GlcA(u?-?)*+\"{HSO3(u?-3)}@y2a\"';



  let reaction = new IupacReaction();
  reaction.sequence = sulfation_2_reaction;

  let reaction_sulf = new IupacReaction();
  reaction_sulf.sequence = sulfation_3_reaction;

  assert.equal(test_sugar.sequence,'GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');

  reaction.execute(test_sugar,test_sugar.locate_monosaccharide('y7a'));

  assert.equal(test_sugar.locate_monosaccharide('y8b').identifier,'GalNAc');

  assert.equal(test_sugar.sequence,'HSO3(u?-2)[GlcA(b1-3)GalNAc(b1-4)]GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');

  assert.equal(test_sugar.locate_monosaccharide('y8b').identifier,'GalNAc');


  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction_sulf);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);
  let cloned_test = test_sugar.clone();
  let result = reactiongroup.supportsLinkageAt(cloned_test,'HSO3');
  assert.deepEqual(result.substrate.map( res => test_sugar.locate_monosaccharide(cloned_test.location_for_monosaccharide(res)).identifier ),['GlcA','GlcA','GlcA']);
  assert.deepEqual(result.substrate.map( res => cloned_test.locate_monosaccharide(cloned_test.location_for_monosaccharide(res)).identifier ),['GlcA','GlcA','GlcA']);
});

QUnit.test( 'We can match and filter on wildcard matches' , function( assert ) {
  let search_sequence = '{GlcA(b1-3)GalNAc(b1-4)}2GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  test_sugar.repeats[0].mode = Repeat.MODE_EXPAND;

  let sulfation_2_reaction = 'GlcA(u?-?)*+\"{HSO3(u?-2)}@y2a\"';
  let sulfation_3_reaction = 'GlcA(u?-?)*+\"{HSO3(u?-3)}@y2a\"';

  let reaction = new IupacReaction();
  reaction.sequence = sulfation_2_reaction;

  let reaction_sulf = new IupacReaction();
  reaction_sulf.sequence = sulfation_3_reaction;

  assert.equal(test_sugar.sequence,'GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');

  reaction.execute(test_sugar,test_sugar.locate_monosaccharide('y7a'));

  assert.equal(test_sugar.locate_monosaccharide('y8b').identifier,'GalNAc');

  assert.equal(test_sugar.sequence,'HSO3(u?-2)[GlcA(b1-3)GalNAc(b1-4)]GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');

  assert.equal(test_sugar.locate_monosaccharide('y8b').identifier,'GalNAc');

  let a_clone = test_sugar.clone();

  assert.equal(a_clone.locate_monosaccharide('y8b').identifier,'GalNAc');

  assert.equal(a_clone.sequence,'HSO3(u?-2)[GlcA(b1-3)GalNAc(b1-4)]GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser');

  assert.equal(a_clone.locate_monosaccharide('y8b').identifier,'GalNAc');
});