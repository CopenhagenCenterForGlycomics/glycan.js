/*global QUnit*/

import Sugar from '../../js/Sugar';

import { Mass } from '../../js/Mass';

import Fragmentor from '../../js/Fragmentor';

import {IO as Iupac} from '../../js/CondensedIupac';

const FRAGMENTS = require('./fragments_pmid_xxxx').FRAGMENTS;

class IupacSugar extends Mass(Iupac(Sugar)) {}


/**
 * Compare numbers taking in account an error
 *
 * @param  {Float} number
 * @param  {Float} expected
 * @param  {Float} error    Optional
 * @param  {String} message  Optional
 */
QUnit.assert.close = function(number=NaN, expected=NaN, error=1e-04, message) {
  if (error === void 0 || error === null) {
    error = 0.00001 // default error
  }

  var result = number == expected || (number < expected + error && number > expected - error) || false

  this.pushResult({ result, actual: number.toFixed(4), expected: `${expected.toFixed(4)} +/- ${error}`, message});
}

QUnit.module('Test that we can fragment sugars', {
});

for (let sequence of Object.keys(FRAGMENTS)) {

  QUnit.test( 'Fragment generation works per type' , function( assert ) {
    let sugar = new IupacSugar();
    sugar.sequence = sequence;
    let wanted_fragments = FRAGMENTS[sugar.sequence];
    for (let frag_type of Object.keys(wanted_fragments)) {
      let frag = Fragmentor.getFragment(sugar,frag_type);
      let matched_wanted = wanted_fragments[frag.type] || wanted_fragments[frag.type.split('/').reverse().join('/')];
      if (matched_wanted) {
        assert.close(frag.mass,matched_wanted.val,0.4, `${frag.type} has right mass delta ${Math.abs(matched_wanted.val - frag.mass)}`);
      }
    }
  });

}

