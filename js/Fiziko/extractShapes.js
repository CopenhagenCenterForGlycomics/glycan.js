'use strict';

// Pulls plain shape descriptors out of a sugars.svg <symbol>, adapted from
// the equivalent extractor in js/CanvasRenderer.js (extract_paths /
// populate_path). Kept as its own small, DOM-attribute-only copy here so
// js/Fiziko/ has no dependency edges into other core files. O(n) in the
// symbol's child element count - a handful of shapes per icon.

const attrNum = (el, name) => parseFloat(el.getAttribute(name));

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
    shapes.push({
      ...populateCommon(el),
      cx: attrNum(el, 'cx'),
      cy: attrNum(el, 'cy'),
      r: attrNum(el, 'r')
    });
  }

  for (const el of symbol.querySelectorAll('rect')) {
    const x = attrNum(el, 'x');
    const y = attrNum(el, 'y');
    const width = attrNum(el, 'width');
    const height = attrNum(el, 'height');
    shapes.push({
      ...populateCommon(el),
      d: `M${x},${y} L${x + width},${y} L${x + width},${y + height} L${x},${y + height} Z`
    });
  }

  for (const el of symbol.querySelectorAll('polygon, polyline')) {
    shapes.push({
      ...populateCommon(el),
      d: `M${el.getAttribute('points')} Z`
    });
  }

  for (const el of symbol.querySelectorAll('path')) {
    shapes.push({
      ...populateCommon(el),
      d: el.getAttribute('d')
    });
  }

  return shapes;
};

export default extractShapes;
