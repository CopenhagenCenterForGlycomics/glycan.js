/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, DERIV_ETHYL_ESTER, DERIV_AMMONIA_AMIDATION, summarise_composition, composition_to_mass }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

import Fragmentor from '../../js/Fragmentor';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

QUnit.test( 'Ensure sialic acid derivatisation works for ethyl ester' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let normal_mass = sugar.mass;
  let sialic = sugar.locate_monosaccharide('y7a');
  sialic.derivative = DERIV_ETHYL_ESTER;
  const target_delta = 28.0313;
  assert.close(sugar.mass,normal_mass+target_delta,1e-04,'Ethyl ester derivatised mass is correct');
});

QUnit.test( 'Ensure sialic acid derivatisation works for ammonia amidation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let normal_mass = sugar.mass;
  let sialic = sugar.locate_monosaccharide('y7b');
  sialic.derivative = DERIV_AMMONIA_AMIDATION;
  const target_delta = -0.984;
  assert.close(sugar.mass,normal_mass+target_delta,1e-04,'Ammonia amidation derivatised mass is correct');
});


QUnit.test( 'Ensure sialic acid derivatisation works for ethyl ester and ammonia amidation on the same sugar' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let normal_mass = sugar.mass;
  let sialic = sugar.locate_monosaccharide('y7b');
  sialic.derivative = DERIV_AMMONIA_AMIDATION;
  sialic = sugar.locate_monosaccharide('y7a');
  sialic.derivative = DERIV_ETHYL_ESTER;
  const target_delta = -0.984 + 28.0313;
  assert.close(sugar.mass,normal_mass+target_delta,1e-04,'Ammonia amidation derivatised mass is correct');
});
