/*global QUnit*/
'use strict';

import FizikoSVGCanvas from '../../js/Fiziko/FizikoSVGCanvas';

// Only the standalone circle()/polygon() primitives are exercised here.
// The use()-based icon-transform path needs a real browser's getBBox(),
// which jsdom does not implement - see FizikoSVGCanvas.js.

const makeContainer = () => document.createElement('div');

QUnit.module('Test FizikoSVGCanvas shape primitives', {
});

QUnit.test('solid texture draws a filled circle plus its outline, no clipPath', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'solid', fill: '#f00', seed: 1 });
  assert.equal(canvas.canvas.querySelectorAll('clipPath').length, 0);
  // filled shape + outline clone = 2 <circle> elements
  assert.equal(canvas.canvas.querySelectorAll('circle').length, 2);
});

QUnit.test('outline can be disabled', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'solid', fill: '#f00', seed: 1, outline: false });
  assert.equal(canvas.canvas.querySelectorAll('circle').length, 1);
});

QUnit.test('outline is drawn on textured shapes too, in its own color when given', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'hatch', fill: '#00f', stroke: '#111', seed: 1, spacing: 2 });
  const outline = [...canvas.canvas.querySelectorAll('circle')].find((el) => !el.closest('clipPath') && el.getAttribute('fill') === 'none');
  assert.ok(outline, 'an unfilled outline circle exists alongside the clip source');
  assert.equal(outline.getAttribute('stroke'), '#111');
});

QUnit.test('hatch texture wraps the shape in a clipPath', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'hatch', fill: '#00f', seed: 1, spacing: 2 });
  assert.equal(canvas.canvas.querySelectorAll('clipPath').length, 1);
  assert.ok(canvas.canvas.querySelectorAll('g[clip-path] line').length > 0);
});

QUnit.test('crosshatch draws two angled sets of lines', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'hatch', fill: '#0f0', seed: 5, spacing: 2 });
  const hatchLineCount = canvas.canvas.querySelectorAll('clipPath')[0].parentNode.querySelectorAll('g[clip-path] line').length;

  const crossCanvas = new FizikoSVGCanvas(makeContainer());
  crossCanvas.circle(10, 10, 5, { texture: 'crosshatch', fill: '#0f0', seed: 5, spacing: 2 });
  const crossLineCount = crossCanvas.canvas.querySelectorAll('g[clip-path] line').length;

  assert.ok(crossLineCount > hatchLineCount);
});

QUnit.test('shaded texture draws concentric ring paths, no clipPath needed', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.circle(10, 10, 5, { texture: 'shaded', fill: '#000', seed: 2, rings: 4, samples: 8 });
  assert.equal(canvas.canvas.querySelectorAll('g[clip-path] path').length, 4);
});

QUnit.test('polygon supports the same texture options as circle', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.polygon([[0, 0], [10, 0], [10, 10], [0, 10]], { texture: 'woodgrain', fill: '#000', seed: 3, spacing: 4, knots: 2, samples: 6 });
  assert.equal(canvas.canvas.querySelectorAll('clipPath polygon').length, 1);
  assert.ok(canvas.canvas.querySelectorAll('g[clip-path] path').length > 0);
});

QUnit.test('shading textures work on non-circular shapes too', function(assert) {
  const canvas = new FizikoSVGCanvas(makeContainer());
  canvas.polygon([[0, 0], [20, 0], [20, 20], [0, 20]], { texture: 'shaded', fill: '#000', seed: 4, rings: 5, samples: 8 });
  assert.equal(canvas.canvas.querySelectorAll('g[clip-path] path').length, 5);
});

QUnit.test('latitude and longitude textures render bands clipped to the shape', function(assert) {
  const latCanvas = new FizikoSVGCanvas(makeContainer());
  latCanvas.circle(10, 10, 8, { texture: 'latitude', fill: '#000', seed: 6, axisTilt: 30, rings: 6, samples: 16 });
  assert.ok(latCanvas.canvas.querySelectorAll('g[clip-path] path').length > 0);

  const lonCanvas = new FizikoSVGCanvas(makeContainer());
  lonCanvas.circle(10, 10, 8, { texture: 'longitude', fill: '#000', seed: 6, axisTilt: 30, meridians: 5, samples: 16 });
  assert.ok(lonCanvas.canvas.querySelectorAll('g[clip-path] path').length > 0);
});

QUnit.test('the same seed reproduces identical geometry', function(assert) {
  const canvasA = new FizikoSVGCanvas(makeContainer());
  canvasA.circle(10, 10, 5, { texture: 'shaded', fill: '#000', seed: 11, rings: 3, samples: 6 });
  const canvasB = new FizikoSVGCanvas(makeContainer());
  canvasB.circle(10, 10, 5, { texture: 'shaded', fill: '#000', seed: 11, rings: 3, samples: 6 });

  const dA = [...canvasA.canvas.querySelectorAll('g[clip-path] path')].map((el) => el.getAttribute('d'));
  const dB = [...canvasB.canvas.querySelectorAll('g[clip-path] path')].map((el) => el.getAttribute('d'));
  assert.deepEqual(dA, dB);
});
