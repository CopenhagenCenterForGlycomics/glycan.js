"use strict";

let root_symbol = Symbol("root");

export default class Sugar {
	constructor() {
	}

	set root(residue) {
		this[root_symbol] = residue;
	}
	get root() {
		return this[root_symbol];
	}

	// FIXME - Matching residues (given a prototype, which residues match)

	// Positional description
	// FIXME - linkage + residue path from given residue to root - optional return residues also
	// FIXME - get path to root

	leaves(root=this.root) {
		return this.composition(root).filter( mono => mono.children.length === 0);
	}

	// FIXME to use a well defined traversal alogirthm (DFS or BFS)
	composition(root=this.root) {
		let self = this;
		let return_value = [ [root] ].concat(root.children.map(child => self.composition(child)));
		return return_value.reduce( (a,b) => a.concat(b) );
	}

	// FIXME - paths (all paths from leaves to root)
	paths(root=this.root) {
		let self = this;
		return this.leaves(root).map((leaf) => Array.from(self.residues_to_root(leaf)));
	}

	// Math functions
	// FIXME - Compare by block - run the closure across the sugar,
	//			given a traversal algorithm
	// FIXME - Union - Create a union sugar from two sugars
	// FIXME - Subtract - Get residues that aren't common
	// FIXME - Intersect - Find the residues that match with given sugar

	// Search methods
	// FIXME - Find residue by linkage path
	// FIXME - Find residue by linkage and residue identifier pair path
	//			Specify the start residues to start looking from.
	//			Allow wildcards for the residue identifier

	// Traversal methods
	// FIXME - Depth first traversal
	// FIXME - Breadth first traversal
	// FIXME - Node to root traversal
	*residues_to_root(start=this.root) {
		yield start;
		while(start.parent) {
			start = start.parent;
			yield start;
		}
	}
}