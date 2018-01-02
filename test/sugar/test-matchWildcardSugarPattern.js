/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can find sugars using wildcards', {
});

let firstchar_comparator = (a,b) => a.identifier.toUpperCase().charAt(0) === b.identifier.toUpperCase().charAt(0);

QUnit.test( 'Finding a single monosaccharide match' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-2)r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)*(u?-?)R';
  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return firstchar_comparator(a,b);
  });
  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[0].sequence === 'a(a1-2)b(a1-2)r','Matches the correct subtree');
});

QUnit.test( 'Finding a branched monosaccharide match' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-2)[aa(a1-2)bb(a1-2)cc(a1-2)]r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)*(u?-?)R';
  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return firstchar_comparator(a,b);
  });
  assert.ok(matches.length === 2,'Matches single location');
  assert.ok(matches[0].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[1].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[0].sequence === 'a(a1-2)b(a1-2)r','Matches the correct subtree');
  assert.ok(matches[1].sequence === 'aa(a1-2)bb(a1-2)r','Matches the correct subtree');

});

QUnit.test( 'Finding lots of same branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-2)[aa(a1-2)bb(a1-2)][aaa(a1-2)bbb(a1-2)][aaaa(a1-2)bbbb(a1-2)]r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)*(u?-?)R';
  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return firstchar_comparator(a,b);
  });
  assert.ok(matches.length === 4,'Matches single location');
  assert.ok(matches[0].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[1].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[2].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[3].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[0].sequence === 'a(a1-2)b(a1-2)r','Matches the correct subtree');
  assert.ok(matches[1].sequence === 'aa(a1-2)bb(a1-2)r','Matches the correct subtree');
  assert.ok(matches[2].sequence === 'aaa(a1-2)bbb(a1-2)r','Matches the correct subtree');
  assert.ok(matches[3].sequence === 'aaaa(a1-2)bbbb(a1-2)r','Matches the correct subtree');
});

QUnit.test( 'Finding lots of stubby branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)[aa(a1-2)][aaa(a1-2)][aaaa(a1-2)]r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)*(u?-?)R';
  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => {
    if (a.identifier === '*' || b.identifier === '*') {
      return true;
    }
    return firstchar_comparator(a,b);
  });
  assert.ok(matches.length ===  4,'Matches all subtrees');
  assert.ok(matches[0].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[1].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[2].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[3].root.identifier === 'r','Matches at the correct location');
  assert.ok(matches[0].sequence === 'a(a1-2)*(u?-?)r','Matches the correct subtree including zero-length placeholder');
  assert.ok(matches[1].sequence === 'aa(a1-2)*(u?-?)r','Matches the correct subtree including zero-length placeholder');
  assert.ok(matches[2].sequence === 'aaa(a1-2)*(u?-?)r','Matches the correct subtree including zero-length placeholder');
  assert.ok(matches[3].sequence === 'aaaa(a1-2)*(u?-?)r','Matches the correct subtree including zero-length placeholder');
});

QUnit.test( 'Tracing lots of stubby branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)[aa(a1-2)][aaa(a1-2)][aaaa(a1-2)]r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)R';
  let matches = sugar.trace(search_sugar,sugar.root, firstchar_comparator ).map( sug => sug.root );
  assert.ok(matches.length ===  4,'Matches single location');
  assert.ok(matches[0].identifier === 'r','Matches at the correct location');
  assert.ok(matches[1].identifier === 'r','Matches at the correct location');
  assert.ok(matches[2].identifier === 'r','Matches at the correct location');
  assert.ok(matches[3].identifier === 'r','Matches at the correct location');
  assert.ok(matches[0].children[0].identifier === 'a','Matches at the correct location');
  assert.ok(matches[1].children[0].identifier === 'aa','Matches at the correct location');
  assert.ok(matches[2].children[0].identifier === 'aaa','Matches at the correct location');
  assert.ok(matches[3].children[0].identifier === 'aaaa','Matches at the correct location');
  assert.ok(matches[0].children.length === 1,'Matches at the correct location');
  assert.ok(matches[1].children.length === 1,'Matches at the correct location');
  assert.ok(matches[2].children.length === 1,'Matches at the correct location');
  assert.ok(matches[3].children.length === 1,'Matches at the correct location');

});
