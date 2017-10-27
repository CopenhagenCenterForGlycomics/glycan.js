import CondensedLayout from './CondensedLayout';

class SugarAwareLayout extends CondensedLayout {
  static LayoutMonosaccharide(sugar,res,position,parent_position) {
    position = super.LayoutMonosaccharide(sugar,res,position,parent_position);
    return position;
  }
}

export default SugarAwareLayout;
