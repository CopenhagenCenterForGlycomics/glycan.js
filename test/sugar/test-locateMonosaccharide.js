/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can locate monosaccharides on sugars', {
});

QUnit.test( 'Finding basic monosaccharides' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)[B(a1-3)][C(a1-4)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y2a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2c').identifier === 'C','Finds branch');
});

QUnit.test( 'Finding basic monosaccharides when input sequence branch ordering is incorrect' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'B(a1-3)[A(a1-2)][C(a1-4)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y2a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2c').identifier === 'C','Finds branch');
});


QUnit.test( 'Finding basic monosaccharides on a multisugar' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'A(a1-2)[B(a1-2)][C(a1-2)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y2a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y2c').identifier === 'C','Finds branch');
});


QUnit.test( 'Finding monosaccharides on a multisugar on a valid sequence' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'A(a1-3)Z(a1-2)[B(a1-4)Z(a1-2)][C(a1-5)Z(a1-2)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y3a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3c').identifier === 'C','Finds branch');
});

QUnit.test( 'Finding monosaccharides on a sugar with complex branching' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'T(a1-2)[U(a1-2)]A(a1-4)Z(a1-2)[B(a1-3)Z(a1-3)][C(a1-2)Z(a1-4)][S(a1-5)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y3a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3c').identifier === 'C','Finds branch');
});

QUnit.test( 'Finding monosaccharides on a multisugar without auto-balancing the tree when branch ordering is incorrect' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'T(a1-2)[U(a1-2)]A(a1-4)Z(a1-2)[B(a1-3)Z(a1-2)][C(a1-2)Z(a1-2)][S(a1-2)]R';
  assert.ok(sugar.locate_monosaccharide('y1a').identifier === 'R','Finds root');
  assert.ok(sugar.locate_monosaccharide('y3a').identifier === 'A','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3b').identifier === 'B','Finds branch');
  assert.ok(sugar.locate_monosaccharide('y3c').identifier === 'C','Finds branch');
});