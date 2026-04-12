import { parse_terminii, parse_composition, DEFINITIONS } from './Mass.js';

/**
 * A registry entry for one monosaccharide.
 * `ring` is the same Map structure that parse_terminii produces.
 * `composition` is the atom array that parse_composition produces.
 * `inchi` is stored for provenance and for derivative diffing.
 * `conformation` records which chair was assumed ('4C1', '1C4', '2C5', 'envelope').
 */
export class MonosaccharideEntry {
  constructor({ name, type, ring, composition, inchi = null, conformation = '4C1', source = 'hardcoded' }) {
    this.name = name;
    this.type = type ?? null;
    this.ring = ring;           // Map<int, {atoms, reducing}>  (same as Mass.js)
    this.composition = composition;
    this.inchi = inchi;
    this.conformation = conformation;
    this.source = source;       // 'hardcoded' | 'inchi' | 'manual'
    Object.freeze(this);
  }
}

export class MonosaccharideRegistry {
  #entries = new Map();

  /**
   * Populate from the existing DEFINITIONS string in Mass.js.
   * This is the bootstrap step and produces the same result as the current
   * read_definitions() function.
   */
  loadFromDefinitions(definitionsString) {
    for (const block of definitionsString.replace(/^\n/, '').split('\n\n')) {
      const def = {};
      for (const line of block.split('\n')) {
        const [field, value] = line.split(/^([^:]+):/).slice(1);
        switch (field) {
          case 'name':        def.name = value; break;
          case 'terminii':    def.ring = parse_terminii(value); break;
          case 'type':        def.type = value; break;
          case 'composition': def.composition = parse_composition(value); break;
        }
      }
      if (def.name) {
        this.#entries.set(def.name, new MonosaccharideEntry({
          ...def,
          source: 'hardcoded'
        }));
      }
    }
    return this;
  }

  /**
   * Register one monosaccharide from a pre-parsed terminii string + optional InChI.
   * Use this for manually curated exotic residues.
   */
  register(name, { terminiiString, compositionString, type = null, inchi = null, conformation = '4C1' }) {
    const entry = new MonosaccharideEntry({
      name,
      type,
      ring: parse_terminii(terminiiString),
      composition: compositionString ? parse_composition(compositionString) : null,
      inchi,
      conformation,
      source: inchi ? 'inchi' : 'manual',
    });
    this.#entries.set(name, entry);
    return this;
  }

  get(name) {
    return this.#entries.get(name) ?? null;
  }

  getPrototype(name) {
    const entry = this.#entries.get(name);
    if (!entry) return null;
    if (entry.type) return this.#entries.get(entry.type) ?? null;
    return entry;
  }

  has(name) {
    return this.#entries.has(name);
  }

  names() {
    return Array.from(this.#entries.keys());
  }
}

// Singleton default registry, pre-loaded with the hardcoded DEFINITIONS.
export const DEFAULT_REGISTRY = new MonosaccharideRegistry().loadFromDefinitions(DEFINITIONS);
