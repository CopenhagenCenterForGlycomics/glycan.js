/*global QUnit, document*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';
import SugarAwareLayout from '../../js/SugarAwareLayout';
import SVGRenderer from '../../js/SVGRenderer';


class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can render basic SVG', {
});

QUnit.test( 'Render simple sugar' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'Man(a1-2)Gal(b1-3)GlcNAc';

  let renderer = new SVGRenderer(document.body,SugarAwareLayout);
  renderer.addSugar(sugar);
  renderer.refresh();
  assert.ok(true == true, 'noop');
});