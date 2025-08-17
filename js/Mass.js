
const C = Symbol('C');
const H = Symbol('H');
const O = Symbol('O');

const N = Symbol('N');
const P = Symbol('P');
const S = Symbol('S');

const NA = Symbol('Na');

import * as DEFAULT_MASS_PROVIDER from './mass_provider';

let CURRENT_MASS_PROVIDER = DEFAULT_MASS_PROVIDER;

CURRENT_MASS_PROVIDER.importSymbols({'C' : C, 'H': H, 'O': O, 'N': N, 'P': P, 'S': S, 'NA': NA });

class RemovableAtom {
  constructor(atom) {
    this.atom = atom;
  }
}

class Derivative {
  constructor(name) {
    this.name = name;
  }

  can_accept(atoms,position) {
    return true;
  }

  apply(atoms) {
    return [].concat(atoms);
  }

  reducing_end(atoms) {
    return atoms;
  }

  static Apply(atoms,new_atoms) {
    let result = Array.from(atoms);
    for (let item of new_atoms) {
      if (item instanceof RemovableAtom) {
        let idx = result.indexOf(item.atom);
        if (idx < 0) {
          throw new Error('Bad index');
        }
        result.splice(idx,1);
      } else {
        result.push(item);
      }
    }
    return result;
  }

}

class NonReducingDerivative extends Derivative {

}

class ReducingEnd extends Derivative {
  calculate_reducing_end(atoms,other_derivative) {
    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ ];
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

class ReducingEndFree extends ReducingEnd {
  calculate_reducing_end(atoms,other_derivative) {
    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ O, [H].concat(other_derivative_atoms), [H].concat(other_derivative_atoms) ].flat();
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

class ReducingEndReduced extends ReducingEnd {
  calculate_reducing_end(atoms,other_derivative) {
    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ O, [H].concat(other_derivative_atoms), [H].concat(other_derivative_atoms), [H], [H].concat(other_derivative_atoms) ].flat();
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

class ReducingEnd2AA extends ReducingEnd {
  calculate_reducing_end(atoms,other_derivative) {
    let label = [ C, C, C, C, C, C, C, // C7
                  H, H, H, H, H, H, H, // H7
                  N,
                  O, O ]; // O2

    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ O, [H].concat(other_derivative_atoms), [H].concat(other_derivative_atoms), [H], delete_composition(label, [O,H]) ].flat();
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

class ReducingEnd2AB extends ReducingEnd {
  calculate_reducing_end(atoms,other_derivative) {
    let label = [ C, C, C, C, C, C, C, // C7
                  H, H, H, H, H, H, H, H, // H8
                  N, N, // N2
                  O ];

    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ O, [H].concat(other_derivative_atoms), [H].concat(other_derivative_atoms), [H], delete_composition(label, [O,H]) ].flat();
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

const make_derivative = (name,accept= v => v,deriv_atoms=[],base=Derivative) => {
  let new_derivative = class extends base {
    constructor() {
      super(name);
    }

    get derivative_atoms() {
      return deriv_atoms;
    }

    can_accept(atoms,position) {
      return accept(atoms,position);
    }
    apply(atoms) {
      let result = super.apply(atoms);
      return Derivative.Apply(result,deriv_atoms);
    }

  }
  return Object.freeze(new new_derivative());
}

const can_accept_permethylation = (atoms) => {
  return (atoms.indexOf(O) >= 0 && atoms.indexOf(H) >= 0) || (atoms.indexOf(N) >= 0 && atoms.indexOf(H) >= 0);
}

const UNDERIVATISED = make_derivative('underivatised');
const PERMETHYLATED = make_derivative('permethylated',can_accept_permethylation,[C,H,H]);

const REDUCING_END_FREE = (Object.freeze(new ReducingEndFree('Free reducing end')));

const REDUCING_END_REDUCED = (Object.freeze(new ReducingEndReduced('Reduced reducing end')));

const REDUCING_END_2AA = (Object.freeze(new ReducingEnd2AA('2AA labelled reducing end')));

const REDUCING_END_2AB = (Object.freeze(new ReducingEnd2AB('2AB labelled reducing end')));


const DERIV_ETHYL_ESTER =       make_derivative('ethyl ester', (a,p) => p == 1, [C,C,H,H,H,H], NonReducingDerivative );
const DERIV_AMMONIA_AMIDATION = make_derivative('ammonia amidation', (a,p) => p == 1, [H, N, new RemovableAtom(O) ], NonReducingDerivative);

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

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OO
name:HexA
composition:C:6;H:8;O:6

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OO
name:GlcA
type:HexA

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:OO
name:IdoA
type:HexA

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH
name:NeuAc
type:NeuAc
composition:C:11;H:17;N:1;O:8

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHGc;6eq:-;7:OH;8:OH;9:HOH
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
  if (composition === 'O') {
    return [ O ];
  }

  if (composition === 'OH') {
    return [ O, H ];
  }
  if (composition === 'HOH') {
    return [ H, O, H ];
  }
  if (composition === 'OO') {
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

const delete_composition = (a,objs) => {
  for (let element of objs) {
    let pos = a.indexOf(element);
    if (pos >= 0) {
      a.splice(pos,1);
    }
  }
  return a;
}

const parse_terminii = (terminii) => {
  let ring = new Map();
  for (let position of terminii.split(';')) {
    if (position.match(/^r/)) {
      ring.set(parseInt( position[1] ) ,  { atoms: [ C, H ].concat( parse_atoms(position.split(':')[1])), reducing: true });
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
  return result;
};

const summarise_composition = (composition) => {
  let c = composition.filter( v => v == C).length;
  let n = composition.filter( v => v == N).length;
  let o = composition.filter( v => v == O).length;
  let h = composition.filter( v => v == H).length;
  return { C: c, N: n, O: o, H: h };
}

const log_composition_comparison = function(message,from,to) {
  let messages = [message];
  if (from.C != to.C) {
    messages.push(`C: ${to.C - from.C}`);
  }
  if (from.H != to.H) {
    messages.push(`H: ${to.H - from.H}`);
  }
  if (from.O != to.O) {
    messages.push(`O: ${to.O - from.O}`);
  }

  if (messages.length > 1) {
    console.log(messages.join(' '));
  }

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

const get_prototype_for = (identifier) => {
  let def = MONOSACCHARIDES[ identifier ];
  if (def && def.type) {
    def = MONOSACCHARIDES[ def.type ];
  }
  return def;
}

const add_derivative = (atoms,position,derivative) => {
  let result = Array.from(atoms);
  // FIXME - the derivative should include the H, so that
  // the underivatised atoms includes the H.
  if ( derivative.can_accept(atoms,position) ) {
    result = derivative.apply(atoms) //result.concat( DERIVATISATION_DELTAS.get(derivative) )
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
      .map( (atoms,idx) => add_derivative(atoms,idx+1,derivative) )
      .map( res => Object.freeze(res) )
    );
  }
  return Object.freeze([]);
};

const composition_to_map = (composition) => {
  let comp = new Map();
  for (let symbol of composition) {
    let curr = comp.get(symbol) || 0;
    comp.set(symbol,curr + 1);
  }
  return comp;
}

const composition_to_mass = (composition) => {
  return Mass.MASS_PROVIDER.composition_to_mass(composition_to_map(composition));
};

const get_composition_for = (identifier,derivative) => {
  let def = get_prototype_for(identifier);
  if ( ! def ) {
    return Object.freeze([]);
  }
  const base_composition = [O];
  let derivative_composition = get_ring_atoms_for(identifier,derivative,true).flat();
  return [...base_composition, ...derivative_composition ];
};

const ReferenceComposition = (monosaccharide) => {
  return get_composition_for(monosaccharide.identifier, monosaccharide.derivative);
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

/*
https://www.nist.gov/static/glyco-mass-calc/

*/

const derivative_info = Symbol('derivative')
const reducing_end_info = Symbol('reducing_end')


const Mass = (base) => {

  class MonosaccharideMass extends base.Monosaccharide {
    get mass() {
      return composition_to_mass(this.atoms);
    }

    get derivative() {
      if (! this[derivative_info] ) {
        this[derivative_info] = UNDERIVATISED;
      }
      return this[derivative_info];
    }

    set derivative(derivative) {
      let valid_derivative = [ UNDERIVATISED, PERMETHYLATED ].indexOf(derivative) >= 0;
      if (derivative === DERIV_ETHYL_ESTER) {
        valid_derivative = this.identifier == 'NeuAc' && this.parent && this.parent.linkageOf(this) == 6;
      }
      if (derivative === DERIV_AMMONIA_AMIDATION) {
        valid_derivative = this.identifier == 'NeuAc' && this.parent && this.parent.linkageOf(this) == 3;
      }

      if (!valid_derivative) {
        throw new Error('Bad derivative');
      }
      this[derivative_info] = derivative;
      return;
    }

    get reducing_end() {
      if (! this[reducing_end_info]) {
        this[reducing_end_info] = REDUCING_END_FREE;
      }
      return this[reducing_end_info];
    }

    set reducing_end(reduction) {
      this[reducing_end_info] = reduction;
    }

    get atoms() {
      let res = [O,...this.ring_atoms].flat();

      // We should remove the reducing end atoms from the composition
      // for all residues, and then add it back on to the
      // root at the end

      // res = delete_composition(res,this.derivative.reducing_end_atoms);
      let derivative = this.derivative;
      if (this.derivative instanceof NonReducingDerivative) {
        derivative = UNDERIVATISED;
      }
      res = delete_composition(res, REDUCING_END_FREE.calculate_reducing_end([],derivative));

      return res;

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

    get atoms() {
      if ( ! this.root ) {
        return [];
      }

      const monosaccharide_atoms = this.composition().
                                      map( res => res.atoms ).flat();

      // Only the parent sugar gets to add back in the reducing end atoms
      const reducing_end_deriv = this.root?.reducing_end;
      const other_derivative = this.root.derivative;
      const result = reducing_end_deriv.calculate_reducing_end(monosaccharide_atoms,other_derivative);

      return result;
    }

    get mass() {
      return composition_to_mass(this.atoms);
    }

    set reducing_end(reduction=REDUCING_END_FREE) {
      this.root.reducing_end = reduction;
    }

    derivatise(derivative) {
      for (let res of this.composition()) {
        res.derivative = derivative;
      }
    }
  };
};

Object.defineProperty(Mass, 'MASS_PROVIDER', {
  set(provider) {
    CURRENT_MASS_PROVIDER = provider;
    CURRENT_MASS_PROVIDER.importSymbols({'C' : C, 'H': H, 'O': O, 'N': N, 'P': P, 'S': S, 'NA': NA });
  },
  get() {
    return CURRENT_MASS_PROVIDER;
  }
});


export { C, H, O, N, NA,
         Mass,
         REDUCING_END_REDUCED, REDUCING_END_2AB, REDUCING_END_2AA, REDUCING_END_FREE,
         DERIV_ETHYL_ESTER, DERIV_AMMONIA_AMIDATION,
         UNDERIVATISED, PERMETHYLATED,
         calculate_a_fragment_composition,
         summarise_composition,
         composition_to_mass,
         composition_to_map,
         delete_composition,
         ReferenceComposition
       };