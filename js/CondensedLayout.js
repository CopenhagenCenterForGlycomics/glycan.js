import QuadTree from '../lib/QuadTree';

import debug from './Debug';

const module_string='glycanjs:condensedlayout';

const log = debug(module_string);

const BASE_DELTA_X = 1;
const BASE_DELTA_Y = 1;


let calculate_position = function(sugar,item,position={dx:0,dy:0,r:0.5},parent_position={}) {

  const DELTA_Y = this.DELTA_Y;
  const DELTA_X = this.DELTA_X;

  // upwards = positive y

  position.collision = [];

  if (item.children.length > 1 && ! position.spread_count ) {
    position.spread_count = item.children.length;
    position.spread = 1;
  }

  if ( ! item.parent ) {
    return position;
  }

  position.dy = -1 * DELTA_Y;
  position.dx = 0;

  if ( ! position.item_index && parent_position.spread_count ) {
    let parent_kids = item.parent.children;
    position.item_index = parent_kids.indexOf(item) + 1;
  }

  if ( parent_position.spread ) {
    position.dy = -1 * parent_position.spread * DELTA_Y;
    position.dx = parent_position.spread * DELTA_X*(position.item_index - 1 - Math.floor(parent_position.spread_count / 2) + 0.5*(1-(parent_position.spread_count % 2)));
  }

  // Make room for linkage
  if (! parent_position.spread || parent_position.spread < 2 ) {
    position.dy += -1 * position.r;
  }

  if (parent_position.grid_spread) {
    position.dx = DELTA_X*position.item_index;
  }

  return position;
};

let derive_position_glycoconjugate = (position) => {
  position.x = -1*position.r;
  position.y = BASE_DELTA_Y;
  position.width = 2*position.r;
  position.height = 2*position.r;
};

let derive_position = (position,parent_position) => {
  position.x = -1*position.r;
  position.y = -1*position.r;
  position.width = 2*position.r;
  position.height = 2*position.r;

  if ( ! parent_position ) {
    return;
  }
  position.x += parent_position.x + parent_position.width/2 + position.dx;
  position.y += parent_position.y + parent_position.height/2 + position.dy;
};

let check_overlaps = (positions) => {
  let xpositions = positions.map( pos => pos.position.x );
  let min_x = Math.min(...xpositions);
  let width = Math.max(...xpositions) - min_x;
  let min_y = Math.min(...xpositions);
  let height = Math.max(...xpositions) - min_y;


  let quad = new QuadTree({x: min_x, y: min_y, width: width, height: height });

  for(let position of positions.map( (pos,idx) => Object.assign({idx: idx },pos.position) )) {

    // Skip this if ignore_overlap is true
    if (position.ignore_overlap === true) {
      continue;
    }
    quad.insert(position);
  }
  for (let i = 0; i < positions.length; i++) {
    if (positions[i].position.ignore_overlap === true) {
      continue;
    }
    let check_position = positions[i].position;
    let items = quad.retrieve(check_position);
    for (let item of items) {
      if (item.idx === i) {
        continue;
      }
      if (positions[i].item.parent == positions[item.idx].item ) {
        continue;
      }
      if (positions[item.idx].item.parent == positions[i].item ) {
        continue;
      }

      let item_position = positions[item.idx].position;
      if (item_position.collision.indexOf(check_position) >= 0 &&
          check_position.collision.indexOf(item_position) >= 0 ) {
        continue;
      }
      let dx = check_position.x - item_position.x;
      let dy = check_position.y - item_position.y;
      let radii = check_position.r + item_position.r;

      let colliding = (( dx * dx )  + ( dy * dy )) < (radii * radii);
      if (colliding) {
        item_position.collision.push(check_position);
        check_position.collision.push(item_position);
      }
    }
  }
};

let derive_item_position = (layout,item) => {
  if ( ! item.parent && item.children.length == 1 && item.linkageOf(item.children[0]) < 0) {
    derive_position_glycoconjugate(layout.get(item),item.identifier);
    return { position: layout.get(item), item: item };
  }
  derive_position(layout.get(item),item.parent ? layout.get(item.parent) : null );
  log.info('Position for',item.identifier,layout.get(item).x,layout.get(item).y);
  return { position: layout.get(item), item: item };
};

let is_not_resolved = (resolved,overlapping) => ! resolved[overlapping];

let map_get_item = (map,item) => map.get(item);

let path_to_root = (sugar,start) => [...sugar.residues_to_root(start)];

let CondensedLayout = class {

  static get DELTA_X() {
    if (this.LINKS) {
      return BASE_DELTA_X;
    } else {
      return BASE_DELTA_X;
    }
  }

  static get DELTA_Y() {
    if (this.LINKS) {
      return BASE_DELTA_Y;
    } else {
      return 0.5*BASE_DELTA_Y;
    }
  }

  static get SPREAD_DELTA() {
    return 1;
  }

  static LayoutMonosaccharide(renderable,monosaccharide,position,parent_position) {
    return calculate_position.call(this,renderable,monosaccharide,position,parent_position);
  }

  static CalculateIdentifier(residue) {
    return residue.identifier.toLowerCase();
  }

  static PerformLayout(renderable) {
    let layout = new WeakMap();
    // Items in the tree based upon
    // increasing depth
    let items = [...renderable.breadth_first_traversal()];

    let overlap_tries_remaining = 20;

    while (overlap_tries_remaining >= 0) {
      log.info('Looping to resolve overlaps on loop',overlap_tries_remaining--);

      for (let item of items) {
        let current_layout = layout.has(item) ? layout.get(item) : undefined;
        let parent_layout = (item.parent && layout.has(item.parent)) ? layout.get(item.parent) : undefined;
        layout.set( item, this.LayoutMonosaccharide(renderable,item,current_layout,parent_layout, layout ) );
      }

      let positions = items.map( derive_item_position.bind(null,layout) );

      check_overlaps(positions);

      let overlapping = positions.filter( position => position.position.collision.length > 0 ).map( overlap => overlap.item );

      let positions_overlap_map = new WeakMap();
      for (let item of overlapping) {
        positions_overlap_map.set(layout.get(item),item);
      }

      if ( overlapping.length < 1) {
        log.info('No overlaps to resolve - breaking');
        break;
      }


      let overlap_roots = new WeakMap();

      for (let item of overlapping) {
        let colliding_parents = [].concat.apply([], layout.get(item)
          .collision
          .map( map_get_item.bind(null,positions_overlap_map) )
          .map( path_to_root.bind(null,renderable) ));
        log.info(item.identifier,
          'collides with',
          colliding_parents[0].identifier,
          'at',
          layout.get(item).x,layout.get(item).y,
          layout.get(item).collision.map( coll => [coll.x,coll.y]),
          'which is a child of',
          colliding_parents.map(res => res.identifier));
        for (let parent of renderable.residues_to_root(item)) {
          if ( parent === item ) {
            continue;
          }
          if (! overlap_roots.has(parent)) {
            overlap_roots.set(parent,[]);
          }
          // First parent this residue collides with
          if (colliding_parents.indexOf(parent) >= 0) {
            log.info('Overlap root of',parent.identifier,'for',item.identifier);
            overlap_roots.get(parent).push(item);
            break;
          }
        }
      }

      let resolved = {};

      for (let item of [].concat(items).reverse()) {
        if (overlap_roots.has(item)) {
          let unresolved = overlap_roots.get(item).filter( is_not_resolved.bind(null,resolved) );
          for (let to_resolve of unresolved) {
            resolved[to_resolve] = true;
          }
          if (unresolved.length > 0) {
            layout.get(item).spread = (layout.get(item).spread || 0) + this.SPREAD_DELTA;
            log.info('Increasing spread for',item.identifier,'to',layout.get(item).spread);
          }
        }
      }

    }

    if (log.enabled) {
      log.info('Done layout for',renderable.sequence);
      for (let item of items) {
        log.info('Laid out',item.identifier,layout.get(item));
      }
    }

    // layout the root
    // layout children
    return layout;
  }
};

CondensedLayout.LINKS = true;

export default CondensedLayout;
