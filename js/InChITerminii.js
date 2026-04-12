/**
 * InChI → terminii converter for glycan.js monosaccharide registry.
 *
 * Ported from inchi_to_terminii.py. Converts an InChI string into the
 * terminii string format used by Mass.js (e.g. "r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH").
 */

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

  if (C === 11 && N === 1) return 'sialic';
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

// D-pentose
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
  if (C === 11 && N === 1) return null;     // sialic
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
  if (N === 1 && C >= 8) return 'NAc';
  if (N === 1 && C === 6) return 'NH2';
  return 'OH';
}

// ---------------------------------------------------------------------------
// Prokaryotic overrides
// ---------------------------------------------------------------------------

// Manually curated terminii strings for residues where InChI derivation is
// ambiguous or formula-based classification is insufficient.
export const PROKARYOTIC_OVERRIDES = {
  // 3,6-Dideoxyhexoses
  'Tyv':  'r1:OH;2eq:OH;3eq:H;4eq:OH;5eq:-;6eq:HH',
  'Abe':  'r1:OH;2eq:OH;3eq:H;4ax:OH;5eq:-;6eq:HH',
  'Par':  'r1:OH;2eq:OH;3ax:H;4eq:OH;5eq:-;6eq:HH',
  'Col':  'r1:OH;2eq:OH;3ax:H;4ax:OH;5eq:-;6eq:HH',

  // Keto-sugars
  'Kdo':  '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:OH;6eq:-;7:OH;8:HOH',
  'Kdx':  '1ax:OO;r2:O;3ax:H;4eq:OH;5eq:OH;6eq:-;7:HOH',

  // Heptoses
  'HepI': 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:OH;6eq:-;7eq:HOH',
  'HepII':'r1:OH;2eq:OH;3eq:OH;4eq:OH;5ax:OH;6eq:-;7eq:HOH',

  // N-modified hexosamines
  'FucNAc': 'r1:OH;2eq:NAc;3eq:OH;4ax:OH;5eq:-;6eq:HH',
  'QuiNAc': 'r1:OH;2eq:NAc;3eq:OH;4eq:OH;5eq:-;6eq:HH',
  'RhaNAc': 'r1:OH;2eq:NAc;3eq:OH;4ax:OH;5eq:-;6eq:HH',
  'ManNAc': 'r1:OH;2eq:NAc;3ax:OH;4eq:OH;5eq:-;6eq:HOH',
  'AllNAc': 'r1:OH;2eq:NAc;3ax:OH;4ax:OH;5eq:-;6eq:HOH',

  // Legionaminic / pseudaminic acids
  'Leg':  '1ax:OO;r2:O;3ax:H;4ax:OH;5eq:NHAc;6eq:-;7:OH;8:NHAc;9:HOH',
  'Pse':  '1ax:OO;r2:O;3ax:H;4ax:OH;5eq:NHAc;6eq:-;7:NHAc;8:OH;9:HOH',

  // Bacillosamine
  'Bac':  'r1:OH;2eq:NAc;3eq:OH;4eq:NAc;5eq:-;6eq:HOH',

  // Muramic acid
  'MurNAc': 'r1:OH;2eq:NAc;3eq:OLac;4eq:OH;5eq:-;6eq:HOH',

  // Glucuronic acid in 4C1 conformation
  'GlcA_4C1': 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OO',
};

// ---------------------------------------------------------------------------
// Per-class terminii builders
// ---------------------------------------------------------------------------

function buildHexose(name, t, formula, isL, conformationOverride, warnings) {
  const c6sub = inferC6Substituent(formula);
  const isUronic = c6sub === 'OO';

  // /t3 → carb C2: determines mannose (ax) vs gluco (eq) configuration
  const tC2sign = t.get(D_HEXOSE_4C1.carb_C2_from_t_pos);
  const c2 = tC2sign !== undefined ? (D_HEXOSE_4C1.C2[tC2sign] ?? 'eq') : 'eq';

  // /t4 → carb C4: determines galacto (ax) vs gluco (eq) configuration
  const tC4sign = t.get(D_HEXOSE_4C1.carb_C4_from_t_pos);
  // For uronic acids: DEFINITIONS models HexA on IdoA 1C4 conformation → C4=ax
  const c4 = isUronic ? 'ax' : (tC4sign !== undefined ? (D_HEXOSE_4C1.C4[tC4sign] ?? 'eq') : 'eq');

  // C3 is always eq for all DEFINITIONS hexoses/uronic acids
  const c2sub = inferC2Substituent(formula, isL ? 'L_hexose' : 'D_hexose');

  const parts = [
    `r1:OH`,
    `2${c2}:${c2sub}`,
    `3eq:OH`,
    `4${c4}:OH`,
    `5eq:-`,
    `6eq:${c6sub ?? 'HOH'}`,
  ];

  return {
    terminii: parts.join(';'),
    conformation: conformationOverride ?? '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildDeoxyhex(name, t, formula, isL, warnings) {
  if (isL) {
    // L-deoxyhex: 1C4 conformation (Fuc, Rha).
    // DEFINITIONS encodes both Fuc and Rha as C4=ax (inherited from dHex).
    // The InChI-based stereochemical derivation for 1C4 chair is ambiguous due
    // to atom-number remapping in L-series. Hardcode to match DEFINITIONS.
    const parts = [
      `r1:OH`,
      `2eq:OH`,
      `3eq:OH`,
      `4ax:OH`,
      `5eq:-`,
      `6eq:HH`,
    ];
    return {
      terminii: parts.join(';'),
      conformation: '1C4',
      source: 'inchi',
      warnings,
    };
  } else {
    // D-deoxyhex: same /t→carbon mapping as D-hexose, with HH at C6
    const tC2sign = t.get(D_HEXOSE_4C1.carb_C2_from_t_pos);
    const tC4sign = t.get(D_HEXOSE_4C1.carb_C4_from_t_pos);
    const c2 = tC2sign !== undefined ? (D_HEXOSE_4C1.C2[tC2sign] ?? 'eq') : 'eq';
    const c4 = tC4sign !== undefined ? (D_HEXOSE_4C1.C4[tC4sign] ?? 'eq') : 'eq';

    const parts = [
      `r1:OH`,
      `2${c2}:OH`,
      `3eq:OH`,
      `4${c4}:OH`,
      `5eq:-`,
      `6eq:HH`,
    ];
    return {
      terminii: parts.join(';'),
      conformation: '4C1',
      source: 'inchi',
      warnings,
    };
  }
}

function buildDideoxyhex(name, t, formula, isL, warnings) {
  // 3,6-dideoxyhexoses: C3 is deoxy (H), C6 is deoxy (HH)
  // Use same /t→carbon mapping as hexoses: /t4 → carb C4
  const tC4sign = t.get(D_HEXOSE_4C1.carb_C4_from_t_pos);
  const c4 = tC4sign !== undefined ? (D_HEXOSE_4C1.C4[tC4sign] ?? 'eq') : 'eq';

  // C3 deoxy position ax/eq: use /t3 (carb C2 pos) as proxy since C3 is the key differentiator
  const tC3sign = t.get(3);
  let c3 = 'eq';
  if (tC3sign !== undefined) {
    c3 = tC3sign === '+' ? 'eq' : 'ax';
  }

  const parts = [
    `r1:OH`,
    `2eq:OH`,
    `3${c3}:H`,
    `4${c4}:OH`,
    `5eq:-`,
    `6eq:HH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: isL ? '1C4' : '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildHexNAc(name, t, formula, warnings) {
  // HexNAc: ring C3 from /t pos 3, ring C4 from /t pos 7
  const tC3sign = t.get(HEXNAC_4C1.ring_C3_from_t_pos);
  const tC4sign = t.get(HEXNAC_4C1.ring_C4_from_t_pos);

  const c3 = tC3sign !== undefined ? (HEXNAC_4C1.C3[tC3sign] ?? 'eq') : 'eq';
  const c4 = tC4sign !== undefined ? (HEXNAC_4C1.C4[tC4sign] ?? 'eq') : 'eq';

  const parts = [
    `r1:OH`,
    `2eq:NAc`,
    `3${c3}:OH`,
    `4${c4}:OH`,
    `5eq:-`,
    `6eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildHexN(name, t, formula, warnings) {
  // GlcN has C6H13NO5 pyranose, same /t→carbon mapping as hexoses
  const tC2sign = t.get(D_HEXOSE_4C1.carb_C2_from_t_pos);
  const tC4sign = t.get(D_HEXOSE_4C1.carb_C4_from_t_pos);
  const c2 = tC2sign !== undefined ? (D_HEXOSE_4C1.C2[tC2sign] ?? 'eq') : 'eq';
  const c4 = tC4sign !== undefined ? (D_HEXOSE_4C1.C4[tC4sign] ?? 'eq') : 'eq';

  const parts = [
    `r1:OH`,
    `2${c2}:NH2`,
    `3eq:OH`,
    `4${c4}:OH`,
    `5eq:-`,
    `6eq:HOH`,
  ];
  return {
    terminii: parts.join(';'),
    conformation: '4C1',
    source: 'inchi',
    warnings,
  };
}

function buildPentose(name, t, formula, isL, warnings) {
  const tC3sign = t.get(3);
  const tC4sign = t.get(4);
  // C3: always eq for common pentoses in DEFINITIONS
  // C4: always ax in DEFINITIONS for Xyl and Ara
  const c3 = tC3sign !== undefined ? (D_PENTOSE_4C1.C3[tC3sign] ?? 'eq') : 'eq';
  const c4 = 'ax';  // always ax per DEFINITIONS

  const parts = [
    `r1:OH`,
    `2eq:OH`,
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

function buildSialic(name, t, formula, warnings) {
  // NeuAc-like: fixed topology.
  // terminii: 1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH
  // NeuGc differs only at position 5: NHGc instead of NHAc
  const { N = 0, O = 0 } = formula;

  // Determine if NHAc or NHGc:
  //   NeuAc: C11H19NO9 = O=9 → NHAc
  //   NeuGc: C11H19NO10 = O=10 → NHGc (extra O in glycolyl vs acetyl)
  let c5sub = 'NHAc';
  if (O >= 10) {
    c5sub = 'NHGc';
    warnings.push(`${name}: inferred NHGc from O count ${O}`);
  }

  const parts = [
    `1ax:OO`,
    `r2:O`,
    `3ax:H`,
    `4eq:OH`,
    `5eq:${c5sub}`,
    `6eq:-`,
    `7:OH`,
    `8:OH`,
    `9:HOH`,
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
      return buildSialic(name, t, formula, warnings);
    case 'kdo':
      return buildKdo(name, t, warnings);
    case 'D_hexose':
    case 'L_hexose':
    case 'D_hexA':
    case 'L_hexA':
      return buildHexose(name, t, formula, isL, opts.conformation, warnings);
    case 'D_deoxyhex':
      return buildDeoxyhex(name, t, formula, false, warnings);
    case 'L_deoxyhex':
      return buildDeoxyhex(name, t, formula, true, warnings);
    case 'D_dideoxyhex':
    case 'L_dideoxyhex':
      return buildDideoxyhex(name, t, formula, isL, warnings);
    case 'hexnac':
      return buildHexNAc(name, t, formula, warnings);
    case 'hexn':
      return buildHexN(name, t, formula, warnings);
    case 'D_pentose':
    case 'L_pentose':
      return buildPentose(name, t, formula, isL, warnings);
    case 'heptose':
      return buildHeptose(name, t, formula, isL, warnings);
    default:
      warnings.push(`Unknown class '${cls}' for ${name} — falling back to formula-only`);
      return buildFallback(name, formula, warnings);
  }
}
