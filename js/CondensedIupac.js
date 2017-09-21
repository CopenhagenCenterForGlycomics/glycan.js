
import Monosaccharide from "./Monosaccharide";

let follow_bold_branch, create_bold_tree;

let get_monosaccharide = (proto) => {
	// There should be a per-object
	// and per-class override of the 
	// class that we use here to allow
	// for specific functionality
	// for some sugars
	return new Monosaccharide(proto);
};

follow_bold_branch = (units) => {
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
			let [child, linkage] = follow_bold_branch(units);
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
			root = child;
		}
	}
};

let reverse = function(string) {
	return string.split("").reverse().join("");
};

let parse_sequence = function(sequence) {
	let comment = "";
	[sequence,comment]=sequence.split("+");
	comment = (comment || "").replace(/^"/,"").replace(/"$/,"");

	if (sequence.match(/[\]\)]$/)) {
		sequence = `${sequence}Root`;
	}
	sequence = sequence+")";
	let units = sequence.split(/([\[\]])/);

	// Reverse ordering of branches so we see closer residues first
	units = units.map( unit => unit.split(/\)(?=[A-Za-z])/).reverse().join(")") )
							 .map( unit => unit.match(/\d$/) ? unit+")" : unit );

	// We wish to split the units by the linkages
	units = [].concat.apply([],units.map(unit => reverse(unit).split(")").filter( (unit) => unit.length ).map(reverse))).reverse();

	let root = get_monosaccharide( units.shift() );
	create_bold_tree(root,units);

	this.root = root;

	if (comment) {
		this.comment = comment;
	}

	return root;
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


let link_expander = function(links) {
	let position = links[0];
	return links[1].map( (mono) => [ position , mono ]);
};


let write_sequence = function(start=this.root) {
	let self = this;
	let child_sequence = ""+[].concat.apply([],[...start.child_linkages].map(link_expander)).map( kid => write_sequence.call(self,kid[1])+kid[0]+")" ).reverse().reduce( (curr,next) => curr ? curr+"["+next+"]" : next , "" );
	return child_sequence+write_monosaccharide(start)+write_linkage(start);
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
		parse_sequence.call(this,sequence);
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
	};
};

let Writer = function(superclass) {
	let setter = (getPropertyDescriptor(superclass.prototype, "sequence") || { "set" : null }).set;
	let getter = function() {
		return write_sequence.call(this,this.root);
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
	};
};

let anonymous_class = (superclass) => { return class extends superclass {}; };

let IO = (superclass) => Builder(Writer(anonymous_class(superclass)));

export {Builder,Writer,IO};