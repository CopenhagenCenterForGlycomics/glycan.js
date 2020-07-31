
import Sugar from '../../js/Sugar';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can perform tracing on sugars', {
});

QUnit.test( 'Can copy tags' , function( assert ) {
  let search_seq = 'A(u1-?)B';
  let pattern_seq = 'A(u1-?)*';
  let search_sugar = new IupacSugar();
  search_sugar.sequence = search_seq;
  let pattern_sugar = new IupacSugar();
  pattern_sugar.sequence = pattern_seq;
  let TEST_SYMBOL=Symbol('TEST');
  pattern_sugar.root.setTag(TEST_SYMBOL);
  let matched = search_sugar.trace(pattern_sugar);
  for (let match of matched) {
    assert.equal(match.root.identifier,'B');
    assert.equal(match.composition_for_tag(TEST_SYMBOL).length,1);
    assert.equal(match.composition_for_tag(TEST_SYMBOL)[0].identifier,'B');
  }
});