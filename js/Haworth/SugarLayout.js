/**
 * Bridges a real glycan.js residue tree (a Monosaccharide, e.g. `sugar.root`)
 * to HaworthSVG.js's renderGlycanSVG() input: resolving each residue's real
 * terminii/InChI and computing a non-overlapping canvas position for every
 * residue, branches included.
 */

import monosaccharideData from '../data/monosaccharides.js';
import { inchiToTerminii } from '../InChITerminii.js';

const BY_NAME = new Map(monosaccharideData.map((entry) => [entry.name, entry]));

/**
 * Resolve a residue identifier (e.g. "GlcNAc") to its real terminii + InChI,
 * following the same precedence as MonosaccharideRegistry.loadFromJSON: an
 * explicit `terminii` field wins (e.g. a furanose, deliberately NOT derived
 * from its own Hex-shaped InChI -- different ring size); otherwise derive
 * from `inchi`. Returns null if this identifier isn't in the data file at
 * all (e.g. a typo, or a residue this registry doesn't know).
 */
function resolveResidueData(identifier) {
  const entry = BY_NAME.get(identifier);
  if (!entry) return null;
  if (entry.inchi && !entry.terminii) {
    return { terminii: inchiToTerminii(entry.name, entry.inchi).terminii, inchi: entry.inchi };
  }
  return { terminii: entry.terminii ?? null, inchi: entry.inchi ?? null };
}

/**
 * HaworthLayout.js only handles the common 6-membered-ring shape
 * (r1;2;3;4;5;6 -- Hex/HexA/HexN/HexNAc/dHex/dideoxyhex/MurNAc). Furanoses
 * (4-part), pentoses (5-part, no exocyclic C6), sialic acids (9-part,
 * different ring numbering) and non-ring residues (ions, sulfate, methyl)
 * are a different shape each, not handled here yet -- rendered as a
 * placeholder instead of silently misreading their terminii onto this
 * module's hexagon vertices.
 */
function isSupportedRingShape(terminii) {
  return typeof terminii === 'string' && terminii.startsWith('r1:') && terminii.split(';').length === 6;
}

const DEFAULT_SPACING_X = 260;
const DEFAULT_SPACING_Y = 170;
const PLACEHOLDER_SPACING_X = 160;

/**
 * Tidy-tree layout: each leaf gets its own row (assigned left-to-right in
 * child order), each internal node's row is the average of its children's
 * rows, standard "layered tree" placement -- simple and collision-free for
 * any branching factor, without per-residue special-casing. Depth maps to
 * the horizontal axis, with the root (reducing end) on the right and
 * branches extending left, matching the usual glycan drawing convention.
 *
 * @param {object} root - a Monosaccharide (or any object exposing
 *   `.children` and `.linkageOf(child)`)
 * @returns {Map<object, {x: number, y: number, depth: number}>} positions
 *   relative to the root at (0, 0); not yet centered on a canvas.
 */
function layoutTree(root, opts = {}) {
  const positions = new Map();
  if (!root) return positions;
  let nextRow = 0;

  const visit = (node, depth, spacingX) => {
    const children = node.children ?? [];
    let row;
    if (children.length === 0) {
      row = nextRow++;
    } else {
      const childRows = children.map((child) => visit(child, depth + 1, spacingX));
      row = childRows.reduce((a, b) => a + b, 0) / childRows.length;
    }
    positions.set(node, { x: -depth * spacingX, y: row, depth });
    return row;
  };

  visit(root, 0, opts.spacingX ?? DEFAULT_SPACING_X);
  return positions;
}

/**
 * Walk a residue tree and resolve everything renderGlycanSVG() needs: real
 * terminii/InChI per residue, a glycosidic linkage per non-root residue, and
 * a canvas position for each, branches laid out without overlap.
 *
 * @param {object} root - a Monosaccharide (e.g. `sugar.root`)
 * @param {object} [opts]
 * @param {number} [opts.spacingX=260] - horizontal distance between ring
 *   centers one generation apart (default sized for this renderer's own
 *   ring+substituent-stick footprint)
 * @param {number} [opts.spacingY=170] - vertical distance between sibling
 *   branch rows
 * @param {number} [opts.marginX=150] - canvas margin so edge residues'
 *   substituent sticks aren't clipped
 * @param {number} [opts.marginY=110]
 * @returns {{ residues: Array, linkages: Array, width: number, height: number,
 *   unsupported: Array<{node: object, identifier: string, reason: string}> }}
 *   `unsupported` lists residues rendered as a plain labeled placeholder
 *   instead of a real Haworth ring (see isSupportedRingShape), so callers
 *   can report what was approximated.
 */
export function sugarToHaworthInput(root, opts = {}) {
  const {
    spacingX = DEFAULT_SPACING_X,
    spacingY = DEFAULT_SPACING_Y,
    marginX = 150,
    marginY = 110,
  } = opts;

  const rawPositions = layoutTree(root, { spacingX });
  const residues = [];
  const linkages = [];
  const unsupported = [];

  for (const [node, pos] of rawPositions) {
    const data = resolveResidueData(node.identifier);
    const supported = data && isSupportedRingShape(data.terminii);
    if (!supported) {
      unsupported.push({
        node,
        identifier: node.identifier,
        reason: data ? 'unsupported ring shape (not a 6-position pyranose)' : 'not found in monosaccharide data',
      });
    }

    residues.push({
      id: node,
      terminii: supported ? data.terminii : null,
      inchi: supported ? data.inchi : null,
      anomer: node.anomer === 'a' ? 'a' : 'b',
      x: pos.x,
      y: pos.y * spacingY,
      label: node.identifier,
      placeholder: !supported,
    });

    if (node.parent) {
      const parentPosition = node.parent.linkageOf(node);
      // Only a plain positive ring position (1-9ish) is drawable as a bond
      // to a specific hexagon vertex here; glycan.js's special linkage
      // sentinels (Monosaccharide.LINKAGES.O / .N, for peptide/lipid
      // attachment) and totally unknown linkages aren't ring positions at
      // all, so those residues are positioned but left unconnected rather
      // than drawing a bond to a nonexistent vertex.
      if (Number.isInteger(parentPosition) && parentPosition >= 1 && parentPosition <= 6) {
        linkages.push({ child: node, parent: node.parent, parentPosition });
      }
    }
  }

  const depths = residues.map((r) => Math.round((0 - r.x) / spacingX));
  const rows = residues.map((r) => r.y / spacingY);
  const maxDepth = depths.length ? Math.max(...depths) : 0;
  const minRow = rows.length ? Math.min(...rows) : 0;
  const maxRow = rows.length ? Math.max(...rows) : 0;

  const width = Math.max(2 * marginX, maxDepth * spacingX + 2 * marginX, PLACEHOLDER_SPACING_X + 2 * marginX);
  const height = Math.max(2 * marginY, (maxRow - minRow) * spacingY + 2 * marginY);
  const offsetX = width - marginX; // root (x=0, the reducing end) sits near the right edge
  const offsetY = height / 2 - ((minRow + maxRow) / 2) * spacingY; // vertically centered

  for (const r of residues) {
    r.x += offsetX;
    r.y += offsetY;
  }

  return { residues, linkages, width, height, unsupported };
}
