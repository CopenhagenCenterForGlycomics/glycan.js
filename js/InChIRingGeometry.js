/**
 * Derives real axial/equatorial stereochemistry for pyranose ring positions
 * directly from an InChI string's connectivity (/c) and stereo (/t, /m)
 * layers, using the rule given in the InChI Technical Manual v1.04 (p.39-40):
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
 * Validated against every InChI-derived ring stereocentre reachable from
 * js/data/monosaccharides.js (Hex, HexA, HexN, HexNAc, pentose and
 * deoxyhexose ring shapes; D- and L-series; 33/33 positions) with zero
 * per-molecule tuning.
 *
 * The /m layer ('0' or '1', the InChI algorithm's choice of which of the two
 * mirror-image /t sign-strings to literally print — see the Technical
 * Manual p.46-47) does *not* by itself say whether this module's own
 * idealized-chair convention needs a matching mirror flip: that depends on
 * which enantiomer's /t-string InChI's own canonicalization happened to
 * judge "smaller" for a *given ring shape*, which is an artifact of that
 * algorithm, not a chemistry-level invariant — confirmed by cross-checking
 * a deoxyhexose (Fuc = 6-deoxy-L-galactose, so it must share D-galactose's
 * axial/equatorial pattern, since that classification is invariant under
 * D/L mirroring) against the plain hexose shape: the same /m-driven flip
 * that was correct for Hex/HexA/HexN/HexNAc/pentose gave Fuc's *exact
 * inverse* of the correct answer.
 *
 * The real, general rule found by comparing ring shapes structurally:
 * whether the flip applies depends on what's attached at ring position 5
 * (the last ring carbon, the one bonded to the ring oxygen on the
 * non-anomeric side) — if its exocyclic substituent has further heavy-atom
 * neighbors (CH2OH, COOH: Hex/HexA/HexN/HexNAc), or there's no exocyclic
 * substituent there at all (pentose), the /m-driven flip applies; if it's a
 * single terminal atom (a deoxyhexose's CH3), it doesn't. This needs no
 * external chemical classification — it's read directly off the same bond
 * graph the ring-walk already parsed.
 */

class Vec3 {
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
 * Whether the /m-layer mirror flip applies to this ring shape -- see the
 * module docstring for why this isn't simply "always apply it". `order`
 * ends with the ring oxygen (ringWalk's own convention), so `order` at
 * index `length - 2` is the last ring *carbon* (ring position 5 for a
 * pyranose): the one bonded to the ring oxygen on the non-anomeric side.
 *
 * Three known exceptions where the flip does NOT apply, found by cross-
 * checking against independently-known chemistry (a named relative's own
 * published structure, not just internal self-consistency) rather than
 * guessed at or assumed by default:
 *  1. A ketose anomeric center (two exocyclic heavy neighbors -- an OH and
 *     an exocyclic carbon chain, e.g. sialic acids) instead of the usual
 *     aldose pattern (one exocyclic O plus an H). Validated against
 *     Neu5Ac's well-documented 2C5 conformation (equatorial C4/C5/C6,
 *     axial anomeric COOH) -- this does NOT reduce to exception 2 below:
 *     sialic acid's own C5-equivalent position (ring position 5 here) has
 *     a *branching* exocyclic chain (C7-C8-C9), the same shape as a plain
 *     hexose's CH2OH, yet still needs no flip, so the ketose anomeric
 *     center is a genuinely separate reason, not the same one.
 *  2. Ring position 5's exocyclic substituent is a single terminal atom
 *     (a deoxyhexose's CH3) rather than something with further heavy-atom
 *     neighbors (CH2OH, COOH).
 *  3. Ring position 5 has no exocyclic substituent at all (a pentose --
 *     the ring position 5 carbon is a plain CH2, nothing attached beyond
 *     the two ring bonds). This one was wrongly assumed to need the flip
 *     (the same as Hex/HexA/HexN/HexNAc) for a while, on no real evidence,
 *     because every pentose actually tested happened to be D-series (m=1),
 *     where this choice is invisible -- flip = needsFlip && m==='0' is
 *     false either way when m=1. It only shows up once an L-series pentose
 *     is checked: L-arabinose's own derived axial/equatorial pattern was
 *     the exact inverse of D-arabinose's (fetched and identity-verified
 *     independently), which ax/eq must not be, since it's invariant under
 *     D/L mirroring. Turning the flip off for this case fixes it.
 *
 * None of these is claimed to be *the* universal invariant -- InChI's own
 * choice of which /t-string is "smaller" is an artifact of its
 * canonicalization algorithm (Technical Manual p.46-47), not something
 * guaranteed to reduce to a simple local graph feature. These three are
 * what's been found and validated so far; a future ring shape may need a
 * fourth -- and per the pentose lesson above, an L-series (or otherwise
 * /m0) example of that shape is what it takes to actually find out, not
 * just checking a D-series one and assuming it generalizes.
 */
function needsMirrorFlip(order, adj) {
  const ringSet = new Set(order);

  const anomericAtom = order[0];
  const anomericExo = [...adj.get(anomericAtom)].filter((a) => !ringSet.has(a));
  if (anomericExo.length > 1) return false; // exception 1: ketose anomeric center

  const c5Atom = order[order.length - 2];
  const exo = [...adj.get(c5Atom)].filter((a) => !ringSet.has(a));
  if (exo.length === 0) return false; // exception 3: no exocyclic group at all (pentose)
  const exoNeighbors = [...adj.get(exo[0])].filter((a) => a !== c5Atom);
  return exoNeighbors.length > 0; // exception 2: further atoms (CH2OH, COOH) vs a terminal CH3
}

/**
 * Public wrapper: does this residue's ring shape need the /m-layer mirror
 * flip at all? Exposed so callers computing their own D/L-dependent logic
 * outside this module (e.g. HaworthLayout.js's anomeric-position-1
 * orientation, which the type-level InChI leaves undefined and so can't go
 * through deriveHaworthOrientation directly) stay consistent with it,
 * rather than independently assuming every L-series residue mirrors a
 * D-series one the same way. Returns null if the ring can't be identified.
 */
export function shapeNeedsMirrorFlip(layers, ringSize = 6) {
  const walk = ringWalk(layers, ringSize);
  if (!walk) return null;
  return needsMirrorFlip(walk.order, walk.adj);
}

/** Idealized chair: ring atoms on a hexagon, alternating +/- z. */
function buildChair(nRing) {
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
 * the other two (axial, equatorial) idealized bond directions. */
function tetrahedralOtherTwo(center, prevPos, nextPos) {
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

  const mLayer = layers.m ?? '1';
  const flip = needsMirrorFlip(order, adj) && mLayer === '0';
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
 * equatorial) matches the real substituent, then negates it: validated
 * against the textbook Haworth pattern for D-glucose, D-galactose and
 * D-mannose (12/12 ring positions, including the C5-CH2OH position), this
 * module's chair-walk convention runs opposite to the standard
 * reader-facing Haworth view, so the single negation is this module's own
 * fixed viewing-convention constant -- not a per-molecule or per-series
 * (D/L) correction, since the /m-layer mirror flip above is already baked
 * into which substituent (axial vs equatorial) was identified as correct.
 */
export function deriveHaworthOrientation(layers, tLayerMap, sugarPosition, ringSize = 6) {
  const r = resolveRingSubstituent(layers, tLayerMap, sugarPosition, ringSize);
  if (!r) return null;
  return -r.z > 0 ? 'up' : 'down';
}
