/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass } from '../../js/Mass';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

const FRAGMENTS = require('./fragments');

class IupacSugar extends Mass(Iupac(Sugar)) {}


/**
 * Compare numbers taking in account an error
 *
 * @param  {Float} number
 * @param  {Float} expected
 * @param  {Float} error    Optional
 * @param  {String} message  Optional
 */
QUnit.assert.close = function(number, expected, error=1e-04, message) {
  if (error === void 0 || error === null) {
    error = 0.00001 // default error
  }

  var result = number == expected || (number < expected + error && number > expected - error) || false

  this.pushResult({ result, actual: number.toFixed(4), expected: `${expected.toFixed(4)} +/- ${error}`, message});
}

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
    if (frag.type.match(/\d,\d-[e]/) ) {
      continue;
    }
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.close(frag.mass,matched_wanted.val,1e-04, `${frag.type} ${sugar.sequence} has mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if (frag.match(/\d,\d-[e]/) ) {
      continue;
    }
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
    if (frag.type.match(/\d,\d-[e]/) ) {
      continue;
    }
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.close(frag.mass,matched_wanted.val,1e-04, `${frag.type} ${sugar.sequence} has mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if (frag.match(/\d,\d-[e]/) ) {
      continue;
    }
    if ( frag.match(/HJ/) ) {
      continue;
    }
    assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  }
});

QUnit.test( 'Fragment generation works per type' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)[GlcA(b1-6)]GalNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag_type of Object.keys(wanted_fragments)) {
    if (frag_type.match(/\d,\d-[e]/) ) {
      continue;
    }
    let frag = Fragmentor.getFragment(sugar,frag_type);
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.close(frag.mass,matched_wanted.val,1e-04, `${frag.type} ${sugar.sequence} has mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if (frag.match(/\d,\d-[e]/) ) {
      continue;
    }
    if ( frag.match(/HJ/) ) {
      continue;
    }
  }
});

QUnit.test( 'Fragment generation works per type larger structure' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag_type of Object.keys(wanted_fragments)) {
    if (frag_type.match(/\d,\d-[e]/) ) {
      continue;
    }
    let frag = Fragmentor.getFragment(sugar,frag_type);
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.close(frag.mass,matched_wanted.val,1e-04, `${frag.type} ${sugar.sequence} has mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if (frag.match(/\d,\d-[e]/) ) {
      continue;
    }
    if ( frag.match(/HJ/) ) {
      continue;
    }
  }
});

QUnit.test( 'Masses work larger structure' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
  let wanted_fragments = FRAGMENTS[sugar.sequence];
  for (let frag of Fragmentor.fragment(sugar,2)) {
    if (frag.type.match(/\d,\d-[e]/) ) {
      continue;
    }
    let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
    if (matched_wanted) {
      assert.close(frag.mass,matched_wanted.val,1e-04, `${frag.type} ${sugar.sequence} has mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      matched_wanted.seen = true;
    }
  }
  for (let frag of Object.keys(wanted_fragments)) {
    if (frag.match(/\d,\d-[e]/) ) {
      continue;
    }
    if ( frag.match(/HJ/) ) {
      continue;
    }
    assert.ok( wanted_fragments[frag].seen, `We did not see test fragment ${frag}` );
  }
});

