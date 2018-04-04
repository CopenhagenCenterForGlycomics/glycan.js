
import Sugar from './Sugar';

let comment_symbol = Symbol('comment_string');
let negative_symbol = Symbol('is_negative');
let reaction_sugar = Symbol('reaction_sugar');
let reaction_position = Symbol('reaction_position');
let reaction_position_string = Symbol('reaction_position_string');

const validate_location = (sugar,location) => sugar.locate_monosaccharide(location);
const attachment_tag = Symbol('attachment');

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
      return super.sequence;
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
  sugar[ reaction_position_string ] = location;
  sugar[ reaction_position ].setTag(attachment_tag);
};

let find_sugar_substrates = function(sugar) {
  // The attachment tag is part of the reaction
  let substrates = sugar.match_sugar_pattern(this,comparator) || [];
  return substrates.map( match => match.composition_for_tag(attachment_tag)[0].original );
};

let execute = function(sugar) {
  for (let attachment of find_sugar_substrates.call(this,sugar)) {
    let addition = this[ reaction_sugar ].clone();
    for (let kid of addition.root.children) {
      attachment.graft(kid);
    }
  }
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
  }
  get comment() {
    return this[comment_symbol];
  }
  get delta() {
    return this[ reaction_sugar ];
  }

  get negative() {
    return this[ negative_symbol ];
  }

  // Move to a container class with positive and negative assertions
  tagSubstrateResidues(sugar,tag=Symbol('substrate')) {
    let test_result = find_sugar_substrates.call(this,sugar);
    if (this.negative) {
      let without_delta = filter_delta_exists.call(this,test_result,sugar);
      test_result = test_result.filter( res => without_delta.indexOf(res) < 0 );
    }
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
  execute(sugar) {
    return execute.call(this,sugar);
  }

  generate(sugar) {
    return execute_all.call(this,sugar);
  }


}

export default Reaction;
