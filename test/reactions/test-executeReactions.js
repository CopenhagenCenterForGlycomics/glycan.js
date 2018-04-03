/*global QUnit*/

import Reaction from '../../js/Reaction';
import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can execute Reactions', {
});

QUnit.test( 'Can execute a reaction' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  reaction.execute(test_sugar);
  assert.ok(test_sugar.sequence === 'Man(b1-4)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc');
});

QUnit.test( 'Can execute a reaction' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  reaction.execute(test_sugar);
  assert.ok(test_sugar.sequence === 'Gal(b1-2)[Man(b1-4)]Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc');
});


QUnit.test( 'We can mark up a single substrate point' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  let target_tag = reaction.tagSubstrateResidues(test_sugar);
  let target_residues = test_sugar.composition_for_tag(target_tag);
  assert.ok(target_residues.length === 1);
});

QUnit.test( 'We can mark up a wildcard substrate point' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*(u?-?)GlcNAc';
  let search_sequence = 'Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y3a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let target_tag = reaction.tagSubstrateResidues(test_sugar);
  let target_residues = test_sugar.composition_for_tag(target_tag);
  assert.ok(target_residues.length === 2);
});

QUnit.test( 'We can mark up a rootless wildcard substrate point' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Gal(b1-2)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let target_tag = reaction.tagSubstrateResidues(test_sugar);
  let target_residues = test_sugar.composition_for_tag(target_tag);
  assert.ok(target_residues.length === 3);
});

QUnit.test( 'We can generate sets of sugars on wildcard matches' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Gal(b1-2)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'New(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let generated_sugars = reaction.generate(test_sugar);
  let generated_sequences = generated_sugars.map( sug => sug.sequence ).sort();
  let wanted_sequences = ['New(b1-4)Gal(b1-2)Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc', 'Gal(b1-2)[New(b1-4)]Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc', 'Gal(b1-2)Gal(b1-2)Man(b1-3)[New(b1-4)Gal(b1-2)Gal(b1-4)]GlcNAc'].sort();
  assert.ok(generated_sequences.length === 3);
  assert.ok(generated_sequences.join(',') === wanted_sequences.join(','));
});


QUnit.test( 'We can mark up a short rootless wildcard substrate point' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let search_sequence = 'Gal(b1-2)[Gal(b1-2)][Gal(b1-2)][Gal(b1-2)Gal(b1-4)]GlcNAc';
  let delta_sequence = 'Man(b1-4)';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let target_tag = reaction.tagSubstrateResidues(test_sugar);
  let target_residues = test_sugar.composition_for_tag(target_tag);
  assert.ok(target_residues.length === 4);
});