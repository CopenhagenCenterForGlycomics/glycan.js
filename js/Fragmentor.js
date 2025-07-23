
import { trace_into_class, TracedMonosaccharide } from './Tracing';

import { C as CSYMB,
         H as HSYMB,
         O as OSYMB,
         N as NSYMB,
         Mass,
         UNDERIVATISED,
         PERMETHYLATED,
         REDUCING_END_FREE,
         REDUCING_END_2AB,
         REDUCING_END_REDUCED,
         composition_to_mass,
         calculate_a_fragment_composition,
         delete_composition as del,
         summarise_composition
       } from './Mass';

const retained_test = (n,i,j) => ((n <= j && i === 0) || ((n <= i || n > j) && i !== 0));

const is_linkage_retained = (link,type) => {
  if ( ! type ) {
    return true;
  }
  if ( type.match(/^[bc]/)) {
    return true;
  }
  let positions = type.match(/(\d),(\d)-([ax])/);
  if ( positions ) {
    let i = parseInt(positions[1]);
    let j = parseInt(positions[2]);
    let reducing = positions[3] === 'x';
    let retained_test_res = retained_test(link > 5 ? 5 : link ,i,j);
    return reducing ? retained_test_res : ! retained_test_res;
  }
};

const rewrite_linear = (type) => {
  let base = type.substring(5);
  let start = type.substring(0,5);
  let newstart = start;
  switch (start) {
  case '1,1-e':
    newstart = '1,5-a';
    break;
  case '2,2-e':
    newstart = '0,2-a';
    break;
  case '3,3-e':
    newstart = '3,5-a';
    break;
  case '4,4-e':
  case '5,5-e':
    newstart = '0,4-a';
    break;
  case '1,3-e':
    newstart = '1,3-a';
    break;
  case '2,4-e':
    newstart = '2,4-a';
    break;
  case '3,5-e':
    newstart = '3,4-a';
    break;
  case '1,1-w':
    newstart = '1,5-x';
    break;
  case '2,2-w':
    newstart = '0,2-x';
    break;
  case '3,3-w':
    newstart = '3,5-x';
    break;
  case '4,4-w':
  case '5,5-w':
    newstart = '0,4-x';
    break;
  }
  return `${newstart}${base}`;
};

const children_with_fragment = (parent_type,children) => {
  let surviving_kids = children;
  if ( parent_type ) {
    if ( parent_type.match(/^[bc]/) ) {
      // surviving_kids = surviving_kids; // Reducing end modificaitions keep all the kids
    }
    let positions = parent_type.match(/(\d),(\d)-([ax])/);
    if ( positions ) {
      let i = parseInt(positions[1]);
      let j = parseInt(positions[2]);
      let reducing = positions[3] === 'x';
      surviving_kids = surviving_kids.filter( res => {
        let link = res.parent.linkageOf(res);
        let retained_test_res = retained_test(link > 5 ? 5: link,i,j);
        return reducing ? retained_test_res : ! retained_test_res;
      });
    }
  }
  surviving_kids = surviving_kids.filter( res => ! (res.type || '').match(/^[yz]/) );
  return surviving_kids;
};

class FragmentResidue extends TracedMonosaccharide {
  get children() {
    let all_children = super.children;
    return children_with_fragment( this.type, all_children );
  }
  get parent() {
    if ((this.type || '').match(/(^[bc]|-a)/)) {
      return undefined;
    }
    return super.parent;
  }

  get mass() {
    return composition_to_mass(this.atoms);
  }

  get atoms() {
    let cross_type;
    let a_composition = [];
    let base_atoms = Array.from([[OSYMB]].concat(this.original.ring_atoms));
    let result = [];
    if ( this.type ) {
      cross_type = this.type.match(/(\d,\d)-([ax])/);
      if (cross_type) {
        let frag_key = cross_type[1];
        let [start,end] = frag_key.split(',').map(val => +val );
        let fragtype = cross_type[2];
        let proto = this.original.proto;
        a_composition = calculate_a_fragment_composition(base_atoms,start,end,this.identifier.indexOf('Neu') >= 0);
        if (fragtype === 'a') {
          result = a_composition.flat();
        }
      }
    }
    if (result.length < 1) {
      result = del(base_atoms.flat(),a_composition.flat());
    }
    result = del(result, REDUCING_END_FREE.calculate_reducing_end([],this.original.derivative));
    return result;
  }
}

const FRAGMENT_ORIGNAL_MAP = new WeakMap();

let Fragmentable = (base) => class extends base {

  constructor() {
    super();
    this.base_composition = [];
  }

  static get Monosaccharide() {
    return FragmentResidue;
  }

  get original() {
    return FRAGMENT_ORIGNAL_MAP.get(this);
  }

  set original(original) {
    FRAGMENT_ORIGNAL_MAP.set(this,original);
  }

  get is_reducing_end() {
    return this.chordResidues.every( res => res.type.match(/(^[yz])|(\d,\d-[x])/));
  }

  get chord() {
    return this.chordResidues;
  }

  set chord(chord) {
    if ( ! this.base_root ) {
      this.base_root = this.root;
      this.base_composition = this.composition();
    }
    this.root = this.base_root;
    let in_chord = this.base_composition.filter( res => chord.chord.indexOf(res.original) >= 0 );
    this.chordResidues = chord.chord.map( res => in_chord.filter( mono => mono.original === res )[0] );
    this.root = ( chord.root === this.root.original ) ? this.root : in_chord.filter( res => res.original === chord.root )[0];
  }

  set type(type) {

    for (let res of this.base_composition) {
      res.type = null;
    }

    if ( ! type ) {
      return;
    }
    let fragtypes = type.split('/');
    for (let i = 0; i < fragtypes.length; i++) {
      if (fragtypes[i].match(/-[ew]/)) {
        fragtypes[i] = rewrite_linear(fragtypes[i]);
      }
      this.chordResidues[i].type = fragtypes[i];
    }
    this.typestring = type;

    let chord_root = this.base_root;
    let non_reducing_chord_residues = this.chordResidues.filter( (chord_res,i) => type.split('/')[i].match(/^(\d+,\d+-[ae]|[bc])/) );
    if (non_reducing_chord_residues.length > 0) {
      chord_root = non_reducing_chord_residues[0];
    }

    this.root = chord_root;

  }

  get type() {
    return this.typestring;
  }

  get mass() {
    return composition_to_mass(this.atoms);
  }

  get atoms() {
    // FIXME - the derivatives should be defined per residue if we are
    // calculating fragment masses
    let R = [HSYMB].concat(this.root.original.derivative.derivative_atoms);
    let base_composition = this.composition().map( res => res.atoms ).flat();
    let result_composition = [...base_composition];

    let types = this.type.split('/').filter((o,i,a) => a.indexOf(o) == i );

    for (let type of types) {
      if (type.match(/^y/)) {
        result_composition = result_composition.concat([HSYMB]);
      }
      if (type.match(/^b/)) {
        result_composition = result_composition.concat(R);
        result_composition = del(result_composition,[HSYMB]);
      }
      if (type.match(/^z/)) {
        result_composition = del(result_composition,[OSYMB,HSYMB]);
      }
      if (type.match(/^c/)) {
        result_composition = result_composition.concat(R);
        result_composition = result_composition.concat([ HSYMB, OSYMB ]);
      }
      if (type.match(/^\d,\d-[xw]/)) {
        result_composition = result_composition.concat(R);
      }
    }

    let linear_base;
    linear_base = this.type.match(/(\d,\d-[ew])/);
    linear_base = linear_base ? linear_base[1] : null;

    switch (linear_base) {
    case '1,1-e': result_composition.push(OSYMB); break;
    case '3,3-e': result_composition.push(OSYMB); break;
    case '5,5-e': result_composition = del(result_composition,[ OSYMB, HSYMB, HSYMB, CSYMB ]); break;
    case '3,5-e': result_composition = result_composition.concat([ HSYMB, HSYMB, CSYMB ]); break;
    case '1,1-w': result_composition = del(result_composition,[ OSYMB, HSYMB, HSYMB ]); break;
    case '2,2-w': result_composition = del(result_composition,[ HSYMB, HSYMB ]); break;
    case '3,3-w': result_composition = del(result_composition,[ OSYMB, HSYMB, HSYMB ]); break;
    case '4,4-w': result_composition = del(result_composition,[ HSYMB, HSYMB ]); break;
    case '5,5-w': result_composition = result_composition.concat([ OSYMB, HSYMB, CSYMB ]); break;
    }

    // The second regex match for a/e fragments is to get the
    // tests passing
    if (this.is_reducing_end) {

      const reducing_end_deriv = this.root.original.reducing_end;
      const other_derivative = this.root.original.derivative;
      result_composition = reducing_end_deriv.calculate_reducing_end(result_composition,other_derivative);

      result_composition = del(result_composition,[HSYMB].concat(this.root.original.derivative.derivative_atoms));


    } else if (this.type.match(/\d,\d-[a]/)) {

      const reducing_end_deriv = this.root.original.reducing_end;
      const other_derivative = this.root.original.derivative;
      result_composition = reducing_end_deriv.calculate_reducing_end(result_composition,other_derivative);
    }

    if (this.type.match(/^1,1-[w]/)) {
      result_composition = del(result_composition,[HSYMB]);
    }

    result_composition = del(result_composition, Array(types.length - 1).fill(R).flat());

    return result_composition;

  }

};

let get_coordinate = (coords,max_depth,type,idx) => {
  let [ depth, height ] = coords[idx].split('');
  depth = parseInt(depth);
  if (type.match(/(^[bc]|-a|-e)/)) {
    depth = 1 + max_depth - depth;
  }
  if (type.match(/(^[yz]|-x|-w)/)) {
    depth = depth - 1;
  }
  return type+depth+height;
};

const is_reducing_end = (sugar,chord) => chord.root === sugar.root && chord.chord[0] !== sugar.root ;

const fcart = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesian = (a, b, ...c) => (b ? cartesian(fcart(a, b), ...c) : a);

const reducing_types = ['y','z','3,5-x','1,3-x','1,5-x','2,4-x','0,2-x','0,4-x'];
const nonreducing_types = ['b','c','3,5-a','1,3-a','1,5-a','2,4-a','0,2-a','0,4-a'];

const retains_residue = (composition,res) => {
  if (res.type.match(/^[yz]/)) {
    return ( composition.indexOf( res.parent ) < 0 ||
             ! is_linkage_retained(res.parent.linkageOf(res), res.parent.type) );
  } else {
    return composition.indexOf( res ) < 0;
  }
};

class Fragmentor {

  static getFragment(target,type) {
    const base = target.constructor;
    const Fragment = Fragmentable(base);

    let fragment_template = trace_into_class(target,Fragment);
    let fragment = fragment_template.clone();
    let chord = type.split('/').map( frag_type => {
      let sub_type = frag_type;
      let match = frag_type.match(/(\d+,\d+-[xw]|[yz])(\d+)(.*)/);
      if (match) {
        sub_type = `y${(+match[2]+1)}${match[3]}`;
      }
      match = frag_type.match(/(\d+,\d+-[ae]|[bc])(\d+)(.*)/);
      if (match) {
        let max_depth = Math.max(...target.leaves().map( res => res.depth ));
        sub_type = `y${(max_depth - match[2] + 1)}${match[3]}`;
      }
      return target.locate_monosaccharide(sub_type);
    });
    let chord_root = target.root;
    let non_reducing_frags = chord.filter( (frag,i) => type.split('/')[i].match(/^(\d+,\d+-[ae]|[bc])/) );
    if (non_reducing_frags.length > 0) {
      chord_root = non_reducing_frags[0];
    }


    fragment.original = target;
    fragment.chord = { root: chord_root, chord };
    fragment.type = type;
    return fragment;
  }

  static *fragment(target,depth=2) {
    if ( ! ('mass' in target) ) {
      throw new Error('Sugar object class does not derive from Mass class');
    }
    const base = target.constructor;
    const Fragment = Fragmentable(base);

    let fragment_template = trace_into_class(target,Fragment);

    const max_depth = Math.max(...target.leaves().map( res => res.depth ));

    const get_coord_for_res = (target,res) => target.location_for_monosaccharide(res).substring(1);

    for (let chord of target.chords(depth)) {
      let base_types = [];

      // This is a fix for a test in test-gwb-compatibility
      // that enables a double reducing end fragment, where
      // one of the chord residues is closer to the root
      // than the other chord residue. 
      // The test is the 'cross ring dual reducing end fragments work'
      // This is based upon the behaviour of GlycoWorkBench
      // on a permethylated sugar with a free reducing end
      //

      base_types = [ reducing_types.concat(nonreducing_types) ];

      const all_types = base_types.concat(new Array(chord.chord.length - 1).fill( reducing_types ));
      if (chord.chord.indexOf(target.root) >= 0) {
        if (is_reducing_end(target,chord)) {
          all_types[ chord.chord.indexOf(target.root) ] = all_types[ chord.chord.indexOf(target.root) ].concat([ '1,1-w','2,2-w', '3,3-w', '4,4-w', '5,5-w' ]);
        } else {
          all_types[ chord.chord.indexOf(target.root) ] = all_types[ chord.chord.indexOf(target.root) ].concat([ '1,1-e','2,2-e', '3,3-e', '4,4-e', '5,5-e', '3,5-e','1,3-e','2,4-e']);
        }
      }
      let types = cartesian.apply(null,all_types);
      let coordinates = chord.chord.map(get_coord_for_res.bind(null,target));
      let coords = get_coordinate.bind(null,coordinates,max_depth);
      for (let type of types) {
        if ( ! Array.isArray(type) ){
          type = [type];
        }
        if ( type[0].match(/^[bc]/) && chord.root === target.root) {
          continue;
        }
        let fragment = fragment_template.clone();
        fragment.type = null;
        fragment.chord = chord;
        fragment.type = type.map(coords).join('/');
        fragment.original = target;

        let curr_composition = fragment.composition();
        if ( fragment.chordResidues.some(retains_residue.bind(null,curr_composition)) ) {
          continue;
        }
        yield fragment;
      }
    }

    for (let type of [ '3,5-x','1,3-x','1,5-x','2,4-x','0,2-x','0,4-x', '1,1-w','2,2-w', '3,3-w', '4,4-w', '5,5-w' ]) {
      let fragment = fragment_template.clone();
      fragment.type = null;
      fragment.chord = { root: target.root, chord: [ target.root ] };
      fragment.type = type+'0a';
      yield fragment;
    }
  }
}

export { FragmentResidue };

export default Fragmentor;