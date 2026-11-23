'use strict';

import FizikoSVGCanvas from '../Fiziko/FizikoSVGCanvas.js';
import { mulberry32, hashSeed, circlePoints, woodgrainLines, variableWidthBand } from '../Fiziko/fizikoTextures.js';
import { MACONDO_BASE64, ANOMER_BASE64 } from './fonts/ukiyoeFonts.js';

// Woodblock-print look on top of FizikoSVGCanvas's clip-path machinery
// (icon extraction, clipping, <symbol> caching all reused as-is). What
// changes is only how a shape is inked:
//   - fill: a bokashi gradient (the colour deepening towards the top edge,
//     fading towards paper at the bottom), with faint woodgrain over it;
//   - outline: a calligraphic brush line in sumi ink, its width following
//     the stroke's direction against a fixed nib angle (thin along the
//     nib, broad across it), not random jitter;
//   - linkages: a tapered brush stroke (thin at both ends, full in the
//     middle) with a slight bow, ending exactly at the attachment points.
// Colours are the residues' own SNFG colours, washed out towards woodblock
// pigments on washi (muted below): much less saturated, lifted lighter,
// with the paper's cream showing through.

// Macondo for the labels; the browser takes the anomer letters, which
// Macondo lacks, from the Zen Old Mincho subset (fonts/ukiyoeFonts.js).
const UKIYOE_FONT_FAMILY = "'Macondo', 'Zen Old Mincho Anomers', Georgia, 'Times New Roman', serif";
const INK = '#231f1c';            // sumi
const PAPER = '#f1e4c6';          // washi (sampled from a Hiroshige print), what a bokashi fades towards
const NIB_ANGLE = 35;             // degrees: the brush's flat direction
const OUTLINE_THIN = 0.3;        // narrowest outline width as a share of the broadest (opts.strokeWidth)
const LINE_WIDTH = 3.6;             // linkage stroke at its broadest, in canvas units
const LINE_END = 0.2;             // linkage width away from its middle, as a share of its broadest
const LINE_SWELL = 0.16;          // how far (share of the length) the middle swell reaches
const LINE_SAMPLES = 16;          // per linkage: not cached, so kept small
const OUTLINE_SPACING = 2.5;      // icon units between outline samples

let nextGradient = 0;

// The paper: a small seamless tile (stitchTiles) of two noise layers -
// long horizontal fibres and fine speckle - in the paper's own browns at
// low alpha, as a CSS background over the cream on the root <svg>. The
// browser rasterises the tile once and repeats it, so unlike an SVG
// filter over the drawing it costs nothing per repaint or per glycan on
// the page (every canvas shares the one data URI). Kept in saved SVGs, as
// a style attribute on the root.
const PAPER_TILE = 240;
const PAPER_TEXTURE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='${PAPER_TILE}' height='${PAPER_TILE}'>`
  + `<filter id='f' x='0' y='0' width='100%' height='100%'>`
  + `<feTurbulence type='fractalNoise' baseFrequency='0.025 0.14' numOctaves='3' seed='7' stitchTiles='stitch' result='fibre'/>`
  + `<feColorMatrix in='fibre' type='matrix' values='0 0 0 0 0.45  0 0 0 0 0.36  0 0 0 0 0.24  0 0 0 -1.6 1.05' result='fibres'/>`
  + `<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='1' seed='3' stitchTiles='stitch' result='grain'/>`
  + `<feColorMatrix in='grain' type='matrix' values='0 0 0 0 0.4  0 0 0 0 0.32  0 0 0 0 0.2  0 0 0 -2.2 1.2' result='speckle'/>`
  + `<feMerge><feMergeNode in='fibres'/><feMergeNode in='speckle'/></feMerge>`
  + `</filter><rect width='100%' height='100%' filter='url(#f)' opacity='0.22'/></svg>`
)}")`;

// '#rrggbb' (or '#rgb') → [r, g, b]; null for anything else (named colours, url()).
const parseHex = (hex) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// How far SNFG's screen colours are pulled towards print pigments.
// Calibrated on a Hiroshige print (Meisho Edo hyakkei): there, greens sit
// at ~0.12-0.15 saturation and ~0.45-0.7 lightness on #f1e4c6 paper. SNFG
// colours stop short of that (0.4 of their saturation) so residue types
// stay easy to tell apart.
const MUTE_SATURATION = 0.4;      // share of saturation kept
const MUTE_LIGHT_FLOOR = 0.28;    // lightness lifted: floor + share * SNFG lightness
const MUTE_LIGHT_SHARE = 0.6;
const PAPER_WASH = 0.15;          // share of PAPER mixed in
// Greens (hue 90-180°): SNFG's is bluish and vivid; the print's are
// yellower and greyer (sampled hue ~120°). Pulled part way to that hue
// and desaturated further.
const GREEN_HUE = 120 / 360;
const GREEN_PULL = 0.5;           // share of the way to GREEN_HUE
const GREEN_SATURATION = 0.7;     // further share of saturation kept

const rgbToHsl = ([r, g, b]) => {
  [r, g, b] = [r / 255, g / 255, b / 255];
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
};
const hslToRgb = ([h, s, l]) => {
  if (!s) return [l, l, l].map((v) => v * 255);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [h + 1 / 3, h, h - 1 / 3].map((t) => channel(t) * 255);
};

// An SNFG colour as a woodblock pigment: the same hue, desaturated, lifted
// lighter, with the paper's cream washed through. White ends near paper.
const muted = (rgb) => {
  let [h, s, l] = rgbToHsl(rgb);
  if (h >= 90 / 360 && h <= 180 / 360) {
    h += (GREEN_HUE - h) * GREEN_PULL;
    s *= GREEN_SATURATION;
  }
  const lifted = Math.min(1, MUTE_LIGHT_FLOOR + MUTE_LIGHT_SHARE * l + (l > 0.9 ? 0.1 : 0));
  return mix(hslToRgb([h, s * MUTE_SATURATION, lifted]), parseHex(PAPER), PAPER_WASH);
};

// A closed loop resampled every `spacing` units along its perimeter, so a
// polygon's straight sides carry enough points for the width to vary along
// them (corners alone would give one width per side). O(perimeter / spacing).
const resampleLoop = (points, spacing) => {
  const out = [];
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    const steps = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / spacing));
    for (let s = 0; s < steps; s++) {
      out.push([x1 + (x2 - x1) * s / steps, y1 + (y2 - y1) * s / steps]);
    }
  }
  return out;
};

// Brush width along a stroke heading `dx,dy`: broad across the nib, thin along it.
const nibWidth = (dx, dy, broad, thin) => {
  const heading = Math.atan2(dy, dx) - NIB_ANGLE * Math.PI / 180;
  return broad * (thin + (1 - thin) * Math.abs(Math.sin(heading)));
};

class UkiyoeSVGCanvas extends FizikoSVGCanvas {

  constructor(container) {
    super(container);
    this.lineWidth = LINE_WIDTH;
    this.paper = true;
  }

  // Paper behind the drawing: the cream, with the fibre texture unless
  // set to 'plain'; false leaves the background as the page's.
  set paper(value) {
    this._paper = value;
    const style = this.canvas.style;
    style.backgroundColor = value ? PAPER : '';
    style.backgroundImage = value && value !== 'plain' ? PAPER_TEXTURE : '';
  }

  get paper() {
    return this._paper;
  }

  // Labels (residue names and linkages) in Macondo, through the font hooks
  // FizikoSVGCanvas has for this (as HeraldicSVGCanvas does).
  // Printed on washi: the amino-acid label and backbone stay sumi ink in
  // either page theme, like the outlines and linkages.
  get inkColor() {
    return INK;
  }

  get fontFamily() {
    return UKIYOE_FONT_FAMILY;
  }

  get labelFontFamily() {
    return UKIYOE_FONT_FAMILY;
  }

  buildFontFaceCSS() {
    return `@font-face {
      font-family: 'Macondo';
      src: url(data:font/truetype;charset=utf-8;base64,${MACONDO_BASE64}) format('truetype');
    }
    @font-face {
      font-family: 'Zen Old Mincho Anomers';
      src: url(data:font/truetype;charset=utf-8;base64,${ANOMER_BASE64}) format('truetype');
      unicode-range: U+03B1-03B2;
    }`;
  }

  static get LAZY_SYMBOLS() {
    return true;
  }

  // The bokashi should deepen at the top of the screen whatever way the
  // residue is turned, so the icon's own rotation goes into its texture
  // options: FizikoSVGCanvas caches one icon per distinct options, so each
  // rotation in use is built once (at most a handful: layout direction,
  // fucose tilts), and paintTexture counter-rotates the gradient by it.
  use(ref, x, y, width, height, rotation = 0) {
    const textureFor = this.textureFor;
    this.textureFor = (r) => {
      const requested = textureFor(r) || {};
      return requested.texture === 'ukiyoe' ? { ...requested, iconRotation: Math.round(rotation) } : requested;
    };
    try {
      return super.use(ref, x, y, width, height, rotation);
    } finally {
      this.textureFor = textureFor;
    }
  }

  // The 'ukiyoe' texture: a bokashi gradient fill, then woodgrain in a
  // deeper shade of the colour at low opacity, both inside the shape's clip
  // (appendClippedTexture). The gradient goes in the shared top-level defs,
  // as clip paths do (WebKit), and is built once per cached icon.
  paintTexture(target, geometry, opts, rng) {
    if (opts.texture !== 'ukiyoe') {
      return super.paintTexture(target, geometry, opts, rng);
    }
    const base = muted(parseHex(opts.fill) || [200, 200, 200]);
    const deep = mix(base, [0, 0, 0], 0.35);
    const paper = parseHex(PAPER);
    const id = `ukiyoe-grad-${nextGradient++}`;
    const gradient = this.createElement('linearGradient');
    gradient.setAttribute('id', id);
    // Top to bottom on screen: down (90°) less the icon's own rotation,
    // about the centre of the shape's box (objectBoundingBox units).
    const angle = (90 - (opts.iconRotation || 0)) * Math.PI / 180;
    const [gx, gy] = [Math.cos(angle) / 2, Math.sin(angle) / 2];
    gradient.setAttribute('x1', (0.5 - gx).toFixed(3));
    gradient.setAttribute('y1', (0.5 - gy).toFixed(3));
    gradient.setAttribute('x2', (0.5 + gx).toFixed(3));
    gradient.setAttribute('y2', (0.5 + gy).toFixed(3));
    // Printed bokashi: a hard band of deeper colour at the top edge, a
    // short blend into the flat colour, then a wiped fade towards paper.
    for (const [offset, rgb] of [[0, deep], [0.14, deep], [0.34, base], [0.6, base], [1, mix(base, paper, 0.7)]]) {
      const stop = this.createElement('stop');
      stop.setAttribute('offset', offset);
      stop.setAttribute('stop-color', toHex(rgb));
      gradient.appendChild(stop);
    }
    this.iconDefs.appendChild(gradient);

    const { bbox } = geometry;
    const fill = this.createElement('rect');
    fill.setAttribute('x', bbox.x);
    fill.setAttribute('y', bbox.y);
    fill.setAttribute('width', bbox.width);
    fill.setAttribute('height', bbox.height);
    fill.setAttribute('fill', `url(#${id})`);
    fill.setAttribute('stroke', 'none');
    target.appendChild(fill);

    const grain = this.createElement('g');
    grain.setAttribute('opacity', opts.grainOpacity ?? 0.3);
    grain.setAttribute('stroke', 'none');
    this.fillPaths(grain, woodgrainLines(bbox, {
      angle: opts.grainAngle ?? -8, spacing: opts.spacing, knots: opts.knots, samples: opts.samples, jitter: opts.jitter, rng
    }), toHex(deep));
    target.appendChild(grain);
  }

  // A calligraphic outline in ink: the shape's perimeter resampled, each
  // point's width from its heading against the nib (nibWidth), with a slow
  // swell in brush pressure around the loop. O(perimeter / OUTLINE_SPACING).
  buildWobblyOutline(geometry, opts, rng) {
    const loop = geometry.points || circlePoints(geometry.center, geometry.radius, 48);
    const points = geometry.points ? resampleLoop(loop, OUTLINE_SPACING) : loop;
    const n = points.length;
    const phase = rng() * Math.PI * 2;
    const widths = points.map((p, i) => {
      const prev = points[(i - 1 + n) % n];
      const next = points[(i + 1) % n];
      const pressure = 1 + 0.15 * Math.sin(phase + (2 * Math.PI * i) / n * 2);
      return nibWidth(next[0] - prev[0], next[1] - prev[1], opts.strokeWidth, OUTLINE_THIN) * pressure;
    });
    const outline = this.createElement('path');
    outline.setAttribute('d', variableWidthBand(points, widths, true));
    outline.setAttribute('fill', INK);
    outline.setAttribute('fill-rule', 'evenodd');
    return outline;
  }

  // A linkage as one brush stroke in ink: a filled band whose centreline
  // bows slightly to one side, swelling to full width at its middle and
  // thinning to LINE_END of it within LINE_SWELL either side. Linkages run
  // from residue centre to centre, so only their middle shows between the
  // icons: the swell has to happen there to be seen. The ends sit exactly
  // on (x,y) and (x2,y2).
  // O(LINE_SAMPLES) per linkage.
  line(x, y, x2, y2, options = {}) {
    const rng = mulberry32(hashSeed(x, y, x2, y2));
    const dx = x2 - x, dy = y2 - y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    const bow = len * 0.035 * (rng() < 0.5 ? -1 : 1);
    const centre = [];
    const widths = [];
    for (let i = 0; i <= LINE_SAMPLES; i++) {
      const t = i / LINE_SAMPLES;
      const offset = bow * Math.sin(Math.PI * t);
      centre.push([x + dx * t + nx * offset, y + dy * t + ny * offset]);
      const swell = Math.exp(-(((t - 0.5) / LINE_SWELL) ** 2));
      widths.push(this.lineWidth * (LINE_END + (1 - LINE_END) * swell));
    }
    const path = this.createElement('path');
    path.setAttribute('d', variableWidthBand(centre, widths, false));
    path.setAttribute('fill', INK);
    path.setAttribute('stroke', 'none');
    this.appendChild(path);
    return path;
  }
}

export default UkiyoeSVGCanvas;
