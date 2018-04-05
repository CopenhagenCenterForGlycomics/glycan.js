/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Grafting a sugar to cause imbalance' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-?)GlcNAc';

  var child = new IupacSugar();
  child.sequence = 'Glc(b1-?)Gal(b1-?)GlcNAc';
  sugar.root.graft(child.root.children[0]);
  sugar.root.balance();
  assert.deepEqual(sugar.locate_monosaccharide('y2a').children.length,1,'Longest branch at bottom');
  assert.deepEqual(sugar.sequence,'Glc(b1-?)Gal(b1-?)[Gal(b1-?)]GlcNAc','Rebalances sugar');
});

QUnit.test( 'Grafting a sugar to cause imbalance' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';

  var child = new IupacSugar();
  child.sequence = 'Glc(b1-?)Gal(b1-3)GlcNAc';
  sugar.root.graft(child.root.children[0]);
  sugar.root.balance();
  assert.deepEqual(sugar.locate_monosaccharide('y2a').children.length,1,'Longest branch at bottom');
  assert.deepEqual(sugar.sequence,'Glc(b1-?)Gal(b1-3)[Gal(b1-3)]GlcNAc','Rebalances sugar');
});

QUnit.test( 'Grafting a sugar to cause imbalance' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)[Gal(b1-3)[Gal(b1-3)]Gal(b1-3)]GlcNAc';

  var child = new IupacSugar();
  child.sequence = 'Glc(b1-?)Gal(b1-3)GlcNAc';
  let target = sugar.leaves()[2];
  target.graft(child.root.children[0]);
  target.balance();
  assert.deepEqual(sugar.locate_monosaccharide('y3a').children.length,1,'Longest branch at bottom');
  assert.deepEqual(sugar.sequence,'Glc(b1-?)Gal(b1-3)Gal(b1-3)[Gal(b1-3)]Gal(b1-3)[Gal(b1-3)]GlcNAc','Rebalances sugar');
});