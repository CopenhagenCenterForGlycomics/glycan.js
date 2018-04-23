/*global QUnit*/

import Reaction from '../../js/Reaction';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}


const MGAT2 = ['GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn+\"{GlcNAc(b1-2)}@y5b\"'];
const MGAT4A = ['GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn+\"{GlcNAc(b1-4)}@y5a\"'];
const MGAT5 = ['GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn+\"{GlcNAc(b1-6)}@y5b\"'];
const CHSY1 = ['GalNAc(b1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcA(b1-3)}@y7a\"',
               'GlcA(b1-3)GalNAc(b1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GalNAc(b1-4)}@y8a\"'
              ];

const EXT1 = [  'GlcNAc(a1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcA(b1-4)}@y7a\"',
                'GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcNAc(a1-4)}@y5a\"',
                'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GlcNAc(a1-4)}@y8a\"'
             ];

const CSGALNACT1 = ['GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+\"{GalNAc(b1-4)}@y5a\"'];

const POMGNT2 = ['Man(a1-O)Ser+\"{GlcNAc(b1-4)}@y2a\"'];
const B3GALNT2 = ['GlcNAc(b1-4)Man(a1-O)Ser+\"{GalNAc(b1-3)}@y3a\"'];
const B4GAT1 = ['Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{GlcA(b1-3)}@y9a\"'];

const LARGE1 = [
'Xyl(a1-3)GlcA(b1-3)*(u?-?)GlcA(b1-3)Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{GlcA(b1-3)}@y13a\"',
'GlcA(b1-3)*(u?-?)GlcA(b1-3)Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{Xyl(a1-3)}@y12a\"',
'Xyl(a1-3)GlcA(b1-3)Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{GlcA(b1-3)}@y11a\"',
'GlcA(b1-3)Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{Xyl(a1-3)}@y10a\"'
];

const FKTN = [
'GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{Rbo(u5-1)P(u1-3)}@y4a\"',
'Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{Rbo(u5-1)P(u1-1)}@y6a\"'
];

const TMEM5 = ['Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser+\"{Xyl(b1-4)}@y8a\"'];


const DERMATAN_SEQUENCE = 'GlcNAc(a1-4)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';
const CHONDROITIN_SEQUENCE = 'GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

const NLINKED_BIANTENNARY = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-6)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';

const NLINKED_TETRATENNARY = 'GlcNAc(b1-2)[GlcNAc(b1-4)]Man(a1-3)[GlcNAc(b1-2)[GlcNAc(b1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';

const NLINKED_CORE = 'GlcNAc(b1-2)Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';

const MATRIGLYCAN_SEQUENCE = 'GlcA(b1-3)Xyl(a1-3)GlcA(b1-3)Xyl(a1-3)GlcA(b1-3)Xyl(a1-3)GlcA(b1-3)Xyl(b1-4)Rbo(u5-1)P(u1-1)Rbo(u5-1)P(u1-3)GalNAc(b1-3)GlcNAc(b1-4)[P(u1-6)]Man(a1-O)Ser';

const ALL_REACTIONS = { MGAT2: MGAT2,
                        MGAT4A: MGAT4A,
                        MGAT5: MGAT5,
                        CHSY1: CHSY1,
                        EXT1: EXT1,
                        CSGALNACT1: CSGALNACT1,
                        POMGNT2: POMGNT2,
                        B3GALNT2: B3GALNT2,
                        B4GAT1: B4GAT1,
                        LARGE1: LARGE1,
                        FKTN: FKTN,
                        TMEM5: TMEM5 };

const ALL_REACTION_GROUPS = Object.keys(ALL_REACTIONS).map( gene => {
  let reactionseqs = ALL_REACTIONS[gene];

  let reactionset = new ReactionSet();

  for (let reaction_seq of reactionseqs) {
    let reaction = new IupacReaction();
    reaction.sequence = reaction_seq;
    reactionset.addReactionRule(reaction);
  }

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  reactiongroup.gene = gene;

  return reactiongroup;
});

let dystroglycan_group = new ReactionGroup();

dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'POMGNT2')[0].reactions[0]);
dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'B3GALNT2')[0].reactions[0]);
dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'B4GAT1')[0].reactions[0]);
dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'LARGE1')[0].reactions[0]);
dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'FKTN')[0].reactions[0]);
dystroglycan_group.addReactionSet(ALL_REACTION_GROUPS.filter( r => r.gene === 'TMEM5')[0].reactions[0]);


let genes_working_on_sugar = (sugar) => {
  return ALL_REACTION_GROUPS.filter( group => {
    let test_sugar = sugar.clone();
    return test_sugar.composition_for_tag(group.supportLinkages(test_sugar)).length > 0;
  }).map( group => group.gene );
};


let make_reaction_group = (reaction_seq) => {
  let reaction = new IupacReaction();
  reaction.sequence = reaction_seq;

  let reactionset = new ReactionSet();

  reactionset.addReactionRule(reaction);

  let reactiongroup = new ReactionGroup();

  reactiongroup.addReactionSet(reactionset);

  return reactiongroup;
};

QUnit.module('Test that we can execute ReactionSets', {
});

QUnit.test( 'MGAT5 works' , function( assert ) {
  let end_sequence = NLINKED_BIANTENNARY;

  let reactiongroup = make_reaction_group(MGAT5[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.deepEqual(genes_working_on_sugar(test_sugar),['MGAT5']);

  assert.ok(supported.length === 1);
  assert.deepEqual(supported.map( res => res.identifier ),Array(1).fill('GlcNAc'));
  assert.equal(test_sugar.location_for_monosaccharide(supported[0]), 'y6b' );
});

QUnit.test( 'Tetra branching works' , function( assert ) {
  let end_sequence = NLINKED_TETRATENNARY;

  let reactiongroup = make_reaction_group(MGAT5[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.deepEqual(genes_working_on_sugar(test_sugar),['MGAT2','MGAT4A','MGAT5']);

  assert.ok(supported.length === 1);
  assert.deepEqual(supported.map( res => res.identifier ),Array(1).fill('GlcNAc'));
  assert.equal(test_sugar.location_for_monosaccharide(supported[0]), 'y6d' );
});

QUnit.test( 'Tetra branching doesnt work on core' , function( assert ) {
  let end_sequence = NLINKED_CORE;

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;
  assert.deepEqual(genes_working_on_sugar(test_sugar),[]);
});


QUnit.test( 'CHSY1 works for GlcA extension' , function( assert ) {
  let end_sequence = CHONDROITIN_SEQUENCE;
  let reactiongroup = make_reaction_group(CHSY1[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['CHSY1','CSGALNACT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.ok(supported.length === 2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('GlcA'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y7a','y9a']);
});

QUnit.test( 'CHSY1 works for GalNAc extension only' , function( assert ) {
  let end_sequence = CHONDROITIN_SEQUENCE;
  let reactiongroup = make_reaction_group(CHSY1[1]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['CHSY1','CSGALNACT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('GalNAc'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y8a','y10a']);
});

QUnit.test( 'CSGALNACT1 works for GalNAc init' , function( assert ) {
  let end_sequence = CHONDROITIN_SEQUENCE;
  let reactiongroup = make_reaction_group(CSGALNACT1[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['CHSY1','CSGALNACT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,1);
  assert.deepEqual(supported.map( res => res.identifier ),['GalNAc']);
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y6a']);
});


QUnit.test( 'EXT1 works on GlcA chain extension' , function( assert ) {
  let end_sequence = DERMATAN_SEQUENCE;
  let reactiongroup = make_reaction_group(EXT1[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['EXT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('GlcA'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y7a','y9a']);
});

QUnit.test( 'EXT1 works on GlcNAc initiation' , function( assert ) {
  let end_sequence = DERMATAN_SEQUENCE;
  let reactiongroup = make_reaction_group(EXT1[1]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['EXT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,1);
  assert.deepEqual(supported.map( res => res.identifier ),Array(1).fill('GlcNAc'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y6a']);
});

QUnit.test( 'EXT1 works on GlcNAc chain extension' , function( assert ) {
  let end_sequence = DERMATAN_SEQUENCE;
  let reactiongroup = make_reaction_group(EXT1[2]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['EXT1']);

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('GlcNAc'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y8a','y10a']);
});

QUnit.test( 'LARGE1 init works for Xyl' , function( assert ) {
  let end_sequence = MATRIGLYCAN_SEQUENCE;
  let reactiongroup = make_reaction_group(LARGE1[3]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,1);
  assert.deepEqual(supported.map( res => res.identifier ),Array(1).fill('Xyl'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y11a']);
});

QUnit.test( 'LARGE1 extension works for GlcA' , function( assert ) {
  let end_sequence = MATRIGLYCAN_SEQUENCE;
  let reactiongroup = make_reaction_group(LARGE1[0]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('GlcA'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y14a','y16a']);
});


QUnit.test( 'LARGE1 extension works for Xyl' , function( assert ) {
  let end_sequence = MATRIGLYCAN_SEQUENCE;
  let reactiongroup = make_reaction_group(LARGE1[1]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,2);
  assert.deepEqual(supported.map( res => res.identifier ),Array(2).fill('Xyl'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y13a','y15a']);
});

QUnit.test( 'LARGE1 init works for GlcA' , function( assert ) {
  let end_sequence = MATRIGLYCAN_SEQUENCE;
  let reactiongroup = make_reaction_group(LARGE1[2]);

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  let supported = test_sugar.composition_for_tag(reactiongroup.supportLinkages(test_sugar));

  assert.equal(supported.length,1);
  assert.deepEqual(supported.map( res => res.identifier ),Array(1).fill('GlcA'));
  assert.deepEqual(supported.map( mono => test_sugar.location_for_monosaccharide(mono)), ['y12a']);
});

QUnit.test( 'Dystroglycan pathway works' , function( assert ) {
  let end_sequence = MATRIGLYCAN_SEQUENCE;

  let test_sugar = new IupacSugar();
  test_sugar.sequence = end_sequence;

  assert.deepEqual(genes_working_on_sugar(test_sugar),['POMGNT2','B3GALNT2','B4GAT1','LARGE1','FKTN','TMEM5']);
});