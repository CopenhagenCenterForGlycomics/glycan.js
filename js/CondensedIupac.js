
import Monosaccharide from './Monosaccharide';
import { default as Repeat, RepeatMonosaccharide } from './Repeat';

let follow_bold_branch, create_bold_tree;

let write_link = link => {
  if (link < 0) {
    if (link === Monosaccharide.LINKAGES.O) {
      return 'O';
    }
    if( link === Monosaccharide.LINKAGES.N) {
      return 'N';
    }
  }
  return link <= 0 ? '?' : ''+link;
};

let parse_link = link_string => {
  if (Monosaccharide.LINKAGES[link_string]) {
    return Monosaccharide.LINKAGES[link_string];
  }
  return link_string == '?' ? 0 : parseInt(link_string);
};

let get_monosaccharide = (sugar,proto) => {
  // There should be a per-object
  // and per-class override of the
  // class that we use here to allow
  // for specific functionality
  // for some sugars
  let mono_class = sugar.constructor.Monosaccharide;

  // If the mono class is an ImmutableMonosaccharide
  // delete the removeChild method
  // delete the set parent
  // delete the set anomer
  // delete the set parent_linkage

  // move the addChild method into a symbol

  return new mono_class(proto);
};

follow_bold_branch = (sugar,units) => {
  let unit = units.shift();
  if ( ! unit ) {
    throw new Error('Empty branch');
  }
  let [child_root, linkage] = unit.split('(');
  let child = get_monosaccharide(sugar,child_root);
  create_bold_tree(sugar,child,units);
  return [ child, linkage ];
};

create_bold_tree = ( sugar, root, units ) => {
  let waiting_children = [];
  let child_adder = (parent,pair) => parent.addChild(pair[0],pair[1]);

  while (units.length > 0) {
    let unit = units.shift();
    if ( unit == ']' ) {
      let [child, linkage] = follow_bold_branch(sugar,units);
      let [anomer,parent_link,,child_link] = (linkage || '').split('');
      child.anomer = anomer;
      child.parent_linkage = parse_link(parent_link);
      waiting_children.push([parse_link(child_link),child]);
    } else if ( unit == '[' ) {
      waiting_children.reverse().forEach( child_adder.bind(null,root) );
      waiting_children.length = 0;
      return;
    } else {
      let [child_root, linkage] = unit.split('(');
      let [anomer,parent_link,,child_link] = (linkage || '').split('');
      let child = get_monosaccharide(sugar,child_root);
      child.anomer = anomer;
      child.parent_linkage = parse_link(parent_link);
      root.addChild(parse_link(child_link),child);
      waiting_children.reverse().forEach( child_adder.bind(null,root) );
      waiting_children.length = 0;
      root = child;
    }
  }
};

let reverse = function(string) {
  return string.split('').reverse().join('');
};

let matches_repeat = (key) => {
  return ( res => { return res.identifier === `Repeat${key}`; } );
};

const create_repeat_objects = (sugar,definitions) => {
  let residues = sugar.composition();
  for (let key of Object.keys(definitions)) {
    let repeat_placeholder = residues.filter( matches_repeat(key) ).shift();
    if ( ! repeat_placeholder ) {
      continue;
    }
    let repeat_seq = definitions[key].seq;
    let max_repeats = 1;
    let variable_identifier = '';
    if (definitions[key].variable.match(/^\d+$/)) {
      max_repeats = parseInt(definitions[key].variable);
    }
    if (definitions[key].variable.match(/[a-z]/)) {
      variable_identifier = definitions[key].variable;
    }
    const clazz = sugar.constructor;
    let repeat_sug = new clazz();
    repeat_sug.sequence = repeat_seq;
    let repeat_end = repeat_sug.root;
    while (repeat_end.children && repeat_end.children.length > 0) {
      repeat_end = repeat_end.children[0];
    }
    let location = repeat_sug.location_for_monosaccharide(repeat_end);
    let repeat = new Repeat(repeat_sug,location,1,max_repeats);

    if (variable_identifier) {
      repeat.identifier = variable_identifier;
    }

    let target = repeat_placeholder.parent;
    target.removeChild(target.linkageOf(repeat_placeholder),repeat_placeholder);
    target.graft(repeat.root);
    if (repeat_placeholder.children.length > 0) {
      repeat.child = repeat_placeholder.children[0];      
    }
  }
};

let parse_sequence = function(sequence) {
  let comment = '';
  [,sequence,comment]=sequence.match(/([^\+]+)(?:\+(\".+\"))*/);
  comment = (comment || '').replace(/^"/,'').replace(/"$/,'');

  const repeat_re = /{([^}]+)}([a-z]|\d+)/g;
  let repeat_match;
  let repeat_count = 0;
  let repeat_definitions = {};

  while ( (repeat_match = repeat_re.exec(sequence)) !== null ) {
    sequence = sequence.replace(repeat_match[0],`Repeat${++repeat_count}(u?-?)`);
    repeat_definitions[repeat_count] = { seq: repeat_match[1], variable: repeat_match[2] };
  }

  if (sequence.match(/[\]\)]$/)) {
    sequence = `${sequence}Root`;
  }
  sequence = sequence+')';
  let units = sequence.split(/([\[\]])/);

  // Reverse ordering of branches so we see closer residues first
  units = units.map( unit => unit.split(/\)(?=[A-Za-z\*])/).reverse().join(')') )
               .map( unit => unit.match(/\d$/) ? unit+')' : unit );

  // We wish to split the units by the linkages
  units = [].concat.apply([],units.map(unit => reverse(unit).split(')').filter( (unit) => unit.length ).map(reverse))).reverse();

  let root = get_monosaccharide( this, units.shift() );
  create_bold_tree(this,root,units);

  this.root = root;

  create_repeat_objects(this,repeat_definitions);

  if (comment) {
    this.comment = comment;
  }

  return root;
};


let write_monosaccharide = (mono) => {
  let name = mono.toString();

  let is_repeat_unit = mono instanceof RepeatMonosaccharide;
  let has_all_repeat_kids = (mono.children.length > 0) && mono.children.every( res => res instanceof RepeatMonosaccharide);
  let has_no_repeat_kids = (mono.children.length === 0) || mono.children.every( res => ! (res instanceof RepeatMonosaccharide) );
  if ((! is_repeat_unit) && has_all_repeat_kids) {
    return `}${mono.children[0].repeat.identifier}${name}`;
  }
  if ( is_repeat_unit &&
       mono.endsRepeat &&
       has_no_repeat_kids
      ) {
    return `{${name}`;
  }
  return name;
};

let write_linkage = (mono) => {
  if (! mono.parent ) {
    return '';
  }
  return '('+ mono.anomer + write_link(mono.parent_linkage) + '-';
};


let link_expander = function(links) {
  let position = links[0];
  return links[1].map( (mono) => [ position , mono ]);
};

let write_sequence = function(start=this.root) {
  let self = this;
  if ( ! start ) {
    return;
  }
  let child_sequence = ''+[].concat.apply([],[...start.child_linkages].sort( (a,b) => a[0] - b[0] ).map(link_expander)).map( kid => write_sequence.call(self,kid[1])+write_link(kid[0])+')' ).reduce( (curr,next) => curr ? curr+'['+next+']' : next , '' );
  let seq = child_sequence+write_monosaccharide(start)+write_linkage(start);
  if (start === this.root && this.comment) {
    return `${seq}+"${this.comment}"`;
  } else {
    return seq;
  }
};

let getPropertyDescriptor = function(object,descriptor) {
  let retval = null;
  while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

let Builder = function(superclass) {
  let getter = (getPropertyDescriptor(superclass.prototype, 'sequence') || { 'get' : null }).get;
  let setter = function(sequence) {
    parse_sequence.call(this,sequence);
  };
  let methods = {};
  if (getter) {
    methods.get = getter;
  }
  if (setter) {
    methods.set = setter;
  }
  Object.defineProperty(superclass.prototype, 'sequence', methods);

  return class extends superclass {
  };
};

let Writer = function(superclass) {
  let setter = (getPropertyDescriptor(superclass.prototype, 'sequence') || { 'set' : null }).set;
  let getter = function() {
    return write_sequence.call(this,this.root);
  };
  let methods = {};

  if (getter) {
    methods.get = getter;
  }
  if (setter) {
    methods.set = setter;
  }

  Object.defineProperty(superclass.prototype, 'sequence', methods);

  return class extends superclass {
  };
};

let anonymous_class = (superclass) => { return class extends superclass {}; };

let IO = (superclass) => Builder(Writer(anonymous_class(superclass)));

export {Builder,Writer,IO};
