'use strict';

import SVGCanvas from '../SVGCanvas.js';
import extractShapes from './extractShapes.js';
import {
  mulberry32,
  hashSeed,
  stringHash,
  circlePoints,
  hatchLines,
  shadedRings,
  latitudeBands,
  longitudeBands,
  woodgrainLines,
  variableWidthOutline
} from './fizikoTextures.js';

// Linkage line width for the fiziko renderer, independent of the
// SCALE-derived width Renderer.js uses for every other renderer.
const FIZIKO_LINE_WIDTH = 3;

const DEFAULT_OPTIONS = {
  texture: 'solid',
  fill: '#000',
  stroke: 'none',
  strokeWidth: 3,
  outline: true,
  roughness: 0,
  hatchAngle: 45,
  spacing: 4,
  jitter: 0.5,
  lightAngle: -45,
  axisTilt: 25,
  rings: 12,
  meridians: 10,
  samples: 64,
  knots: 3
};

let nextId = 0;
const uniqueId = (prefix) => `${prefix}-${nextId++}`;

const bboxOfPoints = (points) => {
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

class FizikoSVGCanvas extends SVGCanvas {

  constructor(container) {
    super(container);
    // Resolver the caller can override to pick a texture per icon
    // identifier, e.g. `canvas.textureFor = ref => ({texture: 'shaded'})`
    this.textureFor = () => ({ texture: 'solid' });
    // Textured icon variants are expensive-ish to build (bbox + ring/hatch
    // generation) but cheap to reuse, so each distinct (ref, texture,
    // seed) combination is built once as a <symbol> and referenced with
    // a plain <use> for every instance, exactly like sugars.svg icons.
    this.iconCache = new Map();
    this.iconDefs = this.createElement('defs');
    this.canvas.appendChild(this.iconDefs);
  }

  circle(cx, cy, r, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const rng = mulberry32(opts.seed ?? hashSeed(cx, cy, r));
    const clipEl = this.createElement('circle');
    clipEl.setAttribute('cx', cx);
    clipEl.setAttribute('cy', cy);
    clipEl.setAttribute('r', r);
    const geometry = {
      bbox: { x: cx - r, y: cy - r, width: 2 * r, height: 2 * r },
      center: { cx, cy },
      radius: r,
      isCircle: true
    };
    const group = this.renderTexturedShape(clipEl, geometry, opts, rng);
    this.appendChild(group);
    return group;
  }

  polygon(points, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const rng = mulberry32(opts.seed ?? hashSeed(...points.flat()));
    const clipEl = this.createElement('polygon');
    clipEl.setAttribute('points', points.map((p) => p.join(',')).join(' '));
    const bbox = bboxOfPoints(points);
    const geometry = {
      bbox,
      center: { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 },
      radius: Math.max(bbox.width, bbox.height) / 2,
      points
    };
    const group = this.renderTexturedShape(clipEl, geometry, opts, rng);
    this.appendChild(group);
    return group;
  }

  rect(x, y, width, height, options = {}) {
    if (!options.texture || options.texture === 'solid') {
      const el = super.rect(x, y, width, height);
      if (options.fill) {
        el.setAttribute('fill', options.fill);
      }
      if (options.stroke) {
        el.setAttribute('stroke', options.stroke);
      }
      return el;
    }
    return this.polygon([[x, y], [x + width, y], [x + width, y + height], [x, y + height]], options);
  }

  // Replaces the crisp straight linkage line with a hand-drawn wobble,
  // matching the wobbly outlines already used on residue shapes
  // (buildWobblyOutline below). Endpoints stay exactly (x,y)/(x2,y2) - the
  // wobble tapers to 0 at both ends (sin(pi*t) factor) - so linkages still
  // connect precisely to each residue's attachment point.
  line(x, y, x2, y2, options = {}) {
    options = { ...options, 'stroke-width': FIZIKO_LINE_WIDTH };
    const rng = mulberry32(hashSeed(x, y, x2, y2));
    const dx = x2 - x, dy = y2 - y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const samples = 8;
    const amplitude = 1.2;
    const points = [];
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const wobble = Math.sin(Math.PI * t) * amplitude * (rng() - 0.5) * 2;
      points.push([x + dx * t + nx * wobble, y + dy * t + ny * wobble]);
    }
    const path = this.createElement('path');
    path.setAttribute('d', `M${points.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' L')}`);
    path.setAttribute('fill', 'none');
    for (const key of Object.keys(options)) {
      path.setAttribute(key, options[key]);
    }
    path.setAttribute('stroke-linecap', 'round');
    this.appendChild(path);
    return path;
  }

  // Transforms an existing sugars.svg icon into the fiziko style on the
  // fly. Falls back to the plain SVGCanvas <use> when no texture is
  // requested, so this is a no-op unless `textureFor` says otherwise.
  use(ref, x, y, width, height) {
    const requested = this.textureFor(ref) || {};
    if (!requested.texture || requested.texture === 'solid') {
      return super.use(ref, x, y, width, height);
    }

    const opts = { ...DEFAULT_OPTIONS, ...requested };
    // Keyed on the full merged options, not just ref/texture/seed - two
    // calls that differ only in e.g. spacing or rings are different
    // icons and must not reuse each other's cached template.
    const cacheKey = `${ref}::${JSON.stringify(opts)}`;

    let templateId = this.iconCache.get(cacheKey);
    if (templateId === undefined) {
      templateId = this.buildTexturedIcon(ref, opts);
      this.iconCache.set(cacheKey, templateId);
    }

    // ref didn't resolve to a real <symbol> (bad/empty identifier) - fall
    // back to the plain, un-textured <use> rather than throw.
    if (!templateId) {
      return super.use(ref, x, y, width, height);
    }
    return super.use(`#${templateId}`, x, y, width, height);
  }

  // Builds the textured replacement for a sugars.svg <symbol> once; every
  // later use() for the same (ref, texture, seed) just references it via
  // <use>, so the cost below (getBBox() + ring/hatch generation per
  // constituent shape) is paid once per distinct icon variant, not once
  // per residue drawn.
  buildTexturedIcon(ref, opts) {
    let symbol;
    const cleaned_ref = ref.replace(/\..*/,'');
    try {
      symbol = this.canvas.querySelector(cleaned_ref);
    } catch (ex) {
      symbol = null;
    }
    if (!symbol) {
      console.log(`Cant find ${ref}, ${cleaned_ref}`)
      debugger;
      return null;
    }
    const templateId = uniqueId('fiziko-icon');
    const template = this.createElement('symbol');
    template.setAttribute('id', templateId);
    template.setAttribute('viewBox', symbol.getAttribute('viewBox') || '0 0 100 100');
    this.iconDefs.appendChild(template);

    const baseSeed = opts.seed ?? stringHash(ref);
    extractShapes(symbol).forEach((shape, index) => {
      const rng = mulberry32(baseSeed + index);
      const clipEl = this.elementForShape(shape);
      // Attach before measuring: getBBox() needs the element to
      // already be part of the (real, non-jsdom) rendered document.
      template.appendChild(clipEl);
      const geometry = this.geometryForShape(shape, clipEl);
      const shapeOpts = { ...opts, fill: shape.fill || opts.fill, stroke: shape.stroke || opts.stroke };
      template.appendChild(this.renderTexturedShape(clipEl, geometry, shapeOpts, rng));
    });

    return templateId;
  }

  elementForShape(shape) {
    if (shape.r !== undefined) {
      const el = this.createElement('circle');
      el.setAttribute('cx', shape.cx);
      el.setAttribute('cy', shape.cy);
      el.setAttribute('r', shape.r);
      return el;
    }
    const el = this.createElement('path');
    el.setAttribute('d', shape.d);
    return el;
  }

  geometryForShape(shape, el) {
    if (shape.r !== undefined) {
      return {
        bbox: { x: shape.cx - shape.r, y: shape.cy - shape.r, width: 2 * shape.r, height: 2 * shape.r },
        center: { cx: shape.cx, cy: shape.cy },
        radius: shape.r,
        isCircle: true
      };
    }
    // rect/polygon/polyline shapes carry their exact corners - follow the
    // real outline instead of falling back to a bounding-circle
    // approximation (still used below for arbitrary <path> icons).
    if (shape.points) {
      const bbox = bboxOfPoints(shape.points);
      return {
        bbox,
        center: { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 },
        radius: Math.max(bbox.width, bbox.height) / 2,
        points: shape.points
      };
    }
    // Arbitrary <path> icon (e.g. Fuc's triangle) with no structured point
    // list from extraction - sample the actual rendered outline so
    // ringGeometry can still follow the true silhouette instead of a plain
    // circle. A bbox-derived circle undershoots any shape whose corners
    // reach further from center than half its longest bbox side (a
    // triangle's apex, for instance), leaving unshaded gaps once clipped.
    const sampled = this.samplePathPoints(el);
    if (sampled) {
      const bbox = bboxOfPoints(sampled);
      return {
        bbox,
        center: { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 },
        radius: Math.max(bbox.width, bbox.height) / 2,
        points: sampled
      };
    }
    const bbox = el.getBBox();
    return {
      bbox,
      center: { cx: bbox.x + bbox.width / 2, cy: bbox.y + bbox.height / 2 },
      radius: Math.max(bbox.width, bbox.height) / 2
    };
  }

  // `getPointAtLength` needs the element attached to a real (non-jsdom)
  // rendered document, same requirement as the getBBox() calls elsewhere
  // in this file - returns null rather than throwing where unsupported, so
  // callers can fall back to the plain bbox/circle approximation.
  samplePathPoints(el, samples = 64) {
    if (typeof el.getTotalLength !== 'function') {
      return null;
    }
    const total = el.getTotalLength();
    if (!total) {
      return null;
    }
    const points = [];
    for (let i = 0; i < samples; i++) {
      const pt = el.getPointAtLength((i / samples) * total);
      points.push([pt.x, pt.y]);
    }
    return points;
  }

  // Shared draw path for both the standalone primitives (circle/polygon)
  // and each shape extracted from an icon. `clipEl` carries the shape's
  // true geometry - for 'solid' it's drawn directly; otherwise it becomes
  // the source of a <clipPath> so generated texture never needs to test
  // point-in-shape containment itself (the SVG engine does that for free).
  renderTexturedShape(clipEl, geometry, opts, rng) {
    const group = this.createElement('g');
    // Taken before clipEl is mutated/moved into a <clipPath> below, so
    // there's always a pristine copy of the shape's own geometry left to
    // draw a crisp boundary line from, regardless of texture.
    const outlineSource = clipEl.cloneNode(true);
    outlineSource.removeAttribute('id');

    if (opts.texture === 'solid') {
      clipEl.setAttribute('fill', opts.fill);
      clipEl.setAttribute('stroke', 'none');
      group.appendChild(clipEl);
    } else {
      // Sparse textures (rings/hatch/woodgrain) leave gaps between their own
      // strokes/bands by design - without an opaque pass underneath, those
      // gaps let anything behind the shape (e.g. a linkage line) show
      // through. Same fix rough-glycan.js's RoughCanvas.js uses: a solid
      // backing pass before the decorative one.
      const backing = outlineSource.cloneNode(true);
      backing.removeAttribute('id');
      backing.setAttribute('fill', 'white');
      backing.setAttribute('stroke', 'none');
      group.appendChild(backing);
      this.appendClippedTexture(group, clipEl, geometry, opts, rng);
    }

    // roughness>0 replaces the crisp outline with a width-jittered one
    // (buildWobblyOutline) rather than drawing both - a plain SVG
    // stroke-width can't vary along a path, so "jitter" there means a
    // filled variable-width band instead, and layering that on top of the
    // flat stroke was redundant (and could show the flat stroke's own
    // color through/around it wherever `stroke` differs from `fill`).
    if (opts.outline !== false) {
      if (opts.roughness > 0) {
        group.appendChild(this.buildWobblyOutline(geometry, opts, rng));
      } else {
        outlineSource.setAttribute('fill', 'none');
        outlineSource.setAttribute('stroke', opts.stroke && opts.stroke !== 'none' ? opts.stroke : opts.fill);
        outlineSource.setAttribute('stroke-width', opts.strokeWidth);
        group.appendChild(outlineSource);
      }
    }

    return group;
  }

  appendClippedTexture(group, clipEl, geometry, opts, rng) {
    const clipId = uniqueId('fiziko-clip');
    clipEl.setAttribute('id', clipId);
    clipEl.setAttribute('fill', 'none');
    clipEl.setAttribute('stroke', 'none');

    const clipPath = this.createElement('clipPath');
    clipPath.setAttribute('id', `${clipId}-path`);
    clipPath.appendChild(clipEl);
    group.appendChild(clipPath);

    const textured = this.createElement('g');
    textured.setAttribute('clip-path', `url(#${clipId}-path)`);
    textured.setAttribute('stroke', opts.fill);
    textured.setAttribute('fill', 'none');
    group.appendChild(textured);

    this.paintTexture(textured, geometry, opts, rng);
  }

  paintTexture(target, geometry, opts, rng) {
    if (opts.texture === 'hatch' || opts.texture === 'crosshatch') {
      const angles = opts.texture === 'crosshatch' ? [opts.hatchAngle, opts.hatchAngle + 90] : [opts.hatchAngle];
      for (const angle of angles) {
        const segments = hatchLines(geometry.bbox, { angle, spacing: opts.spacing, jitter: opts.jitter, rng });
        for (const [x1, y1, x2, y2] of segments) {
          const line = this.createElement('line');
          line.setAttribute('x1', x1.toFixed(2));
          line.setAttribute('y1', y1.toFixed(2));
          line.setAttribute('x2', x2.toFixed(2));
          line.setAttribute('y2', y2.toFixed(2));
          target.appendChild(line);
        }
      }
      return;
    }

    if (opts.texture === 'woodgrain') {
      const lines = woodgrainLines(geometry.bbox, {
        angle: opts.hatchAngle, spacing: opts.spacing, knots: opts.knots, samples: opts.samples, jitter: opts.jitter, rng
      });
      this.fillPaths(target, lines, opts.fill);
      return;
    }

    // Sphere textures (shaded/latitude/longitude) are all filled
    // variable-width bands centered on this shape's own center/radius, so
    // any shape (circle, polygon, rect) gets the same "sphere peeking
    // through a clip" look once its texture is clipped - not just circles.
    const sphereOpts = {
      lightAngle: opts.lightAngle,
      axisTilt: opts.axisTilt,
      rings: opts.rings,
      meridians: opts.meridians,
      samples: opts.samples,
      rng
    };
    // `points` (only present for polygon geometry) lets shadedRings follow
    // the actual outline instead of assuming a circle, so a square's
    // shading fills out to its corners rather than clipping a circle.
    const sphere = { cx: geometry.center.cx, cy: geometry.center.cy, r: geometry.radius, points: geometry.points };
    if (opts.texture === 'longitude') {
      this.fillPaths(target, longitudeBands(sphere, sphereOpts), opts.fill);
      return;
    }
    const ringFn = opts.texture === 'latitude' ? latitudeBands : shadedRings;
    this.fillPaths(target, ringFn(sphere, sphereOpts), opts.fill);
  }

  fillPaths(target, ds, fill) {
    for (const d of ds) {
      const path = this.createElement('path');
      path.setAttribute('d', d);
      path.setAttribute('fill', fill);
      // Closed rings (shaded/latitude/longitude) come as two separate
      // subpaths - outer and inner boundary - and need evenodd for the
      // inner one to actually punch a hole regardless of which way each
      // loop winds. A no-op for open bands (woodgrain, visible arcs),
      // which are already a single simple loop.
      path.setAttribute('fill-rule', 'evenodd');
      target.appendChild(path);
    }
  }

  // Approximates the shape's own silhouette as a circle when no exact
  // point loop is available (arbitrary icon paths) - acceptable since
  // roughness defaults to 0 and is an opt-in cosmetic touch, not the
  // primary texture mechanism.
  buildWobblyOutline(geometry, opts, rng) {
    const points = geometry.points || circlePoints(geometry.center, geometry.radius, opts.samples);
    const widthFn = () => opts.strokeWidth * (1 + (rng() - 0.5) * opts.roughness);
    const outline = this.createElement('path');
    outline.setAttribute('d', variableWidthOutline(points, widthFn));
    // Same color resolution as the crisp outline it replaces - `stroke` if
    // explicitly set, otherwise `fill` (their common default).
    outline.setAttribute('fill', opts.stroke && opts.stroke !== 'none' ? opts.stroke : opts.fill);
    // variableWidthOutline (closed=true) fills two same-direction loops
    // (outer/inner offset boundaries) - without evenodd the default
    // nonzero rule treats that as one solid shape instead of a hollow
    // band, same reason fillPaths sets it for the sphere-ring bands.
    outline.setAttribute('fill-rule', 'evenodd');
    return outline;
  }

}

export default FizikoSVGCanvas;
