"use strict";

let anomer_symbol = Symbol("anomer");
let identifier_symbol = Symbol("identifier");
let children_symbol = Symbol("children");
let parent_linkage_symbol = Symbol("parent_linkage");

/* 	We basically want a barebones Monosacharide class that uses
	some common set of identifiers for each of the monosaccharide
	units. We can then mixin things like mass and sequence
	translation to edit the actual functionality for the sugar.
	Can even have a "strict mode" sugar mixin that enforces
	rules.
*/

let linkage_map = new WeakMap();

export default class Monosaccharide {
	constructor(identifier) {
		if ( ! identifier ) {
			throw new Error("Missing identifier");
		}
		// Accept any identifier - we can do
		// checking on validity of identifiers
		// via mixins.
		this[identifier_symbol] = identifier;
	}

	get identifier() {
		return this[identifier_symbol];
	}

	// properties:
	get anomer() {
		return this[anomer_symbol];
	}
	// This should be a tristate variable a/b/?
	set anomer(anomer) {
		this[anomer_symbol] = anomer;
	}

	// parent linkage
	get parent_linkage() {
		return this[parent_linkage_symbol];
	}

	// Accept any number for the parent linkage. Also accept null for
	// unknown linkage
	set parent_linkage(linkage) {
		this[parent_linkage_symbol] = linkage;
	}


	// This should spit out an immutable array - force usage of the api
	// to add/remove children.
	get children() {
		return this[children_symbol];
	}

	get child_linkages() {
		return this.children.map(mono => linkage_map.get(mono));
	}

	// child linkages

	// methods:
	// add child
	addChild(linkage,child) {
		linkage_map.set(child,linkage);
		this[children_symbol] = (this[children_symbol] || []).concat([child]);
	}
	// remove child
	// cast to sugar (make monosaccharide a sugar/glycan class)
	// siblings
	// children
	// linkage at position
}