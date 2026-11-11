/**
 * GlycanClass.js — classify a glycan by its structural type, from its
 * reducing-end core.
 *
 *   classifyGlycan(sugar) → { family, type, label }
 *
 *   family  'N' | 'O-GalNAc' | 'O-Man' | 'O-Fuc' | 'O-Glc' | 'O-GlcNAc' |
 *           'O-Xyl' | 'Lac' | 'other'
 *   type    within the family: N: 'high-mannose', 'hybrid', 'complex',
 *           'paucimannose', 'truncated'; O-GalNAc: 'Tn', 'core 1' … 'core 8';
 *           O-Man: 'core M0' … 'core M3'; otherwise null
 *   label   for display, e.g. 'Complex N-glycan', 'O-GalNAc core 2'
 *
 * Linkages are read when given and tolerated when unknown (?): a residue
 * with an unknown linkage is placed by what it is, so topology-only
 * structures still classify. Sialic acids, fucose, sulfate and phosphate are
 * capping/decoration and never decide a core. One pass over the residues,
 * O(residues).
 */

const DECORATION = new Set(['NeuAc', 'NeuGc', 'Neu5Ac', 'Neu5Gc', 'Kdn', 'Sia', 'Fuc', 'HSO3', 'S', 'P', 'PO3', 'Me', 'Ac']);

const childrenOf = (residue) => residue.children.map((child) => ({
  child,
  id: child.identifier,
  link: residue.linkageOf(child) || 0,      // 0: unknown
}));

const core = (residue) => childrenOf(residue).filter(({ id }) => !DECORATION.has(id));

/** The child with this identifier at this position; an unknown position matches any. */
const at = (kids, id, position) => kids.find((k) => k.id === id && (k.link === position || k.link === 0));

const N_LABELS = {
  'high-mannose': 'High-mannose N-glycan',
  hybrid: 'Hybrid N-glycan',
  complex: 'Complex N-glycan',
  paucimannose: 'Paucimannose N-glycan',
  truncated: 'Truncated N-glycan core',
};

/**
 * N-glycans: GlcNAc(b1-4)GlcNAc, then the β-mannose and its two arms.
 * An antenna is any non-mannose, non-decoration residue on an arm mannose
 * (GlcNAc usually). High-mannose: no antennae, more than three mannoses.
 * Hybrid: antennae on one arm, extra mannoses on the other. Complex:
 * antennae, and no arm carries extra mannoses without them. Paucimannose:
 * at most the three core mannoses (± Fuc/Xyl), no antennae.
 */
const classifyN = (root) => {
  const chitobiose = at(core(root), 'GlcNAc', 4);
  if (!chitobiose) return null;
  const betaMan = at(core(chitobiose.child), 'Man', 4);
  if (!betaMan) return 'truncated';
  const arms = core(betaMan.child).filter(({ id, link }) => id === 'Man' && link !== 4);
  let antennae = 0;
  let extraMan = 0;
  const armHas = arms.map(({ child }) => {
    const kids = core(child);
    const antenna = kids.some(({ id }) => id !== 'Man');
    const mannoses = kids.some(({ id }) => id === 'Man');
    if (antenna) antennae++;
    return { antenna, mannoses };
  });
  for (const residue of walk(betaMan.child)) if (residue.identifier === 'Man') extraMan++;
  extraMan -= 1 + arms.length;   // beyond the β-mannose and its arm mannoses
  if (!antennae) return extraMan > 0 ? 'high-mannose' : 'paucimannose';
  return armHas.some(({ antenna, mannoses }) => !antenna && mannoses) ? 'hybrid' : 'complex';
};

/**
 * O-GalNAc cores, from what sits on the GalNAc's 3 and 6 positions.
 * core 1 Gal(b1-3); 2 Gal(b1-3) + GlcNAc(b1-6); 3 GlcNAc(b1-3);
 * 4 GlcNAc(b1-3) + GlcNAc(b1-6); 5 GalNAc(a1-3); 6 GlcNAc(b1-6);
 * 7 GalNAc(a1-6); 8 Gal(a1-3); Tn: nothing but decoration (sialyl-Tn too).
 */
const classifyOGalNAc = (root) => {
  const kids = core(root);
  const three = kids.find(({ link }) => link === 3) ?? kids.find(({ link, id }) => link === 0 && id !== 'GlcNAc')
    ?? (kids.length > 1 ? kids.find(({ link }) => link === 0) : null);
  const six = kids.find((k) => k !== three && (k.link === 6 || k.link === 0));
  const id3 = three?.id;
  const id6 = six?.id;
  if (id3 === 'Gal') {
    if (three.child.anomer === 'a') return 'core 8';
    return id6 === 'GlcNAc' ? 'core 2' : 'core 1';
  }
  if (id3 === 'GlcNAc') return id6 === 'GlcNAc' ? 'core 4' : 'core 3';
  if (id3 === 'GalNAc') return 'core 5';
  if (id6 === 'GlcNAc') return 'core 6';
  if (id6 === 'GalNAc') return 'core 7';
  return kids.length ? null : 'Tn';
};

/**
 * O-Man cores: M0 mannose alone (or only decorated), M1 GlcNAc(b1-2),
 * M2 GlcNAc(b1-2) + GlcNAc(b1-6), M3 GlcNAc(b1-4) (carrying GalNAc(b1-3)).
 */
const classifyOMan = (root) => {
  const kids = core(root);
  const glcnacs = kids.filter(({ id }) => id === 'GlcNAc');
  if (!kids.length) return 'core M0';
  if (glcnacs.some(({ link }) => link === 4)) return 'core M3';
  if (glcnacs.length >= 2) return 'core M2';
  if (glcnacs.length === 1) return 'core M1';
  return null;
};

function* walk(start) {
  const queue = [start];
  while (queue.length) {
    const residue = queue.shift();
    yield residue;
    queue.push(...residue.children);
  }
}

const FAMILY_LABELS = {
  'O-Fuc': 'O-Fuc glycan',
  'O-Glc': 'O-Glc glycan',
  'O-GlcNAc': 'O-GlcNAc',
  'O-Xyl': 'GAG linkage (O-Xyl)',
  Lac: 'Lactose-based (glycolipid / milk)',
  other: 'Other',
};

/**
 * The structural class of a glycan (see the module comment).
 * @param {Sugar} sugar
 * @returns {{family: string, type: string|null, label: string}}
 */
export function classifyGlycan(sugar) {
  const root = sugar?.root;
  if (!root) return { family: 'other', type: null, label: FAMILY_LABELS.other };
  const id = root.identifier;
  if (id === 'GlcNAc') {
    const type = classifyN(root);
    if (type) return { family: 'N', type, label: N_LABELS[type] };
    if (!core(root).length) return { family: 'O-GlcNAc', type: null, label: FAMILY_LABELS['O-GlcNAc'] };
  }
  if (id === 'GalNAc') {
    const type = classifyOGalNAc(root);
    return { family: 'O-GalNAc', type, label: type ? `O-GalNAc ${type}` : 'O-GalNAc glycan' };
  }
  if (id === 'Man') {
    const type = classifyOMan(root);
    return { family: 'O-Man', type, label: type ? `O-Man ${type}` : 'O-Man glycan' };
  }
  if (id === 'Glc' && at(core(root), 'Gal', 4)) return { family: 'Lac', type: null, label: FAMILY_LABELS.Lac };
  const family = { Fuc: 'O-Fuc', Glc: 'O-Glc', Xyl: 'O-Xyl' }[id] ?? 'other';
  return { family, type: null, label: FAMILY_LABELS[family] };
}

export default classifyGlycan;
