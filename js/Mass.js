
const C = Symbol('C');
const H = Symbol('H');
const O = Symbol('O');

const N = Symbol('N');
const P = Symbol('P');
const S = Symbol('S');

const NA = Symbol('Na');

// const C = 12;
// const H = 1.0078250;
// const O = 15.9949146;

const MASSES = new Map();

MASSES.set(C,12);
MASSES.set(H,1.007825035);
MASSES.set(O,15.99491463);
MASSES.set(N,14.003074);
MASSES.set(NA,22.989771)

const UNDERIVATISED = Symbol('underivatised');
const PERMETHYLATED = Symbol('permethylated');


const REDUCING_ENDS = new Map();

REDUCING_ENDS.set(UNDERIVATISED, [ O, H, H ]);
REDUCING_ENDS.set(PERMETHYLATED, [ O, C, H, H, H, C, H, H, H ]);

const DERIVATISATION_DELTAS = new Map();

DERIVATISATION_DELTAS.set(UNDERIVATISED, []);
DERIVATISATION_DELTAS.set(PERMETHYLATED, [C,H,H]);


const DEFINITIONS =`
terminii:r1:x;2:x;3:x;4:x
name:P
type:ion
composition:P:1;H:2;O:3

terminii:r1:x;2:x;3:x;4:x
name:S
type:ion
composition:S:1;H:1;O:3

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:Hex
composition:C:6;H:10;O:5

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH
name:Gal
type:Hex

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:Glc
type:Hex

terminii:r1:OH;2eq:OH;3ax:OH;4eq:OH;5eq:-;6eq:HOH
name:Man
type:Hex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH
name:Galf
type:Hex

terminii:r1:OH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:HexNAc
composition:C:8;H:13;N:1;O:5

terminii:r1:OH;2eq:NAc;3eq:OH;4ax:OH;5eq:-;6eq:HOH
name:GalNAc
type:HexNAc

terminii:r1:OH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:GlcNAc
type:HexNAc

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OOH
name:HexA
composition:C:6;H:8;O:6

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OOH
name:GlcA
type:HexA

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OOH
name:IdoA
type:HexA

terminii:1ax:OOH;r2:OH;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:OH
name:NeuAc
type:NeuAc
composition:C:11;H:17;N:1;O:8

terminii:1ax:OOH;r2:OH;3ax:H;4eq:OH;5eq:NHGc;6eq:-;7:OH;8:OH;9:OH
name:NeuGc
type:NeuGc
composition:C:11;H:17;N:1;O:9

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:dHex
composition:C:6;H:10;O:4

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:Fuc
type:dHex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:Rha
type:dHex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Pent
composition:C:5;H:8;O:4

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Xyl
type:Pent

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Ara
type:Pent

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:HexN
composition:C:6;H:11;N:1;O:4

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:GlcN
type:HexN

terminii:r1:H
name:Me
type:alkyl
composition:C:1;H:3
`;

const parse_atoms = (composition) => {
  if (composition === 'H') {
    return [ H ];
  }

  if (composition === 'OH') {
    return [ O, H ];
  }
  if (composition === 'HOH') {
    return [ H, O, H ];
  }
  if (composition === 'OOH') {
    return [ O, O ];
  }
  if (composition === 'NH2') {
    return [ N, H, H ];
  }

  if (composition === 'HH') {
    return [ H, H ];
  }
  if (composition === 'NAc') {
    return [ N, H, C, O, C, H, H, H ];
  }
  if (composition === 'NHAc') {
    return [ N, H, C, O, C, H, H, H ];
  }
  if (composition === 'NHGc') {
    return [ N, H, C, O, C, H, H, O, H ];
  }
};

const parse_terminii = (terminii) => {
  let ring = new Map();
  for (let position of terminii.split(';')) {
    if (position.match(/^r/)) {
      ring.set(parseInt( position[1] ) ,  { atoms: [ C, H, O, H ], reducing: true });
      continue;
    }
    if (position.match(/-/)) {
      ring.set(parseInt( position[0] ) , { atoms: [ C, H ] });
      continue;
    }
    ring.set( parseInt( position[0] ), { atoms: [ C, H ].concat( parse_atoms(position.split(':')[1]) ) });
  }
  Object.freeze(ring);
  return ring;
};

const calculate_a_fragment_composition = (atoms,start,end,sialic=false) => {
  if (sialic && start > 0) {
    start = start + 1;
  }
  if (sialic && end > 0) {
    end = end + 1
  }
  let result = Array.from(atoms);
  let looper = start;
  while(looper < end) {
    result[++looper] = [];
  }
  if (result[1].length > 0) {
    // console.log('Swapping keeping', result.map( (pos,i) => pos.length == 0 ? i : null ));
    result = result.map( (pos,i) => pos.length == 0 ? atoms[i] : []);
  }
  let end_fill_start = sialic? 6 : 5;
  if (end >= end_fill_start) {
    let fill = atoms.length;
    while (fill >= (end_fill_start+1)) {
      if (atoms[fill]) {
        result[fill] = atoms[fill];
      }
      fill = fill - 1;
    }
  }
  if (sialic && (start == 0 || end >= 5)) {
    result = result.concat([H]);
  }
  return result;
};

const summarise_composition = (composition) => {
  let c = composition.filter( v => v == C).length;
  let n = composition.filter( v => v == N).length;
  let o = composition.filter( v => v == O).length;
  let h = composition.filter( v => v == H).length;
  return { C: c, N: n, O: o, H: h };
}

const parse_composition = (composition) => {
  let atoms = [];
  for (let part of composition.split(';')) {
    let [atom,number] = part.split(':');
    number = parseInt(number);
    switch (atom) {
    case 'C':
      atom = C;
      break;
    case 'H':
      atom = H;
      break;
    case 'O':
      atom = O;
      break;
    case 'N':
      atom = N;
      break;
    case 'P':
      atom = P;
      break;
    case 'S':
      atom = S;
      break;
    }
    atoms = atoms.concat( Array(number).fill(atom) );
  }
  Object.freeze(atoms);
  return atoms;
};

let read_definitions = () => {
  let parsed = {};
  for (let block of DEFINITIONS.replace(/^\n/,'').split('\n\n')) {
    let definition = {};
    for (let line of block.split('\n')) {
      let [field, value] = line.split(/^([^:]+):/).slice(1);
      switch (field) {
      case 'name' :
        definition.name = value;
        break;
      case 'terminii' :
        definition.ring = parse_terminii(value);
        break;
      case 'type' :
        definition.type = value;
        break;
      case 'composition':
        definition.composition = parse_composition(value);
      }
    }
    parsed[ definition.name ] = definition;
    Object.freeze(definition);
  }
  return parsed;
};

const MONOSACCHARIDES = read_definitions();

const composition_to_mass = (composition) => {
  return composition.map( atom => MASSES.get(atom) ).reduce( (a,b) => a + b, 0);
};

const get_prototype_for = (identifier) => {
  let def = MONOSACCHARIDES[ identifier ];
  if (def && def.type) {
    def = MONOSACCHARIDES[ def.type ];
  }
  return def;
}

const can_accept_derivative = (atoms) => {
  return (atoms.indexOf(O) >= 0 && atoms.indexOf(H) >= 0) || (atoms.indexOf(N) >= 0 && atoms.indexOf(H) >= 0);
}

const add_derivative = (atoms,derivative) => {
  let result = Array.from(atoms);
  if ( can_accept_derivative(atoms) ) {
    result = result.concat( DERIVATISATION_DELTAS.get(derivative) )
  }
  return result;
};

const get_ring_atoms_for = (identifier,derivative=UNDERIVATISED,reducing=true) => {
  let def = get_prototype_for(identifier);
  if (def && def.ring) {
    return Object.freeze(
      Array.from(def.ring.values())
      .filter( val => reducing || (!val.reducing) )
      .map( position => Array.from(position.atoms) )
      .map( atoms => add_derivative(atoms,derivative) )
      .map( res => Object.freeze(res) )
    );
  }
  return Object.freeze([]);
};

const count_derivative_positions = (ring, free) => {
  let count = ring.filter( can_accept_derivative ).length;
  if (free) {
    return count;
  } else {
    return count - 1;
  }
}

const get_mass_for = (identifier,derivative) => {
  return composition_to_mass(get_composition_for(identifier,derivative));
};

const get_composition_for = (identifier,derivative) => {
  let def = get_prototype_for(identifier);
  if ( ! def ) {
    return Object.freeze([]);
  }
  const base_composition = def.composition;
  let derivative_composition = [];

  const delta = DERIVATISATION_DELTAS.get(derivative);
  let oh_count = count_derivative_positions(get_ring_atoms_for(identifier,UNDERIVATISED,false),false);
  derivative_composition = Array(oh_count).fill( delta ).flat();
  return [...base_composition, ...derivative_composition ];
};

// Permethylated masses:
/*
terminii:r1:HOH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:GlcNAc

Skip r1, Then NAc,OH,OH,OH - 1 = 3*14

terminii:r1:HOH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:GalN
Skip r1, Then NH2 (2), OH, OH, OH - 1 = 4*14

terminii:r2:HOH;1ax:COOH;3ax:H;4:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:OH2
name:NeuAc
Skip r2, Then COOH,OH,NHAc,OH,OH,OH2 - 1 = 5*14

*/

const derivative_info = Symbol('derivative')


const Mass = (base) => {

  class MonosaccharideMass extends base.Monosaccharide {
    get mass() {
      return get_mass_for(this.identifier,this.derivative);
    }

    get derivative() {
      return this[derivative_info] || UNDERIVATISED;
    }

    set derivative(derivative) {
      if ([ UNDERIVATISED, PERMETHYLATED ].indexOf(derivative) < 0) {
        throw new Error('Bad derivative');
      }
      this[derivative_info] = derivative;
    }

    get atoms() {
      return get_composition_for(this.identifier, this.derivative);
    }

    get ring_atoms() {
      return get_ring_atoms_for(this.identifier, this.derivative);
    }

    get proto() {
      return (MONOSACCHARIDES[this.identifier] || {}).type;
    }
  }

  return class SugarMass extends base {
    static get Monosaccharide() { return MonosaccharideMass; }
    get mass() {
      // Only the parent sugar gets to add back in the masses
      const monosaccharide_mass = this.composition().map( res => res.mass ).reduce( (a,b) => a + b,0);
      const derivative_type = this.composition().map( res => res.derivative ).filter( (o,i,a) => a.indexOf(o) == i )[0];
      const reducing_end = REDUCING_ENDS.get(derivative_type).map ( atom => MASSES.get(atom) ).reduce( (a,b) => a + b, 0);
      return reducing_end + monosaccharide_mass;
    }
    derivatise(derivative) {
      for (let res of this.composition()) {
        res.derivative = derivative;
      }
    }
  };
};

export { C, H, O, N, NA, MASSES, Mass, UNDERIVATISED, PERMETHYLATED, calculate_a_fragment_composition, summarise_composition };