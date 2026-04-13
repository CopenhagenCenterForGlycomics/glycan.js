
const C = Symbol('C');
const H = Symbol('H');
const O = Symbol('O');

const N = Symbol('N');
const P = Symbol('P');
const S = Symbol('S');

const NA = Symbol('Na');

import * as DEFAULT_MASS_PROVIDER from './mass_provider.js';
import { MONOSACCHARIDE } from './reference_monosaccharides.js';
import { TracedMonosaccharide } from './Tracing.js';
import monosaccharideData from './data/monosaccharides.json';
import { inchiToTerminii } from './InChITerminii.js';

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

  accepts_residue(monosaccharide) {
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
          throw new Error('Cannot remove atom');
        } else {
          result.splice(idx,1);

        }
      } else {
        result.push(item);
      }
    }
    return result;
  }

}

class DerivativeSet {
  #derivatives = [];
  #label = '';

  constructor(label,...derivatives) {
    this.#label = label;
    for (let deriv of derivatives) {
      this.#derivatives.push(deriv);
    }
  }

  firstValid(monosaccharide) {
    for (let deriv of this.#derivatives) {
      if (deriv.accepts_residue(monosaccharide)) {
        return deriv;
      }
    }
    return;
  }
}

class NonReducingDerivative extends Derivative {

}

class ReducingEnd extends Derivative {
  calculate_reducing_end(atoms,other_derivative,monosaccharide) {
    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [ ];
    return Derivative.Apply(result, reducing_end_atoms);
  }
}

class ReducingEndFree extends ReducingEnd {
  calculate_reducing_end(atoms,other_derivative,monosaccharide) {
    let result = super.apply(atoms);
    let other_derivative_atoms = other_derivative.derivative_atoms;
    let reducing_end_atoms = [H];
    let mono_ring_atoms = monosaccharide.original ? monosaccharide.original.ring_atoms : monosaccharide.ring_atoms;

    // FIXME - is this actually brittle?
    // The free reducing end really means that
    // you are adding 18 (O+H+H) when underivatised, that caps at the start and the end

    // This code below works, but it is weird that we need to add the other_derivative_atoms here
    // when it doesn't actually have anything to do with a free reducing end.
    // in get atoms() from MonosaccharideMass, it looks like it is being removed again!

    // res = delete_composition(res, REDUCING_END_FREE.calculate_reducing_end([],derivative,this));

    // And the same in FragmentResidue and Fragmentable from Fragmentor.js

    if ((typeof monosaccharide.parent_linkage == 'undefined') || other_derivative.can_accept([O,...mono_ring_atoms].flat(),monosaccharide.parent_linkage)) {
      reducing_end_atoms = reducing_end_atoms.concat(other_derivative_atoms);
    }
    let reducing_and_non_reducing_end_atom_correction = [ O, reducing_end_atoms, [H].concat(other_derivative_atoms) ].flat();
    let reducing_end_value = Derivative.Apply(result, reducing_and_non_reducing_end_atom_correction);
    return reducing_end_value;
  }
}

// FIXME - I am not sure what the correct thing to do with derivatives that do not cleanly apply
// to all H atoms should do here. This code only really works below because permethylation is applied to
// all residues, and doesn't care where the derivatisation occurs on the ring
// If you take the examples of the ethyl ester or ammonia amidation, these
// are only applied to specific positions on the ring, so this will end up adding way too
// much mass

// POSSIBLE SOLUTION - treat the reducing_end_atoms as the atoms at some fictional positions on the ring for Reduced / 2AA / 2AB as apprporiate,
// and test if the derivative can be applied there.
// e.g., reducing_end_atoms = [ [O] , [OH], [OH], [H], [OH] ]

// Add the extra O to the above array so permethylation can be accepted on those elements

// delete([O,O,O], reducing_end_atoms.map( atoms => add_derivative(atoms,-1,other_derivative) ).flat() )


// Permethylation should really be a transformation of the H to CHHH

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

const make_derivative = (name,accept= v => v,deriv_atoms=[],base=Derivative, acceptance_test = r => true ) => {
  let new_derivative = class extends base {
    constructor() {
      super(name);
    }

    get derivative_atoms() {
      return deriv_atoms;
    }

    accepts_residue(monosaccharide) {
      return acceptance_test(monosaccharide);
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

const DERIV_ETHYL_ESTER =       make_derivative('ethyl ester',
                                                (a,p) => p == 1,
                                                [C,C,H,H,H,H],
                                                NonReducingDerivative,
                                                r =>  r.monosaccharide === MONOSACCHARIDE.NeuAc && r.parent && r.parent.linkageOf(r) == 6 );

const DERIV_AMMONIA_AMIDATION = make_derivative('ammonia amidation',
                                                (a,p) => p == 1,
                                                [H, N, new RemovableAtom(O) ],
                                                NonReducingDerivative,
                                                r => r.monosaccharide === MONOSACCHARIDE.NeuAc && r.parent && r.parent.linkageOf(r) == 3 );

const DERIV_SIALIC_ACID = Object.freeze(new DerivativeSet('Sialic acid esterification, amidation',DERIV_ETHYL_ESTER,DERIV_AMMONIA_AMIDATION));


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

  if (composition === 'CHOHCHHOH') {
    return [ C, H, O, H, C, H, H, O, H ];
  }

  if (composition === 'Ac') {
    return [ C, O, C, H, H ];
  }

  if (composition === 'HOHAc') {
    return [ H,O, H, C, O, C, H, H ];
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

const load_definitions = () => {
  const parsed = {};
  for (const entry of monosaccharideData) {
    let terminiiStr;
    if (entry.inchi && !entry.terminii) {
      terminiiStr = inchiToTerminii(entry.name, entry.inchi).terminii;
    } else {
      terminiiStr = entry.terminii;
    }
    const definition = {
      name: entry.name,
      ring: parse_terminii(terminiiStr),
      type: entry.type ?? null,
      composition: entry.composition ? parse_composition(entry.composition) : null,
    };
    parsed[entry.name] = Object.freeze(definition);
  }
  return parsed;
};

const MONOSACCHARIDES = load_definitions();

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
  let regular_atoms = composition.filter( atom => !(atom instanceof RemovableAtom));
  let removable_atoms = composition.filter( atom => atom instanceof RemovableAtom ).map( removable => removable.atom );
  regular_atoms = delete_composition(regular_atoms,removable_atoms);
  return Mass.MASS_PROVIDER.composition_to_mass(composition_to_map(regular_atoms));
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
      let valid_derivative = derivative.accepts_residue(this);

      if (!valid_derivative) {
        return;
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
      res = delete_composition(res, REDUCING_END_FREE.calculate_reducing_end([],derivative,this));

      return res;

    }

    get ring_atoms() {
      return get_ring_atoms_for(this.identifier, this.derivative);
    }

    get proto() {
      return (MONOSACCHARIDES[this.identifier] || {}).type;
    }

    clone() {
      let cloned = super.clone();
      cloned[reducing_end_info] = this[reducing_end_info];
      cloned[derivative_info] = this[derivative_info];
      return cloned;
    }
  }

  return class SugarMass extends base {
    static get Monosaccharide() { return MonosaccharideMass; }

    get atoms() {
      if ( ! this.root ) {
        return [];
      }

      const monosaccharide_atoms = this.composition().
                                      map( res => res instanceof TracedMonosaccharide ? res.original : res ).
                                      map( res => res.atoms ).flat();

      // Only the parent sugar gets to add back in the reducing end atoms
      const reducing_end_deriv = this.root ? this.root.reducing_end : null;
      const other_derivative = this.root.derivative;
      const result = reducing_end_deriv.calculate_reducing_end(monosaccharide_atoms,other_derivative,this.root);

      return result;
    }

    get mass() {
      return composition_to_mass(this.atoms);
    }

    set reducing_end(reduction=REDUCING_END_FREE) {
      if (! this.root) {
        return;
      }
      this.root.reducing_end = reduction;
    }

    get reducing_end() {
      return this.root ? this.root.reducing_end : null;
    }

    derivatise(derivative) {
      for (let res of this.composition()) {
        if (derivative instanceof DerivativeSet) {
          let valid_derivative = derivative.firstValid(res);
          if (!valid_derivative) {
            continue;
          }
          res.derivative = valid_derivative;
        } else {
          res.derivative = derivative;
        }
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
         DERIV_ETHYL_ESTER, DERIV_AMMONIA_AMIDATION, DERIV_SIALIC_ACID,
         UNDERIVATISED, PERMETHYLATED,
         calculate_a_fragment_composition,
         summarise_composition,
         composition_to_mass,
         composition_to_map,
         delete_composition,
         ReferenceComposition,
         parse_terminii,
         parse_composition,
         parse_atoms,
         make_derivative,
         MONOSACCHARIDES,
         RemovableAtom,
         get_ring_atoms_for,
       };