import { default as Monosaccharide } from './Monosaccharide.js';

const epimerised_identifier_symbol = Symbol('epimerised_identifier');

const original_residue_symbol = Symbol('original');

const noop = () => {};

const epimerisation_status = new WeakMap();

class EpimerisableMonosaccharide extends Monosaccharide {
  constructor(original,identifier,epimerised=true) {
    super(identifier);
    this[original_residue_symbol] = original;
    this[epimerised_identifier_symbol] = identifier;
    epimerisation_status.set(this,epimerised);
  }

  get identifier() {
    return this.epimerised ? this[epimerised_identifier_symbol] : this[original_residue_symbol].identifier;
  }

  get epimerised() {
    return epimerisation_status.get(this);
  }

  disable() {
    epimerisation_status.set(this,false);
  }

  enable() {
    epimerisation_status.set(this,true);
  }

  get anomer() {
    return this[original_residue_symbol].anomer;
  }
  get parent_linkage() {
    return this[original_residue_symbol].parent_linkage;
  }

  set anomer(ignore) {
    noop(ignore);
  }
  set parent_linkage(ignore) {
    noop(ignore);
  }
  set identifier(ignore) {
    noop(ignore);
  }

  clone() {
    let cloned = new this.constructor(this[original_residue_symbol],
      this[epimerised_identifier_symbol],
      this.epimerised);
    cloned.copyTagsFrom(this);
    return cloned;
  }
}

export { EpimerisableMonosaccharide };