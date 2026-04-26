'use strict';
import Sugar from './Sugar.js';

export const COUNT            = Symbol('Composite.COUNT');
export const WEIGHT           = Symbol('Composite.WEIGHT');
export const SOURCES          = Symbol('Composite.SOURCES');
export const SATURATION       = Symbol('Composite.SATURATION');
export const LOG2FC           = Symbol('Composite.LOG2FC');
export const PVALUE           = Symbol('Composite.PVALUE');
export const STATS_PER_SOURCE = Symbol('Composite.STATS_PER_SOURCE');
export const BRANCH           = Symbol('Composite.BRANCH');
export const CORE_FUCOSE      = Symbol('Composite.CORE_FUCOSE');
export const HIGHLIGHT        = Symbol('Composite.HIGHLIGHT');

export const DEFAULT_MOTIFS = [
  { name: 'Type 1 chain',       sequence: 'Gal(b1-3)GlcNAc',                           color: '#fde68a', priority: 10, repeats: false },
  { name: 'Type 2 chain',       sequence: 'Gal(b1-4)GlcNAc',                           color: '#bae6fd', priority: 10, repeats: false },
  { name: 'LacDiNAc',           sequence: 'GalNAc(b1-4)GlcNAc',                        color: '#fecaca', priority: 10, repeats: false },
  { name: 'Polylactosamine',    sequence: 'Gal(b1-4)GlcNAc(b1-3)Gal(b1-4)GlcNAc',     color: '#7dd3fc', priority: 30, repeats: true  },
  { name: 'Matriglycan',        sequence: 'GlcA(b1-3)Xyl',                             color: '#d8b4fe', priority: 20, repeats: true  },
  { name: 'Heparan repeat',     sequence: 'GlcA(b1-4)GlcNAc',                          color: '#a7f3d0', priority: 20, repeats: true  },
  { name: 'Chondroitin repeat', sequence: 'GlcA(b1-3)GalNAc',                          color: '#86efac', priority: 20, repeats: true  },
  { name: 'Keratan repeat',     sequence: 'Gal(b1-4)GlcNAc(b1-3)',                     color: '#fbbf24', priority: 20, repeats: true  },
];

export default class CompositeSugar extends Sugar {
  static get COUNT()            { return COUNT; }
  static get WEIGHT()           { return WEIGHT; }
  static get SOURCES()          { return SOURCES; }
  static get SATURATION()       { return SATURATION; }
  static get LOG2FC()           { return LOG2FC; }
  static get PVALUE()           { return PVALUE; }
  static get STATS_PER_SOURCE() { return STATS_PER_SOURCE; }
  static get BRANCH()           { return BRANCH; }
  static get CORE_FUCOSE()      { return CORE_FUCOSE; }
  static get HIGHLIGHT()        { return HIGHLIGHT; }
}
