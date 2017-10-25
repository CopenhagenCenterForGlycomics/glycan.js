/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can find sugars', {
});

let firstchar_comparator = (a,b) => a.identifier.toUpperCase().charAt(0) === b.identifier.toUpperCase().charAt(0);

QUnit.test( 'Finding basic monosaccharides' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-2)r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'b','Matches at the correct location');
});

QUnit.test( 'Finding basic monosaccharides at the root' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'b','Matches at the correct location');
});

QUnit.test( 'Finding single residue patterns' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'a','Matches at the correct location');
});

QUnit.test( 'Finding longer residue patterns' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-2)c(a1-2)d(a1-2)r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B(a1-2)C(a1-2)D';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'd','Matches at the correct location');
});

QUnit.test( 'Finding monosaccharide patterns on a branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'a(a1-2)b(a1-3)[c(a1-2)d(a1-2)]e(a1-2)r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'b','Matches at the correct location');
  assert.ok('e' === matches[0].parent.identifier,'Matches branch at right position');
});


QUnit.test( 'Finding repeated monosaccharide patterns' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'aa(a1-2)bb(a1-2)cc(a1-2)a(a1-2)b(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 2,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'bb','Matches at the correct location');
  assert.ok(matches[1].identifier === 'b','Matches at the correct location');
  assert.ok(matches[1] !== matches[0],'Doesnt match the same residue twice');
});

QUnit.test( 'Finding repeated monosaccharide patterns differing by a branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'aa(a1-2)bb(a1-2)cc(a1-2)a(a1-2)[c(a1-2)]b(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)[C(a1-2)]B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 1,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'b','Matches at the correct location');
});


QUnit.test( 'Finding repeated monosaccharide patterns on branches' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'aa(a1-2)bb(a1-2)[a(a1-2)b(a1-2)]c(a1-2)r';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, firstchar_comparator );

  assert.ok(matches.length === 2,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'bb','Matches at the correct location');
  assert.ok(matches[1].identifier === 'b','Matches at the correct location');
  assert.ok(matches[1] !== matches[0],'Doesnt match the same residue twice');
  assert.ok(matches[1].parent === matches[0].parent,'Doesnt match the same residue twice');
});