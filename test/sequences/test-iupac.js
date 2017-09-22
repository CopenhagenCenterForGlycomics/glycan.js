/*global QUnit*/

import Monosaccharide from '../../js/Monosaccharide';
import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';


class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can read in sequences', {
});

QUnit.test( 'Reading in a simple monosaccharide' , function( assert ) {
  var sequence = 'GlcNAc';
  var foo = new Monosaccharide(sequence);
  assert.ok(foo.identifier === sequence,'Can\'t read in sequence '+sequence);
});

QUnit.test( 'Reading in a disaccharide', function( assert ) {
  var sequence = 'GlcNAc(b1-4)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 1,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'GlcNAc','Has the right child');
});

QUnit.test( 'Reading and writing a disaccharide', function( assert ) {
  var sequence = 'GalNAc(b1-4)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = sugar.sequence;
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 1,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'GalNAc','Has the right child');
  assert.ok(regenerated == sequence, 'Has the same sequence regenerated');
});

QUnit.test( 'Reading and writing a linear trisaccharide', function( assert ) {
  var sequence = 'GalNAc(b1-3)GlcNAc(b1-4)GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = sugar.sequence;
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 1,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'GlcNAc','Has the right child');
  assert.ok(regenerated == sequence, 'Has the same sequence regenerated');
});

QUnit.test( 'Reading and writing a trisaccharide', function( assert ) {
  var sequence = 'GalNAc(b1-3)[GlcNAc(b1-4)]GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = sugar.sequence;
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 2,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'GlcNAc','Has the right child');
  assert.ok(sugar.root.children[1].identifier == 'GalNAc','Has the right child');
  assert.ok(regenerated == sequence, 'Has the same sequence regenerated');
});


QUnit.test( 'Reading and writing a basic mutisugar', function( assert ) {
  var sequence = 'GalNAc(b1-4)[Man(b1-4)]GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = (sugar.sequence);
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 2,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'Man' ,'Has the right child');
  assert.ok(regenerated == sequence, 'Has the same sequence regenerated');
});


QUnit.test( 'Reading and writing nested branches', function( assert ) {
  var sequence = 'GalNAc(b1-3)[Man(a1-3)[GlcNAc(b1-2)]GlcNAc(b1-4)]GlcNAc';
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = sugar.sequence;
  assert.ok(sugar.root.identifier == 'GlcNAc','Root is set correctly');
  assert.ok(sugar.root.children.length == 2,'Has the right number of children');
  assert.ok(sugar.root.children[0].identifier == 'GlcNAc','Has the right child');
  assert.ok(regenerated == sequence, 'Has the same sequence regenerated');
});

let make_tracking_sugar = (base) => {
  let tracker = [];

  let tracking_mono = class extends base.Monosaccharide {
    constructor(identifier) {
      tracker.push(identifier);
      return super(identifier);
    }
  };
  let tracking_sugar = class extends base {
    constructor() {
      tracker.length = 0;
      return super();
    }
    get tracker() {
      return tracker;
    }
    static get Monosaccharide() {
      return tracking_mono;
    }
  };
  return tracking_sugar;
};

let TrackedSugar = make_tracking_sugar(IupacSugar);

QUnit.test( 'Test reading in sequence in depth first order', function( assert ) {
  let sequence = 'E(b1-3)[D(a1-2)[C(b1-3)]B(b1-4)]A';
  let sugar = new TrackedSugar();
  sugar.sequence = sequence;
  assert.ok(sugar.root.identifier === 'A','Root is set correctly');
  assert.deepEqual(sugar.tracker, ['A','B','C','D','E'] ,'Tracked residues in the right order');

  sequence = 'F(b1-3)[E(b1-3)[D(a1-2)C(b1-3)]B(b1-4)]A';
  sugar = new TrackedSugar();
  sugar.sequence = sequence;

  assert.ok(sugar.root.identifier === 'A','Root is set correctly');
  assert.deepEqual(sugar.tracker, ['A','B','C','D','E','F'] ,'Tracked residues in the right order');

});

QUnit.test( 'Respect sequence branch ordering', function( assert ) {
  let sequence = 'E(b1-?)[D(a1-?)[C(b1-?)]B(b1-?)]A';
  let sugar = new TrackedSugar();
  sugar.sequence = sequence;
  assert.ok(sugar.root.identifier === 'A','Root is set correctly');
  assert.deepEqual(sugar.tracker, ['A','B','C','D','E'] ,'Tracked residues in the right order');

  sequence = 'F(b1-?)[E(b1-?)[D(a1-?)C(b1-?)]B(b1-?)]A';
  sugar = new TrackedSugar();
  sugar.sequence = sequence;

  assert.ok(sugar.root.identifier === 'A','Root is set correctly');
  assert.deepEqual(sugar.tracker, ['A','B','C','D','E','F'] ,'Tracked residues in the right order');

});
