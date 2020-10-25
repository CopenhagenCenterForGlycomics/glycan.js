
import Reaction from './Reaction';

import { CacheTrace } from './Searching';

import { EpimerisableMonosaccharide } from './Epimerisation';

import debug from './Debug';

const reactions = Symbol('reactions');

const reactionset = Symbol('reactionset');

const module_string='glycanjs:reactionset';

const log = debug(module_string);

const EPIMERISED_TAG = Symbol('has_been_epimerised');


let clean_tags = (tag) => { return res => res.setTag(tag,null); };

let not_in_array = (array) => { return el => array.indexOf(el) < 0; };

let only_unique = (v, i, s) => s.indexOf(v) === i;

let match_root_original = (res) => { return tree => tree.root.original === res; };

let identifier_comparator = (a,b) => {

  if (a.getTag(EPIMERISED_TAG) === b.identifier) {
    return true;
  }
  if (b.getTag(EPIMERISED_TAG) === a.identifier) {
    return true;
  }

  return (a.identifier === b.identifier);
};

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
    if (a.parent.linkageOf(a) === 0 || b.parent.linkageOf(b) === 0) {
      same_linkage = true;
    } else {
      same_linkage = a.parent.linkageOf(a) === b.parent.linkageOf(b);
    }
  }

  if ( ! a.parent && ! b.parent ) {
    same_linkage = true;
  }

  return same_id && same_linkage;
};

let filter_with_delta = function(attachments,sugar) {
  let delta = this.delta;
  let matched_attachments = attachments.map( res => {
    let trees = CacheTrace(sugar,delta,res,comparator);
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

  tagAvailableSubstrateResidues(sugar,tag=Symbol('substrate')) {
    let attachments = find_sugar_substrates.call(this,sugar);
    let unavailable = filter_with_delta.call(this,attachments,sugar);
    unavailable = [].concat.apply([],unavailable);
    unavailable = unavailable.map( tree => tree.root.original );
    let available = attachments.filter( res => unavailable.indexOf(res) < 0 );
    for (let residue of available) {
      if (! residue.parent && residue.children.length > 0 && residue.linkageOf(residue.children[0]) < 0 ) {
        continue;
      }
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

const create_reaction = (reaction_class,cache,reac) => {
  if (reac.length < 1) {
    return;
  }
  let set = new ReactionSet();
  for ( let seq of reac ) {
    let reac_obj = null;
    if (cache.has(seq)) {
      reac_obj = cache.get(seq);
    } else {
      reac_obj = new reaction_class();
      reac_obj.sequence = seq;
      cache.set(seq,reac_obj);
    }
    set.addReactionRule(reac_obj);
  }
  return set;
};


function getAllSupportedActions(sugar,reactions) {

  let possible_linkages = [];
  let possible_anomers = [];
  let possible_donors = [];

  for (let reaction of reactions) {
    let substrates = sugar.composition_for_tag(reaction.tagAvailableSubstrateResidues(sugar));
    if (substrates.length > 0) {
      let donor_res = reaction.delta.root.children[0];
      let reac_linkage = reaction.delta.root.linkageOf(donor_res);
      if ( ! substrates.some( res => res.childAt(reac_linkage) === undefined ) ) {
        continue;
      }
      let donor_seq = reaction.delta.root.identifier !== 'Root' ? reaction.delta.sequence : donor_res.toSugar(reaction.delta.constructor).sequence;
      possible_linkages.push(reac_linkage);
      possible_donors.push(donor_seq);
      possible_anomers.push(donor_res.anomer);
    }
  }
  possible_anomers = possible_anomers.filter(only_unique);
  possible_linkages = possible_linkages.filter(only_unique);
  possible_donors = possible_donors.filter(only_unique);

  return { anomer: possible_anomers, linkage: possible_linkages, donor: possible_donors, substrate: [] };

}

const reaction_cache = new Map();

class ReactionGroup {
  constructor() {
    this[reactionset] = [];
  }

  static groupFromJSON(json,sugarclass) {
    let reaction_group = new this();
    const reaction_class = Reaction.CopyIO(new sugarclass());

    for (let gene of Object.keys(json) ) {
      if (json[gene].reactions.length > 0) {
        for (let set of json[gene].reactions.map( create_reaction.bind(null,reaction_class,reaction_cache) )) {
          if (set) {
            reaction_group.addReactionSet(set);
          }
        }
      }
    }
    return reaction_group;
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
  tagAvailableSubstrateResidues(sugar,reactions=this.reactions,tag=Symbol('substrate')) {
    for (let reaction of reactions) {
      reaction.tagAvailableSubstrateResidues(sugar,tag);
    }
    return tag;
  }

  /* What possible linkages can be made on this sugar at the 
     given sugar, donor, linkage and substrate
   */

  supportsLinkageAt(sugar,donor,linkage,substrate,reactions=this.reactions) {

    if ( ! donor ) {
      return getAllSupportedActions(sugar,reactions);
    }

    let possible_linkages = [];
    let possible_anomers = [];
    let possible_donors = [];

    let donor_filtered = this.reactions.filter( reaction => {
      let donor_res = reaction.delta.root.children[0];
      let donor_seq = reaction.delta.root.identifier !== 'Root' ? reaction.delta.sequence : donor_res.toSugar(reaction.delta.constructor).sequence;
      let reac_linkage = reaction.delta.root.linkageOf(donor_res);
      let matching_donor = (! donor || (donor_seq === donor));
      return matching_donor;
    });

    let possible_substrates_for_reaction = new WeakMap();

    donor_filtered.forEach( reaction => {
      let substrates = sugar.composition_for_tag(reaction.tagAvailableSubstrateResidues(sugar));
      if (substrates.length > 0) {
        let donor_res = reaction.delta.root.children[0];
        let reac_linkage = reaction.delta.root.linkageOf(donor_res);
        let free_substrate_children = substrates.filter( res => res.childAt(reac_linkage) === undefined );
        possible_substrates_for_reaction.set(reaction,free_substrate_children);
        if (free_substrate_children.length > 0) {
          possible_linkages.push(reac_linkage);
          possible_anomers.push(donor_res.anomer);
        }
      }
    });

    let used_linkage_filtered = donor_filtered.filter( reac => (possible_substrates_for_reaction.get(reac) || []).length > 0 );

    let filtered_reactions = used_linkage_filtered;

    possible_anomers = possible_anomers.filter(only_unique);
    possible_linkages = possible_linkages.filter(only_unique);

    log.info(`Remaining reactions after filtering by donor ${donor_filtered.length}`);
    log.info(`Remaining reactions after filtering by used_linakge ${used_linkage_filtered.length}`);

    // If there isn't a linkage specified - what are the possible
    // linkages that this reaction set supports

    if ( used_linkage_filtered.length < 1 || (typeof linkage === 'undefined' && typeof substrate === 'undefined') ) {
      let substrates = used_linkage_filtered.map( reac => possible_substrates_for_reaction.get(reac) ).flat().filter(only_unique);
      return used_linkage_filtered.length > 0 ? { anomer: possible_anomers, linkage: possible_linkages, substrate: substrates } : { anomer:[], linkage: [], substrate: [] };
    }

    // If there is a linkage - filter the reactions down to the
    // reactions that support the linkage we want

    if (typeof linkage !== 'undefined') {
      let linkage_filtered = filtered_reactions.filter( reaction => {
        let donor_res = reaction.delta.root.children[0];
        let reac_linkage = reaction.delta.root.linkageOf(donor_res);
        return (reac_linkage === 0 || reac_linkage === linkage);
      });

      filtered_reactions = linkage_filtered;

      log.info(`Remaining reactions after filtering by linkage ${linkage_filtered.length}`);
      if ( linkage_filtered.length < 1 ) {
        return linkage_filtered.length > 0 ? { anomer: possible_anomers, linkage: [ linkage ], substrate: [] } : { anomer: [], linkage: [], substrate: [] };
      }
    }
    if ( substrate ) {
      possible_linkages = [];
      possible_anomers = [];
    }
    let possible_anomer_linkages = [];

    for (let reaction of filtered_reactions) {
      let substrates = possible_substrates_for_reaction.get(reaction);
      if (substrates.indexOf(substrate) >= 0) {
        let donor_res = reaction.delta.root.children[0];
        let reac_linkage = reaction.delta.root.linkageOf(donor_res);
        possible_linkages.push(reac_linkage);
        possible_anomers.push(donor_res.anomer);
        possible_anomer_linkages.push(donor_res.anomer+reac_linkage);
      }
    }

    possible_anomers = possible_anomers.filter(only_unique);
    possible_linkages = possible_linkages.filter(only_unique);

    if (possible_linkages.length > 0 && possible_anomers.length > 0 && substrate) {
      return { anomer: possible_anomers, linkage: possible_linkages, anomerlinks: possible_anomer_linkages , substrate: [ substrate ]};
    } else {
      return { anomer: possible_anomers, linkage: possible_linkages, substrate: [] };
    }
  }

  supportLinkages(sugar,reactions=this.reactions,with_support=Symbol('with_support')) {
    let symbol_map = new WeakMap();
    for ( let reaction of reactions ) {
      if ( ! symbol_map.has( reaction )) {
        symbol_map.set( reaction, { substrate: Symbol('substrate'), residue: Symbol('residue') });
      }

      var is_epimerisation_reaction = false;

      if (reaction instanceof ReactionSet) {
        for (let single_reaction of reaction.positive) {
          let epimerisable = single_reaction.composition().filter( res => res instanceof EpimerisableMonosaccharide );
          if (epimerisable.length > 0) {
            is_epimerisation_reaction = true;
            single_reaction.delta.root.setTag(EPIMERISED_TAG,epimerisable[0].identifier);
          }
          epimerisable.forEach( res => {
            res.enable();
          });
        }
      }

      reaction.tagSubstrateResidues(sugar,symbol_map.get(reaction).substrate);

      if (reaction instanceof ReactionSet) {
        for (let single_reaction of reaction.positive) {
          let epimerisable = single_reaction.composition().filter( res => res instanceof EpimerisableMonosaccharide );
          epimerisable.forEach( res => res.disable() );          
        }
      }

      let attachments = sugar.composition_for_tag(symbol_map.get(reaction).substrate);
      let trees = filter_with_delta.call(reaction,attachments,sugar);
      let supported = trees.map( tree => {
        let tree_root = tree[0];
        let part_supported = tree_root.composition(tree_root.root.children[0]);
        return part_supported.map( res => res.original );
      });

      if (is_epimerisation_reaction) {
        for (let tree of trees.flat()) {
          for (let epimerised of tree.composition_for_tag(EPIMERISED_TAG)) {
            epimerised.original.setTag(EPIMERISED_TAG, epimerised.getTag(EPIMERISED_TAG));
          }
        }
      }

      for (let residue of [].concat.apply([], supported)) {
        if (residue.getTag(EPIMERISED_TAG) && is_epimerisation_reaction) {
          continue;
        }
        residue.setTag(symbol_map.get(reaction).residue);
        residue.setTag(with_support);
      }
    }
    this.map = symbol_map;
    return with_support;
  }

}

export {ReactionSet, ReactionGroup, comparator };