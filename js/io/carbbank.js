/**
 * js/io/carbbank.js
 *
 * CarbBank 2D ASCII-art tree format writer.
 * Follows the glycan.js IO mixin pattern (same as glycan.js/js/io/CondensedIupac.js).
 *
 * Usage:
 *   import { IO as Carbbank } from './io/carbbank.js';
 *   import { IupacSugar } from './iupac-sugar.js';
 *   class CarbankSugar extends Carbbank(IupacSugar) {}
 *   const s = new CarbankSugar();
 *   s.sequence = 'GlcNAc(b1-4)GlcNAc';   // parsed by inherited IUPAC setter
 *   console.log(s.sequence);               // returns CarbBank ASCII-art string
 *
 * Reading CarbBank notation is not implemented; Writer is the only mixin.
 */

// ── Metadata table ────────────────────────────────────────────────────────────

const CARBBANK_META = {
  GlcNAc: { dl: 'D', ring: 'p', abbrev: 'GlcNAc' },
  GalNAc: { dl: 'D', ring: 'p', abbrev: 'GalNAc' },
  ManNAc: { dl: 'D', ring: 'p', abbrev: 'ManNAc' },
  GlcN:   { dl: 'D', ring: 'p', abbrev: 'GlcN'   },
  Glc:    { dl: 'D', ring: 'p', abbrev: 'Glc'    },
  Gal:    { dl: 'D', ring: 'p', abbrev: 'Gal'    },
  Man:    { dl: 'D', ring: 'p', abbrev: 'Man'    },
  Fuc:    { dl: 'L', ring: 'p', abbrev: 'Fuc'    },
  Xyl:    { dl: 'D', ring: 'p', abbrev: 'Xyl'    },
  NeuAc:  { dl: 'D', ring: 'p', abbrev: 'Neu5Ac' },
  NeuGc:  { dl: 'D', ring: 'p', abbrev: 'Neu5Gc' },
  GlcA:   { dl: 'D', ring: 'p', abbrev: 'GlcA'   },
  IdoA:   { dl: 'L', ring: 'p', abbrev: 'IdoA'   },
};

// ── Residue label ─────────────────────────────────────────────────────────────

function residueLabel(residue) {
  const meta     = CARBBANK_META[residue.identifier] ?? { dl: 'D', ring: 'p', abbrev: residue.identifier };
  const anm      = residue.anomer ?? 'u';
  const donor    = residue.parent_linkage;                                // e.g. 1 for GlcNAc, 2 for NeuAc
  const acceptor = residue.parent ? residue.parent.linkageOf(residue) : null;
  const linkStr  = (donor != null && donor > 0 && acceptor != null && acceptor > 0)
    ? `-(${donor}-${acceptor})`
    : '';
  return `${anm}-${meta.dl}-${meta.abbrev}${meta.ring}${linkStr}`;
}

// ── Subtree size (number of residues in subtree) ──────────────────────────────

function subtreeSize(node) {
  let n = 1;
  for (const child of node.children) n += subtreeSize(child);
  return n;
}

// ── Step 1: compute extents (bottom-up) ──────────────────────────────────────
//
// Returns { above, below } where each value is the number of content-row units
// the subtree extends above/below the node's own row.

function computeExtents(node, extentMap) {
  const children = node.children;

  if (children.length === 0) {
    const ext = { above: 0, below: 0 };
    extentMap.set(node, ext);
    return ext;
  }

  if (children.length === 1) {
    const ext = computeExtents(children[0], extentMap);
    extentMap.set(node, ext);
    return ext;
  }

  // Sort children by descending subtree size — heaviest above
  const sorted = [...children].sort((a, b) => subtreeSize(b) - subtreeSize(a));

  let aboveTotal = 0;
  let belowTotal = 0;
  for (let i = 0; i < sorted.length; i++) {
    const childExt = computeExtents(sorted[i], extentMap);
    const span = childExt.above + childExt.below + 1;
    if (i % 2 === 0) aboveTotal += span;
    else             belowTotal += span;
  }

  const ext = { above: aboveTotal, below: belowTotal };
  extentMap.set(node, ext);
  return ext;
}

// ── Step 2: assign absolute content rows (top-down) ──────────────────────────

function assignRows(node, parentRow, rowMap, extentMap) {
  rowMap.set(node, parentRow);

  const children = node.children;
  if (children.length === 0) return;

  if (children.length === 1) {
    assignRows(children[0], parentRow, rowMap, extentMap);
    return;
  }

  const sorted = [...children].sort((a, b) => subtreeSize(b) - subtreeSize(a));

  let aboveOffset = 0;
  let belowOffset = 0;

  for (let i = 0; i < sorted.length; i++) {
    const child    = sorted[i];
    const childExt = extentMap.get(child);
    let childRow;
    if (i % 2 === 0) {
      // above
      aboveOffset += childExt.below + 1;
      childRow     = parentRow - aboveOffset;
      aboveOffset += childExt.above;
    } else {
      // below
      belowOffset += childExt.above + 1;
      childRow     = parentRow + belowOffset;
      belowOffset += childExt.below;
    }
    assignRows(child, childRow, rowMap, extentMap);
  }
}

// ── Step 3: assign column positions (right-to-left) ──────────────────────────
//
// colMap stores { colStart, colEnd, label } per node.
// rightEdge is the column index just past the right edge of this node's label.

function assignCols(node, rightEdge, colMap, rowMap) {
  const label    = residueLabel(node);
  const colStart = rightEdge - label.length;
  colMap.set(node, { colStart, colEnd: rightEdge, label });

  for (const child of node.children) {
    // Separator between this node's left edge and child's right edge:
    //   '-' when child is on the same row (inline continuation)
    //   '+' when child is on a different row (vertical branch)
    const sep      = rowMap.get(child) === rowMap.get(node) ? '-' : '+';
    const nextRight = colStart - sep.length;
    assignCols(child, nextRight, colMap, rowMap);
  }
}

// ── Step 4: render to character grid ─────────────────────────────────────────

function renderGrid(root, colMap, rowMap) {
  // Collect all nodes
  const allNodes = [];
  const stack = [root];
  while (stack.length > 0) {
    const n = stack.pop();
    allNodes.push(n);
    for (const c of n.children) stack.push(c);
  }

  // Shift rows so min row is 0
  let minRow = Infinity;
  let maxRow = -Infinity;
  for (const n of allNodes) {
    const r = rowMap.get(n);
    if (r < minRow) minRow = r;
    if (r > maxRow) maxRow = r;
  }
  const rowShift = -minRow;

  // Shift columns so min colStart is 0 (child nodes extend left into negative col space)
  let minColStart = Infinity;
  let maxColEnd   = -Infinity;
  for (const n of allNodes) {
    const { colStart, colEnd } = colMap.get(n);
    if (colStart < minColStart) minColStart = colStart;
    if (colEnd   > maxColEnd)   maxColEnd   = colEnd;
  }
  const colShift = -minColStart;

  // Output line count: content rows at even indices, connector rows at odd.
  const numContentRows = maxRow - minRow + 1;
  const numLines       = numContentRows * 2 - 1;
  const numCols        = maxColEnd + colShift + 1;  // +1 for separator chars at colEnd

  // Build grid as array of char arrays, initialised to spaces
  const grid = Array.from({ length: numLines }, () => new Array(numCols).fill(' '));

  const write = (lineIdx, col, str) => {
    const c = col + colShift;
    for (let i = 0; i < str.length; i++) {
      if (c + i >= 0 && c + i < numCols) {
        grid[lineIdx][c + i] = str[i];
      }
    }
  };

  for (const n of allNodes) {
    const { colStart, colEnd: _colEnd, label } = colMap.get(n);
    const contentLine = (rowMap.get(n) + rowShift) * 2;

    // Write label
    write(contentLine, colStart, label);

    // Write separator and vertical connectors for each child.
    // The separator appears in the CHILD's content row at the child's colEnd
    // (which equals parentColStart - separatorLength).
    for (const child of n.children) {
      const nodeRow  = rowMap.get(n)     + rowShift;
      const childRow = rowMap.get(child) + rowShift;
      const sep      = childRow === nodeRow ? '-' : '+';

      const childInfo     = colMap.get(child);
      const childLine     = childRow * 2;
      const sepCol        = childInfo.colEnd;   // separator sits just right of child label

      write(childLine, sepCol, sep);

      if (childRow !== nodeRow) {
        // Draw vertical '|' connectors in every connector row between the two content rows.
        const r1 = Math.min(nodeRow, childRow);
        const r2 = Math.max(nodeRow, childRow);
        for (let cr = r1; cr < r2; cr++) {
          write(cr * 2 + 1, sepCol, '|');
        }
      }
    }
  }

  // Join and trim trailing whitespace per line
  return grid.map(row => row.join('').trimEnd()).join('\n');
}

// ── Main writer ───────────────────────────────────────────────────────────────

const write_sequence = function() {
  const root = this.root;
  if (!root) return '';

  const extentMap = new Map();
  const rowMap    = new Map();
  const colMap    = new Map();

  computeExtents(root, extentMap);
  assignRows(root, 0, rowMap, extentMap);

  // Root right edge: use the length of its label (it sits at the far right)
  const rootLabel    = residueLabel(root);
  const rootRightEdge = rootLabel.length;
  assignCols(root, rootRightEdge, colMap, rowMap);

  return renderGrid(root, colMap, rowMap);
};

// ── Mixin factory (mirrors CondensedIupac.js) ─────────────────────────────────

const getPropertyDescriptor = function(object, descriptor) {
  let retval = null;
  while (!(retval = Object.getOwnPropertyDescriptor(object, descriptor)) && Object.getPrototypeOf(object)) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

const Writer = function(superclass) {
  const setter  = (getPropertyDescriptor(superclass.prototype, 'sequence') || { set: null }).set;
  const getter  = function() { return write_sequence.call(this); };
  const methods = {};

  if (getter) methods.get = getter;
  if (setter) methods.set = setter;

  Object.defineProperty(superclass.prototype, 'sequence', methods);

  return class extends superclass {};
};

// IO is Writer-only — reading CarbBank notation is not implemented.
const IO = Writer;

export { Writer, IO };
