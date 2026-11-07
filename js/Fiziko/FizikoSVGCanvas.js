'use strict';

import SVGCanvas from '../SVGCanvas.js';
import extractShapes from './extractShapes.js';
import ROUTED_GOTHIC_BASE64, { ROUTED_GOTHIC_NARROW_HALF_ITALIC_BASE64 } from './fonts/routedGothicFont.js';
import {
  mulberry32,
  hashSeed,
  stringHash,
  circlePoints,
  hatchLines,
  dotPattern,
  shadedRings,
  latitudeBands,
  longitudeBands,
  woodgrainLines,
  variableWidthOutline
} from './fizikoTextures.js';

// Linkage line width for the fiziko renderer, independent of the
// SCALE-derived width Renderer.js uses for every other renderer.
const FIZIKO_LINE_WIDTH = 3;

// Forces every residue shape to this fill instead of its own SNFG color
// (e.g. '#000' for black-and-white). Set to null to keep each residue's
// normal SNFG color.
const FIZIKO_FILL_OVERRIDE = null;

// Ser/Thr/Asn/Hyl carry their amino acid name as hand-outlined letter
// paths in sugars.svg (there's no live <text> there since extractShapes -
// and every other Fiziko shape - can't see text anyway). Left alone,
// those letter paths get pulled through the same shading/texture pipeline
// as an actual sugar shape (they're plain, un-fill-attributed <path>s),
// making the label an illegible textured blob. Fiziko-only: skip those
// specific paths and draw a plain live <text> label instead - the base
// sugars.svg symbol (and every other renderer using it) is untouched.
const FIZIKO_TEXT_LABELS = {
  '#ser': 'Ser',
  '#thr': 'Thr',
  '#asn': 'Asn',
  '#hyl': 'HyL'
};

// Base64-embedded (fonts/routedGothicFont.js) rather than referenced by
// URL, so an exported SVG (Save SVG/Preview SVG) stays self-contained -
// no dependency on the viewer having this font installed, or on the app's
// own asset host still being reachable later. Falls back to ordinary
// system fonts if the embedded font ever fails to parse/load.
const FIZIKO_FONT_FAMILY = "'Routed Gothic', Helvetica, Verdana, Arial, Sans-serif";

// Used for linkage/anomer labels ("b1-4" etc.) - narrow + half-italic
// matches the conventional italic styling of anomeric configuration
// annotations in glycan diagrams, and distinguishes them from the
// residue-name labels above at a glance.
const FIZIKO_LABEL_FONT_FAMILY = "'Routed Gothic Narrow Half Italic', Helvetica, Verdana, Arial, Sans-serif";

const DEFAULT_OPTIONS = {
  texture: 'solid',
  fill: '#000',
  stroke: 'none',
  strokeWidth: 3,
  outline: true,
  roughness: 0,
  hatchAngle: 45,
  hatchWeight: 1,
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

// Built textured icons, shared by every canvas of the same class on the
// page. Each canvas used to rebuild every icon itself (texture geometry
// plus forced-layout getTotalLength/getBBox calls) - on a page of many
// small glycans that was most of the Fiziko-specific cost. Now the first
// canvas to need an icon builds it; later canvases deep-clone the result.
// WeakMap<canvas class, Map<key, detached nodes>>: per class because a
// subclass can change how icons are drawn (fonts, textures).
const sharedIconTemplates = new WeakMap();

const sharedTemplatesFor = (canvasClass) => {
    let templates = sharedIconTemplates.get(canvasClass);
    if (! templates) {
        templates = new Map();
        sharedIconTemplates.set(canvasClass, templates);
    }
    return templates;
};

// Clones a cached icon (its <symbol> plus the top-level <clipPath>s it
// uses) with fresh ids, so canvases sharing one document (no shadow DOM
// between them) never end up with duplicate ids. Returns the new symbol id.
// Cost: one deep clone plus two selector scans of the clone, O(nodes).
const cloneIconTemplate = (nodes, targetDefs) => {
    const copies = nodes.map((node) => node.cloneNode(true));
    // Ids look like "<prefix>-<n>" or "<prefix>-<n>-path"; renumber per
    // "<prefix>-<n>" so a clip element and its <clipPath> stay paired.
    const renamedBase = new Map();
    const rename = (id) => id.replace(/^(.*?)-(\d+)(-path)?$/, (whole, prefix, n, suffix = '') => {
        const base = `${prefix}-${n}`;
        if (!renamedBase.has(base)) {
            renamedBase.set(base, uniqueId(prefix));
        }
        return renamedBase.get(base) + suffix;
    });
    for (const copy of copies) {
        for (const el of [copy, ...copy.querySelectorAll('[id]')]) {
            el.setAttribute('id', rename(el.getAttribute('id')));
        }
    }
    // References: clip-path (line textures) and fill (pattern textures).
    for (const el of copies[0].querySelectorAll('[clip-path], [fill^="url("]')) {
        for (const attr of ['clip-path', 'fill']) {
            const value = el.getAttribute(attr);
            if (value && value.startsWith('url(')) {
                el.setAttribute(attr, value.replace(/#([^)]+)/, (whole, id) => `#${rename(id)}`));
            }
        }
    }
    targetDefs.append(...copies);
    return copies[0].getAttribute('id');
};

// Textures hatchPatterns mode can draw as a <pattern> fill.
const PATTERN_TEXTURES = new Set(['hatch', 'crosshatch', 'dots']);

// hatchAngle2 lets a crosshatch cross at any second angle (e.g. two
// diagonals for heraldic tenné/sanguine), not just the first angle's
// perpendicular - defaults to +90.
const hatchAngles = (opts) => (opts.texture === 'crosshatch'
    ? [opts.hatchAngle, opts.hatchAngle2 ?? opts.hatchAngle + 90]
    : [opts.hatchAngle]);

// Font CSS embeds ~165 KB of base64; build that string once per canvas
// class rather than once per glycan drawn.
const fontFaceCSSCache = new WeakMap();

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
    // Optional resolver the caller can override to pick a texture per
    // shape's own *fill color* instead of (or on top of) textureFor's
    // per-identifier choice - e.g. heraldic tincture hatching, where the
    // pattern follows the color, not which monosaccharide it is. Returning
    // null/undefined for a color leaves textureFor's choice untouched.
    this.hatchForColor = null;
    // Linkage line width, independent of the SCALE-derived width
    // Renderer.js uses for every other renderer.
    this.lineWidth = FIZIKO_LINE_WIDTH;
    // Forces every residue shape to this fill instead of its own SNFG
    // color (e.g. '#000' for black-and-white). Set to null to keep each
    // residue's normal SNFG color.
    this.fillOverride = FIZIKO_FILL_OVERRIDE;
    // Draw hatch/crosshatch/dots textures as SVG <pattern> fills instead of
    // one <line>/<circle> per stroke/dot: a few nodes per shape rather than
    // dozens, for views drawing many glycans (fragment lists, chromatogram
    // annotations). Patterns are perfectly regular, so `jitter` is ignored;
    // fine for heraldic hatching (jitter 0), a visible change for textures
    // that rely on jitter. Set before drawing.
    this.hatchPatterns = false;
    // Textured icon variants are expensive-ish to build (bbox + ring/hatch
    // generation) but cheap to reuse, so each distinct (ref, texture,
    // seed) combination is built once as a <symbol> and referenced with
    // a plain <use> for every instance, exactly like sugars.svg icons.
    this.iconCache = new Map();
    this.iconDefs = this.createElement('defs');
    this.canvas.appendChild(this.iconDefs);

    // Lives on the <svg> root (not just this in-memory DOM) so it's
    // captured by whatever clones/serializes `this.canvas` for
    // save/preview - a plain <style> is ordinary content as far as
    // XMLSerializer is concerned. buildFontFaceCSS() is overridable so a
    // subclass (e.g. HeraldicSVGCanvas) can embed a different font without
    // touching this construction logic.
    const fontStyle = this.createElement('style');
    if (!fontFaceCSSCache.has(this.constructor)) {
      fontFaceCSSCache.set(this.constructor, this.buildFontFaceCSS());
    }
    fontStyle.textContent = fontFaceCSSCache.get(this.constructor);
    this.canvas.appendChild(fontStyle);
  }

  // Residue-name label font (Ser/Thr/Asn/Hyl) - see FIZIKO_TEXT_LABELS.
  // Overridable per subclass; see fontFamily's own comment for why this
  // isn't just a module constant.
  get fontFamily() {
    return FIZIKO_FONT_FAMILY;
  }

  // Linkage/anomer label font ("b1-4" etc.) - see text(). A getter rather
  // than a module constant so a subclass swapping fonts (HeraldicSVGCanvas)
  // can override it without touching text()/buildTexturedIcon.
  get labelFontFamily() {
    return FIZIKO_LABEL_FONT_FAMILY;
  }

  buildFontFaceCSS() {
    return `@font-face {
      font-family: 'Routed Gothic';
      src: url(data:font/truetype;charset=utf-8;base64,${ROUTED_GOTHIC_BASE64}) format('truetype');
    }
    @font-face {
      font-family: 'Routed Gothic Narrow Half Italic';
      src: url(data:font/truetype;charset=utf-8;base64,${ROUTED_GOTHIC_NARROW_HALF_ITALIC_BASE64}) format('truetype');
    }`;
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
    options = { ...options, 'stroke-width': this.lineWidth };
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

  // Linkage/repeat labels (e.g. "b1-4", repeat counts) go through this -
  // same text, same layout as every other renderer, just swapped to the
  // narrow half-italic fiziko font (conventional italic styling for
  // anomeric configuration annotations).
  text(x, y, text, options = {}) {
    const el = super.text(x, y, text, options);
    el.style.fontFamily = this.labelFontFamily;
    return el;
  }

  // Transforms an existing sugars.svg icon into the fiziko style on the
  // fly. Falls back to the plain SVGCanvas <use> when no texture is
  // requested, so this is a no-op unless `textureFor` says otherwise.
  // `rotation` is the angle degrees setIconPosition will later apply to
  // this <use>'s own transform (see SVGRenderer.renderIcon) - needed here,
  // before that transform exists, so hatch-based textures can be built
  // counter-rotated by that same amount: once the eventual rotate(...)
  // transform is applied on top, the hatching lands back at its intended
  // screen angle instead of rotating along with the residue's own
  // orientation (e.g. fucose's per-linkage tilt, or the horizontal/vertical
  // layout toggle).
  use(ref, x, y, width, height, rotation = 0) {
    const requested = this.textureFor(ref) || {};
    if (!requested.texture || requested.texture === 'solid') {
      return super.use(ref, x, y, width, height);
    }

    const opts = { ...DEFAULT_OPTIONS, ...requested };
    // Only hatch/crosshatch textures actually depend on rotation (via the
    // hatchAngle/hatchAngle2 counter-rotation in buildTexturedIcon) - every
    // other texture (shaded/latitude/longitude/woodgrain/dots, i.e. all of
    // Fiziko's own FIZIKO_TEXTURES) builds an identical icon regardless of
    // rotation, so treat rotation as 0 for those rather than needlessly
    // caching a separate, visually-identical <symbol> per rotation angle.
    const rotationMatters = opts.texture === 'hatch' || opts.texture === 'crosshatch';
    const effectiveRotation = rotationMatters ? rotation : 0;
    // Keyed on the full merged options plus rotation, not just ref/texture/
    // seed - two calls that differ only in e.g. spacing, rings or the final
    // rotation are different icons and must not reuse each other's cached
    // template (a hatch angle counter-rotated for 0° is wrong for 90°).
    const cacheKey = `${ref}::${effectiveRotation}::${this.hatchPatterns}::${JSON.stringify(opts)}`;

    let templateId = this.iconCache.get(cacheKey);
    if (templateId === undefined) {
      templateId = this.sharedTexturedIcon(ref, opts, effectiveRotation, cacheKey);
      this.iconCache.set(cacheKey, templateId);
    }

    // ref didn't resolve to a real <symbol> (bad/empty identifier) - fall
    // back to the plain, un-textured <use> rather than throw.
    if (!templateId) {
      return super.use(ref, x, y, width, height);
    }
    return super.use(`#${templateId}`, x, y, width, height);
  }

  // Per-canvas cache miss: reuse an icon another canvas already built if
  // every input that shapes it matches - the source <symbol>'s own markup
  // (a custom sugars.svg may redefine an id), fillOverride, fonts, and what
  // hatchForColor returns for this symbol's fills (compared by result, as
  // e.g. the heraldic renderer hands every instance a fresh closure).
  sharedTexturedIcon(ref, opts, rotation, cacheKey) {
    const symbol = this.findSymbol(ref);
    if (!symbol) {
      return this.buildTexturedIcon(ref, opts, rotation);
    }
    const colorTextures = this.hatchForColor
      ? extractShapes(symbol).map((shape) => this.hatchForColor(shape.fill || opts.fill) || null)
      : null;
    const sharedKey = JSON.stringify([cacheKey, this.fillOverride, this.fontFamily, colorTextures, symbol.outerHTML]);
    const templates = sharedTemplatesFor(this.constructor);
    const cached = templates.get(sharedKey);
    if (cached) {
      return cloneIconTemplate(cached, this.iconDefs);
    }

    const templateId = this.buildTexturedIcon(ref, opts, rotation);
    // buildTexturedIcon appends the <symbol> and then its <clipPath>s to
    // iconDefs synchronously, so everything from the symbol onward is
    // this icon's own output.
    const nodes = [];
    for (let node = this.iconDefs.querySelector(`#${templateId}`); node; node = node.nextElementSibling) {
      nodes.push(node.cloneNode(true));
    }
    templates.set(sharedKey, nodes);
    return templateId;
  }

  // Copies symbols in on demand (SVGCanvas.findSymbol), so every symbol
  // lookup here goes through findSymbol rather than querying the canvas.
  static get LAZY_SYMBOLS() {
    return true;
  }

  findSymbol(ref) {
    return super.findSymbol(ref.replace(/\..*/, ''));
  }

  // Builds the textured replacement for a sugars.svg <symbol> once; every
  // later use() for the same (ref, texture, seed) just references it via
  // <use>, so the cost below (getBBox() + ring/hatch generation per
  // constituent shape) is paid once per distinct icon variant, not once
  // per residue drawn.
  buildTexturedIcon(ref, opts, rotation = 0) {
    const cleaned_ref = ref.replace(/\..*/,'');
    const symbol = this.findSymbol(ref);
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
    const label = FIZIKO_TEXT_LABELS[cleaned_ref];
    extractShapes(symbol).forEach((shape, index) => {
      // Labeled residues: their letter-outline paths (anything but the
      // wavy backbone line) are replaced wholesale by the <text> label
      // appended below, so skip extracting them at all.
      if (label && shape.fill !== 'none') {
        return;
      }

      const rng = mulberry32(baseSeed + index);
      const clipEl = this.elementForShape(shape);
      // Attach before measuring: getBBox() needs the element to
      // already be part of the (real, non-jsdom) rendered document.
      template.appendChild(clipEl);

      // Explicitly stroke-only decoration (e.g. Ser/Thr/Asn/Hyl's wavy
      // backbone line, fill="none" in sugars.svg) is never meant to be
      // solid - skip the fill/texture/backing pipeline entirely, and skip
      // fillOverride too, or a black-and-white override would fill in what
      // must stay an open line.
      if (shape.fill === 'none') {
        clipEl.setAttribute('fill', 'none');
        clipEl.setAttribute('stroke', shape.stroke || opts.fill);
        clipEl.setAttribute('stroke-width', opts.strokeWidth);
        return;
      }

      const geometry = this.geometryForShape(shape, clipEl);
      const colorTexture = this.hatchForColor && this.hatchForColor(shape.fill || opts.fill);
      const shapeOpts = { ...opts, ...(colorTexture || {}), fill: this.fillOverride || shape.fill || opts.fill, stroke: shape.stroke || opts.stroke };
      // Counter-rotate the hatch angle(s) by this icon's own eventual
      // rotation (see use()'s comment) so the lines read as screen-aligned
      // once that rotation is applied on top, rather than tilting with the
      // residue's own orientation. Only meaningful for hatch/crosshatch -
      // harmless to apply unconditionally since other textures ignore
      // hatchAngle/hatchAngle2 entirely.
      if (rotation) {
        shapeOpts.hatchAngle -= rotation;
        if (shapeOpts.hatchAngle2 !== undefined) {
          shapeOpts.hatchAngle2 -= rotation;
        }
      }
      template.appendChild(this.renderTexturedShape(clipEl, geometry, shapeOpts, rng));
    });


    if (label) {
      const text = this.createElement('text');
      text.setAttribute('x', 50);
      text.setAttribute('y', 92.6);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-family', this.fontFamily);
      text.setAttribute('font-size', 29);
      text.setAttribute('fill', this.fillOverride || opts.fill);
      text.textContent = label;
      template.appendChild(text);
    }

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
      if (this.hatchPatterns && PATTERN_TEXTURES.has(opts.texture)) {
        this.appendPatternTexture(group, outlineSource, geometry, opts);
      } else {
        this.appendClippedTexture(group, clipEl, geometry, opts, rng);
      }
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

  // hatchPatterns mode: the shape itself, filled with a <pattern>, once per
  // hatch angle - no <clipPath>, and one tile instead of a <line> per
  // stroke. Patterns go in the shared top-level <defs> for the same WebKit
  // reason as clip paths (see appendClippedTexture).
  appendPatternTexture(group, shapeEl, geometry, opts) {
    const patterns = opts.texture === 'dots'
      ? [this.dotPatternTile(geometry, opts)]
      : hatchAngles(opts).map((angle) => this.hatchPatternTile(geometry, angle, opts));
    for (const pattern of patterns) {
      this.iconDefs.appendChild(pattern);
      const filled = shapeEl.cloneNode(true);
      filled.removeAttribute('id');
      filled.setAttribute('fill', `url(#${pattern.getAttribute('id')})`);
      filled.setAttribute('stroke', 'none');
      group.appendChild(filled);
    }
  }

  // Same lines hatchLines() draws with jitter 0: along `angle`, `spacing`
  // apart, phased from the bbox centre at offset -diag (in both directions,
  // so dashes start where hatchLines' lines start).
  hatchPatternTile(geometry, angle, opts) {
    const { bbox, center } = geometry;
    const diag = Math.hypot(bbox.width, bbox.height) || 1;
    const spacing = opts.spacing;
    const dashes = opts.dasharray ? String(opts.dasharray).split(/[\s,]+/).map(Number) : [];
    // An odd-length dash list repeats only after two passes.
    const dashPeriod = dashes.reduce((a, b) => a + b, 0) * (dashes.length % 2 ? 2 : 1);
    const width = dashPeriod || spacing;
    const pattern = this.createElement('pattern');
    pattern.setAttribute('id', uniqueId('fiziko-pattern'));
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', width);
    pattern.setAttribute('height', spacing);
    pattern.setAttribute('patternTransform',
      `translate(${center.cx} ${center.cy}) rotate(${angle}) translate(${-diag} ${-diag - spacing / 2})`);
    const line = this.createElement('line');
    line.setAttribute('x1', 0);
    line.setAttribute('y1', spacing / 2);
    line.setAttribute('x2', width);
    line.setAttribute('y2', spacing / 2);
    line.setAttribute('stroke', opts.fill);
    line.setAttribute('stroke-width', opts.hatchWeight);
    if (opts.dasharray) {
      line.setAttribute('stroke-dasharray', opts.dasharray);
    }
    pattern.appendChild(line);
    return pattern;
  }

  // Same staggered grid dotPattern() draws with jitter 0: rows `spacing`
  // apart from bbox.y - spacing, odd rows shifted by half a spacing.
  dotPatternTile(geometry, opts) {
    const { bbox } = geometry;
    const s = opts.spacing;
    const radius = opts.dotRadius ?? Math.max(0.6, s * 0.18);
    const pattern = this.createElement('pattern');
    pattern.setAttribute('id', uniqueId('fiziko-pattern'));
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('x', bbox.x - s - s / 2);
    pattern.setAttribute('y', bbox.y - s - s / 2);
    pattern.setAttribute('width', s);
    pattern.setAttribute('height', 2 * s);
    // Even-row dot in the middle; odd-row dot split across the side edges.
    for (const [cx, cy] of [[s / 2, s / 2], [0, 1.5 * s], [s, 1.5 * s]]) {
      const dot = this.createElement('circle');
      dot.setAttribute('cx', cx);
      dot.setAttribute('cy', cy);
      dot.setAttribute('r', radius.toFixed(2));
      dot.setAttribute('fill', opts.fill);
      pattern.appendChild(dot);
    }
    return pattern;
  }

  appendClippedTexture(group, clipEl, geometry, opts, rng) {
    const clipId = uniqueId('fiziko-clip');
    clipEl.setAttribute('id', clipId);
    clipEl.setAttribute('fill', 'none');
    clipEl.setAttribute('stroke', 'none');

    const clipPath = this.createElement('clipPath');
    clipPath.setAttribute('id', `${clipId}-path`);
    clipPath.appendChild(clipEl);
    // Shared top-level <defs>, not the local <g> - for icon shapes `group`
    // ends up inside a cached <symbol> (buildTexturedIcon) that's instanced
    // by every residue of that monosaccharide via <use>. A <clipPath>
    // nested inside a <symbol> referenced by more than one <use> doesn't
    // reliably re-resolve its clip geometry per instance in WebKit/Safari -
    // switching to a new glycan then leaves an old residue's unclipped
    // backing/texture visibly bleeding through. A single shared, top-level
    // <clipPath> has no such per-instance ambiguity.
    this.iconDefs.appendChild(clipPath);

    const textured = this.createElement('g');
    textured.setAttribute('clip-path', `url(#${clipId}-path)`);
    textured.setAttribute('stroke', opts.fill);
    // Separate from opts.strokeWidth (the shape's own outline) - hatch/
    // crosshatch lines would otherwise fall back to the SVG default of 1,
    // with no way to make them bolder independently of the outline.
    textured.setAttribute('stroke-width', opts.hatchWeight);
    textured.setAttribute('fill', 'none');
    group.appendChild(textured);

    this.paintTexture(textured, geometry, opts, rng);
  }

  paintTexture(target, geometry, opts, rng) {
    if (opts.texture === 'hatch' || opts.texture === 'crosshatch') {
      for (const angle of hatchAngles(opts)) {
        const segments = hatchLines(geometry.bbox, { angle, spacing: opts.spacing, jitter: opts.jitter, rng });
        for (const [x1, y1, x2, y2] of segments) {
          const line = this.createElement('line');
          line.setAttribute('x1', x1.toFixed(2));
          line.setAttribute('y1', y1.toFixed(2));
          line.setAttribute('x2', x2.toFixed(2));
          line.setAttribute('y2', y2.toFixed(2));
          // Lets a hatch line read as dashed/dotted rather than solid - e.g.
          // heraldic Orange's dot-and-dash vertical lines (a hybrid of
          // Gules' solid verticals and Or's dots), or Blue Celeste/Rose's
          // dashed lines distinguishing them from solid Azure/Purpure.
          if (opts.dasharray) {
            line.setAttribute('stroke-dasharray', opts.dasharray);
          }
          target.appendChild(line);
        }
      }
      return;
    }

    if (opts.texture === 'dots') {
      const radius = opts.dotRadius ?? Math.max(0.6, opts.spacing * 0.18);
      const dots = dotPattern(geometry.bbox, { spacing: opts.spacing, jitter: opts.jitter, rng });
      for (const [cx, cy] of dots) {
        const dot = this.createElement('circle');
        dot.setAttribute('cx', cx.toFixed(2));
        dot.setAttribute('cy', cy.toFixed(2));
        dot.setAttribute('r', radius.toFixed(2));
        dot.setAttribute('fill', opts.fill);
        dot.setAttribute('stroke', 'none');
        target.appendChild(dot);
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
