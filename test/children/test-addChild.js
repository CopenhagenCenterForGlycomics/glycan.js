/*global QUnit*/

import Monosaccharide from "../../js/Monosaccharide";

QUnit.module("Test that we can read in sequences", {
});

QUnit.test( "Adding a child to a Monosaccharide" , function( assert ) {
	var sequence = "GlcNAc";
	var foo = new Monosaccharide(sequence);
	var bar = new Monosaccharide(sequence);
	foo.addChild(3,bar);
	assert.ok(foo.childAt(3) === bar,"Child is set at right position");
	assert.ok(bar.parent === foo, "Child has parent set");
});


QUnit.test( "Adding additional child to a Monosaccharide" , function( assert ) {
	var sequence = "GlcNAc";
	var foo = new Monosaccharide(sequence);
	var bar = new Monosaccharide(sequence);
	var baz = new Monosaccharide(sequence);
	foo.addChild(3,bar);
	assert.ok(foo.childAt(3) === bar,"First child is set");
	foo.addChild(4,baz);
	assert.ok(foo.childAt(4) === baz,"Second child is set");
	assert.ok(bar.parent === foo, "First child has parent set");
	assert.ok(baz.parent === foo, "Second child has parent set");
});

QUnit.test( "Adding additional child to a Monosaccharide on the same linkage" , function( assert ) {
	var sequence = "GlcNAc";
	var foo = new Monosaccharide(sequence);
	var bar = new Monosaccharide(sequence);
	var baz = new Monosaccharide(sequence);
	foo.addChild(3,bar);
	assert.ok(foo.childAt(3) === bar,"First child is set");
	foo.addChild(3,baz);
	assert.ok(foo.childAt(3) === bar,"Second child is set");
	var kids_linkages = foo.child_linkages.get(3);
	assert.ok(bar.parent === foo, "First child has parent set");
	assert.ok(baz.parent === foo, "Second child has parent set");
	assert.ok(kids_linkages[0] === bar, "First child returned in list of linkages");
	assert.ok(kids_linkages[1] === baz, "Second child returned in list of linkages");

});