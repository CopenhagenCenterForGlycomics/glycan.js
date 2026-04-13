import { parse_terminii, parse_composition } from './Mass.js';
import monosaccharideData from './data/monosaccharides.json';
import { inchiToTerminii } from './InChITerminii.js';

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
   * Populate from the monosaccharides.json data array.
   * Entries with an `inchi` field have their terminii derived via inchiToTerminii;
   * entries with an explicit `terminii` field use it directly.
   */
  loadFromJSON(data) {
    for (const entry of data) {
      let terminiiStr, source;
      if (entry.inchi && !entry.terminii) {
        terminiiStr = inchiToTerminii(entry.name, entry.inchi).terminii;
        source = 'inchi';
      } else {
        terminiiStr = entry.terminii;
        source = 'hardcoded';
      }
      this.#entries.set(entry.name, new MonosaccharideEntry({
        name: entry.name,
        type: entry.type ?? null,
        ring: parse_terminii(terminiiStr),
        composition: entry.composition ? parse_composition(entry.composition) : null,
        inchi: entry.inchi ?? null,
        conformation: entry.conformation ?? '4C1',
        source,
      }));
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

// Singleton default registry, pre-loaded from monosaccharides.json.
export const DEFAULT_REGISTRY = new MonosaccharideRegistry().loadFromJSON(monosaccharideData);
