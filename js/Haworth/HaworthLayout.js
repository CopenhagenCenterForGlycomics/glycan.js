/**
 * Builds a Haworth-projection layout (ring vertices, bonds, substituent
 * sticks + labels) for a single pyranose residue.
 *
 * Scope: the common 6-membered-ring terminii shape shared by Hex, HexA,
 * HexN, HexNAc and dHex (`r1:X;2{eq|ax}:X;3{eq|ax}:X;4{eq|ax}:X;5eq:-;6eq:X`)
 * -- i.e. everything currently built by InChITerminii.js's buildHexose /
 * buildHexN / buildHexNAc / buildDeoxyhex. Furanoses (4-part terminii, a
 * 5-membered ring) and sialic acids (9-part terminii, a different ring
 * numbering and ketose topology) are a different shape each and are not
 * handled here yet.
 *
 * Orientation (up/down) is derived straight from the residue's real InChI,
 * via InChIRingGeometry.js's deriveHaworthOrientation(), not from the
 * terminii string's ax/eq labels. That distinction matters: a terminii
 * string's ax/eq labels are sometimes a hardcoded literal chosen to match a
 * historical reference (e.g. InChITerminii.js's buildDeoxyhex hardcodes
 * Fuc/Rha's labels outright rather than deriving them, with a code comment
 * explaining why), not a real geometric derivation -- so a position-parity
 * conversion rule applied to THOSE labels can be wrong even though the same
 * rule is correct when applied to genuinely-derived ax/eq. Going straight to
 * the InChI sidesteps that: it was validated against the textbook Haworth
 * pattern for D-glucose, D-galactose, D-mannose and L-fucose (16/16 ring
 * positions, including L-fucose read directly from its own InChI, not
 * through its terminii string) -- see js/InChIRingGeometry.js and
 * test/mass/test-inchi-ring-geometry.js.
 *
 * The terminii string is still used, but only for substituent *labels*
 * (which group is at each position -- OH, NHAc, CH2OH, ...), which is a
 * purely compositional fact unaffected by this issue.
 *
 * Position 1 (the anomeric carbon) is the one position deriveHaworthOrientation
 * can't resolve from the residue-type's own InChI: anomeric configuration is
 * set per Monosaccharide *instance* (alpha/beta), not per residue type, so
 * the type-level InChI leaves that stereocentre undefined ('?'). Its
 * orientation is instead computed from the anomer + D/L-series relationship
 * (alpha-D and beta-L share one ring face, beta-D and alpha-L the other),
 * validated against real anomer-specific InChI for alpha/beta-D-glucopyranose
 * and alpha/beta-L-fucopyranose (4/4).
 */

import { parseInChI, parseTLayer } from '../InChITerminii.js';
import { deriveHaworthOrientation } from '../InChIRingGeometry.js';

const SUBSTITUENT_LABELS = {
  OH: 'OH',
  NHAc: 'NHAc',
  NHGc: 'NHGc',
  NH2: 'NH₂',
  H: 'H',
  HOH: 'CH₂OH',   // C6 of a hexose: 2H + 1 OH on the exocyclic carbon
  HH: 'CH₃',      // C6 of a 6-deoxyhexose (Fuc, Rha): deoxygenated
  OO: 'COOH',          // C6 of a uronic acid (GlcA, IdoA): oxidised
  OLac: 'O-Lactyl',    // MurNAc's C3 ether substituent
  '-': null,
  x: null,
};

/** Parse a terminii string into a Map<ring position 1-5, {label, axEq}> plus
 * the separate exocyclic C6 substituent label (position 6, no axEq -- it
 * isn't itself a ring stereocentre, it just hangs off ring position 5). */
export function parseTerminii(terminii) {
  const positions = new Map();
  let c6Label = null;
  for (const token of terminii.split(';')) {
    const m = token.match(/^r?(\d+)(eq|ax)?:(.+)$/);
    if (!m) continue;
    const [, posStr, axEq, label] = m;
    const pos = parseInt(posStr, 10);
    if (pos === 6) {
      c6Label = label;
    } else {
      positions.set(pos, { label, axEq: axEq ?? null });
    }
  }
  return { positions, c6Label };
}

function displayLabel(rawLabel) {
  return rawLabel in SUBSTITUENT_LABELS ? SUBSTITUENT_LABELS[rawLabel] : rawLabel;
}

/** eq/ax + ring-position parity -> 'up' | 'down'. See module docstring. */
function orientationFromAxEq(position, axEq) {
  const isEven = position % 2 === 0;
  if (axEq === 'eq') return isEven ? 'down' : 'up';
  if (axEq === 'ax') return isEven ? 'up' : 'down';
  return null;
}

/**
 * @param {string} terminii - e.g. "r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH"
 *   (used only for substituent labels -- see module docstring)
 * @param {string} inchi - the residue's real InChI (the source of truth for
 *   orientation; must be genuine standard InChI, not a hand-authored one
 *   with a different convention -- see PUBCHEM_CID_CORRECTIONS.md)
 * @param {object} opts
 * @param {'a'|'b'} [opts.anomer='b'] - alpha or beta anomeric configuration
 * @param {boolean} [opts.isL=false] - L-series (vs D-series) residue
 * @returns {{ substituents: Array<{position: number, label: string, orientation: 'up'|'down'}> }}
 *   position 1-5 are ring carbons (C1=anomeric .. C5); the exocyclic C6
 *   group is reported attached at position 5.
 */
export function layoutSubstituents(terminii, inchi, opts = {}) {
  const { anomer = 'b', isL = false } = opts;
  const { positions, c6Label } = parseTerminii(terminii);
  const layers = parseInChI(inchi);
  const tLayerMap = parseTLayer(layers.t);
  const substituents = [];

  // C1 (anomeric): the type-level InChI leaves this stereocentre undefined
  // ('?'), since anomeric configuration is set per instance -- orientation
  // comes from anomer + series instead. Alpha-D and beta-L share one ring
  // face, beta-D and alpha-L the other.
  const c1 = positions.get(1);
  if (c1 && displayLabel(c1.label)) {
    const up = (anomer === 'b') !== isL;
    substituents.push({ position: 1, label: displayLabel(c1.label), orientation: up ? 'up' : 'down' });
  }

  for (const pos of [2, 3, 4]) {
    const entry = positions.get(pos);
    if (!entry) continue;
    const label = displayLabel(entry.label);
    if (!label) continue;
    const orientation = deriveHaworthOrientation(layers, tLayerMap, pos)
      ?? orientationFromAxEq(pos, entry.axEq); // degraded fallback only
    if (orientation) substituents.push({ position: pos, label, orientation });
  }

  // Exocyclic C6 group, attached at ring position 5 (C5's own substituent,
  // "5eq:-", is a placeholder -- plain aldohexopyranose C5 has no separate
  // OH to draw).
  if (c6Label) {
    const label = displayLabel(c6Label);
    if (label) {
      const orientation = deriveHaworthOrientation(layers, tLayerMap, 5)
        ?? (isL ? 'down' : 'up'); // degraded fallback only
      substituents.push({ position: 5, label, orientation });
    }
  }

  return { substituents };
}

/**
 * Idealized 2D Haworth hexagon: 6 ring vertices (5 carbons + the ring
 * oxygen) laid out in the standard perspective view -- ring oxygen at back
 * right, numbered clockwise as the reader sees the page, front edge
 * (C1-C2-C3) nearest the viewer and drawn bold.
 */
export function ringGeometry() {
  const cx = 0;
  const cy = 0;
  const rx = 95;
  const ry = 38;
  // Angles must be monotonic in ring-bond order (O5-C1-C2-C3-C4-C5-O5) or
  // the polygon self-intersects -- the ring oxygen has to sit angularly
  // between C5 and C1, not "inside" some other edge's arc.
  const angles = {
    C1: 0,
    C2: 60,
    C3: 120,
    C4: 180,
    C5: 240,
    O5: 300,
  };
  const vertices = {};
  for (const [name, deg] of Object.entries(angles)) {
    const rad = (deg * Math.PI) / 180;
    vertices[name] = { x: cx + rx * Math.cos(rad), y: cy + ry * Math.sin(rad) };
  }
  const bonds = [
    { from: 'O5', to: 'C1', bold: false },
    { from: 'C1', to: 'C2', bold: true },
    { from: 'C2', to: 'C3', bold: true },
    { from: 'C3', to: 'C4', bold: false },
    { from: 'C4', to: 'C5', bold: false },
    { from: 'C5', to: 'O5', bold: false },
  ];
  return { vertices, bonds };
}
