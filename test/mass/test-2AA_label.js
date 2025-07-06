/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, REDUCING_END_2AA, summarise_composition, composition_to_mass }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

import Fragmentor from '../../js/Fragmentor';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

const ref_comps = {
  'Gal' : { C: 13, H: 19, N: 1, O: 7 },
  'GlcNAc' : { C: 15, H: 22, N: 2, O: 7 },
  'Fuc' : { C: 13, H: 19, N: 1, O: 6 },
  'NeuAc' : { C: 18, H: 26, N: 2, O: 10 },
  'Man(a1-3)Man': {C: 19, H: 29,  N: 1, O: 12}
};


QUnit.test( 'Ensure ring compositions match free sugar for simple sugars' , function( assert ) {
  for (let mono of ['Gal','GlcNAc','NeuAc','Fuc','Man(a1-3)Man']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.reducing_end = REDUCING_END_2AA;
    assert.deepEqual( summarise_composition([].concat(sugar.atoms)), ref_comps[mono], 'Compositions match for '+mono );
  }
});

