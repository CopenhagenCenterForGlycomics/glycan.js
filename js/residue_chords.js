
let get_first_sibling = (node) => {
  let curr = node;
  while (curr.parent) {
    let curr_siblings = curr.parent.children;
    let next_sibling = curr_siblings[ curr_siblings.indexOf(curr) + 1 ];
    if (next_sibling) {
      return next_sibling;
    } else {
      curr = curr.parent;
    }
  }
  return null;
};

const get_residue_pairs = function*(sugar) {
  const node_order = [...sugar.depth_first_traversal()];
  let curridx = 0;
  while (curridx < node_order.length) {
    let curr = node_order[curridx];
    let next_sibling = get_first_sibling(curr);
    if ( ! next_sibling ) {
      next_sibling = curr;
    }
    let endidx = node_order.indexOf(next_sibling);
    let reducing_end_pairs = node_order.slice(curridx+1,endidx);
    let nonreducing_pairs = node_order.slice(endidx === curridx ? (endidx + 1) : endidx);
    if (endidx === curridx) {
      for (let res of nonreducing_pairs) {
        yield { root: curr, chord: [ curr, res ] };
      }
    } else {
      for (let res of nonreducing_pairs) {
        yield { root: sugar.root, chord: [ curr, res ] };
      }
      for (let res of reducing_end_pairs) {
        yield { root: curr, chord: [ curr, res ] };
      }
    }
    curridx += 1;
  }
};

let expand_residue_chords_iterative = function*(sugar,n) {
  if (n < 2) {
    throw new Error('Cannot expand chord set when n < 2');
  }
  let chord_set = [...get_residue_pairs(sugar,2)];
  let nextnode_pairs = chord_set.filter( chord => chord.root === sugar.root && chord.chord[0] !== sugar.root );
  let nextnodes = {};

  for (let pair of nextnode_pairs) {
    nextnodes[ pair.chord[0] ] = nextnodes[ pair.chord[0] ] || [];
    nextnodes[ pair.chord[0] ].push(pair.chord[1]);
  }

  let added = 0;

  for (let chord of chord_set) {
    yield chord;
  }

  while (added < (n - 2) && chord_set.length > 0) {
    let new_chords = [];
    for (let chord of chord_set) {
      for (let next_node of (nextnodes[ chord.chord[chord.chord.length - 1] ] || []) ) {
        if (sugar.composition(chord.root).indexOf(next_node) >= 0) {
          let new_chord = { root: chord.root };
          new_chord.chord = chord.chord.concat( next_node );
          yield new_chord;
          new_chords.push(new_chord);
        }
      }
    }

    chord_set = new_chords;
    added += 1;
  }
};

let get_residue_chords = function*(sugar,n=2) {
  if (n >= 1) {
    yield * sugar.depth_first_traversal(sugar.root, res => { return { root: sugar.root, chord: [ res ] }; } );
    yield * sugar.depth_first_traversal(sugar.root, res => { return res === sugar.root ? null : { root: res, chord: [ res ] }; } );
  }
  if (n >= 2) {
    yield * expand_residue_chords_iterative(sugar,n);
  }
};

export default get_residue_chords;
