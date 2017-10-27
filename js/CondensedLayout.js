import QuadTree from '../lib/QuadTree';

let calculate_position = (item,layouts) => {

  const DELTA_X = 1;
  const DELTA_Y = 1;

  // upwards = positive y
  let position = layouts.has(item) ? layouts.get(item) : {
    dx: 0,
    dy: 0,
    r: 0.5
  };

  position.collision = false;

  if (item.children.length > 1 && ! layouts.has(item) ) {
    position.spread_count = item.children.length;
    position.spread = 1;
  }

  if ( ! item.parent ) {
    layouts.set(item,position);
    return;
  }

  let parent_position = layouts.get(item.parent);

  position.dy = DELTA_Y;
  position.dx = 0;

  if ( ! position.item_index && parent_position.spread_count ) {
    let parent_kids = item.parent.children;
    position.item_index = parent_kids.indexOf(item) + 1;
  }

  if ( parent_position.spread ) {
    position.dy = parent_position.spread * DELTA_Y;
    position.dx = DELTA_X*(position.item_index - 1 - Math.floor(parent_position.spread_count / 2) + 0.5*(1-(parent_position.spread_count % 2)));
  }

  if (parent_position.grid_spread) {
    position.dx = DELTA_X*position.item_index;
  }

  layouts.set(item,position);
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
    quad.insert(position);
  }
  for (let i = 0; i < positions.length; i++) {
    let check_position = positions[i].position;
    let items = quad.retrieve(check_position);
    for (let item of items) {
      if (item.idx === i) {
        continue;
      }
      let item_position = positions[item.idx].position;
      if (item_position.collision && check_position.collision) {
        continue;
      }
      let dx = check_position.x - item_position.x;
      let dy = check_position.y - item_position.y;
      let radii = check_position.r + item_position.r;

      let colliding = (( dx * dx )  + ( dy * dy )) < (radii * radii);
      item_position.collision = item_position.collision || colliding;
      check_position.collision = check_position.collision || colliding;
    }
  }
};

let derive_item_position = (layout,item) => {
        derive_position(layout.get(item),item.parent ? layout.get(item.parent) : null );
        return { position: layout.get(item), item: item };
      };

let is_not_resolved = (resolved,overlapping) => ! resolved[overlapping];

let CondensedLayout = class {
  static PerformLayout(renderable) {

    let layout = new WeakMap();
    // Items in the tree based upon
    // increasing depth
    let items = [...renderable.breadth_first_traversal()];

    let is_overlapping = 2;

    while (is_overlapping > 0) {

      for (let item of items) {
        calculate_position(item,layout);
      }

      let positions = items.map( derive_item_position.bind(null,layout) );

      check_overlaps(positions);

      let overlapping = positions.filter( position => position.position.collision ).map( overlap => overlap.item );

      console.log(renderable.sequence);
      for (let item of overlapping) {
        console.log(item.identifier,layout.get(item));
      }

      is_overlapping--;
      if (is_overlapping === 0) {
        throw new Error('Could not resolve layout');
      }

      if ( overlapping.length < 1) {
        is_overlapping = 0;
      }


      let overlap_roots = new WeakMap();

      for (let item of overlapping) {
        for (let parent of renderable.residues_to_root(item)) {
          if ( parent === item ) {
            continue;
          }
          if (! overlap_roots.has(parent)) {
            overlap_roots.set(parent,[]);
            console.log('Overlap root of',parent.identifier);
          }
          overlap_roots.get(parent).push(item);
        }
      }

      let resolved = {};

      for (let item of items.reverse()) {
        console.log(item.identifier);
        if (overlap_roots.has(item)) {
          // We need to know *who* it is overlapping with!

          let unresolved = overlap_roots.get(item).filter( is_not_resolved.bind(null,resolved) );
          for (let to_resolve of unresolved) {
            resolved[to_resolve] = true;
          }
          if (unresolved.length > 0) {
            console.log('Spreading at',item.identifier);
            layout.get(item).spread = layout.get(item).spread + 1;
          }
        }
      }

    }

    console.log(renderable.sequence);
    for (let item of items) {
      console.log(item.identifier,layout.get(item));
    }

    // layout the root
    // layout children
    return renderable;
  }
};

export default CondensedLayout;
