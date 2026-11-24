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
 * Orientation (up/down) for ring positions 2-5 starts from the terminii
 * string's own ax/eq labels, via a fixed position-parity rule
 * (orientationFromAxEq) -- safe because every builder that produces a live
 * terminii string derives every real ring stereocentre (position 5
 * included) from the residue's actual InChI, none of them hardcoded (see
 * js/data/PUBCHEM_CID_CORRECTIONS.md, section 13).
 *
 * But that parity rule alone ISN'T enough: axial/equatorial is invariant
 * between true D/L enantiomers, while Haworth up/down genuinely is NOT --
 * two true enantiomers, drawn in the same fixed ring frame this module and
 * standard Haworth drawings both use, must invert at EVERY position (see
 * InChIRingGeometry.js's module docstring for the full story, including a
 * bug caught by comparing a rendered residue against a published reference
 * structure). So this module still needs the InChI, for every position,
 * to apply that same D/L correction (InChIRingGeometry.js's
 * shapeNeedsMirrorFlip combined with the InChI's own /m layer) -- it just
 * doesn't need the InChI's *per-position* /t data the way
 * InChIRingGeometry.js's own deriveHaworthOrientation does, since the
 * parity rule already gives the right UN-corrected answer directly from
 * the (already-correctly-derived) ax/eq label.
 *
 * Position 1 (the anomeric carbon) additionally has no ax/eq at all in the
 * terminii string to start from (anomeric configuration is set per
 * Monosaccharide *instance*, not per residue type) -- its un-corrected
 * orientation comes from the anomer label instead (alpha=down, beta=up,
 * before the same D/L correction is applied).
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

  // The D/L correction (see module docstring): whether mLayer==='0' really
  // means "the full enantiomer" is itself shape-dependent -- GlcA and its
  // C5 epimer IdoA are BOTH /m0, yet GlcA (the D-series compound) must NOT
  // be treated as inverted -- so this combines with shapeNeedsMirrorFlip,
  // the same per-shape correction InChIRingGeometry.js's ax/eq derivation
  // uses (for a different reason there -- see its own module docstring).
  // Computed once per residue, applied to every position.
  const layers = parseInChI(inchi);
  const mLayer = layers.m ?? '1';
  const shapeFlip = shapeNeedsMirrorFlip(layers) ?? false;
  const extraInvert = (mLayer === '0') !== shapeFlip;
  const flip = (o) => (o && extraInvert ? (o === 'up' ? 'down' : 'up') : o);

  // C1 (anomeric): the terminii string carries no ax/eq for this position
  // at all (anomeric configuration is per-instance, not per residue type),
  // so its un-corrected orientation comes from the anomer label directly
  // (alpha=down, beta=up -- the D-series pattern, confirmed against real
  // alpha/beta-D-glucopyranose), before the same D/L correction as every
  // other position.
  const c1 = positions.get(1);
  if (c1 && displayLabel(c1.label)) {
    const orientation = flip(anomer === 'b' ? 'up' : 'down');
    substituents.push({ position: 1, label: displayLabel(c1.label), orientation });
  }

  for (const pos of [2, 3, 4]) {
    const entry = positions.get(pos);
    if (!entry) continue;
    const label = displayLabel(entry.label);
    if (!label) continue;
    const orientation = flip(orientationFromAxEq(pos, entry.axEq));
    if (orientation) substituents.push({ position: pos, label, orientation });
  }

  // Exocyclic C6 group, attached at ring position 5 -- oriented by ring
  // position 5's own ax/eq label (the ring-junction carbon it hangs off),
  // not a label of its own.
  if (c6Label) {
    const label = displayLabel(c6Label);
    const c5 = positions.get(5);
    if (label && c5) {
      const orientation = flip(orientationFromAxEq(5, c5.axEq));
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
