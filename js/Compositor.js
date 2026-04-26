'use strict';
import CompositeSugar, {
  COUNT, WEIGHT, SOURCES, SATURATION,
  LOG2FC, PVALUE, STATS_PER_SOURCE,
  BRANCH, CORE_FUCOSE, HIGHLIGHT, DEFAULT_MOTIFS,
} from './Composite.js';

const LABEL_LETTERS = ['V','W','X','Y','Z'];

function labelN(i) {
  if (i < 5) return LABEL_LETTERS[i];
  i = i - 5;
  const letters = [];
  do {
    letters.unshift(String.fromCharCode('A'.charCodeAt(0) + (i % 26)));
    i = Math.floor(i / 26) - 1;
  } while (i >= 0);
  return 'A' + letters.join('');
}

function siblingIndex(res) {
  if (!res.parent) return 0;
  return res.parent.children.indexOf(res);
}

function sumOverConditions(weights) {
  return Object.values(weights).reduce((a, b) => a + b, 0);
}

function bumpTagsForStructure(res, structure, index) {
  const countTag   = res.getTag(COUNT) || 0;
  const weightTag  = res.getTag(WEIGHT) || {};
  const sourcesTag = res.getTag(SOURCES) || new Set();

  res.setTag(COUNT, countTag + 1);
  for (const [cond, w] of Object.entries(structure.weights)) {
    weightTag[cond] = (weightTag[cond] || 0) + w;
  }
  res.setTag(WEIGHT, weightTag);
  sourcesTag.add(index);
  res.setTag(SOURCES, sourcesTag);

  if (structure.stats) {
    const statsMap = res.getTag(STATS_PER_SOURCE) || new Map();
    statsMap.set(index, structure.stats);
    res.setTag(STATS_PER_SOURCE, statsMap);
  }
}

export class Compositor {
  constructor(options = {}) {
    this.options = options;
    this._structures = [];
    this._rootIdentifier = null;
  }

  add(sugar, meta = {}) {
    let weights = meta.weights;
    if (weights == null && meta.weight != null) {
      weights = { default: meta.weight };
    }
    if (weights == null) {
      throw new Error('Each structure needs a weight or weights object');
    }
    if (sugar.root) {
      const rootId = sugar.root.identifier;
      if (this._rootIdentifier === null) {
        this._rootIdentifier = rootId;
      } else if (rootId !== this._rootIdentifier) {
        throw new Error(`Cannot add structure with root '${rootId}': existing structures have root '${this._rootIdentifier}'`);
      }
    }
    this._structures.push({ sugar, weights, stats: meta.stats || null });
    return this;
  }

  build() {
    if (this._structures.length === 0) {
      return new CompositeSugar();
    }

    let composite = this._promote(this._structures[0], 0);

    for (let i = 1; i < this._structures.length; i++) {
      composite = this._foldIn(composite, this._structures[i], i);
    }

    this._computeSaturations(composite);
    this._aggregateStats(composite);
    this._assignBranchLabels(composite);
    this._tagCoreFucose(composite);
    this._matchMotifs(composite);

    if (this.options.freeze !== false) {
      composite.freeze();
    }

    return composite;
  }

  _promote(structure, index) {
    const cloned = structure.sugar.clone();
    const composite = new CompositeSugar();
    composite.root = cloned.root;

    for (const res of composite.composition()) {
      res.setTag(COUNT, 1);
      res.setTag(WEIGHT, { ...structure.weights });
      res.setTag(SOURCES, new Set([index]));
      if (structure.stats) {
        res.setTag(STATS_PER_SOURCE, new Map([[index, structure.stats]]));
      }
    }
    return composite;
  }

  _foldIn(composite, structure, index) {
    const onMerge = (compositeRes, sourceRes, sourceIdx) => {
      if (sourceIdx === 0) return;
      bumpTagsForStructure(compositeRes, structure, index);
    };

    const onAdopt = (compositeRes, sourceRes, sourceIdx) => {
      if (sourceIdx === 0) return;
      compositeRes.setTag(COUNT, 1);
      compositeRes.setTag(WEIGHT, { ...structure.weights });
      compositeRes.setTag(SOURCES, new Set([index]));
      if (structure.stats) {
        compositeRes.setTag(STATS_PER_SOURCE, new Map([[index, structure.stats]]));
      }
    };

    return composite.union(structure.sugar, { onMerge, onAdopt });
  }

  _computeSaturations(composite) {
    const totalWeight = {};
    for (const s of this._structures) {
      for (const [cond, w] of Object.entries(s.weights)) {
        totalWeight[cond] = (totalWeight[cond] || 0) + w;
      }
    }

    for (const res of composite.composition()) {
      const weight = res.getTag(WEIGHT) || {};
      const saturation = {};
      for (const [cond, w] of Object.entries(weight)) {
        saturation[cond] = w / (totalWeight[cond] || 1);
      }
      res.setTag(SATURATION, saturation);
    }
  }

  _aggregateStats(composite) {
    const policy = this.options.statsAggregation || { log2fc: 'weighted-mean', pvalue: 'min' };

    for (const res of composite.composition()) {
      const statsPerSource = res.getTag(STATS_PER_SOURCE);
      if (!statsPerSource || statsPerSource.size === 0) continue;

      const log2fcs    = [];
      const pvalues    = [];
      const abundances = [];

      for (const [sourceIdx, stats] of statsPerSource) {
        const structure = this._structures[sourceIdx];
        const abundance = sumOverConditions(structure.weights);
        if (stats.log2fc != null && !isNaN(stats.log2fc)) {
          log2fcs.push(stats.log2fc);
          abundances.push(abundance);
        }
        const pval = stats.qvalue != null ? stats.qvalue : stats.pvalue;
        if (pval != null && !isNaN(pval)) {
          pvalues.push(pval);
        }
      }

      res.setTag(LOG2FC, this._aggregate(policy.log2fc || 'weighted-mean', log2fcs, abundances));
      res.setTag(PVALUE, this._aggregate(policy.pvalue || 'min', pvalues, null));
    }
  }

  _aggregate(policy, values, weights) {
    if (values.length === 0) return null;
    switch (policy) {
      case 'mean':
        return values.reduce((a, b) => a + b, 0) / values.length;
      case 'median': {
        const sorted = values.slice().sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
      }
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      case 'weighted-mean': {
        if (!weights || weights.length !== values.length) {
          return values.reduce((a, b) => a + b, 0) / values.length;
        }
        const totalW = weights.reduce((a, b) => a + b, 0);
        if (totalW === 0) return null;
        return values.reduce((sum, v, i) => sum + v * weights[i], 0) / totalW;
      }
      default:
        return values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  _assignBranchLabels(composite) {
    const discriminating = this.options.discriminatingResidues || ['GlcNAc', 'Gal', 'GalNAc', 'Man'];
    const candidates = [];

    for (const parent of composite.breadth_first_traversal()) {
      const discKids = parent.children.filter(c => discriminating.includes(c.identifier));
      if (discKids.length < 2) continue;

      const uniqueLinkages = new Set(discKids.map(k => {
        const L = parent.linkageOf(k);
        return L !== undefined ? L : 0;
      }));
      if (uniqueLinkages.size < 2) continue;

      for (const kid of discKids) {
        candidates.push(kid);
      }
    }

    candidates.sort((a, b) =>
      (a.depth - b.depth) || (siblingIndex(a) - siblingIndex(b))
    );

    for (let i = 0; i < candidates.length; i++) {
      candidates[i].setTag(BRANCH, labelN(i));
    }
  }

  _tagCoreFucose(composite) {
    const SugarClass = this.options.SugarClass;
    if (!SugarClass) return;

    let nlinkedCore;
    try {
      nlinkedCore = new SugarClass();
      nlinkedCore.sequence = 'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc';
    } catch (e) {
      return;
    }

    const identifierComparator = (a, b) => a && b && a.identifier === b.identifier;
    const matches = composite.match_sugar_pattern(nlinkedCore, identifierComparator);

    for (const match of matches) {
      const matchResidues = match.composition();
      const coreGlcNAcTrace = matchResidues.find(tr => {
        if (tr.identifier !== 'GlcNAc') return false;
        return tr.children.length === 0 || tr.children.every(c => c.identifier !== 'GlcNAc');
      });
      if (!coreGlcNAcTrace) continue;
      const coreGlcNAc = coreGlcNAcTrace.original || coreGlcNAcTrace;
      for (const child of coreGlcNAc.children) {
        if (child.identifier === 'Fuc' && coreGlcNAc.linkageOf(child) === 6) {
          child.setTag(CORE_FUCOSE, true);
        }
      }
    }
  }

  _matchMotifs(composite) {
    const SugarClass = this.options.SugarClass;
    if (!SugarClass) return;

    const motifs = (this.options.motifs || DEFAULT_MOTIFS)
      .slice()
      .sort((a, b) => b.priority - a.priority);

    const identifierComparator = (a, b) => a && b && a.identifier === b.identifier;

    for (const motif of motifs) {
      let pattern;
      try {
        pattern = new SugarClass();
        pattern.sequence = motif.sequence;
      } catch (e) {
        continue;
      }

      const matches = composite.match_sugar_pattern(pattern, identifierComparator);

      for (const match of matches) {
        const residues = match.composition().map(tr => tr.original || tr);
        for (const res of residues) {
          if (!res.getTag(HIGHLIGHT)) {
            res.setTag(HIGHLIGHT, motif);
          }
        }
      }
    }
  }
}

export function compose(structures, options = {}) {
  const SugarClass = options.SugarClass;
  if (!SugarClass) throw new Error('compose() requires options.SugarClass');
  const compositor = new Compositor(options);
  for (const s of structures) {
    const sugar = new SugarClass();
    sugar.sequence = s.sequence;
    const meta = { ...s };
    delete meta.sequence;
    compositor.add(sugar, meta);
  }
  return compositor.build();
}

export default Compositor;
