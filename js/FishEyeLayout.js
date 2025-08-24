import debug from './Debug.js';

import SugarAwareLayout from './SugarAwareLayout.js';

const module_string='glycanjs:fisheyelayout';

const log = debug(module_string);

var radius = 2,
  distortion = 3,
  k0,
  k1,
  focus = [-100, -3];

let residue_only = true;

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

const MakeFishEye = (baseclass) => {
  return class FishEyeLayout extends baseclass {
    static get focus() {
      return [].concat(focus);
    }
    static set focus(newfocus) {
      focus[0] = newfocus[0];
      focus[1] = newfocus[1];
      rescale();
    }
    static get zoom() {
      return distortion;
    }
    static set zoom(zoom) {
      distortion = zoom;
      rescale();
    }

    static get lock_residues() {
      return residue_only;
    }
    static set lock_residues(flag) {
      residue_only = flag;
    }


    static PerformLayout(renderable) {
      log('Performing FishEyeLayout');
      let layout = baseclass.PerformLayout.call(this,renderable);
      for (let res of renderable.composition()) {
        let position = layout.get(res);
        let [x,y,width,height] = [position.x,position.y,position.width,position.height];
        let scaled_center = fisheye({x: x + (width/2), y: y + (height/2)});
        let scaled_top = fisheye({x: x + (width/2), y: y + height});
        let scaled_edge = fisheye({x: x + width, y: y + (height/2)});

        let new_size = Math.max( 2*(scaled_top.y - scaled_center.y), 2*(scaled_edge.x - scaled_center.x) );
        if (residue_only) {
          position.x = position.x - ((new_size - width)/2);
          position.y = position.y - ((new_size - height)/2);
        } else {
          position.x = scaled_center.x - (new_size/2);
          position.y = scaled_center.y - (new_size/2);
        }
        position.z = scaled_center.z;

        position.width = new_size;
        position.height = new_size;
      }
      return layout;
    }
  };
};


export default MakeFishEye(SugarAwareLayout);
export { MakeFishEye as MakeFishEye };



