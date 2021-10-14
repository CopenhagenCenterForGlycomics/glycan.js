
import Sugar from './Sugar';

import { EpimerisableMonosaccharide } from './Epimerisation';
import Repeat from './Repeat';
import { comparator } from './ReactionSet';

let comment_symbol = Symbol('comment_string');
let negative_symbol = Symbol('is_negative');
let reaction_sugar = Symbol('reaction_sugar');
let reaction_position = Symbol('reaction_position');
let reaction_position_string = Symbol('reaction_position_string');

const validate_location = (sugar,location) => sugar.locate_monosaccharide(location);

const SEQUENCE_CACHEKEY = Symbol('Sequence Cache');

// We rewrite the sequence to
// get rid of the placeholder Root
// root monosaccharide.

let rewrite_sequence = base => {
  return class extends base {
    get sequence() {
      let seq = super.sequence;
      return seq.replace(/Root/,'');
    }
    set sequence(seq) {
      super.sequence = seq;
      return;
    }
  };
};


let parseReaction = (sugar) => {
  let comment = sugar[comment_symbol];
  let negative_flag = false;
  if (comment.indexOf('!') === 0) {
    comment = comment.substring(1);
    negative_flag = true;
  }
  let [ subseq, location ] = comment.split('@');
  subseq = subseq.replace(/[{}]/g,'');

  let reaction_class = rewrite_sequence(Sugar.CopyIO(sugar));

  let subsugar = new reaction_class();
  sugar[negative_symbol] = negative_flag;
  subsugar.sequence = subseq;

  sugar[ reaction_sugar ] = subsugar;
  sugar[ reaction_position ] = validate_location(sugar,location);
  if (!  sugar[ reaction_position ]) {
    throw new Error('Cannot locate attachment point');
  }

  if (subsugar.root.identifier !== 'Root') {
    let attachment = sugar[reaction_position];

    let epimierisable = new EpimerisableMonosaccharide(attachment,subsugar.root.identifier,false);
    attachment.donateChildrenTo(epimierisable);
    epimierisable.copyTagsFrom(attachment);
    if (attachment.parent) {
      attachment.parent.replaceChild(attachment,epimierisable);
    } else {
      sugar.root = epimierisable;
    }
    sugar[reaction_position] = epimierisable;
  }

  sugar[ reaction_position_string ] = location;
  sugar.attachment_tag = Symbol('attachment');
  sugar[ reaction_position ].setTag(sugar.attachment_tag);
};

const cache_symbol = Symbol('search_cache');
const find_sugar_substrates_caches = new Map();

let find_sugar_substrates = function(sugar,cacheKey) {
  let sugar_caches;
  let sugar_cache;

  const use_seqs = cacheKey === SEQUENCE_CACHEKEY;
  if (cacheKey) {
    if ( ! find_sugar_substrates_caches.has(cacheKey) ) {
      sugar_caches = use_seqs ? new Map : new WeakMap();
      find_sugar_substrates_caches.set(cacheKey,sugar_caches);
    } else {
      sugar_caches = find_sugar_substrates_caches.get(cacheKey);
    }
    sugar_cache = sugar_caches.get(use_seqs ? sugar.sequence : sugar);
    if ( ! sugar_cache ) {
      sugar_cache = new Map();
      sugar_caches.set(use_seqs ? sugar.sequence : sugar,sugar_cache);
    }
  }

  const is_epimerase = this.composition().some( res => res instanceof EpimerisableMonosaccharide);

  const cache_lookup_key = this.sequence+this[reaction_position_string];

  let cache_hit = sugar_cache ? sugar_cache.has(cache_lookup_key) : false;

  let results = sugar_cache ? ( sugar_cache.has(cache_lookup_key) ? sugar_cache.get(cache_lookup_key) : null ) : null;

  // The attachment tag is part of the reaction
  if ( ! results ) {
    let substrates = sugar.match_sugar_pattern(this,comparator) || [];
    results = substrates.map( match => {
      let first_tagged = match.composition_for_tag(this.attachment_tag)[0];
      if ( ! first_tagged ) {
        return;
      }
      return first_tagged.original;
    }).filter( r => r );
    if (sugar_cache && (!is_epimerase || results.length == 0)) {
      if (use_seqs) {
        sugar_cache.set(cache_lookup_key, results.map( res => sugar.location_for_monosaccharide(res) ));
      } else {
        sugar_cache.set(cache_lookup_key,results);
      }
    }
  }

  if (use_seqs && results[0] && typeof results[0] === 'string' ) {
    results = results.map( pos => sugar.locate_monosaccharide(pos) );
  }

  return results;
};

let execute = function(sugar,residue) {
  let all_locations;

  if ( ! residue ) {
    all_locations = [...find_sugar_substrates.call(this,sugar)].map( res => sugar.location_for_monosaccharide(res) );
  } else {
    all_locations = [ sugar.location_for_monosaccharide(residue) ];
  }

  let added = new Set();

  for (let attachment_location of all_locations ) {
    let attachment = sugar.locate_monosaccharide(attachment_location);
    let addition = this[ reaction_sugar ].clone();
    if (addition.root.identifier !== 'Root') {
      let epimierisable = new EpimerisableMonosaccharide(attachment,addition.root.identifier,true);
      if ( (attachment instanceof Repeat.Monosaccharide) && attachment.repeat.mode == Repeat.MODE_MINIMAL && ! (attachment.parent instanceof Repeat.Monosaccharide)  ) {
        // Special case starting repeat
        let current_parent = attachment.parent;
        let current_repeat = attachment.repeat;

        attachment.original.donateChildrenTo(epimierisable);
        current_repeat.template.root.parent.replaceChild(attachment.original,epimierisable);
        current_repeat.template.root = epimierisable;

        current_parent.replaceChild(attachment,current_repeat.root);

        attachment = epimierisable;
        added.add(epimierisable);

        for (let kid of addition.root.children) {
          attachment.graft(kid);
          [...addition.composition(kid)].forEach(added.add, added);
        }
        let cloned = current_repeat.clone();

        cloned.children = current_repeat.children;

        current_repeat.root.parent.replaceChild(current_repeat.root,cloned.root);
      } else {

        for (let kid of addition.root.children) {
          attachment.graft(kid);
          [...addition.composition(kid)].forEach(added.add, added);
        }
        attachment.donateChildrenTo(epimierisable);
        epimierisable.copyTagsFrom(attachment);

        attachment = sugar.locate_monosaccharide(attachment_location);
        if (attachment !== sugar.root) {
          attachment.parent.replaceChild(attachment,epimierisable);
        } else {
          sugar.root = epimierisable;
          attachment = epimierisable;
        }
        added.add(epimierisable);
      }
    } else {

      if ( (attachment instanceof Repeat.Monosaccharide) && attachment.repeat.mode == Repeat.MODE_MINIMAL ) {
        attachment = attachment.original;
      }

      // Simple addition of residues

      for (let kid of addition.root.children) {
        attachment.graft(kid);
        [...addition.composition(kid)].forEach(added.add, added);
      }

    }
  }

  return [...added];
};

let execute_all = function(sugar) {
  let results = [];
  let attach_symbol = Symbol('attach');
  for (let attachment of find_sugar_substrates.call(this,sugar)) {
    let addition = this[ reaction_sugar ].clone();
    attachment.setTag(attach_symbol,true);
    let new_sugar = sugar.clone();
    let new_attachment = new_sugar.composition_for_tag(attach_symbol)[0];
    for (let kid of addition.root.children) {
      new_attachment.graft(kid);
    }
    attachment.setTag(attach_symbol,null);
    new_attachment.setTag(attach_symbol,null);
    results.push(new_sugar);
  }
  return results;
};

let filter_delta_exists = function(attachments,sugar) {
  let delta = this.delta;
  let unmatched_attachments = attachments.filter( res => {
    return sugar.trace(delta,res,comparator).length == 0;
  });
  return unmatched_attachments;
};

class Reaction extends Sugar {
  set comment(comment) {
    this[comment_symbol] = comment;
    parseReaction(this);
    this.freeze();
    this.delta.freeze();
  }
  get comment() {
    if (this.delta) {
      return undefined;
    }
    return this[comment_symbol];
  }
  get delta() {
    return this[ reaction_sugar ];
  }

  get negative() {
    return this[ negative_symbol ];
  }

  // Move to a container class with positive and negative assertions
  tagSubstrateResidues(sugar,tag=Symbol('substrate'),cacheKey=null) {
    let test_result = find_sugar_substrates.call(this,sugar,cacheKey);
    if (this.negative) {
      let without_delta = filter_delta_exists.call(this,test_result,sugar);
      test_result = test_result.filter( res => without_delta.indexOf(res) < 0 );
    }
    test_result.forEach( res => res.setTag(tag) );
    return tag;
  }

  tagAvailableSubstrateResidues(sugar,tag=Symbol('substrate')) {
    let test_result = find_sugar_substrates.call(this,sugar);
    let without_delta = filter_delta_exists.call(this,test_result,sugar);
    test_result = test_result.filter( res => without_delta.indexOf(res) < 0 );
    test_result.forEach( res => res.setTag(tag) );
    return tag;
  }

  worksOn(sugar) {
    let test_result = find_sugar_substrates.call(this,sugar);
    if ( test_result.length < 1 ) {
      return this.negative || false;
    }
    if (this.negative) {
      let unmatched_attachments = filter_delta_exists.call(this,test_result,sugar);
      return unmatched_attachments.length > 0;
    } else {
      return true;
    }
  }

  // Move to a container class with positive and negative assertions
  execute(sugar,residue) {
    return execute.call(this,sugar,residue);
  }

  generate(sugar) {
    return execute_all.call(this,sugar);
  }


}

Reaction.Comparator = comparator;

export default Reaction;

export { SEQUENCE_CACHEKEY };
