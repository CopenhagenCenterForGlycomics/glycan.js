import { Mass, UNDERIVATISED, PERMETHYLATED, NA, H, composition_to_mass } from '../../js/Mass';


const FRAGS =`Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	y5b/b2a	350.5
Fuc(a1-3)[Gal(b1-4)]GlcNAc(b1-2)Man(a1-3)[GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc	b5a/y3a/y3b	366.4`;

let fragments = FRAGS.split('\n').map( line => line.split('\t'));

const FRAGMENTS = {};

for (let frag of fragments) {
  if ( ! FRAGMENTS[frag[0]] ) {
    FRAGMENTS[frag[0]] = {};
  }
  FRAGMENTS[frag[0]][frag[1]] = { val: parseFloat(frag[2]) - composition_to_mass([H]) };
}

export { FRAGMENTS };
