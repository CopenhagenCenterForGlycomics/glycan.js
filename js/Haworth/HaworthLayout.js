/**
 * Builds a Haworth-projection layout (ring vertices, bonds, substituent
 * sticks + labels) for a single pyranose residue.
 *
 * Scope: the common 6-membered-ring terminii shape shared by Hex, HexA,
 * HexN, HexNAc and dHex (`r1:X;2{eq|ax}:X;3{eq|ax}:X;4{eq|ax}:X;5{eq|ax}:X;6eq:X`)
 * -- i.e. everything currently built by InChITerminii.js's buildHexose /
 * buildHexN / buildHexNAc / buildDeoxyhex. Furanoses (4-part terminii, a
 * 5-membered ring) and sialic acids (9-part terminii, a different ring
 * numbering and ketose topology) are a different shape each and are not
 * handled here yet.
 *
 * Orientation (up/down) for ring positions 2-5 comes straight from the
 * terminii string's own ax/eq labels, via a fixed position-parity rule
 * (orientationFromAxEq). This is safe because every builder that produces a
 * live terminii string now derives every real ring stereocentre (including
 * position 5, the ring-junction carbon bearing the exocyclic C6 group) from
 * the residue's actual InChI -- none of them are hardcoded literals anymore
 * (see js/data/PUBCHEM_CID_CORRECTIONS.md, especially section 13, which is
 * the reason position 5 had to be fixed before this simplification was
 * safe). The parity rule itself was validated by computing BOTH it and the
 * direct from-InChI derivation (InChIRingGeometry.js's
 * deriveHaworthOrientation) for every live non-sialic compound and
 * confirming they agree -- see test/mass/test-inchi-ring-geometry.js.
 *
 * Position 1 (the anomeric carbon) is the one position no terminii string
 * can give an orientation for: anomeric configuration is set per
 * Monosaccharide *instance* (alpha/beta), not per residue type, so the
 * type-level terminii leaves it as a bare label with no ax/eq at all. Its
 * orientation is instead computed from the anomer + D/L-series relationship,
 * which does require going to the InChI directly -- but "alpha-D and beta-L
 * share one ring face" is only true for ring shapes where the /m-layer
 * mirror flip actually applies (see InChIRingGeometry.js's
 * shapeNeedsMirrorFlip -- a deoxyhexose like Fuc does NOT mirror the same
 * way a plain hexose does, confirmed against real anomer-specific InChI for
 * alpha/beta-D-glucopyranose, where it applies, and alpha/beta-L-
 * fucopyranose, where it doesn't: alpha-L-Fuc's anomeric OH is down, same
 * face as alpha-D-Glc's, not up as a naive "L mirrors D" rule would give),
 * which is a per-shape-family fact a terminii string has no way to carry.
 */

import { parseInChI } from '../InChITerminii.js';
import { shapeNeedsMirrorFlip } from '../InChIRingGeometry.js';

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
 * @returns {{ substituents: Array<{position: number, label: string, orientation: 'up'|'down'}> }}
 *   position 1-5 are ring carbons (C1=anomeric .. C5); the exocyclic C6
 *   group is reported attached at position 5.
 */
export function layoutSubstituents(terminii, inchi, opts = {}) {
  const { anomer = 'b' } = opts;
  const { positions, c6Label } = parseTerminii(terminii);
  const substituents = [];

  // C1 (anomeric): the terminii string carries no ax/eq for this position
  // at all (anomeric configuration is per-instance, not per residue type),
  // so this is the one position that still needs the InChI directly --
  // "alpha-D and beta-L share one ring face" only holds for ring shapes
  // where the /m mirror flip actually applies (see
  // InChIRingGeometry.js's shapeNeedsMirrorFlip); for a shape where it
  // doesn't (e.g. a deoxyhexose), L-series behaves like D-series here, not
  // its mirror. D/L-series itself is read straight off the InChI's own /m
  // layer (same convention InChITerminii.js's classifyMonosaccharide uses),
  // not a separate flag the caller has to track and keep in sync.
  const c1 = positions.get(1);
  if (c1 && displayLabel(c1.label)) {
    const layers = parseInChI(inchi);
    const isL = (layers.m ?? '1') === '0';
    const mirrors = isL && (shapeNeedsMirrorFlip(layers) ?? true);
    const up = (anomer === 'b') !== mirrors;
    substituents.push({ position: 1, label: displayLabel(c1.label), orientation: up ? 'up' : 'down' });
  }

  for (const pos of [2, 3, 4]) {
    const entry = positions.get(pos);
    if (!entry) continue;
    const label = displayLabel(entry.label);
    if (!label) continue;
    const orientation = orientationFromAxEq(pos, entry.axEq);
    if (orientation) substituents.push({ position: pos, label, orientation });
  }

  // Exocyclic C6 group, attached at ring position 5 -- oriented by ring
  // position 5's own ax/eq label (the ring-junction carbon it hangs off),
  // not a label of its own.
  if (c6Label) {
    const label = displayLabel(c6Label);
    const c5 = positions.get(5);
    if (label && c5) {
      const orientation = orientationFromAxEq(5, c5.axEq);
      if (orientation) substituents.push({ position: 5, label, orientation });
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
