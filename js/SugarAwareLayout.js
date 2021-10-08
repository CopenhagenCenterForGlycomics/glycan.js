import CondensedLayout from './CondensedLayout';

import Monosaccharide from './Monosaccharide';

import {IO as Iupac} from './CondensedIupac';
import Sugar from './Sugar';

import Repeat from './Repeat';

const not_sulf = res => res.identifier !== 'HSO3';

const horizontal_identifiers = [ 'GlcA','IdoA','Xyl','HSO3','Rbo','P','GlcN'];

class IupacSugar extends Iupac(Sugar) {}

const NLINKED_CORE = new IupacSugar();
NLINKED_CORE.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';

let identifier_comparator = (a,b) => {
  if ( ! a || ! b) {
    return false;
  }
  return a.identifier === b.identifier;
};


const CHECKED_NLINKED = new WeakMap();

class SugarAwareLayout extends CondensedLayout {

  static CalculateIdentifier(residue) {
    let residue_id = residue.identifier.toLowerCase();
    let parent_linkage = residue.parent ? residue.parent.linkageOf(residue) : null;
    if (parent_linkage === Monosaccharide.LINKAGES.N) {
      parent_linkage = 'N';
    }
    if (parent_linkage === Monosaccharide.LINKAGES.O) {
      parent_linkage = 'O';
    }
    let residue_suffix = (residue.parent && residue_id === 'hso3' && parent_linkage) ? '.'+parent_linkage : '';
    return `${residue_id}${residue_suffix}`;
  }


  static get DELTA_X() {
    return super.DELTA_X*1.25;
  }

  static get DELTA_Y() {
    return super.DELTA_Y*1.25;
  }

  static LayoutMonosaccharide(sugar,res,position,parent_position,layout) {

    const DELTA_Y = this.DELTA_Y;
    const DELTA_X = this.DELTA_X;


    position = CondensedLayout.LayoutMonosaccharide.call(this,sugar,res,position,parent_position);

    if (horizontal_identifiers.indexOf(res.identifier) >= 0) {
      position.keep_horizontal = true;
    }


    if ( ! CHECKED_NLINKED.get(position) && ! this.LINKS && ! position.ignore_overlap ) {
      let matches = sugar.match_sugar_pattern(NLINKED_CORE, identifier_comparator );
      CHECKED_NLINKED.set(position,true);
      if (matches.length > 0) {
        if (matches[0].composition().map( traced => traced.original ).indexOf(res) >= 0) {
          if ( ! this.LINKS ) {
            position.ignore_overlap = true;
          }
        }
      }
    }



    let sibs = res.siblings;

    if ( (sibs.filter(not_sulf).length == 1 && (res.identifier == 'Fuc' || res.identifier == 'NeuAc')) ||
          ( res.parent && res.parent.endsRepeatUnit && res.parent.repeat.mode == Repeat.MODE_MINIMAL && res.identifier == 'Fuc')
      ) {
      // Stubby NeuAc and Fuc along a chain
      // Stubby Fuc at the end of a repeat unit
      if (res.identifier == 'NeuAc' && sibs.filter(not_sulf)[0].identifier == 'Fuc') {
        position.dx = 0;
        position.dy = -1 * DELTA_Y;
        position.dy -= position.r; // Make room for linkage
        return position;
      }
      position.dy = 0;
      position.dx = [2,3].indexOf(res.parent.linkageOf(res)) >= 0 ? -1 * DELTA_X : DELTA_X;

      if (res.identifier == 'Fuc') {
        position.rotate = (position.dx < 0 ) ? 90 : -90;
        position.ignore_overlap = true;
        return position;
      }
      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }

      return position;
    }

    if (res.identifier === 'PI') {
      position.r = 0.75;
    }

    if (res.identifier === 'GlcN' && res.parent.identifier === 'PI') {
      position.dx = 0.5*DELTA_X;
      return position;
    }


    if (res.identifier === 'EtNP') {
      let linkage_pos = res.parent.linkageOf(res);
      if (linkage_pos === 2) {
        position.dy = 0;
        position.dx = -0.66*DELTA_X;
        position.rotate = -90;
      }
      if (linkage_pos === 6 && res.parent.children.length === 1) {
        position.dy = -1.25*DELTA_Y;
        position.dx = 0;
      }
      if (linkage_pos === 6 && res.parent.children.length > 1) {
        position.dx = 0.66*DELTA_X;
        position.dy = 0;
        position.rotate = 90;
      }
      position.ignore_overlap = true;
    }

    if (res.identifier === 'HSO3') {
      const SULF_DELTA_X = 5/4*DELTA_X;
      const SULF_DELTA_Y = this.LINKS ? DELTA_Y / 2 : DELTA_Y ;
      position.r = 1/4*DELTA_X;
      let linkage_pos = res.parent.linkageOf(res);
      if (linkage_pos === 2 || linkage_pos === 6 || linkage_pos === Monosaccharide.LINKAGES.N) {
        position.dy = 0.5*SULF_DELTA_Y;
        position.dx = 0.5*SULF_DELTA_X;
        if (linkage_pos === 2 || linkage_pos === Monosaccharide.LINKAGES.N) {
          position.dx *= -1;
        }
      }
      if (linkage_pos === 3 || linkage_pos === 4 ) {
        position.dy = -0.5*SULF_DELTA_Y;
        position.dx = 0.5*SULF_DELTA_X;
        if (linkage_pos === 3) {
          position.dx *= -1;
        }
      }
      position.ignore_overlap = true;
      return position;
    }

    if (sibs.length == 1 && res.identifier === 'P') {
      position.dy = 0;
      position.dx = res.parent.linkageOf(res) >= 0 ? DELTA_X : -1 * DELTA_X;
      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }
      return position;
    }

    // Make Type I chains linear
    if (sibs.length == 1 && (res.identifier === 'GlcNAc' && sibs[0].identifier == 'GlcNAc')) {
      if (res.parent.linkageOf(res) === 3) {
        position.dx = 0;
      }
      return position;
    }

    // If only a single sibling is Fuc or NeuAc make it a stub
    if (sibs.filter(not_sulf).filter( sibling => ['Fuc','NeuAc'].indexOf(sibling.identifier) < 0 ).length == 0 &&
        sibs.filter(not_sulf).filter( sibling => ['Fuc','NeuAc'].indexOf(sibling.identifier) >= 0 ).length <= 1
    ) {
      position.dx = 0;
    }

    if (sibs.length === 1 && ( ['P','HSO3','EtNP'].indexOf(sibs[0].identifier) >= 0 ) ) {
      position.dx = 0;
    }

    if ( sibs.length === 2 &&
          [ res ].concat(sibs).map( res => res.identifier ).indexOf( 'Fuc' ) >= 0 &&
          [ res ].concat(sibs).map( res => res.identifier ).indexOf( 'HSO3' ) >= 0 &&
          ['Fuc'].indexOf(res.identifier) >= 0) {
      position.dy = 0;
      position.dx = res.parent.linkageOf(res) >= 4 ? DELTA_X : -1 * DELTA_X;

      if (res.identifier == 'Fuc') {
        position.rotate = (position.dx < 0 ) ? 90 : -90;
        position.ignore_overlap = true;
      }

      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }
      return position;
    }

    if (res.identifier === 'Man' && res.siblings.length > 0) {
      let sibling_spreads = res.siblings.map( sib => layout.get(sib) ).filter( lay => lay ).map( lay => lay.spread ).filter( x => x );
      if (position.spread) {
        sibling_spreads.push(position.spread);
      }
      let max_spread = Math.max(...sibling_spreads);
      if (isFinite(max_spread)) {
        for (let sib of res.siblings) {
          if (sib.children.length > 0 && layout.get(sib)) {
            layout.get(sib).spread = max_spread;
          }
        }
        position.spread = max_spread;
      }
    }
    return position;
  }
}

export default SugarAwareLayout;
