/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, PERMETHYLATED, ReferenceComposition, summarise_composition }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

QUnit.test( 'Ensure ring compositions match free sugar for single monosaccharides' , function( assert ) {
  for (let mono of ['Gal','Glc','Man','GalNAc','GlcNAc','NeuAc','NeuGc','GlcA','IdoA','GlcN','Fuc','Xyl']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    assert.deepEqual( summarise_composition([].concat(sugar.atoms)), summarise_composition([].concat(ReferenceComposition(sugar.root))), 'Compositions match for '+mono );
  }
});


QUnit.test( 'Ensure ring compositions match free sugar compositions for single permethylated monosaccharides' , function( assert ) {
  for (let mono of ['Gal','Glc','Man','GalNAc','GlcNAc','NeuAc','NeuGc','GlcA','IdoA','GlcN','Fuc','Xyl']) {
    let sugar = new IupacSugar();
    sugar.sequence = mono;
    sugar.derivatise(PERMETHYLATED);
    assert.deepEqual( summarise_composition([].concat(sugar.atoms)), summarise_composition([].concat(ReferenceComposition(sugar.root))), 'Compositions match for permethylated '+mono );
  }
});
