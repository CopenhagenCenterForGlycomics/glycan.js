/*global QUnit*/

import Reaction from '../../js/Reaction';
import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can test negative assertions on reactions', {
});

QUnit.test( 'Can test a simple negative assertion on reaction' , function( assert ) {
  let base_sequence = 'Man(b1-4)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"!{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.negative, 'Reaction is a negative reaction');
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  let test_result = reaction.worksOn(test_sugar);
  assert.ok(! test_result, 'Reaction does not work on test sugar');
});

QUnit.test( 'Delta matches at attachment point' , function( assert ) {
  let base_sequence = 'Fuc(a1-4)Man(b1-4)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Fuc(a1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"!{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.negative, 'Reaction is a negative reaction');
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  let test_result = reaction.worksOn(test_sugar);
  assert.ok(test_result, 'Reaction could work on test sugar');
});

QUnit.test( 'Longer delta matches at attachment point' , function( assert ) {
  let base_sequence = 'Fuc(a1-4)Man(b1-4)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Fuc(a1-4)Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"!{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.negative, 'Reaction is a negative reaction');
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  let test_result = reaction.worksOn(test_sugar);
  assert.ok(! test_result, 'Reaction should not work on test sugar');
});