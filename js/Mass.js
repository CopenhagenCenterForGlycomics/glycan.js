
const C = Symbol('C');
const H = Symbol('H');
const O = Symbol('O');

const N = Symbol('N');
const P = Symbol('P');
const S = Symbol('S');

// const C = 12;
// const H = 1.0078250;
// const O = 15.9949146;

const MASSES = new Map();

MASSES.set(C,12);
MASSES.set(H,1.007825035);
MASSES.set(O,15.99491463);
MASSES.set(N,14.003074);

const UNDERIVATISED = Symbol('underivatised');
const PERMETHYLATED = Symbol('permethylated');

const DEFINITIONS =`
terminii:r1:x;2:x;3:x;4:x
name:P
type:ion
composition:P:1;H:2;O:3

terminii:r1:x;2:x;3:x;4:x
name:S
type:ion
composition:S:1;H:1;O:3

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:Gal
type:Hex

terminii:r1:HOH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:Hex
composition:C:6;H:10;O:5

terminii:r1:HOH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:Glc
type:Hex

terminii:r1:HOH;2eq:NAc;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:GalNAc
type:HexNAc

terminii:r1:HOH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:HexNAc
composition:C:8;H:13;N:1;O:5

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:HexA
composition:C:6;H:8;O:6

terminii:r1:HOH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:OH
name:GlcNAc
type:HexNAc

terminii:r2:HOH;1ax:COOH;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:OH
name:NeuAc
type:NeuAc
composition:C:11;H:17;N:1;O:8

terminii:r2:HOH;1ax:COOH;3ax:H;4eq:OH;5eq:NHGc;6eq:-;7:OH;8:OH;9:OH
name:NeuGc
type:NeuGc
composition:C:11;H:17;N:1;O:9

terminii:r1:HOH;2eq:OH;3ax:OH;4eq:OH;5eq:-;6eq:OH
name:Man
type:Hex

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:Galf
type:Hex

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:GlcA
type:HexA

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:IdoA
type:HexA

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:Fuc
type:dHex

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:Rha
type:dHex

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OH
name:dHex
composition:C:6;H:10;O:4

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:-;5eq:OH
name:Pent
composition:C:5;H:8;O:4

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:-;5eq:OH
name:Xyl
type:Pent

terminii:r1:HOH;2eq:OH;3eq:OH;4ax:-;5eq:OH
name:Ara
type:Pent

terminii:r1:H
name:Me
type:alkyl
composition:C:1;H:3
`;
/*
const parse_atoms = (composition) => {
  if (composition === 'OH') {
    return [ O, H ];
  }
  if (composition === 'COOH') {
    return [ C, O, O, H, O ];
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
  let ring = [];
  for (let position of terminii.split(';')) {
    if (position.match(/^r/)) {
      ring[ parseInt( position[1] ) ] = { atoms: [ C, H, O, H ], reducing: true };
      continue;
    }
    if (position.match(/-/)) {
      ring[ parseInt( position[1] ) ] = { atoms: [ C ] };
    }
    ring[ parseInt( position[0] )] = { atoms: [ C, H ].concat( parse_atoms(position.split(':')[1]) ) };
  }
};
*/

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
        // definition.ring = parse_terminii(value);
        break;
      case 'type' :
        definition.type = value;
        break;
      case 'composition':
        definition.composition = parse_composition(value);
      }
    }
    parsed[ definition.name ] = definition;
  }
  return parsed;
};

const MONOSACCHARIDES = read_definitions();

const composition_to_mass = (composition) => {
  return composition.map( atom => MASSES.get(atom) ).reduce( (a,b) => a + b, 0);
};

const get_mass_for = (identifier) => {
  let def = MONOSACCHARIDES[ identifier ];
  if (def && def.type) {
    def = MONOSACCHARIDES[ def.type ];
  }
  if ( ! def ) {
    return 0;
  }
  return composition_to_mass(def.composition);
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

    get proto() {
      return (MONOSACCHARIDES[this.identifier] || {}).type;
    }
  }

  return class SugarMass extends base {
    static get Monosaccharide() { return MonosaccharideMass; }
    get mass() {
      return 2*MASSES.get(H) + MASSES.get(O) + this.composition().map( res => res.mass ).reduce( (a,b) => a + b,0);
    }
    derivatise(derivative) {
      for (let res of this.composition()) {
        res.derivative = derivative;
      }
    }
  };
};

export { C, H, O, N, MASSES, Mass, UNDERIVATISED, PERMETHYLATED };