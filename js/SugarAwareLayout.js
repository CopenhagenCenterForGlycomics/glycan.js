import {CondensedLayout} from './CondensedLayout';

class SugarAwareLayout extends CondensedLayout {
  performLayout() {
    // Identify locked components
    // and lock them together
    super.performLayout();
  }
}

export {SugarAwareLayout};
