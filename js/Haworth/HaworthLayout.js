/**
 * Builds a Haworth-projection layout (ring vertices, bonds, substituent
 * sticks + labels) for a single residue, for three ring shapes:
 *
 *  - layoutSubstituents() / ringGeometry(): the common 6-membered-ring
 *    terminii shape shared by Hex, HexA, HexN, HexNAc and dHex
 *    (`r1:X;2{eq|ax}:X;3{eq|ax}:X;4{eq|ax}:X;5{eq|ax}:X;6eq:X`).
 *  - layoutFuranoseSubstituents() / furanoseGeometry(): the 4-part
 *    terminii, 5-membered-ring shape (Galf/Glcf/Manf).
 *  - layoutSialicSubstituents() / (reuses ringGeometry()): the 9-part
 *    terminii ketose shape (NeuAc/NeuGc/NeuAc9Ac/NeuGc9Ac).
 *
 * See each function's own docstring for its shape-specific details.
 *
 * For the hexose shape, orientation (up/down) for ring positions 2-5
 * starts from the terminii string's own ax/eq labels, via a fixed
 * position-parity rule (orientationFromAxEq) -- safe because every builder
 * that produces a live terminii string derives every real ring
 * stereocentre (position 5 included) from the residue's actual InChI, none
 * of them hardcoded (see js/data/PUBCHEM_CID_CORRECTIONS.md, section 13).
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
 * before the same D/L correction is applied). This alpha=axial-like/
 * beta=equatorial-like correlation holds for an ALDOSE anomeric carbon
 * (one H, one OH) -- the sialic-acid ketose anomeric carbon (layoutSialic
 * Substituents, position 1 = sialic C2) inverts it instead (alpha=
 * equatorial-like, beta=axial-like), per real Neu5Ac stereochemistry; see
 * that function's own docstring.
 */

import { parseInChI, parseTLayer } from '../InChITerminii.js';
import { shapeNeedsMirrorFlip, deriveHaworthOrientation, deriveAxialEquatorial } from '../InChIRingGeometry.js';

// A small set of residues that glycan.js's tree models as a separate child
// Monosaccharide node (e.g. `GlcNAc(b1-4)[HSO3(u?-6)]...`, same as Fuc/
// NeuAc/P/EtNP -- see SugarAwareLayout.js's own identical treatment of
// these as small satellite icons rather than full residues), but that this
// renderer draws differently: not as an icon/ring of its own at all, just
// as a label swapped onto the PARENT's own substituent stick at the
// position it's linked to (its real chemistry -- a sulfate ester REPLACES
// the hydroxyl it esterifies, it doesn't sit beside it). See SugarLayout.js
// (which excludes these from tree layout/positioning entirely) and
// HaworthSVG.js/HaworthRenderer.js (which apply the label swap and skip
// drawing the child's own icon/bond).
//
// Label text is the standard forward (ring-bonded-atom-first) spelling;
// HaworthSVG.js's own REVERSED_LABELS has the mirrored form for a
// left-extending stick. Scoped to HSO3 only for now (what was actually
// asked for) -- P/EtNP/Me get the same "small satellite, not a full
// residue" treatment elsewhere in glycan.js and could be added here the
// same way if ever needed for this renderer.
//
// Unlike every other label in this file, "OSO3H" isn't independently
// confirmed against a published Haworth reference image (attempted but
// the reference couldn't be fetched) -- worth a visual sanity check.
export const MODIFICATION_LABELS = {
  HSO3: 'OSO3H',
};

const SUBSTITUENT_LABELS = {
  OH: 'OH',
  O: 'OH',       // a ketose anomeric centre's reducing-end hydroxyl is written as a bare "O" in terminii (see InChITerminii.js's buildSialic) -- same chemistry as "OH" everywhere else, just a mass-accounting quirk of the "r"-prefixed reducing-end token

  NHAc: 'NHAc',
  NHGc: 'NHGc',
  NH2: 'NH₂',
  H: 'H',
  HOH: 'CH₂OH',   // C6 of a hexose: 2H + 1 OH on the exocyclic carbon
  HH: 'CH₃',      // C6 of a 6-deoxyhexose (Fuc, Rha): deoxygenated
  OO: 'COOH',          // C6 of a uronic acid (GlcA, IdoA), or sialic C1
  OLac: 'O-Lactyl',    // MurNAc's C3 ether substituent
  CHOHCHHOH: 'CH(OH)CH₂OH', // furanose C5-C6 tail (Galf/Glcf/Manf)
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
  // other position. Its axEq follows the anomer directly too (alpha=axial,
  // beta=equatorial, the standard aldose anomeric correlation -- see e.g.
  // alpha/beta-D-glucopyranose's own well-known 4C1 chair) -- UNLIKE
  // orientation, this is NOT D/L-corrected: axial/equatorial is invariant
  // between true enantiomers (see this file's own module docstring), the
  // same reasoning InChIRingGeometry.js's own deriveAxialEquatorial
  // already relies on for every OTHER position. Only used by a chair-
  // conformation renderer (see ChairLayout.js) -- Haworth itself ignores
  // it, since a Haworth projection doesn't distinguish axial/equatorial at
  // all (that's the whole simplification it makes).
  const c1 = positions.get(1);
  if (c1 && displayLabel(c1.label)) {
    const orientation = flip(anomer === 'b' ? 'up' : 'down');
    const axEq = anomer === 'a' ? 'ax' : 'eq';
    substituents.push({ position: 1, label: displayLabel(c1.label), orientation, axEq });
  }

  for (const pos of [2, 3, 4]) {
    const entry = positions.get(pos);
    if (!entry) continue;
    const label = displayLabel(entry.label);
    if (!label) continue;
    const orientation = flip(orientationFromAxEq(pos, entry.axEq));
    if (orientation) substituents.push({ position: pos, label, orientation, axEq: entry.axEq });
  }

  // Exocyclic C6 group, attached at ring position 5 -- oriented by ring
  // position 5's own ax/eq label (the ring-junction carbon it hangs off),
  // not a label of its own.
  if (c6Label) {
    const label = displayLabel(c6Label);
    const c5 = positions.get(5);
    if (label && c5) {
      const orientation = flip(orientationFromAxEq(5, c5.axEq));
      if (orientation) substituents.push({ position: 5, label, orientation, axEq: c5.axEq });
    }
  }

  return { substituents };
}

/**
 * Idealized 2D Haworth hexagon: 6 ring vertices (5 carbons + the ring
 * oxygen) laid out in the standard perspective view -- ring oxygen at back
 * right, numbered clockwise as the reader sees the page.
 *
 * The front of the ring (nearest the viewer) is C1-C2-C3, drawn as a
 * tapered wedge rather than two uniformly-bold edges: thin at C1, full
 * thickness through C2, tapering back to thin at C4 -- each bond's
 * `widthFrom`/`widthTo` names its own two endpoints' thickness ('thin' or
 * 'bold'), so a renderer draws a plain line where they match and a tapered
 * polygon where they don't. This is the standard hand-drawn Haworth
 * perspective cue (the middle of the front face reads as closest to the
 * viewer, fading out toward the back on both sides), not just a binary
 * bold/not-bold split.
 */
export function ringGeometry() {
  const cx = 0;
  const cy = 0;
  // Closer to the published Fuc/glucofuranose references' own proportions
  // (~1.6:1 width:height) than this used to be (rx=95/ry=38 drew a much
  // flatter, more squashed-looking oval, ~2.9:1). Kept compact (not just
  // proportioned) per feedback that the rings read as a bit spacious, then
  // taken down to about 2/3 of that size again per further feedback.
  const rx = 43;
  const ry = 31;
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
    { from: 'O5', to: 'C1', widthFrom: 'thin', widthTo: 'thin' },
    { from: 'C1', to: 'C2', widthFrom: 'thin', widthTo: 'bold' },
    { from: 'C2', to: 'C3', widthFrom: 'bold', widthTo: 'bold' },
    { from: 'C3', to: 'C4', widthFrom: 'bold', widthTo: 'thin' },
    { from: 'C4', to: 'C5', widthFrom: 'thin', widthTo: 'thin' },
    { from: 'C5', to: 'O5', widthFrom: 'thin', widthTo: 'thin' },
  ];
  return { vertices, bonds };
}

/**
 * Idealized 2D Haworth pentagon: 5 ring vertices (4 carbons + the ring
 * oxygen), for the furanose ring shape (Galf/Glcf/Manf's 4-part terminii:
 * `r1:OH;2{eq|ax}:OH;3{eq|ax}:OH;4{eq|ax}:<C5-C6 tail>`). Ring oxygen at
 * top, C1 (anomeric) adjacent on the right, with the SAME two-bold-edges
 * convention (C1-C2, C2-C3) as the hexose ring, not a third -- confirmed
 * against published alpha/beta-D-ribofuranose and alpha/beta-D-
 * glucofuranose Haworth structures (an earlier version of this wrongly had
 * C3-C4 bold too, from mis-tracing which edges were actually bold in a
 * first reference image; the glucofuranose pair -- a hexose in furanose
 * form, the same shape Galf/Glcf/Manf use -- also independently confirmed
 * every position's up/down orientation, including the anomeric flip
 * between alpha and beta: layoutFuranoseSubstituents' plain even/odd
 * parity rule needed no correction).
 */
export function furanoseGeometry() {
  const cx = 0;
  const cy = 0;
  // Scaled down to match the hexose ring's own size reductions (same
  // factors, in the same two steps), per feedback that the rings read as
  // a bit spacious and then should come down to about 2/3 of that again.
  const r = 42;
  const angles = {
    O4: 270,
    C1: 342,
    C2: 54,
    C3: 126,
    C4: 198,
  };
  const vertices = {};
  for (const [name, deg] of Object.entries(angles)) {
    const rad = (deg * Math.PI) / 180;
    vertices[name] = { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }
  // Front face tapers the same way the hexose ring's does (thin -> bold at
  // C1-C2, uniform bold through the C2-C3 "middle", bold -> thin at C3-C4),
  // per feedback that the wedge taper should apply to furanose too, not just
  // pyranose; the back two edges (O4-C1, C4-O4) stay thin.
  const bonds = [
    { from: 'O4', to: 'C1', widthFrom: 'thin', widthTo: 'thin' },
    { from: 'C1', to: 'C2', widthFrom: 'thin', widthTo: 'bold' },
    { from: 'C2', to: 'C3', widthFrom: 'bold', widthTo: 'bold' },
    { from: 'C3', to: 'C4', widthFrom: 'bold', widthTo: 'thin' },
    { from: 'C4', to: 'O4', widthFrom: 'thin', widthTo: 'thin' },
  ];
  return { vertices, bonds };
}

/**
 * Build layout for the furanose ring shape (Galf/Glcf/Manf). Its terminii
 * are hand-authored literals (see InChITerminii.js), not InChI-derived the
 * way the hexose shape's are -- every live furanose entry is D-series, so
 * the D/L correction layoutSubstituents needs for the hexose shape isn't
 * exercised here (nothing to cross-check against yet, the same situation
 * hexose's own flip was in before an L-series example exposed its bug --
 * see InChIRingGeometry.js). This uses the same even/odd position-parity
 * rule as orientationFromAxEq, which hasn't been independently verified
 * for a 5-membered ring the way it was for the hexagon: a reasonable first
 * pass, not a verified one.
 */
export function layoutFuranoseSubstituents(terminii, opts = {}) {
  const { anomer = 'b' } = opts;
  const { positions } = parseTerminii(terminii);
  const substituents = [];

  const c1 = positions.get(1);
  if (c1 && displayLabel(c1.label)) {
    const orientation = anomer === 'b' ? 'up' : 'down';
    substituents.push({ position: 1, label: displayLabel(c1.label), orientation });
  }

  for (const pos of [2, 3, 4]) {
    const entry = positions.get(pos);
    if (!entry) continue;
    const label = displayLabel(entry.label);
    if (!label) continue;
    const orientation = orientationFromAxEq(pos, entry.axEq);
    if (orientation) substituents.push({ position: pos, label, orientation });
  }

  return { substituents };
}

/** Parse a sialic-acid terminii string (9-part, using sialic's own
 * numbering 1-9 directly) -- unlike parseTerminii, no position number is
 * special-cased: sialic's own position 6 is a real ring stereocentre, not
 * an exocyclic-group marker the way hexose's position 6 is. */
function parseSialicTerminii(terminii) {
  const positions = new Map();
  for (const token of terminii.split(';')) {
    const m = token.match(/^r?(\d+)(eq|ax)?:(.+)$/);
    if (!m) continue;
    const [, posStr, axEq, label] = m;
    positions.set(parseInt(posStr, 10), { label, axEq: axEq ?? null });
  }
  return positions;
}

function sialicTailLabel(c7, c8, c9) {
  if (!c7 || !c8 || !c9) return null;
  const tailEnd = c9.label === 'HOHAc' ? 'CH₂OAc' : 'CH₂OH';
  return `CH(OH)CH(OH)${tailEnd}`;
}

/**
 * Build layout for the sialic-acid ring shape (NeuAc/NeuGc/NeuAc9Ac/
 * NeuGc9Ac) -- a ketose: the anomeric centre (sialic C2) is quaternary,
 * bearing BOTH an exocyclic OH and an exocyclic COOH chain (sialic C1),
 * not the usual aldose's OH+H. Reuses the hexose ring's own hexagon
 * (ringGeometry()) -- same 6-membered ring, just different numbering (see
 * InChITerminii.js's buildSialic): sialic C2 (anomeric) = hexagon C1,
 * sialic C3 (a plain CH2, not a stereocentre) = hexagon C2, sialic
 * C4/C5/C6 = hexagon C3/C4/C5, with the C7-C8-C9 glycerol tail hanging off
 * hexagon C5 (the same position hexose's own C6 group hangs off).
 *
 * Positions 4/5/6 (sialic numbering) are real, InChI-derived stereocentres
 * (ring-walk positions 3/4/5), handled exactly like any hexose position
 * via deriveHaworthOrientation, D/L correction included -- though that
 * correction has only been independently verified (against a published
 * reference structure) for the hexose/deoxyhexose/HexA shapes so far, not
 * for a ketose: no live sialic compound has a real counter-enantiomer to
 * cross-check against the way Fuc has Gal, so this is the system's own
 * consistent convention here, not independently confirmed -- worth
 * revisiting if a published sialic acid Haworth reference ever turns up.
 *
 * The anomeric OH and the exocyclic COOH are NOT independently derived
 * (same anomer/instance-level situation as every other family's position
 * 1) -- they're a complementary pair on the same quaternary carbon (one
 * up, one down, always), so only the OH's orientation is computed, and
 * COOH is simply its opposite face.
 *
 * Unlike every other shape's C1, though, the anomer-to-orientation
 * correlation here is INVERTED from the generic aldose rule (alpha=
 * axial-like, beta=equatorial-like -- see this file's own module
 * docstring): real Neu5Ac chemistry has it the other way round for its
 * ketose anomeric centre -- alpha-Neu5Ac is the form with the C1
 * carboxylate AXIAL (hence its anomeric OH/OR is EQUATORIAL), beta has
 * the carboxylate equatorial (anomeric OH/OR axial) -- confirmed e.g. by
 * Wikipedia's "Sialic acid" article ("The configuration that places the
 * carboxylate in the axial position is the alpha-anomer"), and
 * cross-checked against this file's own already-validated eq/eq/eq
 * derivation for sialic C4/C5/C6 on the same molecule (same ring, same
 * fixed frame, same odd/even position parity -- see that derivation
 * above): an odd position's "equatorial" renders 'down' here, so
 * alpha's equatorial OH must be 'down', not 'up'.
 */
export function layoutSialicSubstituents(terminii, inchi, opts = {}) {
  const { anomer = 'b' } = opts;
  const positions = parseSialicTerminii(terminii);
  const substituents = [];

  const layers = parseInChI(inchi);
  const mLayer = layers.m ?? '1';
  const shapeFlip = shapeNeedsMirrorFlip(layers) ?? false;
  const extraInvert = (mLayer === '0') !== shapeFlip;
  const flip = (o) => (o && extraInvert ? (o === 'up' ? 'down' : 'up') : o);

  // Anomeric OH ("r2") + exocyclic COOH (sialic C1), both at hexagon C1.
  // axEq follows the anomer directly (alpha=COOH axial, beta=COOH
  // equatorial -- see this function's own docstring above), same
  // D/L-invariance reasoning as layoutSubstituents' own C1 -- only used by
  // a chair-conformation renderer, Haworth itself ignores it.
  const ohEntry = positions.get(2);
  const ohLabel = ohEntry && displayLabel(ohEntry.label);
  if (ohLabel) {
    const ohOrientation = flip(anomer === 'b' ? 'down' : 'up');
    const coohAxEq = anomer === 'a' ? 'ax' : 'eq';
    const ohAxEq = coohAxEq === 'ax' ? 'eq' : 'ax';
    substituents.push({ position: 1, label: ohLabel, orientation: ohOrientation, axEq: ohAxEq });
    const coohEntry = positions.get(1);
    const coohLabel = coohEntry && displayLabel(coohEntry.label);
    if (coohLabel) {
      // neverSuppress: this COOH isn't the reducing-end substituent a
      // glycosidic bond at position 1 replaces (the anomeric OH above is)
      // -- it's always there regardless of linkage, so a suppression keyed
      // on "position 1" (see HaworthSVG.js) must not hide it too, even
      // though it shares the OH's vertex.
      substituents.push({
        position: 1,
        label: coohLabel,
        orientation: ohOrientation === 'up' ? 'down' : 'up',
        axEq: coohAxEq,
        neverSuppress: true,
      });
    }
  }

  // Sialic C4/C5/C6 = ring-walk / hexagon positions 3/4/5 -- real,
  // InChI-derived stereocentres. axEq comes straight from
  // InChIRingGeometry.js's own deriveAxialEquatorial (the same real
  // stereocentre data deriveHaworthOrientation already uses here, just its
  // ax/eq sibling instead of its up/down one) -- no extra D/L correction
  // needed for axEq, same as everywhere else in this file.
  const tLayerMap = parseTLayer(layers.t);
  const SIALIC_TO_HEXAGON = { 4: 3, 5: 4, 6: 5 };
  for (const sialicPos of [4, 5, 6]) {
    const entry = positions.get(sialicPos);
    const label = entry && displayLabel(entry.label);
    if (!label) continue;
    const hexagonPos = SIALIC_TO_HEXAGON[sialicPos];
    const orientation = deriveHaworthOrientation(layers, tLayerMap, hexagonPos);
    const axEq = deriveAxialEquatorial(layers, tLayerMap, hexagonPos);
    if (orientation) substituents.push({ position: hexagonPos, label, orientation, axEq });
  }

  // C7-C8-C9 glycerol tail, hanging off hexagon C5 (sialic C6) -- drawn as
  // one composite label, the same simplification hexose's own C6 (CH2OH)
  // gets rather than a fully separate per-atom drawing.
  const tailLabel = sialicTailLabel(positions.get(7), positions.get(8), positions.get(9));
  if (tailLabel) {
    const orientation = deriveHaworthOrientation(layers, tLayerMap, 5);
    const axEq = deriveAxialEquatorial(layers, tLayerMap, 5);
    if (orientation) substituents.push({ position: 5, label: tailLabel, orientation, axEq });
  }

  return { substituents };
}
