"use strict";

let anomer_symbol = Symbol("anomer");
let identifier_symbol = Symbol("identifier");
let parent_linkage_symbol = Symbol("parent_linkage");
let parent_symbol = Symbol("parent");


/* 	We basically want a barebones Monosacharide class that uses
	some common set of identifiers for each of the monosaccharide
	units. We can then mixin things like mass and sequence
	translation to edit the actual functionality for the sugar.
	Can even have a "strict mode" sugar mixin that enforces
	rules.
*/

let linkage_map = new WeakMap();
let children_map = new WeakMap();

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

	get parent() {
		return this[parent_symbol];
	}
	// This should be a tristate variable a/b/?
	set parent(parent) {
		this[parent_symbol] = parent;
	}

	// This should spit out an immutable array - force usage of the api
	// to add/remove children.
	get children() {
		return children_map.get(this) || [];
	}

	get child_linkages() {
		var results = new Map();
		this.children.forEach(function(mono) {
			let kids = results.get( linkage_map.get(mono) );
			if ( ! kids ) {
				kids = [];
				results.set( linkage_map.get(mono), kids );
			}
			kids.push(mono);
		});
		return results;
	}

	get siblings() {
		var self = this;
		if ( ! this.parent ) {
			return [];
		}
		return this.parent.children.filter(mono => mono !== self);
	}

	// child linkages

	// methods:
	// add child
	addChild(linkage,child) {
		linkage_map.set(child,linkage);
		children_map.set(this, (children_map.get(this) || []).concat(child));

		// Each child references its parent.
		// When you clear this, you don't
		// have any strong references to this monosaccharide
		// and all its kids, so they will get GC'ed
		child.parent = this;
	}

	// remove child
	removeChild(new_linkage) {
		var self = this;

		var kids = children_map.get(self);

		let remover = (child) => {
			kids.splice(kids.indexOf(child),1);
			linkage_map.delete(child);
			child.parent = null;
		};

		for (let [linkage,children] of this.child_linkages) {
			if (new_linkage == linkage) {
				children.forEach(remover);
			}
		}
	}

	childAt(linkage) {
		var kids = this.child_linkages.get(linkage);
		return kids ? kids[0] : kids;
	}

	// cast to sugar (make monosaccharide a sugar/glycan class)
}

let StrictLinkages = (superclass) => class extends superclass {
	addChild(linkage,child) {
		if (this.childAt(linkage)) {
			this.removeChild(linkage);
		}
		return super.addChild(linkage,child);
	}
};

export class StrictMonosaccharide extends StrictLinkages(Monosaccharide) {}