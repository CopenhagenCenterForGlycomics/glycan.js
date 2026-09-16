'use strict';

// Pulls plain shape descriptors out of a sugars.svg <symbol>, adapted from
// the equivalent extractor in js/CanvasRenderer.js (extract_paths /
// populate_path). Kept as its own small, DOM-attribute-only copy here so
// js/Fiziko/ has no dependency edges into other core files. O(n) in the
// symbol's child element count - a handful of shapes per icon.

const attrNum = (el, name) => parseFloat(el.getAttribute(name));

// Some sugars.svg icons (e.g. glca/gala's split-diamond halves) carry their
// own `transform` directly on the <rect>/<polygon>/<polyline>, on top of
// whatever transform the residue's own <use> applies. Ignoring it here
// extracted the pre-transform points, so a rotated half rendered rotated
// wrong relative to its sibling. `consolidate()` collapses any transform
// list (translate/rotate/scale/matrix/skew chains) into one matrix.
const transformMatrixFor = (el) => {
  const transformAttr = el.getAttribute('transform');
  if (!transformAttr) {
    return null;
  }
  const consolidated = el.transform.baseVal.consolidate();
  return consolidated ? consolidated.matrix : null;
};

// Only affine point mapping - correct for translate/rotate/uniform-scale
// (every actual use in sugars.svg today is a plain rotate), but a
// non-uniform scale or skew would need the circle's radius handled as an
// ellipse, which this doesn't attempt.
const applyMatrix = (matrix, [x, y]) => (matrix
  ? [matrix.a * x + matrix.c * y + matrix.e, matrix.b * x + matrix.d * y + matrix.f]
  : [x, y]);

const populateCommon = (el) => {
  const shape = {};
  const fill = el.getAttribute('fill');
  const stroke = el.getAttribute('stroke');
  if (fill) {
    shape.fill = fill;
  }
  if (stroke) {
    shape.stroke = stroke;
  }
  return shape;
};

const extractShapes = (symbol) => {
  const shapes = [];

  for (const el of symbol.querySelectorAll('circle')) {
    const matrix = transformMatrixFor(el);
    const [cx, cy] = applyMatrix(matrix, [attrNum(el, 'cx'), attrNum(el, 'cy')]);
    shapes.push({
      ...populateCommon(el),
      cx,
      cy,
      r: attrNum(el, 'r')
    });
  }

  for (const el of symbol.querySelectorAll('rect')) {
    const x = attrNum(el, 'x');
    const y = attrNum(el, 'y');
    const width = attrNum(el, 'width');
    const height = attrNum(el, 'height');
    const matrix = transformMatrixFor(el);
    const points = [[x, y], [x + width, y], [x + width, y + height], [x, y + height]]
      .map((p) => applyMatrix(matrix, p));
    shapes.push({
      ...populateCommon(el),
      d: `M${points.map((p) => p.join(',')).join(' L')} Z`,
      points
    });
  }

  for (const el of symbol.querySelectorAll('polygon, polyline')) {
    const matrix = transformMatrixFor(el);
    const points = el.getAttribute('points').trim().split(/\s+/)
      .map((pair) => pair.split(',').map(Number))
      .map((p) => applyMatrix(matrix, p));
    shapes.push({
      ...populateCommon(el),
      d: `M${points.map((p) => p.join(',')).join(' L')} Z`,
      points
    });
  }

  // Known gap: a <path> carrying its own transform (none currently in
  // sugars.svg) isn't corrected here - unlike the shapes above, its `d` can
  // contain curves that a plain point-remap can't safely re-encode.
  for (const el of symbol.querySelectorAll('path')) {
    shapes.push({
      ...populateCommon(el),
      d: el.getAttribute('d')
    });
  }

  return shapes;
};

export default extractShapes;
