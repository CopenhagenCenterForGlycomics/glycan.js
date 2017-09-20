
import Sugar from './Sugar';

let comment_symbol = Symbol('comment_string');
let reaction_sugar = Symbol('reaction_sugar');
let reaction_position = Symbol('reaction_position');


let getPropertyDescriptor = function(object,descriptor) {
  let retval = null;
  while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

const validate_location = (sugar,location) => sugar.locate_monosaccharide(location);

let parseReaction = (sugar) => {
  let comment = sugar[comment_symbol];
  let [ subseq, location ] = comment.split('@');
  subseq = subseq.replace(/[{}]/g,'');
  let parser_function = getPropertyDescriptor(sugar, 'sequence').set;
  let subsugar = new Sugar();
  subsugar.root = parser_function.call(subsugar,subseq);
  sugar[ reaction_sugar ] = subsugar;
  sugar[ reaction_position ] = validate_location(sugar,location);
};

class Reaction extends Sugar {
  set comment(comment) {
    this[comment_symbol] = comment;
    parseReaction(this);
  }
  get comment() {
    return this[comment_symbol];
  }
}

export default Reaction;