/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";

QUnit.module("Test that we can read in sequences", {
});

QUnit.test( "Adding a child to a Monosaccharide" , function( assert ) {
	var sequence = "GlcNAc";
	var foo = new Monosaccharide(sequence);
	var bar = new Monosaccharide(sequence);
	foo.addChild(3,bar);
	assert.ok(foo.childAt(3) === bar,"We can load in a module");
});