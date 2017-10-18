/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can find sugars', {
});

QUnit.test( 'Finding basic monosaccharides' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar);

  assert.ok(matches.length === 1,'Matches single location');
});
