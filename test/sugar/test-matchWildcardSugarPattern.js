/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can find sugars using wildcards', {
});

QUnit.test( 'Finding a single monosaccharide match' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)*(u?-4)R';
  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return a.identifier === b.identifier;
  });
  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
});
