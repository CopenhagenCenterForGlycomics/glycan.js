/**
 * InChI → terminii converter for glycan.js monosaccharide registry.
 *
 * Ported from inchi_to_terminii.py. Converts an InChI string into the
 * terminii string format used by Mass.js (e.g. "r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH").
 */

import { deriveAxialEquatorial } from './InChIRingGeometry.js';

// ---------------------------------------------------------------------------
// InChI parser
// ---------------------------------------------------------------------------

/**
 * Parse an InChI string into its layer components.
 * Returns { formula, c, h, t, m, s, ... } where each key is a layer letter.
 */
export function parseInChI(inchi) {
  const body = inchi.replace(/^InChI=1S?\//, '');
  const parts = body.split('/');
  const layers = { formula: parts[0] };
  for (const part of parts.slice(1)) {
    if (part) layers[part[0]] = part.slice(1);
  }
  return layers;
}

/**
 * Parse molecular formula string → { C, H, O, N, S, P, ... }
 */
export function parseFormula(formula) {
  const counts = {};
  for (const [, elem, n] of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    if (elem) counts[elem] = (counts[elem] ?? 0) + (n ? parseInt(n) : 1);
  }
  return counts;
}

/**
 * Parse /t layer → Map<int, '+' | '-'>
 * e.g. "2-,3+,4+,5-" → Map { 2 => '-', 3 => '+', 4 => '+', 5 => '-' }
 */
export function parseTLayer(tLayer) {
  const result = new Map();
  if (!tLayer) return result;
  for (const token of tLayer.split(',')) {
    const m = token.match(/^(\d+)([+-])$/);
    if (m) result.set(parseInt(m[1]), m[2]);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

/**
 * Classify a monosaccharide for terminii derivation purposes.
 */
export function classifyMonosaccharide(formula, mLayer) {
  const C = formula.C ?? 0;
  const O = formula.O ?? 0;
  const N = formula.N ?? 0;
  const isL = mLayer === '0';

  // Muramic acid (MurNAc): same C/N count range as a sialic acid but one
  // fewer oxygen (C11H19NO8 vs sialic's O9/O10) -- it's a HexNAc with a
  // 3-O-lactyl ether, not a ketose, so it must be checked before the
  // generic sialic-acid range below.
  if (C === 11 && N === 1 && O === 8) return 'muramic';
  if (C >= 11 && N === 1) return 'sialic';
  if (C === 8  && N === 1) return 'hexnac';
  if (C === 6  && N === 1) return 'hexn';
  if (C === 8  && N === 0 && O === 7) return 'kdo';
  if (C === 7  && N === 0 && O === 6) return 'kdx';
  if (C === 7  && N === 0) return 'heptose';
  // Uronic acids have O=7 (extra oxygen from COOH vs hexose OH):
  //   hexose C6H12O6 = O6, uronic acid C6H10O7 = O7
  if (C === 6  && N === 0 && O >= 7)  return isL ? 'L_hexA' : 'D_hexA';
  // Hexose: C6H12O6 = O6
  if (C === 6  && N === 0 && O === 6) return isL ? 'L_hexose' : 'D_hexose';
  // 6-deoxyhexose: C6H12O5 = O5 (e.g. Fuc, Rha)
  if (C === 6  && N === 0 && O === 5) return isL ? 'L_deoxyhex' : 'D_deoxyhex';
  // 3,6-dideoxyhexose: C6H12O4 = O4 (e.g. Tyv, Abe, Par, Col)
  if (C === 6  && N === 0 && O === 4) return isL ? 'L_dideoxyhex' : 'D_dideoxyhex';
  if (C === 5  && N === 0) return isL ? 'L_pentose' : 'D_pentose';
  return 'unknown';
}

// ---------------------------------------------------------------------------
// Conformation tables
// ---------------------------------------------------------------------------

// 4C1 D-aldohexose InChI /t → ring carbon mapping.
//
// In the pyranose InChI, atom numbering places C6 (CH2OH) at atom 1 and
// C1 (anomeric) at atom 2.  The remaining ring carbons follow in chain order:
//   InChI atom 3 → carb C2 (key epimer position: Man C2=ax, others eq)
//   InChI atom 4 → carb C3 (always eq for all DEFINITIONS hexoses)
//   InChI atom 5 → carb C4 (ax for Gal; eq for Glc, Man)
//   InChI atom 6 → carb C5 (ring junction, always eq in D-series)
//
// Signs:  '+' → equatorial,  '-' → axial  (4C1 D-series)
export const D_HEXOSE_4C1 = {
  carb_C2_from_t_pos: 3,
  C2: { '+': 'eq', '-': 'ax' },  // /t3 sign → carb C2 (Man has '-' → ax)
  carb_C4_from_t_pos: 4,
  C4: { '+': 'eq', '-': 'ax' },  // /t4 sign → carb C4 (Gal has '-' → ax)
};

// 1C4 L-deoxyhexose (Fuc, Rha).
export const L_DEOXYHEX_1C4 = {
  carb_C4_from_t_pos: 3,
  carb_C3_from_t_pos: 4,
  C4: { '+': 'ax', '-': 'eq' },
  C3: { '+': 'eq', '-': 'eq' },
};

// HexNAc: InChI atoms 1-3 are the N-acetyl group (CH3, C=O, N).
// Ring carbons follow, so /t positions are offset vs plain hexoses:
//   /t5 → ring C3 (the differentiating GlcNAc vs ManNAc position)
//   /t6 → ring C4 (differentiates GlcNAc/ManNAc from GalNAc/AllNAc)
export const HEXNAC_4C1 = {
  ring_C3_from_t_pos: 5,
  ring_C4_from_t_pos: 6,
  C3: { '+': 'eq', '-': 'ax' },
  C4: { '+': 'eq', '-': 'ax' },
};

// D-pentose. Degenerate by construction (every sign maps to the same
// label) -- this was never a real derivation, just a historical default.
// Kept only as resolveRingPosition's last-resort fallback for an InChI the
// general ring-walk can't parse; buildPentose derives for real otherwise.
export const D_PENTOSE_4C1 = {
  C3: { '+': 'eq', '-': 'eq' },
  C4: { '-': 'ax', '+': 'ax' },
};

// 2C5 sialic acid (NeuAc, NeuGc)
export const SIALIC_2C5 = {
  C4: { '+': 'eq', '-': 'ax' },
};

// ---------------------------------------------------------------------------
// Substituent inference
// ---------------------------------------------------------------------------

export function inferC6Substituent(formula) {
  const { C = 0, O = 0, N = 0 } = formula;
  if (C >= 11 && N === 1) return null;     // sialic
  if (C === 5)              return null;     // pentose
  if (C === 7)              return 'HOH';   // heptose
  if (C === 8 && N === 0)   return null;    // KDO
  if (N === 0) {
    if (O === 6) return 'HOH';   // hexose (C6H12O6)
    if (O >= 7) return 'OO';     // uronic acid (C6H10O7)
    if (O === 5) return 'HH';    // 6-deoxyhexose (C6H12O5)
    if (O === 4) return 'HH';    // 3,6-dideoxyhexose (C6H12O4)
  }
  if (N === 1) return 'HOH';     // HexNAc, HexN
  return 'HOH';
}

export function inferC2Substituent(formula, classHint) {
  const { N = 0, C = 0 } = formula;
  if (classHint === 'sialic') return null;
  if (classHint === 'kdo')    return null;
  if (N === 0) return 'OH';
  if (N === 1 && C >= 8) return 'NHAc';
  if (N === 1 && C === 6) return 'NH2';
  return 'OH';
}

// ---------------------------------------------------------------------------
// Prokaryotic overrides
// ---------------------------------------------------------------------------

// Manually curated terminii strings for residues where InChI derivation is
// ambiguous or formula-based classification is insufficient.
export const PROKARYOTIC_OVERRIDES = {
  // 3,6-Dideoxyhexoses (Tyv, Abe, Par, Col) used to be hardcoded here, but
  // are now derived for real by buildDideoxyhex from their own InChI in
  // js/data/monosaccharides.js -- see PUBCHEM_CID_CORRECTIONS.md section 9.

  // Keto-sugars
  'Kdo':  '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:OH;6eq:-;7:OH;8:HOH',
  'Kdx':  '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:OH;6eq:-;7:HOH',

  // Heptoses
  'HepI': 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:OH;6eq:-;7eq:HOH',
  'HepII':'r1:OH;2eq:OH;3eq:OH;4eq:OH;5ax:OH;6eq:-;7eq:HOH',

  // N-modified hexosamines
  'FucNAc': 'r1:OH;2eq:NHAc;3eq:OH;4ax:OH;5eq:-;6eq:HH',
  'QuiNAc': 'r1:OH;2eq:NHAc;3eq:OH;4eq:OH;5eq:-;6eq:HH',
  'RhaNAc': 'r1:OH;2eq:NHAc;3eq:OH;4ax:OH;5eq:-;6eq:HH',
  'ManNAc': 'r1:OH;2eq:NHAc;3ax:OH;4eq:OH;5eq:-;6eq:HOH',
  'AllNAc': 'r1:OH;2eq:NHAc;3ax:OH;4ax:OH;5eq:-;6eq:HOH',

  // Legionaminic / pseudaminic acids
  'Leg':  '1ax:OO;r2:O;3ax:H;4ax:OH;5eq:NHAc;6eq:-;7:OH;8:NHAc;9:HOH',
  'Pse':  '1ax:OO;r2:O;3ax:H;4ax:OH;5eq:NHAc;6eq:-;7:NHAc;8:OH;9:HOH',

  // Bacillosamine
  'Bac':  'r1:OH;2eq:NHAc;3eq:OH;4eq:NHAc;5eq:-;6eq:HOH',

  // Muramic acid (MurNAc) used to be hardcoded here, but is now derived
  // for real by buildMurNAc from its own InChI in js/data/monosaccharides.js
  // -- see PUBCHEM_CID_CORRECTIONS.md section 12.

};

// ---------------------------------------------------------------------------
// Per-class terminii builders
// ---------------------------------------------------------------------------

// Resolve a ring position's axial/equatorial label from genuine InChI
// connectivity + idealized chair geometry (InChIRingGeometry.js), which
// works for any standard InChI regardless of its particular canonical
// atom-numbering. Falls back to the legacy fixed-/t-position heuristic
// (valid only for the specific numbering convention it was fit to) when the
// general method can't identify the ring or anomeric center -- e.g. for a
// non-standard or incomplete InChI -- so unusual input degrades instead of
// throwing.
function resolveRingPosition(layers, t, sugarPosition, legacyTPos, legacySignTable) {
  const derived = deriveAxialEquatorial(layers, t, sugarPosition);
  if (derived) return derived;
  const legacySign = t.get(legacyTPos);
  return legacySign !== undefined ? (legacySignTable[legacySign] ?? 'eq') : 'eq';
}

function buildHexose(name, t, formula, isL, conformationOverride, warnings, layers) {
  const c6sub = inferC6Substituent(formula);

  // carb C2: determines mannose (ax) vs gluco (eq) configuration
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);

  // carb C4: determines galacto (ax) vs gluco (eq) configuration
  const c4 = resolveRingPosition(layers, t, 4, D_HEXOSE_4C1.carb_C4_from_t_pos, D_HEXOSE_4C1.C4);

  // carb C5 (ring junction, bears the exocyclic C6 group): always eq for a
  // plain D-hexose, but a real, derivable stereocentre, NOT always eq --
  // it's the position that literally gets epimerised going from GlcA
  // (D-series) to IdoA (L-series), which is otherwise unchanged at
  // C2/C3/C4. A fixed "eq" placeholder here was silently wrong for IdoA
  // (real answer: ax) until this was derived like every other position.
  const c5 = resolveRingPosition(layers, t, 5, null, {});

  // C3 is always eq in 4C1 conformation
  const c2sub = inferC2Substituent(formula, isL ? 'L_hexose' : 'D_hexose');

  const parts = [
    `r1:OH`,
    `2${c2}:${c2sub}`,
    `3eq:OH`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:${c6sub ?? 'HOH'}`,
  ];

  return {
    terminii: parts.join(';'),
    conformation: conformationOverride ?? '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildDeoxyhex(name, t, formula, isL, warnings, layers) {
  // Deoxyhexose (Fuc, Rha): same ring shape for D- and L-series, both
  // derived the same way now. This used to hardcode the L-series case
  // outright (both Fuc and Rha to one shared literal, which was wrong for
  // at least one of them), because applying the /m-layer mirror flip that's
  // correct for a plain hexose gave this ring shape's *inverse* -- the real
  // issue was that that flip doesn't apply to this shape at all (see
  // InChIRingGeometry.js's shapeNeedsMirrorFlip), not that derivation was
  // impossible. Validated against Fuc and Rha matching D-galactose's and
  // D-mannose's own axial/equatorial patterns respectively (that
  // classification is invariant under D/L mirroring) -- see
  // PUBCHEM_CID_CORRECTIONS.md.
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);
  const c3 = resolveRingPosition(layers, t, 3, 3, { '+': 'eq', '-': 'eq' });
  const c4 = resolveRingPosition(layers, t, 4, D_HEXOSE_4C1.carb_C4_from_t_pos, D_HEXOSE_4C1.C4);
  const c5 = resolveRingPosition(layers, t, 5, null, {}); // see buildHexose's comment on C5

  const parts = [
    `r1:OH`,
    `2${c2}:OH`,
    `3${c3}:OH`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:HH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: isL ? '1C4' : '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildDideoxyhex(name, t, formula, isL, warnings, layers) {
  // 3,6-dideoxyhexose (Tyv, Abe, Par, Col): C2 and C4 are real, derivable
  // ring stereocentres, validated against each compound's own known parent
  // hexose (Tyv = 3,6-dideoxy-D-mannose, Abe = 3,6-dideoxy-D-galactose,
  // Par = 3,6-dideoxy-D-glucose, Col = 3,6-dideoxy-L-galactose, per their
  // own PubChem synonyms) -- each matches its parent's C2/C4 pattern
  // exactly, 8/8. This also caught a real bug in the historical hardcoded
  // version: it gave every one of these four the same "2eq", but Tyvelose
  // (mannose-configured, not glucose-configured) needs "2ax" at C2, the
  // same way D-mannose itself does.
  //
  // C3 is NOT a stereocentre at all here -- it's a plain CH2 (deoxygenated,
  // both substituents are H), so standard InChI has no /t entry for it; the
  // old code's "use /t3 as a proxy" wasn't just unprincipled, it was
  // reading the wrong atom entirely (InChI atom 3 isn't ring position 3 for
  // this shape -- same fixed-position assumption that broke GlcA). There is
  // nothing to derive here, so it's kept as a fixed placeholder; this label
  // is also never actually read by Mass.js (parse_terminii only looks at
  // the position number and the substituent, never the ax/eq part of any
  // label), so it has no effect on mass calculation either way.
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);
  const c4 = resolveRingPosition(layers, t, 4, D_HEXOSE_4C1.carb_C4_from_t_pos, D_HEXOSE_4C1.C4);
  const c5 = resolveRingPosition(layers, t, 5, null, {}); // see buildHexose's comment on C5

  const parts = [
    `r1:OH`,
    `2${c2}:OH`,
    `3eq:H`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:HH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: isL ? '1C4' : '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildHexNAc(name, t, formula, warnings, layers) {
  // Same ring shape as plain hexoses (C2 bears NHAc instead of OH, but it's
  // still a real, derivable ring stereocentre -- cross-checked against
  // GalNAc/GlcNAc matching their own parent hexose's C2 exactly, Gal and
  // Glc respectively, both eq).
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);
  // ring C3 / ring C4: the differentiating gluco/galacto/manno/allo positions
  const c3 = resolveRingPosition(layers, t, 3, HEXNAC_4C1.ring_C3_from_t_pos, HEXNAC_4C1.C3);
  const c4 = resolveRingPosition(layers, t, 4, HEXNAC_4C1.ring_C4_from_t_pos, HEXNAC_4C1.C4);
  const c5 = resolveRingPosition(layers, t, 5, null, {}); // see buildHexose's comment on C5

  const parts = [
    `r1:OH`,
    `2${c2}:NHAc`,
    `3${c3}:OH`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildMurNAc(name, t, formula, warnings, layers) {
  // Muramic acid: a GlcNAc with its C3-OH etherified to lactic acid (a
  // 3-O-lactyl ether). Same ring shape and the same real stereocentres as
  // any other HexNAc -- only the substituent label at C3 differs (OLac
  // instead of OH); the ring itself doesn't know or care what's attached.
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);
  const c3 = resolveRingPosition(layers, t, 3, HEXNAC_4C1.ring_C3_from_t_pos, HEXNAC_4C1.C3);
  const c4 = resolveRingPosition(layers, t, 4, HEXNAC_4C1.ring_C4_from_t_pos, HEXNAC_4C1.C4);
  const c5 = resolveRingPosition(layers, t, 5, null, {}); // see buildHexose's comment on C5

  const parts = [
    `r1:OH`,
    `2${c2}:NHAc`,
    `3${c3}:OLac`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildHexN(name, t, formula, warnings, layers) {
  // GlcN has C6H13NO5 pyranose, same ring shape as plain hexoses
  const c2 = resolveRingPosition(layers, t, 2, D_HEXOSE_4C1.carb_C2_from_t_pos, D_HEXOSE_4C1.C2);
  const c4 = resolveRingPosition(layers, t, 4, D_HEXOSE_4C1.carb_C4_from_t_pos, D_HEXOSE_4C1.C4);
  const c5 = resolveRingPosition(layers, t, 5, null, {}); // see buildHexose's comment on C5

  const parts = [
    `r1:OH`,
    `2${c2}:NH2`,
    `3eq:OH`,
    `4${c4}:OH`,
    `5${c5}:-`,
    `6eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildPentose(name, t, formula, isL, warnings, layers) {
  // C2 is a real ring stereocentre too (D-arabinose's is ax, unlike
  // D-ribose/xylose/lyxose's eq) -- derived now instead of hardcoded.
  const c2 = resolveRingPosition(layers, t, 2, null, {});
  const c3 = resolveRingPosition(layers, t, 3, 3, D_PENTOSE_4C1.C3);
  const c4 = resolveRingPosition(layers, t, 4, 4, D_PENTOSE_4C1.C4);

  const parts = [
    `r1:OH`,
    `2${c2}:OH`,
    `3${c3}:OH`,
    `4${c4}:OH`,
    `5eq:H`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: isL ? '1C4' : '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildHeptose(name, t, formula, isL, warnings) {
  // Apply D_HEXOSE_4C1 rules for C2-C4, treat C6 as ring-O, C7 = exocyclic CH2OH
  const tC3sign = t.get(3);
  const tC4sign = t.get(4);
  const tC5sign = t.get(5);

  const c3 = tC3sign !== undefined ? (D_HEXOSE_4C1[3][tC3sign] ?? 'eq') : 'eq';
  const c4 = tC4sign !== undefined ? (D_HEXOSE_4C1[4][tC4sign] ?? 'eq') : 'eq';
  // C5 orientation: use the same +/- → eq/ax mapping as C4
  const c5 = tC5sign !== undefined ? (tC5sign === '+' ? 'eq' : 'ax') : 'eq';

  const parts = [
    `r1:OH`,
    `2eq:OH`,
    `3${c3}:OH`,
    `4${c4}:OH`,
    `5${c5}:OH`,
    `6eq:-`,
    `7eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildSialic(name, t, formula, warnings, layers) {
  // NeuAc-like: a ketose. The anomeric centre (sialic C2) is quaternary --
  // bonded to the ring O, the ring, an exocyclic OH, AND an exocyclic COOH
  // carbon, with no H -- unlike every aldose family above. Ring positions
  // 4/5/6 (sialic numbering) ARE real, derivable stereocentres though, and
  // deriveAxialEquatorial's ring-walk finds them fine (position N in its
  // own numbering = sialic position N+1, since its position 1 is this
  // ketose anomeric carbon). Validated against Neu5Ac's well-documented 2C5
  // conformation (equatorial C4/C5/C6, axial anomeric COOH) -- see
  // InChIRingGeometry.js's needsMirrorFlip and PUBCHEM_CID_CORRECTIONS.md.
  //
  // Position 1 (the exocyclic COOH's own orientation, ax for the common
  // alpha anomer) and position 3 (C3, a plain CH2 -- not a stereocentre,
  // same situation as a dideoxyhexose's deoxy position, see buildDideoxyhex)
  // are NOT derived: the former is anomer/instance-level information this
  // residue-type InChI doesn't carry (same as every other family's anomeric
  // position), the latter has nothing to derive.
  //
  // C/O matrix:
  //   NeuAc    C11 O9  → C5=NHAc, C9=HOH
  //   NeuGc    C11 O10 → C5=NHGc, C9=HOH    (extra O from glycolyl)
  //   NeuAc9Ac C13 O10 → C5=NHAc, C9=HOHAc  (extra C2O from 9-O-acetyl)
  //   NeuGc9Ac C13 O11 → C5=NHGc, C9=HOHAc  (both modifications)
  const { C = 0, O = 0 } = formula;

  const is9Ac = C >= 13;                          // 9-O-acetylation adds 2 carbons
  const isGlycolyl = is9Ac ? (O >= 11) : (O >= 10); // within C13, glycolyl adds one more O
  const c5sub = isGlycolyl ? 'NHGc' : 'NHAc';
  const c9sub = is9Ac ? 'HOHAc' : 'HOH';

  const c4 = resolveRingPosition(layers, t, 3, null, {}); // ring-walk pos 3 = sialic C4
  const c5 = resolveRingPosition(layers, t, 4, null, {}); // ring-walk pos 4 = sialic C5
  const c6 = resolveRingPosition(layers, t, 5, null, {}); // ring-walk pos 5 = sialic C6

  const parts = [
    `1ax:OO`,
    `r2:O`,
    `3ax:H`,
    `4${c4}:OH`,
    `5${c5}:${c5sub}`,
    `6${c6}:-`,
    `7:OH`,
    `8:OH`,
    `9:${c9sub}`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '2C5',
    source: 'inchi',
    warnings,
  };
}

function buildKdo(name, t, warnings) {
  // 3-deoxy-D-manno-oct-2-ulosonic acid
  // terminii: 1ax:OO;r2:O;3ax:H;4eq:OH;5eq:OH;6eq:-;7:OH;8:HOH
  const parts = [
    `1ax:OO`,
    `r2:O`,
    `3ax:H`,
    `4eq:OH`,
    `5eq:OH`,
    `6eq:-`,
    `7:OH`,
    `8:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildFallback(name, formula, warnings) {
  // Minimal fallback: just produce a single-position ring
  warnings.push(`${name}: using formula-only fallback terminii`);
  return {
    terminii: `r1:OH`,
    conformation: 'unknown',
    source: 'fallback',
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Main conversion function
// ---------------------------------------------------------------------------

/**
 * Derive a terminii string from an InChI string.
 *
 * @param {string} name       - Monosaccharide name (used for override lookup and class hints)
 * @param {string} inchi      - Standard InChI string from PubChem or equivalent
 * @param {object} [opts]
 * @param {string} [opts.conformation] - Override chair: '4C1' | '1C4' | '2C5' | 'envelope'
 * @returns {{ terminii: string, conformation: string, source: string, warnings: string[] }}
 */
export function inchiToTerminii(name, inchi, opts = {}) {
  const warnings = [];

  // 1. Check for a manual override first
  if (PROKARYOTIC_OVERRIDES[name]) {
    return {
      terminii: PROKARYOTIC_OVERRIDES[name],
      conformation: opts.conformation ?? 'manual',
      source: 'override',
      warnings,
    };
  }

  // 2. Parse InChI
  const layers = parseInChI(inchi);
  const formula = parseFormula(layers.formula ?? '');
  const t = parseTLayer(layers.t);
  const mLayer = layers.m ?? '1';   // '1' = D-series, '0' = L-series
  const isL = mLayer === '0';

  // 3. Classify
  const cls = classifyMonosaccharide(formula, mLayer);

  // 4. Dispatch to per-class builder
  switch (cls) {
    case 'sialic':
      return buildSialic(name, t, formula, warnings, layers);
    case 'kdo':
      return buildKdo(name, t, warnings);
    case 'D_hexose':
    case 'L_hexose':
    case 'D_hexA':
    case 'L_hexA':
      return buildHexose(name, t, formula, isL, opts.conformation, warnings, layers);
    case 'D_deoxyhex':
      return buildDeoxyhex(name, t, formula, false, warnings, layers);
    case 'L_deoxyhex':
      return buildDeoxyhex(name, t, formula, true, warnings, layers);
    case 'D_dideoxyhex':
    case 'L_dideoxyhex':
      return buildDideoxyhex(name, t, formula, isL, warnings, layers);
    case 'hexnac':
      return buildHexNAc(name, t, formula, warnings, layers);
    case 'muramic':
      return buildMurNAc(name, t, formula, warnings, layers);
    case 'hexn':
      return buildHexN(name, t, formula, warnings, layers);
    case 'D_pentose':
    case 'L_pentose':
      return buildPentose(name, t, formula, isL, warnings, layers);
    case 'heptose':
      return buildHeptose(name, t, formula, isL, warnings);
    default:
      warnings.push(`Unknown class '${cls}' for ${name} — falling back to formula-only`);
      return buildFallback(name, formula, warnings);
  }
}
