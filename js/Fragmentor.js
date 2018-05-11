
import { trace_into_class, TracedMonosaccharide } from './Tracing';

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
    let retained_test_res = retained_test(link,i,j);
    return reducing ? retained_test_res : ! retained_test_res;
  }
};

const children_with_fragment = (parent_type,children) => {
  let surviving_kids = children;
  if ( parent_type ) {
    if ( parent_type.match(/^[bc]/) ) {
      surviving_kids = surviving_kids; // Reducing end modificaitions keep all the kids
    }
    let positions = parent_type.match(/(\d),(\d)-([ax])/);
    if ( positions ) {
      let i = parseInt(positions[1]);
      let j = parseInt(positions[2]);
      let reducing = positions[3] === 'x';
      surviving_kids = surviving_kids.filter( res => {
        let link = res.parent.linkageOf(res);
        let retained_test_res = retained_test(link,i,j);
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
  get identifier() {
    if (this.type && this.type.match(/-[ax]/)) {
      return super.identifier + '#' + this.type;
    }
    return super.identifier;
  }
  get parent() {
    if ((this.type || '').match(/(^[bc]|-a)/)) {
      return;
    }
    return super.parent;
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
      this.chordResidues[i].type = fragtypes[i];
    }
    this.typestring = type;
  }

  get type() {
    return this.typestring;
  }

};

let get_coordinate = (coords,max_depth,type,idx) => {
  let [ depth, height ] = coords[idx].split('');
  depth = parseInt(depth);
  if (type.match(/(^[bc]|-a)/)) {
    depth = 1 + max_depth - depth;
  }
  if (type.match(/(^[yz]|-x)/)) {
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
  }
}

export default Fragmentor;