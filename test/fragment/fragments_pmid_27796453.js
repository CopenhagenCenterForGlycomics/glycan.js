import { Mass, UNDERIVATISED, PERMETHYLATED, NA, H, composition_to_mass } from '../../js/Mass';


const FIGURE_1A =`
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y5b/b2a	350.5
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	b5a/y3a/y3b	366.4
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	b2a	512.1
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	c4a/z3a	528.0
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y3a/y4b	751.4
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	c5a/z4a	893.6
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	b4a/y5b	1039.5
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y5a/y3b	1116.5
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y5b/y4b	1262.6
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	z4b	1406.6
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y4b	1424.5
`;

const FIGURE_2B = `
GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc	y1a	468.4
GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc	b4a/y3a	899.6
GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc	b4a/y4a	1103.7
GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc	b4a	1362.8
GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc	y4a	1570.8
`

const FRAGMENTS = {};

function splitlines(textblock) {
	return textblock.split('\n').filter(line => line.trim()).filter( line => line != '' ).map( line => line.split('\t'))
}

function populateFragments(figure,frags) {
	if ( ! FRAGMENTS[figure]) {
		FRAGMENTS[figure] = {};
	}
	for (let frag of frags) {
	  if ( ! FRAGMENTS[figure][frag[0]] ) {
	    FRAGMENTS[figure][frag[0]] = {};
	  }
	  FRAGMENTS[figure][frag[0]][frag[1]] = { val: parseFloat(frag[2]) - composition_to_mass([H]) };
	}
}

populateFragments('figure1a', splitlines(FIGURE_1A) );
populateFragments('figure2b', splitlines(FIGURE_2B) );



export { FRAGMENTS };
