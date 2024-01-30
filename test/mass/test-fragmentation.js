/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass, UNDERIVATISED, PERMETHYLATED, MASSES, NA } from '../../js/Mass';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that we can fragment permethylated sugars', {
});

QUnit.test( 'Masses work trisaccharide' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[GlcNAc(b1-4)][Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc';
  sugar.derivatise(PERMETHYLATED);
  for (let frag of [...Fragmentor.fragment(sugar,2)].sort( (a,b) => a.mass - b.mass )) {
  	console.log(frag.type,frag.sequence,frag.mass);//+MASSES.get(NA));
    // let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    // if (matched_wanted) {
    //   assert.ok(Math.abs(matched_wanted.val - frag.mass) < 1e-04, `${frag.type} has right mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
    //   matched_wanted.seen = true;
    // }
  }
  // for (let frag of Object.keys(wanted_fragments)) {
  //   if ( frag.match(/HJ/) ) {
  //     continue;
  //   }
  //   assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  // }
});