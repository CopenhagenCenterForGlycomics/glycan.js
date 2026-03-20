/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, C , H , O , N, DERIV_ETHYL_ESTER, DERIV_AMMONIA_AMIDATION, summarise_composition, composition_to_mass, DERIV_SIALIC_ACID, REDUCING_END_2AB, REDUCING_END_FREE, REDUCING_END_REDUCED }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

import Fragmentor from '../../js/Fragmentor';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that monosaccharides have the right composition', {
});

QUnit.test('Test can generate mass for NeuAc(a2-8)NeuAc(a2-3)Gal(b1-3)[NeuAc(a2-6)]GalNAc', function (assert) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  assert.close(sugar.mass,2222.7830,1e-04,'Has a defined mass');
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

QUnit.test( 'Ensure sialic acid derivatisation works for ethyl ester and 2AB' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
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

QUnit.test( 'Ensure sialic acid derivatisation works for ethyl ester and ammonia amidation on the same sugar using a derivative set' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let normal_mass = sugar.mass;
  sugar.derivatise(DERIV_SIALIC_ACID);
  const target_delta = -0.984 + 28.0313;
  assert.close(sugar.mass,normal_mass+target_delta,1e-04,'Ammonia amidation derivatised mass is correct');
});

QUnit.test( 'Ensure sialic acid derivatisation works for ethyl ester and ammonia amidation on the same sugar using a derivative set and 2AB reducing end' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
  let normal_mass = sugar.mass;
  sugar.derivatise(DERIV_SIALIC_ACID);
  const target_delta = -0.984 + 28.0313;
  assert.close(sugar.mass,normal_mass+target_delta,1e-04,'Linkage specific sialic acid derivatisation has the right mass');
});


QUnit.test( 'Ensure ethyl ester sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
  let normal_mass = Fragmentor.getFragment(sugar,'b1a').mass;
  sugar.derivatise(DERIV_ETHYL_ESTER);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1a').mass;
  const target_delta = 28.0313;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});

QUnit.test( 'Ensure ammonia amidation sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
  let normal_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  sugar.derivatise(DERIV_AMMONIA_AMIDATION);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  const target_delta = -0.984;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});

QUnit.test( 'Ensure ammonia amidation sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_FREE;
  let normal_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  sugar.derivatise(DERIV_AMMONIA_AMIDATION);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  const target_delta = -0.984;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});

QUnit.test( 'Ensure ammonia amidation sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_REDUCED;
  let normal_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  sugar.derivatise(DERIV_AMMONIA_AMIDATION);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  const target_delta = -0.984;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});

QUnit.test( 'Ensure linkage specific sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
  let normal_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  sugar.derivatise(DERIV_SIALIC_ACID);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1b').mass;
  const target_delta = -0.984;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});

QUnit.test( 'Ensure linkage specific sialic acid derivatisation works with fragmentation' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  sugar.reducing_end = REDUCING_END_2AB;
  let normal_mass = Fragmentor.getFragment(sugar,'b1a').mass;
  sugar.derivatise(DERIV_SIALIC_ACID);
  let derivatised_mass = Fragmentor.getFragment(sugar,'b1a').mass;
  const target_delta = 28.0313;
  assert.close(derivatised_mass,normal_mass+target_delta,1e-04,'We can generate fragments with the right mass');
});
