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
test_sugar.sequence = 'NeuAc(a2-?)Gal(b1-3)GalNAc(a1-O)Ser';

let supported_symbol = reaction_group.supportLinkages(test_sugar);

console.log(test_sugar.composition_for_tag(supported_symbol).map( res => res.identifier ));