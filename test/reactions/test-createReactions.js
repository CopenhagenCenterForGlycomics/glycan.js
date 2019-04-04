/*global QUnit*/

import Reaction from '../../js/Reaction';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}

QUnit.module('Test that we can create Reactions from string representations', {
});

QUnit.test( 'Read in a simple reaction' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.sequence === base_sequence, 'Has the same sequence');
  assert.ok(reaction.delta.sequence === delta_sequence, 'Has the same delta sequence');
});

QUnit.test( 'Reactions are immutable' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  assert.ok(reaction.sequence === base_sequence, 'Has the same sequence');
  assert.ok(reaction.delta.sequence === delta_sequence, 'Has the same delta sequence');
  assert.throws( () => reaction.sequence = `${base_sequence}+"{Glc(b1-4)}@${position}"`, TypeError , 'Reactions should be immutable');
  assert.ok(reaction.sequence === base_sequence, 'Has the same sequence');
  assert.ok(reaction.delta.sequence === delta_sequence, 'Has the same delta sequence');
});

QUnit.test( 'Throws error when reaction has incorrect location' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y10a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  assert.throws( () => {
    reaction.sequence = sequence;
  },
  new Error('Cannot locate attachment point'),
  'Throws error when location is not possible');
});