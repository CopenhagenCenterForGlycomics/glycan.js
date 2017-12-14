import CondensedLayout from './CondensedLayout';

const DELTA_X = 1;

class SugarAwareLayout extends CondensedLayout {
  static LayoutMonosaccharide(sugar,res,position,parent_position) {
    position = super.LayoutMonosaccharide(sugar,res,position,parent_position);
    if (res.siblings.length == 1 && (res.identifier == 'Fuc' || res.identifier == 'NeuAc')) {
      if (res.identifier == 'NeuAc' && res.siblings[0].identifier == 'Fuc') {
        position.dx = 0;
        return position;
      }
      position.dy = 0;
      position.dx = [2,3].indexOf(res.parent.linkageOf(res)) >= 0 ? -1 * DELTA_X : DELTA_X;
      if (res.identifier == 'Fuc') {
        position.rotate = (position.dx < 0 ) ? 90 : -90;
      }
      return position;
    }
    if (res.siblings.filter( sibling => ['Fuc','NeuAc'].indexOf(sibling.identifier) < 0 ).length == 0) {
      position.dx = 0;
    }
    return position;
  }
}

export default SugarAwareLayout;
