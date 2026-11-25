/**
 * Derives real axial/equatorial stereochemistry, AND real Haworth-projection
 * up/down orientation, for pyranose ring positions directly from an InChI
 * string's connectivity (/c) and stereo (/t, /m) layers, using the rule
 * given in the InChI Technical Manual v1.04 (p.39-40):
 *
 *   "Tetrahedral parity is '+' if the canonical numbers of neighbors
 *    increase clockwise when observed from a hydrogen atom or an atom that
 *    has the smallest canonical number."
 *
 * Unlike a fixed "InChI atom N is always ring position X" lookup table (which
 * only holds for one specific canonical-numbering convention), this walks
 * the actual bond graph to find the ring and the anomeric carbon, then
 * resolves the parity sign against an idealized 3D chair built from that
 * walk — so it works for any standard InChI of a pyranose, regardless of
 * how that particular molecule happened to get numbered.
 *
 * Two genuinely different things are derived here, and they need two
 * genuinely different corrections for a ring shape's own numbering quirks
 * and for D/L series — conflating them (as an earlier version of this
 * module did) silently breaks one of them:
 *
 *  - Axial/equatorial is a LOCAL, chair-relative descriptor, invariant under
 *    full D/L mirroring (confirmed repeatedly below) — D-glucose and its
 *    true mirror image, L-glucose, are BOTH all-equatorial; GlcA and its C5
 *    epimer IdoA share the same C2/C3/C4 classification and differ only at
 *    the epimerised C5. The only correction this needs is a FIXED, per-ring-
 *    shape one (see needsShapeCorrection below) having nothing to do with
 *    D/L at all — it compensates for how a given shape's own exocyclic
 *    branching happens to interact with InChI's canonical atom numbering.
 *  - Haworth up/down is an ABSOLUTE-ORIENTATION fact: true enantiomers drawn
 *    in the SAME fixed ring frame (ring-O at the same corner for D and L
 *    alike, as both this module and standard textbook/Wikipedia Haworth
 *    drawings do) must have EVERY position inverted, not just some —
 *    confirmed against real alpha/beta-D- and alpha/beta-L-fucopyranose
 *    (independently fetched InChI for both, AND cross-checked against the
 *    published beta-L-fucopyranose Haworth structure) and against
 *    synthetic/real D-glucose vs L-glucose (same /t, only /m differs, per
 *    PubChem). This needs its own correction, independent of the ax/eq one:
 *    negate whenever being the "other" enantiomer (mLayer==='0') doesn't
 *    already coincide with the shape correction having been applied — see
 *    deriveHaworthOrientation.
 *
 * A seemingly obvious shortcut — "just flip whenever mLayer==='0'", applied
 * to ax/eq instead of (or in addition to) Haworth — was tried first and is
 * WRONG: GlcA and IdoA are both /m0 (they're C5 epimers of each other, NOT
 * an InChI same-/t-flip-/m enantiomer pair), so gating the shape correction
 * on /m there would have been a no-op either way — nothing exposed the bug
 * until a true full-enantiomer pair of the SAME skeleton (D-glucose vs
 * L-glucose, or D- vs L-fucopyranose) was checked, which an earlier version
 * of this module never did.
 */

export class Vec3 {
  constructor(x, y, z) {
    this.x = x; this.y = y; this.z = z;
  }
  add(o) { return new Vec3(this.x + o.x, this.y + o.y, this.z + o.z); }
  sub(o) { return new Vec3(this.x - o.x, this.y - o.y, this.z - o.z); }
  scale(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
  neg() { return new Vec3(-this.x, -this.y, -this.z); }
  dot(o) { return this.x * o.x + this.y * o.y + this.z * o.z; }
  cross(o) {
    return new Vec3(
      this.y * o.z - this.z * o.y,
      this.z * o.x - this.x * o.z,
      this.x * o.y - this.y * o.x
    );
  }
  norm() { return Math.sqrt(this.dot(this)); }
  unit() { const n = this.norm(); return new Vec3(this.x / n, this.y / n, this.z / n); }
}

/**
 * Parse an InChI /c (connection table) layer into an adjacency map
 * Map<atomNumber, Set<atomNumber>>.
 *
 * A parenthesized group can hold several comma-separated branches off the
 * SAME atom (e.g. "11(20,10(18)19)" -- atom 11 bonded to 20 AND, separately,
 * to 10, not atom 20 bonded to 10). A comma resets the current chain back
 * to that group's branch point rather than continuing from whatever atom
 * the previous branch ended on.
 */
export function parseCLayer(c) {
  const tokens = c.match(/\d+|\(|\)|,/g) || [];
  const adj = new Map();
  const bond = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  let pos = 0;
  const parseChain = (branchPoint) => {
    let last = branchPoint;
    while (pos < tokens.length) {
      const tok = tokens[pos];
      if (tok === ')') return last;
      if (tok === ',') {
        pos += 1;
        last = branchPoint; // new parallel branch off the same atom
        continue;
      }
      if (tok === '(') {
        pos += 1;
        parseChain(last);
        if (pos < tokens.length && tokens[pos] === ')') pos += 1;
        continue;
      }
      const atom = parseInt(tok, 10);
      pos += 1;
      if (last !== null) bond(last, atom);
      last = atom;
    }
    return last;
  };
  parseChain(null);
  return adj;
}

/**
 * Standard InChI canonical numbering: carbon atoms first, then other
 * elements in increasing atomic-number order. Returns Map<element, Set<atomNumber>>.
 */
export function elementRanges(formula) {
  const counts = {};
  for (const m of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const [, elem, n] = m;
    if (elem) counts[elem] = (counts[elem] ?? 0) + (n ? parseInt(n, 10) : 1);
  }
  const order = ['C', 'N', 'O', 'S', 'P'];
  const ranges = new Map();
  let i = 1;
  for (const el of order) {
    const n = counts[el] ?? 0;
    if (n) {
      const set = new Set();
      for (let k = 0; k < n; k++) set.add(i + k);
      ranges.set(el, set);
      i += n;
    }
  }
  return ranges;
}

/** Depth-first search for a simple cycle of exactly `size` atoms. */
function findRing(adj, size) {
  for (const start of adj.keys()) {
    const stack = [[start, [start], new Set([start])]];
    while (stack.length) {
      const [node, path, visited] = stack.pop();
      if (path.length > size) continue;
      for (const nxt of adj.get(node)) {
        if (nxt === start && path.length === size) return path;
        if (!visited.has(nxt)) {
          stack.push([nxt, [...path, nxt], new Set([...visited, nxt])]);
        }
      }
    }
  }
  return null;
}

/**
 * Walk a pyranose/furanose ring from its anomeric carbon (the ring-oxygen
 * neighbor that itself carries an exocyclic oxygen) around to the other
 * ring-oxygen neighbor. Returns { order, ringO, adj } where order[0] is the
 * anomeric carbon (sugar position C1), order[1] is C2, etc. — purely from
 * connectivity, independent of any particular canonical-numbering convention.
 */
export function ringWalk(inchiLayers, ringSize = 6) {
  const adj = parseCLayer(inchiLayers.c);
  const ranges = elementRanges(inchiLayers.formula);
  const oAtoms = ranges.get('O') ?? new Set();

  const ring = findRing(adj, ringSize);
  if (!ring) return null;
  const ringSet = new Set(ring);
  const ringO = ring.find((a) => oAtoms.has(a));
  if (ringO === undefined) return null;

  const oNeighbors = [...adj.get(ringO)].filter((n) => ringSet.has(n));
  let anomeric;
  for (const cand of oNeighbors) {
    const exo = [...adj.get(cand)].filter((n) => !ringSet.has(n));
    if (exo.some((n) => oAtoms.has(n))) anomeric = cand;
  }
  if (anomeric === undefined) return null;

  const order = [anomeric];
  let prevAtom = ringO;
  let cur = anomeric;
  while (order.length < ring.length) {
    const nxt = [...adj.get(cur)].find((n) => ringSet.has(n) && n !== prevAtom);
    if (nxt === undefined) return null;
    order.push(nxt);
    prevAtom = cur;
    cur = nxt;
  }
  return { order, ringO, adj };
}

/**
 * Whether this ring shape's own InChI canonical numbering needs a fixed
 * correction when matching a predicted tetrahedral parity against the real
 * one -- see the module docstring: this is NOT about D/L series at all
 * (deriveHaworthOrientation handles that separately), it's a per-shape
 * structural constant. `order` ends with the ring oxygen (ringWalk's own
 * convention), so `order` at index `length - 2` is the last ring *carbon*
 * (ring position 5 for a pyranose): the one bonded to the ring oxygen on
 * the non-anomeric side.
 *
 * Found by cross-checking ax/eq (which must be IDENTICAL between true
 * enantiomers -- confirmed repeatedly: D/L-glucose, D/L-galactose, D/L-
 * fucopyranose, D/L-gulose, D/L-arabinose, all independently fetched from
 * PubChem) rather than guessed at or assumed by default:
 *  1. A ketose anomeric center (two exocyclic heavy neighbors -- an OH and
 *     an exocyclic carbon chain, e.g. sialic acids) instead of the usual
 *     aldose pattern (one exocyclic O plus an H): no correction needed.
 *     Validated against Neu5Ac's well-documented 2C5 conformation
 *     (equatorial C4/C5/C6, axial anomeric COOH) -- this does NOT reduce to
 *     case 2 below: sialic acid's own C5-equivalent position (ring position
 *     5 here) has a *branching* exocyclic chain (C7-C8-C9), the same shape
 *     as a plain hexose's CH2OH, yet still needs no correction, so the
 *     ketose anomeric center is a genuinely separate reason, not the same
 *     one.
 *  2. Ring position 5's exocyclic substituent BRANCHES into two or more
 *     further heavy-atom neighbors (a uronic acid's COOH, bonded to two
 *     oxygens) -- needs the correction. A single terminal atom (a
 *     deoxyhexose's CH3), a simple unbranched chain (a plain hexose's
 *     CH2OH, one further oxygen), or no exocyclic group at all (a pentose):
 *     no correction needed. This distinction -- branching vs. not -- is
 *     what actually separates HexA from Hex/HexN/HexNAc/dHex/pentose; an
 *     earlier version of this function only checked "any further atom at
 *     all" (`length > 0`), which put HexA and plain Hex/HexN/HexNAc in the
 *     same bucket. That bucketing was never actually wrong for the ax/eq
 *     values it was checked against (D-series Hex/HexN/HexNAc, and HexA's
 *     own D/L-labeled-but-not-enantiomeric GlcA/IdoA pair, both /m0) --
 *     it just happened to coincide with gating this per-shape correction on
 *     `mLayer==='0'`, which was ALSO never exercised for Hex/HexN/HexNAc
 *     with a genuine m=0 case until a true full-enantiomer pair (L-glucose)
 *     was checked, and was wrong.
 *
 * None of this is claimed to be *the* universal invariant -- InChI's own
 * canonical atom numbering is an artifact of its algorithm (Technical
 * Manual), not something guaranteed to reduce to a simple local graph
 * feature in general. This is what's been found and validated so far; a
 * future ring shape may need a different rule, and per the lessons above,
 * what it takes to find out is an independently-fetched, identity-verified
 * TRUE FULL ENANTIOMER of an already-validated shape (same /t, opposite
 * /m) -- not a related-but-different compound (an epimer, a deoxygenated
 * relative), and not just assuming a D-series example generalizes.
 */
function needsShapeCorrection(order, adj) {
  const ringSet = new Set(order);

  const anomericAtom = order[0];
  const anomericExo = [...adj.get(anomericAtom)].filter((a) => !ringSet.has(a));
  if (anomericExo.length > 1) return false; // case 1: ketose anomeric center

  const c5Atom = order[order.length - 2];
  const exo = [...adj.get(c5Atom)].filter((a) => !ringSet.has(a));
  if (exo.length === 0) return false; // no exocyclic group at all (pentose)
  const exoNeighbors = [...adj.get(exo[0])].filter((a) => a !== c5Atom);
  return exoNeighbors.length > 1; // case 2: a BRANCHING group (COOH) vs. a terminal atom or simple chain (CH3/CH2OH)
}

/**
 * Public wrapper: does this residue's ring shape need the fixed per-shape
 * correction at all? Exposed so callers computing their own D/L-dependent
 * logic outside this module (e.g. HaworthLayout.js's anomeric-position-1
 * orientation, which the type-level InChI leaves undefined and so can't go
 * through deriveHaworthOrientation directly) stay consistent with it,
 * rather than independently assuming every L-series residue mirrors a
 * D-series one the same way. Returns null if the ring can't be identified.
 */
export function shapeNeedsMirrorFlip(layers, ringSize = 6) {
  const walk = ringWalk(layers, ringSize);
  if (!walk) return null;
  return needsShapeCorrection(walk.order, walk.adj);
}

/** Idealized chair: ring atoms on a hexagon, alternating +/- z. Exported
 * for ChairLayout.js's own reuse (the same idealized 3D positions,
 * projected to 2D for an actual chair drawing, rather than just used
 * internally here to resolve ax/eq and up/down). */
export function buildChair(nRing) {
  const pos = [];
  const R = 1.4;
  for (let i = 0; i < nRing; i++) {
    const angle = i * (2 * Math.PI / nRing);
    const z = i % 2 === 0 ? 0.25 : -0.25;
    pos.push(new Vec3(R * Math.cos(angle), R * Math.sin(angle), z));
  }
  return pos;
}

/** Given a tetrahedral center and its two ring-bond directions, construct
 * the other two (axial, equatorial) idealized bond directions. Exported for
 * ChairLayout.js's own reuse: applied there to a chair drawing's OWN real
 * (hand-drawn) ring-vertex positions, rather than this module's own
 * ring-on-a-flat-circle approximation (see buildChair) -- the same pure
 * tetrahedral-geometry step, just fed different ring-bond vectors. */
export function tetrahedralOtherTwo(center, prevPos, nextPos) {
  const u1 = prevPos.sub(center).unit();
  const u2 = nextPos.sub(center).unit();
  let bis = u1.add(u2);
  bis = bis.norm() < 1e-8 ? new Vec3(0, 0, 1) : bis.unit();
  const perp = u1.cross(u2).unit();
  const theta = (54.75 * Math.PI) / 180;
  const v1 = bis.neg().scale(Math.cos(theta)).add(perp.scale(Math.sin(theta)));
  const v2 = bis.neg().scale(Math.cos(theta)).sub(perp.scale(Math.sin(theta)));
  let axial = v1.unit();
  let equatorial = v2.unit();
  if (Math.abs(axial.z) < Math.abs(equatorial.z)) {
    [axial, equatorial] = [equatorial, axial];
  }
  return { axial, equatorial };
}

/** '+' if ordered_dirs (ascending canonical-number order) appear clockwise
 * viewed from the H position, per the InChI Technical Manual rule. */
function clockwiseSign(hDir, orderedDirs) {
  const viewAxis = hDir.neg();
  const proj = (v) => v.sub(viewAxis.scale(v.dot(viewAxis)));
  const [a, b, c] = orderedDirs.map(proj);
  const total = a.cross(b).add(b.cross(c)).add(c.cross(a));
  return total.dot(viewAxis) < 0 ? '+' : '-';
}

/**
 * Core derivation shared by deriveAxialEquatorial and deriveHaworthOrientation:
 * identifies whether the real exocyclic substituent at a ring position sits
 * at the idealized chair's axial or equatorial direction, and that
 * direction's z-component (sign of height above/below the idealized ring
 * plane) in this module's own chair-building convention.
 *
 * Returns null if the ring/anomeric center can't be identified, or the
 * position isn't a defined stereocentre.
 */
function resolveRingSubstituent(layers, tLayerMap, sugarPosition, ringSize) {
  const walk = ringWalk(layers, ringSize);
  if (!walk) return null;
  const { order, ringO, adj } = walk;
  const n = order.length;
  const idx = sugarPosition - 1;
  if (idx < 0 || idx >= n) return null;

  const atom = order[idx];
  const sign = tLayerMap.get(atom);
  if (sign === undefined || sign === '?') return null;

  const ringSet = new Set([...order, ringO]);
  const exo = [...adj.get(atom)].filter((a) => !ringSet.has(a));
  if (exo.length !== 1) return null;
  const exoAtom = exo[0];

  const prevAtom = idx > 0 ? order[idx - 1] : ringO;
  const nextAtom = idx < n - 1 ? order[idx + 1] : ringO;

  const chair = buildChair(n + 1);
  const chairPos = new Map();
  order.forEach((a, i) => chairPos.set(a, chair[i]));
  chairPos.set(ringO, chair[n]);

  const center = chairPos.get(atom);
  const prevP = chairPos.get(prevAtom);
  const nextP = chairPos.get(nextAtom);
  const { axial, equatorial } = tetrahedralOtherTwo(center, prevP, nextP);

  const heavy = [prevAtom, nextAtom, exoAtom].slice().sort((a, b) => a - b);
  const dirOf = new Map([
    [prevAtom, prevP.sub(center).unit()],
    [nextAtom, nextP.sub(center).unit()],
  ]);

  // Fixed per-shape correction (see needsShapeCorrection) -- NOT gated by
  // /m. Only deriveHaworthOrientation needs an /m-based correction, and it
  // needs its own, separate one (see its own docstring).
  const flip = needsShapeCorrection(order, adj);
  const applyFlip = (s) => (flip ? (s === '+' ? '-' : '+') : s);

  dirOf.set(exoAtom, axial);
  const predictedAxial = applyFlip(clockwiseSign(equatorial, heavy.map((a) => dirOf.get(a))));
  if (predictedAxial === sign) return { axEq: 'ax', z: axial.z };

  dirOf.set(exoAtom, equatorial);
  const predictedEquatorial = applyFlip(clockwiseSign(axial, heavy.map((a) => dirOf.get(a))));
  if (predictedEquatorial === sign) return { axEq: 'eq', z: equatorial.z };

  return null;
}

/**
 * Derive 'ax' | 'eq' | null for a given 1-based sugar ring position
 * (2=C2, 3=C3, 4=C4, ...) from a parsed InChI (layers from parseInChI) and
 * its /t map (from parseTLayer). Returns null if the ring/anomeric center
 * can't be identified, or the position isn't a defined stereocentre.
 */
export function deriveAxialEquatorial(layers, tLayerMap, sugarPosition, ringSize = 6) {
  const r = resolveRingSubstituent(layers, tLayerMap, sugarPosition, ringSize);
  return r ? r.axEq : null;
}

/**
 * Derive 'up' | 'down' | null: which face of the ring the real exocyclic
 * substituent sits on in a standard Haworth projection, for a given 1-based
 * sugar ring position. Unlike axial/equatorial (which alternates with
 * conformation), Haworth orientation is the conformation-independent fact
 * of which ring face a substituent occupies -- but it is NOT the same
 * partition as axial/equatorial either (e.g. all-equatorial D-glucose still
 * alternates down/up/down/up around its ring in a Haworth projection).
 *
 * This reads the z-component of this module's own idealized chair (the
 * same one deriveAxialEquatorial uses) for whichever direction (axial or
 * equatorial) matches the real substituent, then negates it -- that single
 * negation is this module's own fixed viewing-convention constant, and is
 * NOT a per-molecule or D/L correction.
 *
 * The D/L correction IS still needed here, separately from ax/eq's fixed
 * per-shape one: axial/equatorial is a local, chair-relative descriptor
 * (invariant between true enantiomers, confirmed repeatedly -- see the
 * module docstring), but Haworth up/down is an absolute-orientation fact,
 * and true enantiomers drawn in the SAME fixed ring frame (ring-O at the
 * same corner for D and L, as both this module and standard Haworth
 * drawings do) genuinely must have EVERY position inverted. Since this
 * module's chair is built identically regardless of /m, that inversion has
 * to be applied explicitly -- but only when it hasn't ALREADY happened as a
 * side effect of ax/eq's own shape correction (which, when it applies,
 * swaps which direction -- axial vs equatorial -- counts as "the real
 * substituent", and that swap already changes the resulting z sign on its
 * own). Hence the XOR: negate when being the "other" enantiomer
 * (mLayer==='0') doesn't already coincide with the shape correction having
 * fired. Confirmed against independently-fetched real InChI for D/L pairs
 * across every ring shape tested (D/L-glucose, D/L-galactose, D/L-
 * fucopyranose -- the latter cross-checked against the published
 * beta-L-fucopyranose Haworth structure too -- and GlcA/IdoA, which are
 * NOT such a pair -- both /m0 -- and correctly need no extra negation).
 */
export function deriveHaworthOrientation(layers, tLayerMap, sugarPosition, ringSize = 6) {
  const r = resolveRingSubstituent(layers, tLayerMap, sugarPosition, ringSize);
  if (!r) return null;
  const walk = ringWalk(layers, ringSize);
  const shapeFlip = walk ? needsShapeCorrection(walk.order, walk.adj) : false;
  const mLayer = layers.m ?? '1';
  const extraNegate = (mLayer === '0') !== shapeFlip;
  const z = extraNegate ? -r.z : r.z;
  return -z > 0 ? 'up' : 'down';
}
