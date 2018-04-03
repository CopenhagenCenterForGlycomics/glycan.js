import SugarAwareLayout from './SugarAwareLayout';
import {IO as Iupac} from './CondensedIupac';
import Sugar from './Sugar';

class IupacSugar extends Iupac(Sugar) {}

let identifier_comparator = (a,b) => {
  if ( ! a || ! b) {
    return false;
  }
  return a.identifier === b.identifier;
};


const NLINKED_CORE = new IupacSugar();
NLINKED_CORE.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';


class LinkageLayout extends SugarAwareLayout {
  static LayoutMonosaccharide(sugar,res,position,parent_position,layout) {

    const DELTA_Y = 2*this.DELTA_Y;
    const DELTA_X = this.DELTA_X;


    position = super.LayoutMonosaccharide(sugar,res,position,parent_position,layout);

    if ( ! res.parent ) {
      return position;
    }


    let matches = sugar.match_sugar_pattern(NLINKED_CORE, identifier_comparator );
    if (matches.length > 0) {
      if (matches[0].composition().map( traced => traced.original ).indexOf(res) >= 0) {
        return position;
      }
    }

    let linkage = res.parent.linkageOf(res);

    let is_fucose = res.identifier === 'Fuc';

    switch (linkage) {
      case 0:
        position.dx = 0;
        position.dy = -1 * DELTA_Y;
        break;
      case 2:
        position.dx = -1 * DELTA_X;
        position.dy = 0;
        break;
      case 3:
        position.dx = -1 * DELTA_X;
        position.dy = -1 * DELTA_Y;
        if (is_fucose) {
          position.rotate = 90;
        }
        break;
      case 4:
        position.dx = 0;
        position.dy = -1 * DELTA_Y;
        if (is_fucose) {
          position.rotate = 180;
        }
        break;
      case 6:
        position.dx = 1 * DELTA_X;
        position.dy = -1 * DELTA_Y;
        if (is_fucose) {
          position.rotate = 225;
        }
        break;
      case 8:
        position.dx = 1 * DELTA_X;
        position.dy = 0;
        break;
    }

    return position;
  }
}

export default LinkageLayout;
