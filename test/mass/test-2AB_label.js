/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, REDUCING_END_2AB, summarise_composition, composition_to_mass }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

import Fragmentor from '../../js/Fragmentor';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

const ref_comps = {
  'Gal' : { C: 13, H: 20, N: 2, O: 6 },
  'GlcNAc' : { C: 15, H: 23, N: 3, O: 6 },
  'Fuc' : { C: 13, H: 20, N: 2, O: 5 },
  'NeuAc' : { C: 18, H: 27, N: 3, O: 9 },
  'Man(a1-3)Man': {C: 19, H: 30,  N: 2, O: 11}
};


QUnit.test( 'Ensure ring compositions match free sugar for simple sugars' , function( assert ) {
  for (let mono of ['Gal','GlcNAc','NeuAc','Fuc','Man(a1-3)Man']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.reducing_end = REDUCING_END_2AB;
    assert.deepEqual( summarise_composition([].concat(sugar.atoms)), ref_comps[mono], 'Compositions match for '+mono );
  }
});

QUnit.test( 'Fragmentation worsk' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;


  // https://sciex.com/content/dam/SCIEX/pdf/tech-notes/all/released-N-linked-glycans.pdf
  // M+H masses in spectra

  let specific_frag = Fragmentor.getFragment(sugar,'y4a');
  assert.close( specific_frag.mass , 1380.5319 - composition_to_mass([H]), 1e-02, 'Fragment y4a mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'y4a/y4b');
  assert.close( specific_frag.mass , 1177.4562 - composition_to_mass([H]), 1e-02, 'Fragment y4a/y4b mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'y4a/y4b');
  assert.close( specific_frag.mass , 1177.4562 - composition_to_mass([H]), 1e-02, 'Fragment y4a/y4b mass is correct' );

  specific_frag = Fragmentor.getFragment(sugar,'y3a/b4a');
  assert.close( specific_frag.mass , 731.2688 - composition_to_mass([H]), 1e-02, 'Fragment y3a/b4a mass is correct' );


});