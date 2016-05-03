/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";
import Sugar from "../../js/Sugar";
import {Builder,Writer} from "../../js/CondensedIupac";


class IupacSugar extends Builder(Writer(Sugar)) {}

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
  sugar.sequence = sequence;
  assert.ok(sugar.root.identifier == "GlcNAc","Root is set correctly");
  assert.ok(sugar.root.children.length == 1,"Has the right number of children");
  assert.ok(sugar.root.children[0].identifier == "GlcNAc","Has the right child");
});

QUnit.test( "Reading and writing a disaccharide", function( assert ) {
  var sequence = "GalNAc(b1-4)GlcNAc";
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = (sugar.sequence);
  assert.ok(sugar.root.identifier == "GlcNAc","Root is set correctly");
  assert.ok(sugar.root.children.length == 1,"Has the right number of children");
  assert.ok(sugar.root.children[0].identifier == "GalNAc","Has the right child");
  assert.ok(regenerated == sequence, "Has the same sequence regenerated");
});

QUnit.test( "Reading and writing a basic mutisugar", function( assert ) {
  var sequence = "GalNAc(b1-4)[Man(b1-4)]GlcNAc";
  let sugar = new IupacSugar();
  sugar.sequence = sequence;
  let regenerated = (sugar.sequence);
  assert.ok(sugar.root.identifier == "GlcNAc","Root is set correctly");
  assert.ok(sugar.root.children.length == 2,"Has the right number of children");
  assert.ok(sugar.root.children[0].identifier == "Man" ,"Has the right child");
  assert.ok(regenerated == "Man(b1-4)[GalNAc(b1-4)]GlcNAc", "Has the same sequence regenerated");
});


QUnit.test( "Reading in an incorrect sequence" , function( assert ) {
  var sequence = "Shazbut";
  assert.ok(false,"Can't read in sequence "+sequence);
});