/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, PERMETHYLATED, ReferenceComposition }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';



const summarise_composition = (composition) => {
  let c = composition.filter( v => v == C).length;
  let n = composition.filter( v => v == N).length;
  let o = composition.filter( v => v == O).length;
  let h = composition.filter( v => v == H).length;
  return { C: c, N: n, O: o, H: h };
}

const mass_diff = (a,b,tolerance=1e-04) => {
	return Math.abs(a-b) <= tolerance
};

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides' , function( assert ) {
  for (let mono of ['Gal','Glc','Man','GalNAc','GlcNAc','NeuAc','NeuGc','GlcA','IdoA','GlcN','Fuc','Xyl']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    assert.deepEqual( summarise_composition([O].concat(sugar.root.ring_atoms.flat())), summarise_composition([O,H,H].concat(ReferenceComposition(sugar.root))), 'Compositions match for '+mono );
  }
});


QUnit.test( 'Ensure ring compositions match free sugar compositions for single permethylated monosaccharides' , function( assert ) {
  for (let mono of ['Gal','Glc','Man','GalNAc','GlcNAc','NeuAc','NeuGc','GlcA','IdoA','GlcN','Fuc','Xyl']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.derivatise(PERMETHYLATED);
    assert.deepEqual( summarise_composition([O].concat(sugar.root.ring_atoms.flat())), summarise_composition([O,H,H,C,H,H,C,H,H].concat(ReferenceComposition(sugar.root))), 'Compositions match for permethylated '+mono );
  }
});
