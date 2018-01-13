import * as debug from 'debug-any-level';

import SugarAwareLayout from './SugarAwareLayout';

const module_string='glycanjs:fisheyelayout';

const log = debug(module_string);

var radius = 2,
    distortion = 3,
    k0,
    k1,
    focus = [-100, -3];

function rescale() {
  k0 = Math.exp(distortion);
  k0 = k0 / (k0 - 1) * radius;
  k1 = distortion / radius;
}

rescale();

function fisheye(d) {
  var dx = d.x - focus[0],
      dy = d.y - focus[1],
      dd = Math.sqrt(dx * dx + dy * dy);
  if (!dd || dd >= radius) {
    return {x: d.x, y: d.y, z: dd >= radius ? 1 : 10};
  }
  var k = k0 * (1 - Math.exp(-dd * k1)) / dd * 0.75 + 0.25;
  return {x: focus[0] + dx * k, y: focus[1] + dy * k, z: Math.min(k, 10)};
}

class FishEyeLayout extends SugarAwareLayout {
  static get focus() {
    return [].concat(focus);
  }
  static set focus(newfocus) {
    focus[0] = newfocus[0];
    focus[1] = newfocus[1];
    rescale();
  }
  static PerformLayout(renderable) {
    log('Performing FishEyeLayout');
    let layout = super.PerformLayout(renderable);
    for (let res of renderable.composition()) {
      let position = layout.get(res);
      let [x,y,width,height] = [position.x,position.y,position.width,position.height];
      let scaled_center = fisheye({x: x + (width/2), y: y + (height/2)});
      let scaled_top = fisheye({x: x + (width/2), y: y + height});
      let new_size = 2*(scaled_top.y - scaled_center.y);
      position.x = scaled_center.x - (new_size/2);
      position.y = scaled_center.y - (new_size/2);
      position.width = new_size;
      position.height = new_size;
    }
    return layout;
  }
}

export default FishEyeLayout;



