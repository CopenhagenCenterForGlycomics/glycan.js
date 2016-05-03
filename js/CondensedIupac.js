
import Monosaccharide from "./Monosaccharide";

let create_bold_branch, create_bold_tree;

let get_monosaccharide = (proto) => {
	// There should be a per-object
	// and per-class override of the 
	// class that we use here to allow
	// for specific functionality
	// for some sugars
	return new Monosaccharide(proto);
};

create_bold_branch = (units) => {
	let unit = units.shift();
	if ( ! unit ) {
		throw new Error("Empty branch");
	}
	let [child_root, linkage] = unit.split("(");
	let child = get_monosaccharide(child_root);
	create_bold_tree(child,units);
	return [ child, linkage ];
};

create_bold_tree = ( root, units ) => {
	while (units.length > 0) {
		let unit = units.shift();
		if ( unit == "]" ) {
			let [child, linkage] = create_bold_branch(units);
			let [anomer,parent_link,,child_link] = (linkage || "").split("");
			child.anomer = anomer;
			child.parent_linkage = parseInt(parent_link);
			root.addChild(parseInt(child_link),child);
		} else if ( unit == "[" ) {
			return;
		} else {
			let [child_root, linkage] = unit.split("(");
			let [anomer,parent_link,,child_link] = (linkage || "").split("");
			let child = get_monosaccharide(child_root);
			child.anomer = anomer;
			child.parent_linkage = parseInt(parent_link);
			root.addChild(parseInt(child_link),child);
		}
	}
};


let write_monosaccharide = (mono) => {
	return mono.toString();
};

let write_linkage = (mono) => {
	if (! mono.parent ) {
		return "";
	}
	return "("+ mono.anomer + mono.parent_linkage + "-";
};

let reverse = function(string) {
	return string.split("").reverse().join("");
};

let getPropertyDescriptor = function(object,descriptor) {
	let retval = null;
	while (! (retval = Object.getOwnPropertyDescriptor(object,descriptor)) && Object.getPrototypeOf(object) ) {
		object = Object.getPrototypeOf(object);
	}
	return retval;
};

let Builder = function(superclass) {
	let getter = (getPropertyDescriptor(superclass.prototype, "sequence") || { "get" : null }).get;
	let setter = function(sequence) {
		this.root = this.parseSequence(sequence);
	};
	let methods = {};
	if (getter) {
		methods.get = getter;
	}
	if (setter) {
		methods.set = setter;
	}
	Object.defineProperty(superclass.prototype, "sequence", methods);

	return class extends superclass {
		parseSequence(sequence) {
			let units = sequence.split(/([\[\]])/);
			let branch_count = units.length;
			units = [].concat.apply([],units.map(unit => reverse(unit).split(")").filter( (unit) => unit.length ).map(reverse))).reverse();
			if (branch_count == 1) {
				units = units.reverse();
			}
			let root = get_monosaccharide( units.shift() );
			create_bold_tree(root,units);
			return root;
		}
	};
};

let link_expander = function(links) {
	let position = links[0];
	return links[1].map( (mono) => [ position , mono ]);
};

let Writer = function(superclass) {
	let setter = (getPropertyDescriptor(superclass.prototype, "sequence") || { "set" : null }).set;
	let getter = function() {
		return this.writeSequence(this.root);
	};
	let methods = {};

	if (getter) {
		methods.get = getter;
	}
	if (setter) {
		methods.set = setter;
	}

	Object.defineProperty(superclass.prototype, "sequence", methods);

	return class extends superclass {
		writeSequence(start=this.root) {
			let self = this;
			let child_sequence = ""+[].concat.apply([],[...start.child_linkages].map(link_expander)).map( kid => self.writeSequence(kid[1])+kid[0]+")" ).reverse().reduce( (curr,next) => curr ? curr+"["+next+"]" : next , "" );
			return child_sequence+write_monosaccharide(start)+write_linkage(start);
		}
	};
};

let IO = (superclass) => Builder(Writer(superclass));

export {Builder,Writer,IO};