/*global QUnit*/

import Sugar from "../../js/Sugar";
import {IO as Iupac} from "../../js/CondensedIupac";


class IupacSugar extends Iupac(Sugar) {}

QUnit.module("Test that we can read in sequences with comment fields", {
});

QUnit.test( "Reading in a disaccharide with a comment", function( assert ) {
  var sequence = "GlcNAc(b1-4)GlcNAc+\"SomeCommentField\"";
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  assert.ok(sugar.root.identifier == "GlcNAc","Root is set correctly");
  assert.ok(sugar.root.children.length == 1,"Has the right number of children");
  assert.ok(sugar.root.children[0].identifier == "GlcNAc","Has the right child");
  assert.ok(sugar.comment === "SomeCommentField");
});