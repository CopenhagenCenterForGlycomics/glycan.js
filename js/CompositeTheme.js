'use strict';

export function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export const DEFAULT_THEME = Object.freeze({
  motifColors: {
    'Type 1 chain':         '#fde68a',
    'Type 2 chain':         '#bae6fd',
    'LacDiNAc':             '#fecaca',
    'Polylactosamine':      '#7dd3fc',
    'Matriglycan':          '#d8b4fe',
    'Heparan repeat':       '#a7f3d0',
    'Chondroitin repeat':   '#86efac',
    'Keratan repeat':       '#fbbf24',
  },
  motifOpacity:        0.3,
  motifCornerRadius:   8,
  motifPadding:        4,

  arcColorNeuAc:        '#a64d79',
  arcColorNeuGc:        '#7daad8',
  arcStrokeWidth:       3,
  arcRadiusFactor:      0.6,
  arcMinThickness:      2,
  arcMaxThickness:      10,
  arcUnknownLinkageDash:'3,2',

  wedgeColorFuc:        '#e74c3c',
  wedgeLengthFactor:    0.5,
  wedgeHalfWidthFactor: 0.3,
  wedgeMinOpacity:      0.3,

  branchLabelColor:      '#222',
  branchLabelFontFamily: 'sans-serif',
  branchLabelFontSize:   12,
  branchLabelFontWeight: 'bold',
  branchLabelCorner:     'top-right',
  branchLabelOffset:     2,

  countBadgeColor:      '#0066cc',
  countBadgeFontSize:   10,
  countBadgeFontFamily: 'sans-serif',
  countBadgeCorner:     'bottom-left',

  saturationMinOpacity: 0.15,
  saturationMode:       'opacity',

  divergingColormap:              'RdBu',
  divergingNeutralFill:           '#dddddd',
  divergingLow:                   '#2c7bb6',
  divergingMid:                   '#ffffff',
  divergingHigh:                  '#d7191c',
  significanceStrokeColor:        '#222',
  significanceStrokeWidth:        2,
  nonSignificantStrokeColor:      '#999',
  nonSignificantStrokeWidth:      1,
  nonSignificantStrokeDash:       '3,2',
  badgeSignificanceStars:         ['*', '**', '***'],
  badgeSignificanceThresholds:    [0.05, 0.01, 0.001],
});
