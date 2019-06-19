/*global QUnit*/

import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can read Sugars with repeating units', {
});


const glycosuite_repeats = `
Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-?)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-?)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & k,j>=1"
Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-?)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-?)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-?)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-?)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)GlcNAc+"Where j+k=14 & j,k>=1"
Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-?)[Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-?)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}kGlcNAc(b1-2)Man(a1-3)[NeuAc(a2-?)Gal(b1-4){GlcNAc(b1-3)Gal(b1-4)}jGlcNAc(b1-2)Man(a1-6)][GlcNAc(b1-4)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"Where j+k=14 & j,k>=1"
Me(-3)Rha(a1-4){Man(b1-3)Rha(a1-4)}26Man(a1-3)Rha(a1-3)Rha(a1-3)Rha(a1-3)Gal
Me(-3)Rha(a1-4){Man(b1-3)Rha(a1-4)}26Man(a1-3)Rha(a1-3)Rha(a1-3)Rha(a1-3)Gal
Me(-3)Rha(a1-4){Man(b1-3)Rha(a1-4)}27Man(a1-3)Rha(a1-3)Rha(a1-3)Rha(a1-3)Gal
Me(-3)Rha(a1-4){Man(b1-3)Rha(a1-4)}27Man(a1-3)Rha(a1-3)Rha(a1-3)Rha(a1-3)Gal
Gal(b1-4)[Glc(a1-6)]ManNAc(b1-3){Gal(b1-4)[Glc(a1-6)]ManNAc}j(b1-3)Gal(b1-4)[Glc(a1-6)]ManNAc(a1-3)[GroA2(u?-?)P(u?-4)Man(b1-4)]Rha(a1-3)Rha(a1-3)Rha(a1-3)Gal+"where j = 20"
{Fuc(a1-3)}k[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[{Fuc(a1-3)}j[Gal(b1-4)]GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"where j+k=1.3"
{Fuc(a1-3)}k[Gal(b1-4)]GlcNAc(b1-2)Man(a1-?)[{Fuc(a1-3)}j[NeuAc(a2-3)Gal(b1-4)]GlcNAc(b1-2)Man(a1-?)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"where j+k=1.2"
{Fuc(a1-3)}j[NeuAc(a2-3)Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[{Fuc(a1-3)}k[NeuAc(a2-3)Gal(b1-4)]GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"where j+k=1.2"
GlcNAc(b1-3)[GlcNAc(b1-6)]{Gal(b1-?)GlcNAc(b1-3)}k{[Fuc(a1-2)[HSO3(-6)]Gal(b1-4)[HSO3(-6)]GlcNAc(b1-6)]}jGal(b1-?)GlcNAc(b1-3)Gal(b1-3)[Fuc(a1-2)Gal(b1-4)GlcNAc(b1-6)]GalNAc+"where j=30-40 and k=30-40"
{Fuc(a1-3)}j[Gal(a1-3)Gal(b1-4)]GlcNAc(b1-2)Man(a1-?)[{Fuc(a1-3)}k[Gal(b1-4)]GlcNAc(b1-2)Man(a1-?)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc+"where j+k=1.8"
`.split('\n').map( seq => seq.trim() ).filter( seq => seq );

QUnit.test( 'Read a simple repeat' , function( assert ) {
  let sequence = glycosuite_repeats[0];
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  assert.equal(sugar.sequence,sequence, 'Has repeat generated sequence');
});
