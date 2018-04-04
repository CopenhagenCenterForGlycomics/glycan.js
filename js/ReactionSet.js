
const reactions = Symbol('reactions');

let clean_tags = (tag) => { return res => res.setTag(tag,null); };

let not_in_array = (array) => { return el => array.indexOf(el) < 0; };

let find_sugar_substrates = function(sugar) {
  let result_attachments = [];
  for (let reaction of this.positive) {
    let current_attachment = reaction.tagSubstrateResidues(sugar);
    let attachments = sugar.composition_for_tag(current_attachment);
    attachments.forEach( clean_tags(current_attachment) );
    result_attachments = result_attachments.concat( attachments );
  }
  if (result_attachments.length < 1) {
    return result_attachments;
  }
  for (let reaction of this.negative) {
    let current_attachment = reaction.tagSubstrateResidues(sugar);
    let attachments = sugar.composition_for_tag(current_attachment);
    attachments.forEach( clean_tags(current_attachment) );
    result_attachments = result_attachments.filter( not_in_array(attachments) );
    if (result_attachments.length < 1) {
      return result_attachments;
    }
  }
  return result_attachments;
};

class ReactionSet {
  constructor() {
    this[reactions] = [];
  }

  get positive() {
    return this[reactions].filter( reac => ! reac.negative );
  }

  get negative() {
    return this[reactions].filter( reac => reac.negative );
  }

  addReactionRule(reaction) {
    this[reactions].push(reaction);
  }

  tagSubstrateResidues(sugar,tag=Symbol('substrate')) {
    for (let residue of find_sugar_substrates.call(this,sugar)) {
      residue.setTag(tag);
    }
    return tag;
  }

  worksOn(sugar) {
    return find_sugar_substrates.call(this,sugar).length > 0;
  }
  execute() {
  }
  generate() {
  }
}

export default ReactionSet;