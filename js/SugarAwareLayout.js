import CondensedLayout from './CondensedLayout';

import Monosaccharide from './Monosaccharide';

class SugarAwareLayout extends CondensedLayout {
  static LayoutMonosaccharide(sugar,res,position,parent_position,layout) {

    const DELTA_Y = this.DELTA_Y;
    const DELTA_X = this.DELTA_X;


    position = super.LayoutMonosaccharide(sugar,res,position,parent_position);

    if (res.siblings.length == 1 && (res.identifier == 'Fuc' || res.identifier == 'NeuAc')) {
      if (res.identifier == 'NeuAc' && res.siblings[0].identifier == 'Fuc') {
        position.dx = 0;
        position.dy = -1 * DELTA_Y;
        position.dy -= position.r; // Make room for linkage
        return position;
      }
      position.dy = 0;
      position.dx = [2,3].indexOf(res.parent.linkageOf(res)) >= 0 ? -1 * DELTA_X : DELTA_X;

      if (res.identifier == 'Fuc') {
        position.rotate = (position.dx < 0 ) ? 90 : -90;
        return position;
      }
      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }

      return position;
    }

    if (res.identifier === 'S') {
      position.r = 1/4*DELTA_X;
      let linkage_pos = res.parent.linkageOf(res);
      if (linkage_pos === 2 || linkage_pos === 6 || linkage_pos === Monosaccharide.LINKAGES.N) {
        position.dy = 0.5*DELTA_Y;
        position.dx = 0.5*DELTA_X;
        if (linkage_pos === 2 || linkage_pos === Monosaccharide.LINKAGES.N) {
          position.dx *= -1;
        }
      }
      if (linkage_pos === 3 || linkage_pos === 4 ) {
        position.dy = -0.5*DELTA_Y;
        position.dx = 0.5*DELTA_X;
        if (linkage_pos === 3) {
          position.dx *= -1;
        }
      }
      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }
      position.ignore_overlap = true;
      return position;
    }

    if (res.siblings.length == 1 && res.identifier === 'P') {
      position.dy = 0;
      position.dx = res.parent.linkageOf(res) >= 0 ? DELTA_X : -1 * DELTA_X;
      if (this.LINKS) {
        position.dx += (((position.dx < 0) ? -1 : 1)*DELTA_X)/4;
      }
      return position;
    }

    if (res.siblings.length == 1 && (res.identifier === 'GlcNAc' && res.siblings[0].identifier == 'GlcNAc')) {
      if (res.parent.linkageOf(res) === 3) {
        position.dx = 0;
      }
      return position;
    }

    // If only a single sibling is Fuc or NeuAc make it a stub
    if (res.siblings.filter( sibling => ['Fuc','NeuAc'].indexOf(sibling.identifier) < 0 ).length == 0 &&
        res.siblings.filter( sibling => ['Fuc','NeuAc'].indexOf(sibling.identifier) >= 0 ).length <= 1
        ) {
      position.dx = 0;
    }

    if (res.siblings.length == 1 && ( res.siblings[0].identifier === 'P' || res.siblings[0].identifier === 'S') ) {
      position.dx = 0;
    }

    if ( res.siblings.length === 2 &&
          [ res ].concat(res.siblings).map( res => res.identifier ).indexOf( 'Fuc' ) >= 0 &&
          [ res ].concat(res.siblings).map( res => res.identifier ).indexOf( 'S' ) >= 0 &&
          ['Fuc'].indexOf(res.identifier) >= 0) {
      position.dy = 0;
      position.dx = res.parent.linkageOf(res) >= 4 ? DELTA_X : -1 * DELTA_X;

      if (res.identifier == 'Fuc') {
        position.rotate = (position.dx < 0 ) ? 90 : -90;
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
