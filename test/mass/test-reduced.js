/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, REDUCING_END_REDUCED, summarise_composition, composition_to_mass }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

import Fragmentor from '../../js/Fragmentor';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

const ref_comps = {
  'Gal' : { C: 6, H: 14, N: 0, O: 6 },
  'GlcNAc' : { C: 8, H: 17, N: 1, O: 6 },
  'Fuc' : { C: 6, H: 14, N: 0, O: 5 },
  'NeuAc' : { C: 11, H: 21, N: 1, O: 9 },
  'Man(a1-3)Man': {C: 12, H: 24,  N: 0, O: 11}
};


QUnit.test( 'Ensure compositions match for reduction' , function( assert ) {
  for (let mono of ['Gal','GlcNAc','NeuAc','Fuc','Man(a1-3)Man']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.reducing_end = REDUCING_END_REDUCED;
    assert.deepEqual( summarise_composition([].concat(sugar.atoms)), ref_comps[mono], 'Compositions match for '+mono );
  }
});