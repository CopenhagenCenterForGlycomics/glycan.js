
import { trace_into_class, TracedMonosaccharide } from './Tracing';

import { C as CSYMB, H as HSYMB, O as OSYMB, MASSES } from './Mass';

const C = MASSES.get(CSYMB);
const H = MASSES.get(HSYMB);
const O = MASSES.get(OSYMB);

const retained_test = (n,i,j) => ((n <= j && i === 0) || ((n <= i || n > j) && i !== 0));

// const UNDERIVATISED = Symbol('underivatised');
// const PERMETHYLATED = Symbol('permethylated');

// const MONOISOTOPICMASS = Symbol('monoisotopicmass');
// const AVERAGEMASS = Symbol('averagemass');

const AFRAG_MASS = {
  UNDERIVATISED : {
    MONOISOTOPICMASS: 0,
    AVERAGEMASS: 1
  },
  PERMETHYLATED : {
    MONOISOTOPICMASS: 2,
    AVERAGEMASS: 3
  }
};

const aFragMass = {
  'Hex' : {
    '0,2' : [120.0422584,120.10512,162.0892084,162.18576],
    '1,3' : [60.0211292,60.05256,88.0524292,88.10632],
    '2,4' : [60.0211292,60.05256,88.0524292,88.10632],
    '1,5' : [134.0579084,134.132,190.1205084,190.23952],
    '3,5' : [74.0367792,74.07944,102.0680792,102.1332],
    '0,4' : [60.0211292,60.05256,74.0367792,74.07944],
    '3,4' : [30.0105646,30.02628,44.0262146,44.05316],
  },
  'HexNAc' : {
    '0,2' : [120.0422584,120.10512,162.0892084,162.18576],
    '1,3' : [101.0476782,101.10512,129.0789782,129.15888],
    '2,4' : [60.0211292,60.05256,88.0524292,88.10632],
    '1,5' : [175.0844574,175.18456,231.1470574,231.29208],
    '3,5' : [74.0367792,74.07944,102.0680792,102.1332],
    '0,4' : [60.0211292,60.05256,74.0367792,74.07944],
    '3,4' : [30.0105646,30.02628,44.0262146,44.05316],
  },
  'Pent' : {
    '0,2' : [90.0316938,90.07884,118.0629938,118.1326],
    '1,3' : [60.0211292,60.05256,88.0524292,88.10632],
    '2,4' : [60.0211292,60.05256,88.0524292,88.10632],
    '1,5' : [104.0473438,104.10572,146.0942938,146.18636],
    '3,5' : [44.0262146,44.05316,58.0418646,58.08004],
    '0,4' : [30.0105646,30.02628,30.0105646,30.02628],
    '3,4' : [30.0105646,30.02628,44.0262146,44.05316],
  },
  'dHex' : {
    '0,2' : [104.0473438,104.10572,132.0786438,132.15948],
    '1,3' : [60.0211292,60.05256,88.0524292,88.10632],
    '2,4' : [60.0211292,60.05256,88.0524292,88.10632],
    '1,5' : [118.0629938,118.1326,160.1099438,160.21324],
    '3,5' : [58.0418646,58.08004,72.0575146,72.10692],
    '0,4' : [44.0262146,44.05316,44.0262146,44.05316],
    '3,4' : [30.0105646,30.02628,44.0262146,44.05316],
  },
  'HexA' : {
    '0,2' : [134.021523,134.08864,176.068473,176.16928],
    '1,3' : [60.0211292,60.05256,88.0524292,88.10632],
    '2,4' : [60.0211292,60.05256,88.0524292,88.10632],
    '1,5' : [148.037173,148.11552,204.099773,204.22304],
    '3,5' : [88.0160438,88.06296,116.0473438,116.11672],
    '0,4' : [74.0003938,74.03608,88.0160438,88.06296],
    '3,4' : [30.0105646,30.02628,44.0262146,44.05316],
  },
  'NeuAc' : {
    '0,2' : [221.0899366,221.21024,305.1838366,305.37152],
    '1,3' : [44.0262146,44.05316,58.0418646,58.08004],
    '2,4' : [101.0476782,101.10512,143.0946282,143.18576],
    '1,5' : [219.110672,219.23772,303.204572,303.399],
    '3,5' : [163.0844574,163.17356,233.1627074,233.30796],
    '0,4' : [120.0422584,120.10512,162.0892084,162.18576],
    '3,4' : [59.0371136,59.06784,87.0684136,87.1216],
  },
  'NeuGc' : {
    '0,2' : [237.0848512,237.20964,307.1631012,307.34404],
    '1,3' : [44.0262146,44.05316,58.0418646,58.08004],
    '2,4' : [117.0425928,117.10452,145.0738928,145.15828],
    '1,5' : [235.1055866,235.23712,305.1838366,305.37152],
    '3,5' : [179.079372,179.17296,235.141972,235.28048],
    '0,4' : [120.0422584,120.10512,162.0892084,162.18576],
    '3,4' : [75.0320282,75.06724,89.0476782,89.09412],
  }
};


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
    let cross_type;
    let fragmass = 0;
    if ( this.type ) {
      cross_type = this.type.match(/(\d,\d)-([ax])/);
      if (cross_type) {
        let ends = cross_type[1];
        let fragtype = cross_type[2];
        let proto = this.original.proto;
        if ( proto ) {
          fragmass = aFragMass[proto][ends][ AFRAG_MASS.UNDERIVATISED.MONOISOTOPICMASS ];
        }
        if (fragtype === 'a') {
          return fragmass;
        }
      }
    }
    return this.original.mass - fragmass;
  }
}

let Fragmentable = (base) => class extends base {

  constructor() {
    super();
    this.base_composition = [];
  }

  static get Monosaccharide() {
    return FragmentResidue;
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
  }

  get type() {
    return this.typestring;
  }

  get mass() {
    let base_mass = this.composition().map( res => res.mass ).reduce((s, v) => s + v );
    let R = H;
    let result_mass = base_mass;
    for (let type of this.type.split('/')) {
      if (type.match(/^y/)) {
        result_mass += H;
      }
      if (type.match(/^b/)) {
        result_mass += R - H;
      }
      if (type.match(/^z/)) {
        result_mass += 0 - O - H;
      }
      if (type.match(/^c/)) {
        result_mass += O + H + R;
      }
      if (type.match(/^\d,\d-[xw]/)) {
        result_mass += R;
      }
    }

    let linear_base;
    linear_base = this.type.match(/(\d,\d-[ew])/);
    linear_base = linear_base ? linear_base[1] : null;

    switch (linear_base) {
    case '1,1-e': result_mass += 0 + O; break;
    case '3,3-e': result_mass += 0 + O; break;
    case '5,5-e': result_mass += 0 - O - 2 * H - C; break;
    case '3,5-e': result_mass += 0 + 2 * H + C; break;
    case '1,1-w': result_mass += 0 - 2 * H - O; break;
    case '2,2-w': result_mass += 0 - 2 * H; break;
    case '3,3-w': result_mass += 0 - 2 * H - O; break;
    case '4,4-w': result_mass += 0 - 2 * H; break;
    case '5,5-w': result_mass += 0 + O + C + H; break;
    }

    if (this.type.match(/^[yz]/) || this.type.match(/^\d,\d-[xw]/)) {
      result_mass += O + R;
    }
    result_mass += -1 * (this.type.split('/').length - 1) * R;

    return result_mass;
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
  static *fragment(target,depth=2) {
    if ( ! (target.mass) ) {
      throw new Error('Sugar object class does not derive from Mass class');
    }
    const base = target.constructor;
    const Fragment = Fragmentable(base);

    let fragment_template = trace_into_class(target,Fragment);

    const max_depth = Math.max(...target.leaves().map( res => res.depth ));

    const get_coord_for_res = (target,res) => target.location_for_monosaccharide(res).substring(1);

    for (let chord of target.chords(depth)) {
      let base_types = [];
      if (is_reducing_end(target,chord)) {
        base_types.push( reducing_types );
      } else {
        base_types.push( nonreducing_types );
      }
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

export default Fragmentor;