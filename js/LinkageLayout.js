import { default as SugarAwareLayout, calculate_layout_hso3 } from './SugarAwareLayout';
import {IO as Iupac} from './CondensedIupac';
import Sugar from './Sugar';

import Monosaccharide from './Monosaccharide';


class IupacSugar extends Iupac(Sugar) {}

let identifier_comparator = (a,b) => {
  if ( ! a || ! b) {
    return false;
  }
  return a.identifier === b.identifier;
};


const NLINKED_CORE = new IupacSugar();
NLINKED_CORE.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';

const OLINKED_CORE = new IupacSugar();
OLINKED_CORE.sequence = 'Gal(b1-3)GalNAc';

const LINEARISE_CHAINS = false;

class LinkageLayout extends SugarAwareLayout {
  static LayoutMonosaccharide(sugar,res,position,parent_position,layout) {

    const DELTA_Y_SCALE = 2;

    const DELTA_Y = DELTA_Y_SCALE*this.DELTA_Y;
    const DELTA_X = this.DELTA_X;


    position = SugarAwareLayout.LayoutMonosaccharide.call(this,sugar,res,position,parent_position,layout);

    if ( ! res.parent ) {
      return position;
    }

    if ( res.identifier === 'HSO3') {
      return calculate_layout_hso3.call(this,res,position, DELTA_X, DELTA_Y / DELTA_Y_SCALE);
    }

    let matches = sugar.match_sugar_pattern(NLINKED_CORE, identifier_comparator );
    if (matches.length > 0) {
      if (matches[0].composition().map( traced => traced.original ).indexOf(res) >= 0) {
        if ( ! this.LINKS ) {
          position.ignore_overlap = true;
          if (res.identifier == 'Man' && res.parent.identifier == 'Man') {
            position.dx = 0.25*position.dx;
            position.dy = 0.225*position.dy;
          }
        }
        return position;
      }
    }
    matches = sugar.match_sugar_pattern(OLINKED_CORE, identifier_comparator );
    if (matches.length > 0) {
      if ( LINEARISE_CHAINS && res.identifier === 'GlcNAc' && res.parent.linkageOf(res) === 3 && res.siblings.length === 0) {
        return position;
      }
      let in_core = matches[0].composition().map( traced => traced.original );
      if ( in_core[0] && in_core[0].parent && ['Ser','Thr','Tyr'].indexOf(in_core[0].parent.identifier) < 0 ) {

      } else {
        if (in_core.indexOf(res) >= 0) {
          return position;
        }
        if (res.siblings.filter( sib => in_core.indexOf(sib) >= 0 ).length > 0) {
          return position;
        }
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
      position.dx = -1 * DELTA_X * (parent_position.spread || 1);
      position.dy = 0;
      if (is_fucose) {
        position.rotate = 90;
      }
      break;
    case 3:
      position.dx = -1 * DELTA_X;
      position.dy = -1 * DELTA_Y;
      if (is_fucose) {
        position.rotate = 0;
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
        position.rotate = this.LINKS ? 206 : 225;
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
