require('babel-polyfill');

const Glycan = require('./dist/js/index.js');

const fs = require('fs');
const reactions = JSON.parse(fs.readFileSync('./reactions.json', 'utf8'));

class IupacSugar extends Glycan.CondensedIupac.IO(Glycan.Sugar) {}

class IupacReaction extends Glycan.CondensedIupac.IO(Glycan.Reaction) {}

let reaction_group = new Glycan.ReactionGroup();

let create_reaction = (set,reac) => {
  let reac_obj = new IupacReaction();
  reac_obj.sequence = reac;
  set.addReactionRule(reac_obj);
};

for (let gene of Object.keys(reactions) ) {
  if (reactions[gene].reactions.length > 0) {
    let set = new Glycan.ReactionSet();
    reactions[gene].reactions.forEach( create_reaction.bind(null,set) );
    reaction_group.addReactionSet(set);
  }
}

let test_sugar = new IupacSugar();
test_sugar.sequence = 'GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)GalNAc(b1-4)GlcA(b1-3)Gal(b1-3)Gal(b1-4)Xyl(b1-O)Ser';

//'GlcNAc(b1-2)[GlcNAc(b1-4)]Man(a1-3)[GlcNAc(b1-2)[GlcNAc(b1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc(b1-N)Asn';//'NeuAc(a2-?)Gal(b1-3)GalNAc(a1-O)Ser';

let supported_symbol = reaction_group.supportLinkages(test_sugar);

let matched_residues = test_sugar.composition_for_tag(supported_symbol);

for (let matched of matched_residues) {
  console.log(matched.identifier,matched.parent.identifier);
}

for (let reac of reaction_group.reactions) {
  for (let matched of matched_residues) {
    if (matched.getTag(reaction_group.map.get(reac).residue)) {
      console.log(matched.identifier,matched.parent.identifier,reac.delta.sequence,reac.positive.map( r => r.sequence ));
    }
  }
}