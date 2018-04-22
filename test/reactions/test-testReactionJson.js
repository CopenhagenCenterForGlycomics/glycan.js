/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

const MGAT5B = 'GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn+\"{GlcNAc(b1-6)}@y5b\"';
const CHSY1 = ['GalNAc(b1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcA(b1-3)}@y7a\"',
               'GlcA(b1-3)GalNAc(b1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GalNAc(b1-4)}@y8a\"',
               'GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GalNAc(b1-4)}@y5a\"'
              ];


QUnit.module('Test that we can execute ReactionSets', {
});

QUnit.test( 'MGAT5B works' , function( assert ) {
  let end_sequence = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-6)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  let reaction = new IupacReaction();
  reaction.sequence = MGAT5B;

  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.ok(supported.length === 1);
  assert.ok(supported.map( res => res.identifier ).join(',') === 'GlcNAc');
  assert.equal(test_sugar.location_for_monosaccharide(supported[0]), 'y6b' );
});

QUnit.test( 'CHSY1 works for GlcA' , function( assert ) {
  let end_sequence = 'GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';
  let reaction = new IupacReaction();
  reaction.sequence = CHSY1[0];

  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.ok(supported.length === 2);
  assert.equal(supported.map( res => res.identifier ).join(','),'GlcA,GlcA');
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y7a','y9a']);
});

QUnit.test( 'CHSY1 works for GalNAc' , function( assert ) {
  let end_sequence = 'GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';
  let reaction = new IupacReaction();
  reaction.sequence = CHSY1[1];

  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length,2);
  assert.equal(supported.map( res => res.identifier ).join(','),'GalNAc,GalNAc');
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y8a','y10a']);
});

QUnit.test( 'CHSY1 works for GalNAc' , function( assert ) {
  let end_sequence = 'GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';
  let reaction = new IupacReaction();
  reaction.sequence = CHSY1[2];

  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length,1);
  assert.equal(supported.map( res => res.identifier ).join(','),'GalNAc');
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y6a']);
});