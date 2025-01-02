/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, PERMETHYLATED, summarise_composition, composition_to_mass, calculate_a_fragment_composition as a_frag_for }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

const mass_diff = (a,b,tolerance=1e-04) => {
	return Math.abs(a-b) <= tolerance
};

const to_mass = (atoms) => {
  return composition_to_mass(atoms.flat(Infinity));
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
  let comparray = [ ...Array(comp.C).fill( C ).flat(), ...Array(comp.H).fill( H ).flat(), ...Array(comp.N).fill( N ).flat(), ...Array(comp.O).fill( O ).flat() ] ;
  return composition_to_mass(comparray);
}


// PMID: 15961488
const MECHEREF_MASSES = require('./mechref_reference.json');

const GLYCOSIDIQ_MASSES = require('./glycosidiq_reference.json');

const GLYCOWORKBENCH_MASSES_RAW = require('./glycoworkbench_reference.json');

// PATCH TEST MASSES

// GLYCOWORKBENCH a-masses are wrong
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-3,5']='C7H13O4N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-2,5']='C8H15O5N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-2,4']='C4H7O2N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-1,5']='C9H17O5N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-1,4']='C5H9O2N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-0,2']='C8H15O6N1';
GLYCOWORKBENCH_MASSES_RAW['NeuAc']['a-0,3']='C7H13O5N1';


const MECHREF_MASSES_BY_RESIDUE = Object.fromEntries(MECHEREF_MASSES.map( (entry) => { return [entry.residue,entry.masses] }));
// Prefer calculation by GLYCOWORKBENCH
// MECHREF expects this to be 60, but we can only calculate mass should be 44, and glycoworkbench agrees with 44
// The deltas up to 1,4 and 2,4 are all correct, but offset by the extra O in the 1,3 mass.
delete MECHREF_MASSES_BY_RESIDUE['NeuAc']['1,3']
delete MECHREF_MASSES_BY_RESIDUE['NeuAc']['1,4']
delete MECHREF_MASSES_BY_RESIDUE['NeuAc']['2,4']

// This has to be wrong, as it must match up with the NeuAc 0,2 mass + 16
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['0,2']
// This has to be wrong, as it must match up with the NeuAc 0,4 mass
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['0,4']
// This has to be wrong, as it must match up with the NeuAc 1,3 mass
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['1,3']
// Same offset error as in the NeuAc
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['1,4']
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['2,4']
// Must be NeuAc mass + 16
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['2,5']
// Must be NeuAc mass + 16
delete MECHREF_MASSES_BY_RESIDUE['NeuGc']['3,5']


// Remove these entries as we have agreement with GlycosidIQ and glycoworkbench
// These all seem to include one H too many
delete MECHREF_MASSES_BY_RESIDUE['GlcA']['1,3']
delete MECHREF_MASSES_BY_RESIDUE['GlcA']['1,4']
delete MECHREF_MASSES_BY_RESIDUE['GlcA']['2,4']

// Remove these entries as we have agreement with GlycosidIQ and glycoworkbench
// These all seem to be missing a CHOH 
delete MECHREF_MASSES_BY_RESIDUE['Xyl']['1,3']
delete MECHREF_MASSES_BY_RESIDUE['Xyl']['1,4']
delete MECHREF_MASSES_BY_RESIDUE['Xyl']['2,4']


// The MECHREF mass is correct - this is off by one carbon
delete GLYCOSIDIQ_MASSES['NeuAc']['3,5'];
// This mass is also off by one carbon
delete GLYCOSIDIQ_MASSES['NeuAc']['3,4'];
// The MECHREF mass is correct - this is off by one carbon
delete GLYCOSIDIQ_MASSES['NeuGc']['3,5'];
// This mass is also off by one carbon
delete GLYCOSIDIQ_MASSES['NeuGc']['3,4'];

/* The GLYCOSIDIQ masses for some of the NeuAc cross rings are off 
   for permethylated. If you calculate the delta between the permethylated
   mass and the underivatised, it looks like it is adding one too many
   derivatives
*/

GLYCOSIDIQ_MASSES['NeuAc']['0,2'][2] = GLYCOSIDIQ_MASSES['NeuAc']['0,2'][2] - massFromCompObj({C:1,H:2,N:0,O:0});
GLYCOSIDIQ_MASSES['NeuAc']['1,5'][2] = GLYCOSIDIQ_MASSES['NeuAc']['1,5'][2] - massFromCompObj({C:1,H:2,N:0,O:0});
GLYCOSIDIQ_MASSES['NeuAc']['2,4'][2] = GLYCOSIDIQ_MASSES['NeuAc']['2,4'][2] - massFromCompObj({C:1,H:2,N:0,O:0});

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
    let wanted = masses[frag_key] - composition_to_mass([H]);
    let [start,end] = frag_key.split(',').map(val => +val );
    REFERENCE_MASSES.push(["mechref", mono, `a${start}-${end}`, contra_mass - wanted ]);
  }
}


// Contra masses all match up correctly with GlycanMass from Expasy

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides from MECHREF' , function( assert ) {
  for (let {residue: mono,masses} of MECHEREF_MASSES) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    let contra_mass = sugar.root.mass;
    let atom_composition = Array.from([[O]].concat(sugar.root.ring_atoms))
    for (let frag_key of Object.keys(masses)) {

      // Apply a systematic fix to the delta mass
      let wanted = masses[frag_key] - composition_to_mass([H]);
      let [start,end] = frag_key.split(',').map(val => +val );
      let calculated_mass = to_mass(a_frag_for(atom_composition,start,end,mono.indexOf('Neu') >= 0));
      assert.close( calculated_mass, contra_mass - wanted, 1e-01 , mono+','+frag_key );
    }
  }
});

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

