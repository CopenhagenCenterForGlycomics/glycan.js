/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass } from '../../js/Mass';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

const FRAGMENTS = require('./fragments');

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test that we can fragment sugars', {
});

QUnit.test( 'Generating single chords works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let frags = [...Fragmentor.fragment(sugar,2)].map( f => f.type  ).join('\n');
  assert.ok(frags.length > 0);
});


QUnit.test( 'Masses work disaccharide' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GalNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag of Fragmentor.fragment(sugar,2)) {
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.ok(Math.abs(matched_wanted.val - frag.mass) < 1e-04, `${frag.type} has right mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if ( frag.match(/HJ/) ) {
      continue;
    }
    assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  }
});


QUnit.test( 'Masses work trisaccharide' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)[GlcA(b1-6)]GalNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag of Fragmentor.fragment(sugar,2)) {
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.ok(Math.abs(matched_wanted.val - frag.mass) < 1e-04, `${frag.type} has right mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if ( frag.match(/HJ/) ) {
      continue;
    }
    assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  }
});

QUnit.test( 'Masses work larger structure' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag of Fragmentor.fragment(sugar,2)) {
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.ok(Math.abs(matched_wanted.val - frag.mass) < 1e-04, `${frag.type} has right mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if ( frag.match(/HJ/) ) {
      continue;
    }
    assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  }
});
