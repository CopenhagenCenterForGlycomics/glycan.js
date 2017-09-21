/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";
import Sugar from "../../js/Sugar";

QUnit.module("Test that we can get the paths of sugars", {
});

QUnit.test( "Getting basic paths" , function( assert ) {
  var sugar = new Sugar();
  var foo = new Monosaccharide("GlcNAc");
  var bar = new Monosaccharide("GalNAc");
  var baz = new Monosaccharide("GalNAc");
  sugar.root = foo;
  foo.addChild(3,bar);
  var paths = sugar.paths();
  assert.ok(paths[0][0] === bar,"Correct residue is returned");
  assert.ok(paths.length === 1,"Correct number of paths are returned");
  foo.addChild(4,baz);
  paths = sugar.paths();
  assert.ok(paths[1][0] === baz,"Correct residue is returned");
  assert.ok(paths.length === 2,"Correct number of paths are returned");

});
