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

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
});

QUnit.test( 'Finding basic monosaccharides at the root' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
});

QUnit.test( 'Finding single residue patterns' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A';

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 1,'Matches single location');
  assert.ok(matches[0].identifier === 'A','Matches at the correct location');
});

QUnit.test( 'Finding monosaccharide patterns on a branch' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B(a1-3)[C(a1-2)D(a1-2)]E(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 1,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
  assert.ok('E' === matches[0].parent.identifier,'Matches branch at right position');
});


QUnit.test( 'Finding repeated monosaccharide patterns' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B(a1-2)C(a1-2)A(a1-2)B(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 2,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
  assert.ok(matches[1].identifier === 'B','Matches at the correct location');
  assert.ok(matches[1] !== matches[0],'Doesnt match the same residue twice');
});


QUnit.test( 'Finding repeated monosaccharide patterns on branches' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)B(a1-2)[A(a1-2)B(a1-2)]C(a1-2)R';

  let search_sugar = new IupacSugar();
  search_sugar.sequence = 'A(a1-2)B';

  let matches = sugar.match_sugar_pattern(search_sugar, (a,b) => a.identifier === b.identifier );

  assert.ok(matches.length === 2,'Matches correct number of locations');
  assert.ok(matches[0].identifier === 'B','Matches at the correct location');
  assert.ok(matches[1].identifier === 'B','Matches at the correct location');
  assert.ok(matches[1] !== matches[0],'Doesnt match the same residue twice');
  assert.ok(matches[1].parent === matches[0].parent,'Doesnt match the same residue twice');
});