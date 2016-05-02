
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
	create_bold_tree(child_root,units);
	return [ child_root, linkage ];
};

create_bold_tree = ( root, units ) => {
	while (units.length > 0) {
		let unit = units.shift();
		if ( unit == "]" ) {
			let [branch_root, linkage] = create_bold_branch(units);
			root.addChild(branch_root,linkage);
		} else if ( unit == "[" ) {
			return;
		} else {
			let [child_root, linkage] = unit.split("(");
			root.addChild(parseInt(linkage.split(/-/)[1]),get_monosaccharide(child_root));
		}
	}
};


let write_monosaccharide = (mono) => {
	return mono.toString();
};

let reverse = function(string) {
	return string.split("").reverse().join("");
};

let Builder = (superclass) => class extends superclass {
	parseSequence(sequence) {
		let units = sequence.split(/[\[\]]/);
		units = [].concat.apply([],units.map(unit => reverse(unit).split(")").map(reverse)));
		let root = get_monosaccharide( units.shift() );
		create_bold_tree(root,units);
		return root;
	}
};

let Writer = (superclass) => class extends superclass {
	writeSequence(start=this.root) {
		let self = this;
		let child_sequence = ""+start.children.map(kid => self.writeSequence(kid)).reduce( (curr,next) => curr ? "["+next+"]"+curr : next );
		return child_sequence+write_monosaccharide(start);
	}
};

export {Builder,Writer};