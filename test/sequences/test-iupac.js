/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";
import Sugar from "../../js/Sugar";
import {Builder} from "../../js/CondensedIupac";


class IupacSugar extends Builder(Sugar) {}

QUnit.module("Test that we can read in sequences", {
});

QUnit.test( "Reading in a simple monosaccharide" , function( assert ) {
  var sequence = "GlcNAc";
  var foo = new Monosaccharide(sequence);
  assert.ok(foo.identifier === sequence,"Can't read in sequence "+sequence);
});

QUnit.test( "Reading in a disaccharide", function( assert ) {
  var sequence = "GlcNAc(b1-4)GlcNAc";
  let sugar = new IupacSugar();
  let root = sugar.parseSequence(sequence);
  assert.ok(root.identifier == "GlcNAc","Root is set correctly");
  assert.ok(root.children.length == 1,"Has the right number of children");
  assert.ok(root.children[0].identifier == "GlcNAc","Has the right child");  
});

QUnit.test( "Reading in an incorrect sequence" , function( assert ) {
  var sequence = "Shazbut";
  assert.ok(false,"Can't read in sequence "+sequence);
});