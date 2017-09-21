
import Sugar from './Sugar';

let comment_symbol = Symbol('comment_string');
let reaction_sugar = Symbol('reaction_sugar');
let reaction_position = Symbol('reaction_position');

const validate_location = (sugar,location) => sugar.locate_monosaccharide(location);


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
}

export default Reaction;