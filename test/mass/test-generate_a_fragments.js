/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, PERMETHYLATED, MASSES, summarise_composition, calculate_a_fragment_composition as a_frag_for }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

const mass_diff = (a,b,tolerance=1e-04) => {
	return Math.abs(a-b) <= tolerance
};

const to_mass = (atoms) => {
  return atoms.flat().map( symb => MASSES.get(symb)).reduce((a,b) => a+b,0);
}

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

/**
 * Compare numbers taking in account an error
 *
 * @param  {Float} number
 * @param  {Float} expected
 * @param  {Float} error    Optional
 * @param  {String} message  Optional
 */
QUnit.assert.close = function(number, expected, error=1e-04, message) {
  if (error === void 0 || error === null) {
    error = 0.00001 // default error
  }

  var result = number == expected || (number < expected + error && number > expected - error) || false

  this.pushResult({ result, actual: number.toFixed(4), expected: `${expected.toFixed(4)} +/- ${error}`, message});
}

function compToObj(str) {
  const result = {C:0,H:0,N:0,O:0};
  
  // Find all letters followed by numbers
  str.match(/[A-Z]\d+/g).forEach((match) => {
    // The first character is the element symbol, the rest are its count
    let elemSymbol = match[0];
    let elemCount = parseInt(match.slice(1), 10);
    
    result[elemSymbol] = elemCount;
  });
  return result;
}

function massFromCompObj(comp) {
  return comp.C * MASSES.get(C) + comp.H * MASSES.get(H) + comp.N * MASSES.get(N) + comp.O * MASSES.get(O);
}


// PMID: 15961488
const MECHEREF_MASSES = require('./mechref_reference.json');

const GLYCOSIDIQ_MASSES = require('./glycosidiq_reference.json');

const GLYCOWORKBENCH_MASSES_RAW = require('./glycoworkbench_reference.json');

const GLYCOWORKBENCH_MASSES = Object.fromEntries(Object.entries(GLYCOWORKBENCH_MASSES_RAW).map ( ([res,val]) => {
  let fixed_val = Object.entries(val).map( ([frag,comp]) => {
    return [frag,{ composition: compToObj(comp), mass: massFromCompObj(compToObj(comp)) }];
  });
  return [res, Object.fromEntries(fixed_val)];
}));


const REFERENCE_MASSES = [];

for (let mono of Object.keys(GLYCOWORKBENCH_MASSES).filter( v => ['Gal','GalNAc','Xyl','Fuc','GlcA','GlcN','NeuAc','NeuGc'].indexOf(v) >= 0)) {
  let compositions = GLYCOWORKBENCH_MASSES[mono];
  for (let frag_key of Object.keys(compositions).filter(val => val.match(/^a/))) {
    let wanted = compositions[frag_key].mass;
    let [start,end] = frag_key.split('-')[1].split(',').map(val => +val );
    REFERENCE_MASSES.push(["glycoworkbench", mono, `a${start}-${end}`, wanted ]);
  }
}
for (let mono of Object.keys(GLYCOSIDIQ_MASSES)) {
  let sugar = new IupacSugar();
  let masses = GLYCOSIDIQ_MASSES[mono];
  for (let frag_key of Object.keys(masses)) {
    let wanted = masses[frag_key][0];
    let [start,end] = frag_key.split(',').map(val => +val );
    REFERENCE_MASSES.push(["glycosidiq", mono, `a${start}-${end}`, wanted ]);
  }
}
for (let {residue: mono,masses} of MECHEREF_MASSES) {
  let sugar = new IupacSugar();
  sugar.sequence = mono;
  let contra_mass = sugar.root.mass;
  for (let frag_key of Object.keys(masses)) {
    // Apply a systematic fix to the delta mass
    let wanted = masses[frag_key] - MASSES.get(H);
    let [start,end] = frag_key.split(',').map(val => +val );
    REFERENCE_MASSES.push(["mechref", mono, `a${start}-${end}`, contra_mass - wanted ]);
  }
}

// Issues with NeuAc 1,4, 1,3
// Xyl masses from MECHREF look wrong when inspecting 3D model
// GlcA errors off by H, corresponds to the delta in mass we
// need to systematically apply to the wanted masses 
// from the table

// Contra masses all match up correctly with GlycanMass from Expasy

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides from MECHREF' , function( assert ) {
  for (let {residue: mono,masses} of MECHEREF_MASSES) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    let contra_mass = sugar.root.mass;
    let atom_composition = Array.from([[O]].concat(sugar.root.ring_atoms))
    for (let frag_key of Object.keys(masses)) {

      // Apply a systematic fix to the delta mass
      let wanted = masses[frag_key] - MASSES.get(H);
      let [start,end] = frag_key.split(',').map(val => +val );
      let calculated_mass = to_mass(a_frag_for(atom_composition,start,end,mono.indexOf('Neu') >= 0));
      assert.close( calculated_mass, contra_mass - wanted, 1e-01 , mono+','+frag_key );
    }
  }
});

// Issues with NeuAc/Gc 2,4, 3,5 and 3,4

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides from GLYCOSIDIQ' , function( assert ) {
  for (let mono of Object.keys(GLYCOSIDIQ_MASSES)) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    let atom_composition = Array.from([[O]].concat(sugar.root.ring_atoms));
    let masses = GLYCOSIDIQ_MASSES[mono];
    for (let frag_key of Object.keys(masses)) {
      let wanted = masses[frag_key][0];
      let [start,end] = frag_key.split(',').map(val => +val );
      let calculated_mass = to_mass(a_frag_for(atom_composition,start,end,mono.indexOf('Neu') >= 0));
      assert.close( calculated_mass, wanted, 1e-02 , mono+','+frag_key );
    }
  }
});


// Issues with permethylated NeuAc 0,2, 1,5,   2,4, 3,5 and 3,4
// Issues with permethylated NeuGc 2,4, 3,5 and 3,4

QUnit.test( 'Ensure ring compositions match free sugar for single permethylated monosaccharides from GLYCOSIDIQ' , function( assert ) {
  for (let mono of Object.keys(GLYCOSIDIQ_MASSES)) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.derivatise(PERMETHYLATED);
    let atom_composition = Array.from([[O]].concat(sugar.root.ring_atoms));
    let masses = GLYCOSIDIQ_MASSES[mono];
    for (let frag_key of Object.keys(masses)) {
      let wanted = masses[frag_key][2];
      let [start,end] = frag_key.split(',').map(val => +val );
      let calculated_mass = to_mass(a_frag_for(atom_composition,start,end,mono.indexOf('Neu') >= 0));
      assert.close( calculated_mass, wanted, 1e-02 , mono+' permethylated,'+frag_key );
    }
  }
});


// Issues with NeuAc 0,2, 0,3, 1,4, 1,5, 2,5,   2,4, 3,5 
// Issues with NeuGc 1,4   2,4

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides from GLYCOWORKBENCH' , function( assert ) {
  for (let mono of Object.keys(GLYCOWORKBENCH_MASSES).filter( v => ['Gal','GalNAc','Xyl','Fuc','GlcA','GlcN','NeuAc','NeuGc'].indexOf(v) >= 0)) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    let atom_composition = Array.from([[O]].concat(sugar.root.ring_atoms));
    let compositions = GLYCOWORKBENCH_MASSES[mono];
    for (let frag_key of Object.keys(compositions).filter(val => val.match(/^a/))) {
      let wanted = compositions[frag_key].composition;
      let [start,end] = frag_key.split('-')[1].split(',').map(val => +val );
      let calculated_composition = summarise_composition(a_frag_for(atom_composition,start,end,mono.indexOf('Neu') >= 0).flat());
      assert.deepEqual( calculated_composition, wanted , mono+','+frag_key );
    }
  }
});


