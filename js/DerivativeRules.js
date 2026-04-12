import { parseInChI, parseFormula, parseTLayer, inchiToTerminii } from './InChITerminii.js';
import { parse_terminii, make_derivative, C, H, O, N, RemovableAtom } from './Mass.js';

// ---------------------------------------------------------------------------
// DerivativeRule class
// ---------------------------------------------------------------------------

/**
 * A portable rule descriptor — framework-agnostic.
 * Can be converted to a Mass.js Derivative via toMassJsDerivative().
 */
export class DerivativeRule {
  constructor({ name, accepts, delta, scope = 'all', description = '' }) {
    this.name = name;
    // accepts: (atomsArray: Symbol[], positionIndex: number) => boolean
    this.accepts = accepts;
    // delta: Symbol[] | RemovableAtom[]  — atoms to add/remove at each accepted position
    this.delta = delta;
    // scope: 'all' | 'non_reducing' | 'reducing_end_only'
    this.scope = scope;
    this.description = description;
    Object.freeze(this);
  }

  /**
   * Convert to a Mass.js Derivative instance compatible with the existing
   * make_derivative() / Derivative class API in Mass.js.
   *
   * The returned object can be passed directly to:
   *   monosaccharide.derivative = rule.toMassJsDerivative()
   *   sugar.derivatise(rule.toMassJsDerivative())
   */
  toMassJsDerivative() {
    const { name, accepts, delta } = this;
    return make_derivative(name, accepts, delta);
  }

  /**
   * Apply this rule to a terminii Map (as produced by parse_terminii) and return
   * a new Map with the derivatised atom arrays.
   * This is the pure/framework-agnostic version for testing and registry use.
   *
   * @param {Map} ringMap   - Map<int, {atoms: Symbol[], reducing: bool}>
   * @returns {Map}         - new Map with derivatised atoms
   */
  applyToRing(ringMap) {
    const result = new Map();
    let posIdx = 0;
    for (const [pos, entry] of ringMap) {
      const atoms = Array.from(entry.atoms);
      const derivatised = this.accepts(atoms, posIdx + 1)
        ? applyDelta(atoms, this.delta)
        : atoms;
      result.set(pos, { ...entry, atoms: Object.freeze(derivatised) });
      posIdx++;
    }
    return result;
  }
}

// Internal helper: apply an atom delta (add/remove) to an atom array
function applyDelta(atoms, delta) {
  const result = Array.from(atoms);
  for (const item of delta) {
    if (item instanceof RemovableAtom) {
      const idx = result.indexOf(item.atom);
      if (idx >= 0) result.splice(idx, 1);
    } else {
      result.push(item);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Declarative rule construction
// ---------------------------------------------------------------------------

/**
 * Build a DerivativeRule from an explicit predicate + delta.
 *
 * Example — permethylation:
 *   const PERMETHYLATED = makeDeclarativeRule('permethylated', {
 *     accepts: atoms => (atoms.includes(O) && atoms.includes(H))
 *                    || (atoms.includes(N) && atoms.includes(H)),
 *     delta: [C, H, H],
 *   });
 */
export function makeDeclarativeRule(name, { accepts, delta, scope = 'all', description = '' }) {
  return new DerivativeRule({ name, accepts, delta, scope, description });
}

// ---------------------------------------------------------------------------
// Empirical rule construction from InChI pair
// ---------------------------------------------------------------------------

/**
 * Derive a DerivativeRule by comparing two InChI strings for the same monosaccharide.
 *
 * @param {string} name             - Rule name
 * @param {string} baseName         - Monosaccharide name (e.g. 'GlcNAc')
 * @param {string} baseInChI        - InChI of the free (underivatised) monosaccharide
 * @param {string} derivatisedInChI - InChI of the derivatised residue
 * @param {object} [opts]
 * @param {boolean} [opts.residueForm=false]
 *   Set true if derivatisedInChI represents a glycan residue (glycosidic O already
 *   removed). The reducing-end position will be treated differently.
 * @param {object} [registry]       - MonosaccharideRegistry to use for base terminii
 * @returns {{ rule: DerivativeRule, positionDiffs: Array, warnings: string[] }}
 */
export function ruleFromInChIPair(name, baseName, baseInChI, derivatisedInChI, opts = {}, registry = null) {
  const warnings = [];

  // 1. Derive base terminii (from registry if available, else from InChI)
  let baseRing;
  if (registry && registry.has(baseName)) {
    baseRing = registry.getPrototype(baseName).ring;
  } else {
    const { terminii } = inchiToTerminii(baseName, baseInChI);
    baseRing = parse_terminii(terminii);
  }

  // 2. Compute formula delta between base and derivatised
  const baseFormula = parseFormula(parseInChI(baseInChI).formula ?? '');
  const derivFormula = parseFormula(parseInChI(derivatisedInChI).formula ?? '');
  const formulaDelta = diffFormulas(baseFormula, derivFormula);

  // 3. Build per-position diffs by comparing /t layers
  const baseT = parseTLayer(parseInChI(baseInChI).t);
  const derivT = parseTLayer(parseInChI(derivatisedInChI).t);

  // 4. Determine which positions accepted the derivative
  const positionDiffs = [];
  let posIdx = 0;

  for (const [pos, entry] of baseRing) {
    const baseAtoms = Array.from(entry.atoms);
    const tChanged = baseT.get(posIdx + 1) !== derivT.get(posIdx + 1);
    const hasOH = baseAtoms.includes(O) && baseAtoms.includes(H);
    const hasNH = baseAtoms.includes(N) && baseAtoms.includes(H);

    positionDiffs.push({
      position: pos,
      posIndex: posIdx + 1,
      baseAtoms,
      tChanged,
      canAccept: hasOH || hasNH,
      accepted: tChanged || (hasOH || hasNH),
    });
    posIdx++;
  }

  // 5. Distribute the formula delta across accepting positions
  const acceptingCount = positionDiffs.filter(p => p.accepted && p.canAccept).length;
  let perPositionDelta = null;
  let symmetric = true;

  if (acceptingCount > 0) {
    const isEvenlyDivisible = Object.values(formulaDelta).every(v => v % acceptingCount === 0);
    if (isEvenlyDivisible) {
      perPositionDelta = formulaDeltaToAtoms(
        Object.fromEntries(Object.entries(formulaDelta).map(([k, v]) => [k, v / acceptingCount]))
      );
    } else {
      symmetric = false;
      warnings.push(
        `Formula delta ${JSON.stringify(formulaDelta)} is not evenly divisible by ` +
        `${acceptingCount} accepting positions — rule may be position-specific. ` +
        `Falling back to total-delta rule applied once.`
      );
      perPositionDelta = formulaDeltaToAtoms(formulaDelta);
    }
  }

  if (!perPositionDelta || perPositionDelta.length === 0) {
    warnings.push(`Could not determine per-position delta for rule '${name}'.`);
    perPositionDelta = [];
  }

  // 6. Build the rule
  const capturedDelta = perPositionDelta;
  const rule = new DerivativeRule({
    name,
    accepts: (atoms, _posIdx) =>
      (atoms.includes(O) && atoms.includes(H)) ||
      (atoms.includes(N) && atoms.includes(H)),
    delta: capturedDelta,
    scope: symmetric ? 'all' : 'non_reducing',
    description: `Empirically derived from InChI pair for ${baseName}. ` +
                 `Formula delta: ${JSON.stringify(formulaDelta)}. ` +
                 (symmetric ? 'Symmetric.' : 'Asymmetric — check position specificity.'),
  });

  return { rule, positionDiffs, symmetric, formulaDelta, warnings };
}

/** Compare two formula dicts, returning signed deltas. */
function diffFormulas(base, deriv) {
  const delta = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(deriv)]);
  for (const k of keys) {
    const d = (deriv[k] ?? 0) - (base[k] ?? 0);
    if (d !== 0) delta[k] = d;
  }
  return delta;
}

/**
 * Convert a signed formula delta dict to a Mass.js atom delta array.
 * Positive values → push atoms. Negative values → push RemovableAtom wrappers.
 * e.g. { C: 1, H: 2 } → [C, H, H]  (permethylation per position)
 */
function formulaDeltaToAtoms(delta) {
  const ATOM_MAP = { C, H, O, N };
  const result = [];
  for (const [elem, count] of Object.entries(delta)) {
    const atom = ATOM_MAP[elem];
    if (!atom) continue;
    if (count > 0) {
      for (let i = 0; i < count; i++) result.push(atom);
    } else {
      for (let i = 0; i < Math.abs(count); i++) result.push(new RemovableAtom(atom));
    }
  }
  return result;
}
