
import Sugar from './Sugar';

let comment_symbol = Symbol('comment_string');
let reaction_sugar = Symbol('reaction_sugar');
let reaction_position = Symbol('reaction_position');
let reaction_position_string = Symbol('reaction_position_string');

const validate_location = (sugar,location) => sugar.locate_monosaccharide(location);
const attachment_tag = Symbol('attachment');

let firstchar_comparator = (a,b) => a.identifier === b.identifier;

let comparator = (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return firstchar_comparator(a,b);
};


// We rewrite the sequence to
// get rid of the placeholder Root
// root monosaccharide.
// FIXME - Add in skip flags for monosaccharides?

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
  let [ subseq, location ] = comment.split('@');
  subseq = subseq.replace(/[{}]/g,'');

  let reaction_class = rewrite_sequence(Sugar.CopyIO(sugar));

  let subsugar = new reaction_class();
  subsugar.sequence = subseq;
  sugar[ reaction_sugar ] = subsugar;
  sugar[ reaction_position ] = validate_location(sugar,location);
  if (!  sugar[ reaction_position ]) {
    throw new Error('Cannot locate attachment point');
  }
  sugar[ reaction_position_string ] = location;
  sugar[ reaction_position ].setTag(attachment_tag);
};

let test_sugar_substrate = function(sugar) {
  return sugar.match_sugar_pattern(this,comparator);
};

let execute = function(sugar) {
  for (let substrate of this.canWorkOn(sugar)) {
    if ( ! substrate ) {
      throw new Error('Cannot execute reaction');
    }
    let addition = this[ reaction_sugar ].clone();
    for (let kid of addition.root.children) {
      substrate.composition_for_tag(attachment_tag)[0].original.graft(kid);
    }
  }
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

  canWorkOn(sugar) {
    return test_sugar_substrate.call(this,sugar);
  }

  execute(sugar) {
    return execute.call(this,sugar);
  }

}

export default Reaction;
