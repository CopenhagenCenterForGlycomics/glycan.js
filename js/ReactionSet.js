
const reactions = Symbol('reactions');

const reactionset = Symbol('reactionset');

let clean_tags = (tag) => { return res => res.setTag(tag,null); };

let not_in_array = (array) => { return el => array.indexOf(el) < 0; };

let match_root_original = (res) => { return tree => tree.root.original === res; };

let identifier_comparator = (a,b) => a.identifier === b.identifier;

let comparator = (a,b) => {
  if ( ! a || ! b ) {
    return false;
  }
  if (a.identifier === '*' || b.identifier === '*') {
    return true;
  }

  let same_id = identifier_comparator(a,b);
  let same_linkage = false;

  if ( a.parent && b.parent ) {
    same_linkage = a.parent.linkageOf(a) === b.parent.linkageOf(b);
  }

  if ( ! a.parent && ! b.parent ) {
    same_linkage = true;
  }

  return same_id && same_linkage;
};

let filter_with_delta = function(attachments,sugar) {
  let delta = this.delta;
  let matched_attachments = attachments.map( res => {
    let trees = sugar.trace(delta,res,comparator);
    trees = trees.filter( match_root_original(res) );
    return trees;
  }).filter( trace_result => trace_result.length > 0 );
  return matched_attachments;
};

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

  get delta() {
    return this.positive[0].delta;
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

class ReactionGroup {
  constructor() {
    this[reactionset] = [];
  }

  get reactions() {
    return this[reactionset];
  }

  addReactionSet(reaction) {
    if (this[reactionset].indexOf(reaction) < 0) {
      this[reactionset].push(reaction);
    }
    return reaction;
  }

  supportLinkages(sugar) {
    let symbol_map = {};
    for ( let reaction of this.reactions ) {
      symbol_map[ reaction ] = symbol_map[ reaction ] || Symbol('substrate');
      reaction.tagSubstrateResidues(sugar,symbol_map[reaction]);
      let attachments = sugar.composition_for_tag(symbol_map[reaction]);
      let trees = filter_with_delta.call(reaction,attachments,sugar);
      let supported = trees.map( tree => tree[0].root.children[0].original );
      console.log(supported.map( res => [res.identifier, res.parent.identifier, res.depth ] ));
    }
  }

}

export {ReactionSet, ReactionGroup};