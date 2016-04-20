/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";

QUnit.module("Test that we can read in sequences", {
});

QUnit.test( "Reading in a simple monosaccharide" , function( assert ) {
  var sequence = "GlcNAc";
  var foo = new Monosaccharide("GlcNAc");
  foo.anomer = "a";
  assert.ok(false,"Can't read in sequence "+sequence);
});

QUnit.test( "Reading in a disaccharide", function( assert ) {
  var sequence = "GlcNAc(b1-4)GlcNAc";
  assert.ok(false,"Can't read in sequence "+sequence);
});

QUnit.test( "Reading in an incorrect sequence" , function( assert ) {
  var sequence = "Shazbut";
  assert.ok(false,"Can't read in sequence "+sequence);
});