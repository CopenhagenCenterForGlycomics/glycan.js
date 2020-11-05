/*global QUnit*/

import Reaction from '../../js/Reaction';
import Sugar from '../../js/Sugar';
import { ReactionSet, ReactionGroup } from '../../js/ReactionSet';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacReaction extends Iupac(Reaction) {}
class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can use epimerisation in reaction operations', {
});

QUnit.test( 'Can perform single epimerisation' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)GlcNAc';
  let delta_sequence = 'Gal';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = base_sequence;
  reaction.execute(test_sugar);
  assert.equal(test_sugar.sequence,'Gal(b1-2)Gal(b1-3)GlcNAc');
});


QUnit.test( 'Can attach a residue while epimerising' , function( assert ) {
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

QUnit.test( 'Can use epimerising reaction with children to support a linkage' , function( assert ) {
  let base_sequence = 'Gal(b1-2)Man(b1-3)GlcNAc';
  let delta_sequence = 'New';
  let search_sequence = 'Gal(b1-2)New(b1-3)GlcNAc';

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
  assert.equal(supported.length, 0);
  assert.equal(supported.map( res => res.identifier ).join(','),'');
  let tags = test_sugar
    .composition()
    .filter( res => res.identifier == 'New')
    .map( res => res.getTags())
    .flat()
    .map( symb => symb.description );
  assert.deepEqual(tags,['substrate','has_been_epimerised']);
});

QUnit.test( 'Can perform multiple epimerisation with wildcards' , function( assert ) {
  let base_sequence = 'Gal(b1-2)*';
  let delta_sequence = 'New';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = 'Gal(b1-2)Gal(b1-2)Gal';
  reaction.execute(test_sugar);
  assert.equal(test_sugar.sequence,'New(b1-2)New(b1-2)Gal');
});

QUnit.test( 'Can perform multiple epimerisation on simple specifier' , function( assert ) {
  let base_sequence = 'Gal';
  let delta_sequence = 'New';
  let position = 'y1a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = 'Gal(b1-2)Gal(b1-2)Gal';
  reaction.execute(test_sugar);
  assert.equal(test_sugar.sequence,'Gal(b1-2)Gal(b1-2)New');
});

QUnit.test( 'Can perform multiple epimerisation allowing linkage variability' , function( assert ) {
  let base_sequence = 'Gal(u1-?)*';
  let delta_sequence = 'New';
  let position = 'y2a';
  let sequence = `${base_sequence}+"{${delta_sequence}}@${position}"`;
  let reaction = new IupacReaction();
  reaction.sequence = sequence;
  let test_sugar = new IupacSugar();
  test_sugar.sequence = 'Gal(b1-2)Gal(b1-3)Gal';
  reaction.execute(test_sugar);
  assert.equal(test_sugar.sequence,'New(b1-2)New(b1-3)Gal');
});

QUnit.test( 'Can use epimerising reaction with wildcards to support a linkage' , function( assert ) {
  let base_sequence = 'Gal(u1-?)*';
  let delta_sequence = 'New';
  let search_sequence = 'New(b1-2)New(b1-2)GlcNAc';

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

  assert.deepEqual(supported,[]);

  let tags = test_sugar
    .composition()
    .filter( res => res.identifier == 'New')
    .map( res => res.getTags())
    .flat()
    .map( symb => symb.description );
  assert.deepEqual(tags,['substrate','has_been_epimerised','substrate','has_been_epimerised']);
});

QUnit.test( 'Can use epimerising reaction with wildcards to support a linkage' , function( assert ) {
  let base_sequence = 'Gal(b1-2)GlcNAc';
  let delta_sequence = 'New';
  let search_sequence = 'New(b1-2)New(b1-2)GlcNAc';

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
  assert.equal(supported.length, 0);
  var tags = test_sugar
    .composition()
    .filter( res => res.identifier == 'New' && res.parent.identifier == 'GlcNAc')
    .map( res => res.getTags())
    .flat()
    .map( symb => symb.description );
  assert.deepEqual(tags,['substrate','has_been_epimerised']);


  tags = test_sugar
    .composition()
    .filter( res => res.identifier == 'New' && res.parent.identifier != 'GlcNAc')
    .map( res => res.getTags())
    .flat()
    .map( symb => symb.description );
  assert.deepEqual(tags,[]);

});

QUnit.test( 'Can use epimerising reaction with children to support a linkage' , function( assert ) {
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
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 1);
  assert.equal(supported.map( res => res.identifier ).join(','),'New');
});

QUnit.test( 'Can use chain epimerisation and regular transferase to support linkages' , function( assert ) {
  let search_sequence = 'New(b1-4)Gal(b1-3)GlcNAc';

  let epimerisation_reaction = 'Man(b1-3)GlcNAc+"{New(b1-4)Gal}@y2a"';

  let chain_synthesis_reaction = 'GlcNAc+"{Man(b1-3)}@y1a"';

  let reactions = [ epimerisation_reaction, chain_synthesis_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 2);
  assert.equal(supported.map( res => res.identifier ).join(','),'Gal,New');
});

QUnit.test( 'Can use chain epimerisation and regular transferase to support linkages' , function( assert ) {
  let search_sequence = 'Glc(b1-2)[New(b1-4)]Gal(b1-3)GlcNAc';

  let epimerisation_reaction = 'Man(b1-3)GlcNAc+"{New(b1-4)Gal}@y2a"';

  let chain_synthesis_reaction = 'GlcNAc+"{Man(b1-3)}@y1a"';

  let chain_synthesis_reaction_post = 'Man(b1-3)GlcNAc+"{Glc(b1-2)}@y2a"';


  let reactions = [ epimerisation_reaction, chain_synthesis_reaction, chain_synthesis_reaction_post ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 3);
  assert.equal(supported.map( res => res.identifier ).join(','),'Gal,Glc,New');
});

QUnit.test( 'Support the HS epimerisation' , function( assert ) {
  let search_sequence = 'HSO3(u1-3)[HSO3(u1-N)[HSO3(u1-3)[HSO3(u1-2)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-4)]GlcNAc(a1-4)GlcA(b1-4)]GlcN(a1-4)GlcA(b1-4)[HSO3(u1-6)]GlcNAc(a1-4)GlcA(b1-4)GlcNAc(a1-4)]IdoA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let epimerisation_reaction = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)Xyl(b1-O)Ser+\"{HSO3(u1-N)GlcN}@y4a"';

  let chain_synthesis_reaction = 'GlcNAc(a1-4)*(u?-?)IdoA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+"{GlcA(b1-4)}@y7a"';

  let chain_synthesis_reaction_post = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)IdoA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser+"{GlcNAc(a1-4)}@y8a"';


  let reactions = [ epimerisation_reaction, chain_synthesis_reaction, chain_synthesis_reaction_post ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 10);
  assert.equal(supported.map( res => res.identifier ).join(','),'GlcA,GlcNAc,GlcA,GlcN,HSO3,GlcA,GlcNAc,GlcA,GlcNAc,GlcA');
});


QUnit.test( 'Support possible epimerisation' , function( assert ) {
  let search_sequence = 'GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-4)GlcNAc(a1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

  let epimerisation_reaction = 'GlcA(b1-4)GlcNAc(a1-4)*(u?-?)Xyl(b1-O)Ser+\"{HSO3(u1-N)GlcN}@y4a"';

  let reactions = [ epimerisation_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported = reactiongroup.supportsLinkageAt(test_sugar,'HSO3');
  assert.equal(supported.substrate.length,2,'Can find a residue to epimerise');
});


QUnit.test( 'Epimerisation does not erroneously support extra residues' , function( assert ) {
  let search_sequence = 'New(b1-4)Gal(b1-3)GlcNAc';

  let epimerisation_reaction = 'Man(b1-3)GlcNAc+"{New(b1-4)Gal}@y2a"';

  let reactions = [ epimerisation_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 1);
  assert.equal(supported.map( res => res.identifier ).join(','),'New');
});

QUnit.test( 'Epimerisation without extension works with chains' , function( assert ) {
  let search_sequence = 'Gal(b1-3)GlcNAc';

  let epimerisation_reaction = 'Man(b1-3)GlcNAc+"{Gal}@y2a"';

  let chain_synthesis_reaction = 'GlcNAc+"{Man(b1-3)}@y1a"';

  let reactions = [ epimerisation_reaction, chain_synthesis_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 1);
  assert.equal(supported.map( res => res.identifier ).join(','),'Gal');
});

QUnit.test( 'Epimerisation without extension does not work without previous chain' , function( assert ) {
  let search_sequence = 'Gal(b1-3)GlcNAc';

  let epimerisation_reaction = 'Man(b1-3)GlcNAc+"{Gal}@y2a"';

  let reactions = [ epimerisation_reaction ];

  let reactiongroup = new ReactionGroup();

  for (let sequence of reactions ) {
    let reactionset = new ReactionSet();
    let reaction = new IupacReaction();
    reaction.sequence = sequence;
    reactionset.addReactionRule(reaction);
    reactiongroup.addReactionSet(reactionset);
  }


  let test_sugar = new IupacSugar();
  test_sugar.sequence = search_sequence;
  let supported_tag = reactiongroup.supportLinkages(test_sugar);
  let supported = test_sugar.composition_for_tag(supported_tag);
  assert.equal(supported.length, 0);
  assert.equal(supported.map( res => res.identifier ).join(','),'');
});
