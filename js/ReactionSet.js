
const reactions = Symbol('reactions');

const reactionset = Symbol('reactionset');

import * as debug from 'debug-any-level';

const module_string='glycanjs:reactionset';

const log = debug(module_string);

let clean_tags = (tag) => { return res => res.setTag(tag,null); };

let not_in_array = (array) => { return el => array.indexOf(el) < 0; };

let only_unique = (v, i, s) => s.indexOf(v) === i;

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
  tagSubstrateResidues(sugar,reactions=this.reactions,tag=Symbol('substrate')) {
    for (let reaction of reactions) {
      reaction.tagSubstrateResidues(sugar,tag);
    }
    return tag;
  }
  supportsLinkageAt(sugar,donor,linkage,substrate) {
    let possible_linkages = [];
    let possible_anomers = [];
    let donor_filtered = this.reactions.filter( reaction => {
      let donor_res = reaction.delta.root.children[0];
      let reac_linkage = reaction.delta.root.linkageOf(donor_res);
      possible_linkages.push(reac_linkage);
      possible_anomers.push(donor_res.anomer);
      return (donor_res.identifier === donor);
    });

    possible_anomers = possible_anomers.filter(only_unique);
    possible_linkages = possible_linkages.filter(only_unique);

    log.info('Remaining reactions after filtering by donor',donor_filtered.length);

    // If there isn't a linkage specified - what are the possible
    // linkages that this reaction set supports

    if ( donor_filtered.length < 1 || typeof linkage === 'undefined' ) {
      return donor_filtered.length > 0 ? { anomer: possible_anomers, linkage: possible_linkages } : { anomer:[], linkage: [] };
    }

    // If there is a linkage - filter the reactions down to the
    // reactions that support the linkage we want

    let linkage_filtered = donor_filtered.filter( reaction => {
      let donor_res = reaction.delta.root.children[0];
      let reac_linkage = reaction.delta.root.linkageOf(donor_res);
      return (reac_linkage === 0 || reac_linkage === linkage);
    });

    log.info('Remaining reactions after filtering by linkage',linkage_filtered.length);

    if ( linkage_filtered.length < 1 || typeof substrate === 'undefined' ) {
      return linkage_filtered.length > 0 ? { anomer: possible_anomers, linkage: [ linkage ] } : { anomer: ['a','b'], linkage: [] };
    }

    let supported_tag = this.tagSubstrateResidues(sugar,linkage_filtered);
    let supported = sugar.composition_for_tag(supported_tag);

    log.info('Total residues that are possible substrates',supported.length);

    if (supported.indexOf(substrate) >= 0 ) {
      return { anomer: possible_anomers, linkage: [ linkage ], substrate: [ substrate ]};
    } else {
      return { anomer: possible_anomers, linkage: [], substrate: [] };
    }
  }

  supportLinkages(sugar,reactions=this.reactions) {
    let symbol_map = new WeakMap();
    let with_support = Symbol('with_support');
    for ( let reaction of reactions ) {
      if ( ! symbol_map.has( reaction )) {
        symbol_map.set( reaction, { substrate: Symbol('substrate'), residue: Symbol('residue') });
      }
      reaction.tagSubstrateResidues(sugar,symbol_map.get(reaction).substrate);
      let attachments = sugar.composition_for_tag(symbol_map.get(reaction).substrate);
      let trees = filter_with_delta.call(reaction,attachments,sugar);
      let supported = trees.map( tree => {
        let tree_root = tree[0];
        let part_supported = tree_root.composition(tree_root.root.children[0]);
        return part_supported.map( res => res.original );
      });
      for (let residue of [].concat.apply([], supported)) {
        residue.setTag(symbol_map.get(reaction).residue);
        residue.setTag(with_support);
      }
    }
    this.map = symbol_map;
    return with_support;
  }

}

export {ReactionSet, ReactionGroup};