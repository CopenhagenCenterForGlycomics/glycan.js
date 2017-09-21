/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";
import Sugar from "../../js/Sugar";

QUnit.module("Test that we can get the leaves of sugars", {
});

QUnit.test( "Adding a child to a Monosaccharide and getting the right leaves" , function( assert ) {
  var sugar = new Sugar();
  var foo = new Monosaccharide("GlcNAc");
  var bar = new Monosaccharide("GalNAc");
  var baz = new Monosaccharide("GalNAc");
  sugar.root = foo;
  foo.addChild(3,bar);
  var leaves = sugar.leaves();
  assert.ok(leaves[0] === bar,"Correct residue is returned");
  assert.ok(leaves.length === 1,"Correct number of leaves are returned");
  bar.addChild(3,baz);
  leaves = sugar.leaves();
  assert.ok(leaves[0] === baz,"Correct residue is returned");
  assert.ok(leaves.length === 1,"Correct number of leaves are returned");
});
