/*global QUnit*/
"use strict";

import Monosaccharide from "../../js/Monosaccharide";

QUnit.module("Test that we can load modules", {
});

QUnit.test( "Loading up a simple class" , function( assert ) {
	let test = new Monosaccharide();
	assert.ok(test !== null,"We can load in a module");
});
