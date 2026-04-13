import { MONOSACCHARIDE } from '../reference_monosaccharides.js';

// GlycoCT substituent descriptor that maps to an HSO3 tree node.
const SULFATE_DESCRIPTOR = 'sulfate';
import Sugar from '../Sugar.js';
import { IO as IupacIO } from './CondensedIupac.js';

// ---------------------------------------------------------------------------
// Translation tables
// ---------------------------------------------------------------------------

// Key: backbone descriptor + sorted substituents joined with '+'
// Value: canonical MONOSACCHARIDE identifier
//
// NeuAc backbone confirmed against Glygen G17689DH fixture:
//   a-dgro-dgal-NON-2:6|1:a|2:keto|3:d (9-carbon nonose with acid/keto/deoxy mods)
// Fuc confirmed against G00051MO and G17689DH:
//   a-lgal-HEX-1:5|6:d (L-Fucose with C6-deoxy modifier)
const BACKBONE_TO_IDENTIFIER = {
  'b-dglc-HEX-1:5+n-acetyl':                              MONOSACCHARIDE.GlcNAc,
  'a-dglc-HEX-1:5+n-acetyl':                              MONOSACCHARIDE.GlcNAc,
  'b-dglc-HEX-1:5':                                       MONOSACCHARIDE.Glc,
  'a-dglc-HEX-1:5':                                       MONOSACCHARIDE.Glc,
  'b-dgal-HEX-1:5+n-acetyl':                              MONOSACCHARIDE.GalNAc,
  'a-dgal-HEX-1:5+n-acetyl':                              MONOSACCHARIDE.GalNAc,
  'b-dman-HEX-1:5+n-acetyl':                              MONOSACCHARIDE.ManNAc,
  'b-dgal-HEX-1:5':                                       MONOSACCHARIDE.Gal,
  'a-dgal-HEX-1:5':                                       MONOSACCHARIDE.Gal,
  'a-dgal-HEX-1:4':                                       MONOSACCHARIDE.Galf,
  'b-dgal-HEX-1:4':                                       MONOSACCHARIDE.Galf,
  'b-dman-HEX-1:5':                                       MONOSACCHARIDE.Man,
  'a-dman-HEX-1:5':                                       MONOSACCHARIDE.Man,
  'a-lgal-HEX-1:5|6:d':                                   MONOSACCHARIDE.Fuc,
  'b-lgal-HEX-1:5|6:d':                                   MONOSACCHARIDE.Fuc,
  'b-dxyl-PEN-1:5':                                       MONOSACCHARIDE.Xyl,
  'a-dxyl-PEN-1:5':                                       MONOSACCHARIDE.Xyl,
  'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+n-acetyl':          MONOSACCHARIDE.NeuAc,
  'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+n-glycolyl':        MONOSACCHARIDE.NeuGc,
  'b-dgro-dgal-NON-2:6|1:a|2:keto|3:d+n-acetyl':          MONOSACCHARIDE.NeuAc,
  'b-dgro-dgal-NON-2:6|1:a|2:keto|3:d+n-glycolyl':        MONOSACCHARIDE.NeuGc,
  'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl+n-acetyl':   MONOSACCHARIDE.NeuAc9Ac,
  'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl+n-glycolyl': MONOSACCHARIDE.NeuGc9Ac,
  'b-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl+n-acetyl':   MONOSACCHARIDE.NeuAc9Ac,
  'b-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl+n-glycolyl': MONOSACCHARIDE.NeuGc9Ac,
  'a-dglc-HEX-1:5|6:a':                                   MONOSACCHARIDE.GlcA,
  'b-dglc-HEX-1:5|6:a':                                   MONOSACCHARIDE.GlcA,
  'a-lido-HEX-1:5':                                       MONOSACCHARIDE.IdoA,
  'b-dglc-HEX-1:5+amino':                                 MONOSACCHARIDE.GlcN,
  'a-dglc-HEX-1:5+amino':                                 MONOSACCHARIDE.GlcN
};

// For writing: identifier → backbone descriptor template + substituents + anomeric_pos.
// anomeric_pos: the GlycoCT toPos for this residue (1 for aldoses, 2 for ketoses like NeuAc).
// The backbone prefix is replaced at write time with the actual node anomer.
const IDENTIFIER_TO_GLYCOCT = {
  [MONOSACCHARIDE.GlcNAc]: { backbone: 'b-dglc-HEX-1:5',                      substituents: [{ name: 'n-acetyl',   pos: 2 }], anomeric_pos: 1 },
  [MONOSACCHARIDE.GalNAc]: { backbone: 'b-dgal-HEX-1:5',                      substituents: [{ name: 'n-acetyl',   pos: 2 }], anomeric_pos: 1 },
  [MONOSACCHARIDE.ManNAc]: { backbone: 'b-dman-HEX-1:5',                      substituents: [{ name: 'n-acetyl',   pos: 2 }], anomeric_pos: 1 },
  [MONOSACCHARIDE.GlcN]:   { backbone: 'b-dglc-HEX-1:5',                      substituents: [{ name: 'amino',      pos: 2 }], anomeric_pos: 1 },
  [MONOSACCHARIDE.Glc]:    { backbone: 'b-dglc-HEX-1:5',                      substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.Gal]:    { backbone: 'b-dgal-HEX-1:5',                      substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.Galf]:   { backbone: 'b-dgal-HEX-1:4',                      substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.Man]:    { backbone: 'b-dman-HEX-1:5',                      substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.Fuc]:    { backbone: 'a-lgal-HEX-1:5|6:d',                  substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.Xyl]:    { backbone: 'b-dxyl-PEN-1:5',                      substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.NeuAc]:  { backbone: 'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d', substituents: [{ name: 'n-acetyl',   pos: 5 }], anomeric_pos: 2 },
  [MONOSACCHARIDE.NeuGc]:  { backbone: 'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d', substituents: [{ name: 'n-glycolyl', pos: 5 }], anomeric_pos: 2 },
  [MONOSACCHARIDE.NeuAc9Ac]:  { backbone: 'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl', substituents: [{ name: 'n-acetyl',   pos: 5 }], anomeric_pos: 2 },
  [MONOSACCHARIDE.NeuGc9Ac]:  { backbone: 'a-dgro-dgal-NON-2:6|1:a|2:keto|3:d+acetyl', substituents: [{ name: 'n-glycolyl', pos: 5 }], anomeric_pos: 2 },
  [MONOSACCHARIDE.GlcA]:   { backbone: 'b-dglc-HEX-1:5|6:a',                 substituents: [],                               anomeric_pos: 1 },
  [MONOSACCHARIDE.IdoA]:   { backbone: 'a-lido-HEX-1:5',                     substituents: [],                               anomeric_pos: 1 },
};

// ---------------------------------------------------------------------------
// Internal text parser — no `this` dependency
// ---------------------------------------------------------------------------
function parse_glycoct_text(text) {
  const lines    = text.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const residues = new Map(); // id → { type: 'backbone'|'substituent', descriptor }
  const linkages = [];

  let section = null;
  for (const line of lines) {
    if (line === 'RES') { section = 'RES'; continue; }
    if (line === 'LIN') { section = 'LIN'; continue; }

    if (section === 'RES') {
      const m = line.match(/^(\d+)(b|s):(.+)$/);
      if (!m) continue;
      const [, idStr, type, descriptor] = m;
      residues.set(Number(idStr), {
        type: type === 'b' ? 'backbone' : 'substituent',
        descriptor,
      });
    } else if (section === 'LIN') {
      // {id}:{fromId}{fromEnd}({fromPos}+{toPos}){toId}{toType}
      const m = line.match(/^(\d+):(\d+)([do])\((-?\d+|\?)\+(-?\d+|\?)\)(\d+)([dno])$/);
      if (!m) continue;
      const [, , fromIdStr, fromEnd, fromPosStr, toPosStr, toIdStr, toType] = m;
      linkages.push({
        fromId:  Number(fromIdStr),
        fromEnd,
        fromPos: fromPosStr === '?' ? 0 : Number(fromPosStr),
        toPos:   toPosStr   === '?' ? 0 : Number(toPosStr),
        toId:    Number(toIdStr),
        toType,
      });
    }
  }

  return { residues, linkages };
}

// ---------------------------------------------------------------------------
// build_sequence — called with `this` as the sugar instance (Builder target)
// ---------------------------------------------------------------------------
function build_sequence(text) {
  // For multi-block GlycoCT, use the first block containing a RES section.
  const blocks = text.trim().split(/\n\s*\n/);
  const block  = blocks.find(b => /^RES/m.test(b)) ?? blocks[0];

  const mono_class         = this.constructor.Monosaccharide;
  const { residues, linkages } = parse_glycoct_text(block);

  // --- 1. Collect substituents attached to each backbone -------------------
  // Sulfate substituents are tracked separately: they become HSO3 child nodes
  // in the sugar tree rather than being folded into the backbone lookup key.
  const substByBackbone = new Map(); // backbone id → { normal: string[], sulfates: number[] }
  for (const lnk of linkages) {
    const from = residues.get(lnk.fromId);
    const to   = residues.get(lnk.toId);
    if (from?.type !== 'backbone' || to?.type !== 'substituent') continue;
    if (!substByBackbone.has(lnk.fromId)) {
      substByBackbone.set(lnk.fromId, { normal: [], sulfates: [] });
    }
    const info = substByBackbone.get(lnk.fromId);
    if (to.descriptor === SULFATE_DESCRIPTOR) {
      info.sulfates.push(lnk.fromPos);
    } else {
      info.normal.push(to.descriptor);
    }
  }

  // --- 2. Create Monosaccharide instances ----------------------------------
  const monoById = new Map(); // backbone id → Monosaccharide
  for (const [id, res] of residues) {
    if (res.type !== 'backbone') continue;
    const info   = substByBackbone.get(id) ?? { normal: [], sulfates: [] };
    const substs = info.normal.slice().sort();
    const key    = substs.length > 0 ? `${res.descriptor}+${substs.join('+')}` : res.descriptor;
    const identifier = BACKBONE_TO_IDENTIFIER[key];
    if (!identifier) {
      throw new Error(`[glycoct] Unknown descriptor: "${key}"`);
    }
    const mono = new mono_class(identifier);

    // Sulfate substituents become HSO3 children at the recorded positions.
    for (const pos of info.sulfates) {
      const hso3 = new mono_class(MONOSACCHARIDE.HSO3);
      hso3.anomer         = 'u';
      hso3.parent_linkage = 0;   // unknown; written as '?' in IUPAC
      mono.addChild(pos, hso3);
    }

    monoById.set(id, mono);
  }

  // --- 3. Identify root (reducing end = never a backbone link target) ------
  const hasParent = new Set();
  for (const lnk of linkages) {
    if (residues.get(lnk.fromId)?.type === 'backbone' &&
        residues.get(lnk.toId)?.type   === 'backbone') {
      hasParent.add(lnk.toId);
    }
  }
  let rootId = null;
  for (const id of monoById.keys()) {
    if (!hasParent.has(id)) { rootId = id; break; }
  }
  if (rootId === null) throw new Error('[glycoct] Could not determine root residue');

  this.root = monoById.get(rootId);

  // --- 4. Wire backbone–backbone linkages ----------------------------------
  for (const lnk of linkages) {
    if (residues.get(lnk.fromId)?.type !== 'backbone' ||
        residues.get(lnk.toId)?.type   !== 'backbone') continue;

    const parent = monoById.get(lnk.fromId);
    const child  = monoById.get(lnk.toId);

    // fromPos = position on parent; toPos = anomeric position on child
    // (1 for aldoses, 2 for ketoses like NeuAc)
    parent.addChild(lnk.fromPos, child);
    child.parent_linkage = lnk.toPos;

    // Anomer from first character of the child's backbone descriptor
    child.anomer = residues.get(lnk.toId).descriptor[0];
  }
}

// ---------------------------------------------------------------------------
// write_sequence — called with `this` as the sugar instance (Writer target)
// ---------------------------------------------------------------------------
function write_sequence() {
  // BFS assigns IDs: reducing end (root) gets id 1.
  // HSO3 sulfate children are excluded from the backbone BFS — they are
  // written as s:sulfate substituents alongside their parent backbone entry.
  const idOf  = new Map();
  const order = [];
  let nextId  = 1;

  const queue = [this.root];
  while (queue.length) {
    const node = queue.shift();
    idOf.set(node, nextId++);
    order.push(node);
    const children = [...node.children]
      .filter(c => c.identifier !== MONOSACCHARIDE.HSO3)
      .sort((a, b) => node.linkageOf(a) - node.linkageOf(b));
    queue.push(...children);
  }

  const resLines = [];
  const linLines = [];
  let substId = order.length + 1; // substituent IDs follow all backbone IDs
  let linkId  = 1;

  // RES section + substituent LIN entries
  for (const node of order) {
    const bId = idOf.get(node);
    const def = IDENTIFIER_TO_GLYCOCT[node.identifier];
    if (!def) throw new Error(`[glycoct] No GlycoCT definition for identifier "${node.identifier}"`);

    // Use the node's actual anomer for non-root residues; fall back to the
    // table default (used for the reducing-end root which has no parent).
    const anomer   = node.parent ? (node.anomer || def.backbone[0]) : def.backbone[0];
    const backbone = def.backbone.replace(/^[a-z]/, anomer);
    resLines.push(`${bId}b:${backbone}`);

    // Regular substituents from the identifier table (e.g. n-acetyl).
    for (const subst of def.substituents) {
      const sId = substId++;
      resLines.push(`${sId}s:${subst.name}`);
      linLines.push(`${linkId++}:${bId}d(${subst.pos}+1)${sId}n`);
    }

    // HSO3 children → written as sulfate substituents.
    const sulfates = [...node.children]
      .filter(c => c.identifier === MONOSACCHARIDE.HSO3)
      .sort((a, b) => node.linkageOf(a) - node.linkageOf(b));
    for (const hso3 of sulfates) {
      const sId = substId++;
      const pos = node.linkageOf(hso3);
      resLines.push(`${sId}s:${SULFATE_DESCRIPTOR}`);
      linLines.push(`${linkId++}:${bId}o(${pos}+1)${sId}n`);
    }
  }

  // Backbone–backbone LIN entries
  for (const node of order) {
    if (!node.parent) continue;
    const pId     = idOf.get(node.parent);
    const cId     = idOf.get(node);
    const def     = IDENTIFIER_TO_GLYCOCT[node.identifier];
    const fromPos = node.parent.linkageOf(node);
    const toPos   = def?.anomeric_pos ?? 1;
    linLines.push(`${linkId++}:${pId}o(${fromPos}+${toPos})${cId}d`);
  }

  return `RES\n${resLines.join('\n')}\nLIN\n${linLines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Mixin helpers (mirrors CondensedIupac.js pattern)
// ---------------------------------------------------------------------------
const getPropertyDescriptor = function(object, descriptor) {
  let retval = null;
  while (!(retval = Object.getOwnPropertyDescriptor(object, descriptor)) && Object.getPrototypeOf(object)) {
    object = Object.getPrototypeOf(object);
  }
  return retval;
};

const anonymous_class = (superclass) => class extends superclass {};

// ---------------------------------------------------------------------------
// Builder — adds a GlycoCT `sequence` setter; preserves any existing getter.
// ---------------------------------------------------------------------------
export const Builder = function(superclass) {
  const getter = (getPropertyDescriptor(superclass.prototype, 'sequence') || { get: null }).get;
  const setter = function(sequence) { build_sequence.call(this, sequence); };
  const methods = {};
  if (getter) methods.get = getter;
  if (setter) methods.set = setter;
  Object.defineProperty(superclass.prototype, 'sequence', methods);
  return class extends superclass {};
};

// ---------------------------------------------------------------------------
// Writer — adds a GlycoCT `sequence` getter; preserves any existing setter.
// ---------------------------------------------------------------------------
export const Writer = function(superclass) {
  const setter = (getPropertyDescriptor(superclass.prototype, 'sequence') || { set: null }).set;
  const getter = function() { return write_sequence.call(this); };
  const methods = {};
  if (getter) methods.get = getter;
  if (setter) methods.set = setter;
  Object.defineProperty(superclass.prototype, 'sequence', methods);
  return class extends superclass {};
};

// ---------------------------------------------------------------------------
// IO — full GlycoCT round-trip (reads GlycoCT, writes GlycoCT).
// ---------------------------------------------------------------------------
export const IO = (superclass) => Builder(Writer(anonymous_class(superclass)));

// ---------------------------------------------------------------------------
// Convenience functions
// ---------------------------------------------------------------------------

// readGlycoCT: GlycoCT setter layered on top of IupacIO so that
// sugar.sequence getter returns IUPAC condensed format.
const _GlycoCTReader = Builder(anonymous_class(IupacIO(Sugar)));

/**
 * Parse a GlycoCT string and return a Sugar whose `.sequence` getter
 * returns the IUPAC condensed sequence.
 *
 * @param {string} text  GlycoCT text (first block used if multi-block)
 * @returns {Sugar}
 */
export function readGlycoCT(text) {
  const sugar = new _GlycoCTReader();
  sugar.sequence = text;
  return sugar;
}

/**
 * Serialise any Sugar to a GlycoCT string.
 *
 * @param {Sugar} sugar
 * @returns {string}
 */
export function writeGlycoCT(sugar) {
  return write_sequence.call(sugar);
}
