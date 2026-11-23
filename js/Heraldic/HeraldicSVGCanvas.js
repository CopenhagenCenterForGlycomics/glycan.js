'use strict';

import FizikoSVGCanvas from '../Fiziko/FizikoSVGCanvas.js';
import FONDAMENTO_BASE64, { FONDAMENTO_ITALIC_BASE64 } from './fonts/fondamentoFont.js';

// Reuses FizikoSVGCanvas's clip-path "ink" machinery and residue-label
// handling (FIZIKO_TEXT_LABELS) entirely unchanged - the only difference is
// which font gets embedded and applied, which FizikoSVGCanvas exposes as a
// small set of overridable hooks (buildFontFaceCSS/fontFamily/
// labelFontFamily) for exactly this purpose.
const HERALDIC_FONT_FAMILY = "'Fondamento', Georgia, 'Times New Roman', serif";
const HERALDIC_LABEL_FONT_FAMILY = "'Fondamento Italic', Georgia, 'Times New Roman', serif";

// The ground: laid paper, as in the engraved armorials the hatching system
// comes from (Petra Sancta's Tesserae Gentilitiae, 1638). Off-white, less
// yellow than Haeckel's cream or Ukiyo-e's washi. In a dark page theme it
// becomes the copper plate itself: dark warm metal, bright engraved lines.
// light-dark() resolves per element, so a theme flip needs no re-render;
// saved SVGs resolve to the paper.
const PAPER = 'light-dark(#f4efe4, #2a1e17)';
const INK = 'light-dark(#1d1a17, #ecdcc0)';
// Laid paper's texture as two CSS gradients on the root <svg>: fine
// horizontal laid lines every 3px and wide-spaced vertical chain lines,
// both a few percent opaque so they stay under the 4-unit hatching (3px
// rather than 4 so they don't beat against it). On the plate the chain
// lines go and the laid lines turn into faint burnish streaks. Painted by
// the browser once per canvas size: no SVG nodes, no filter, no per-glycan
// cost. In CSS pixels, so it doesn't scale with the glycan, as paper wouldn't.
const LAID = 'light-dark(rgba(90, 70, 40, 0.045), rgba(255, 210, 160, 0.03))';
const CHAIN = 'light-dark(rgba(90, 70, 40, 0.07), transparent)';
const PAPER_TEXTURE = [
  `repeating-linear-gradient(90deg, transparent 0 25px, ${CHAIN} 25px 26px)`,
  `repeating-linear-gradient(0deg, transparent 0 2px, ${LAID} 2px 3px)`
].join(', ');

const BLACK = new Set(['#000', '#000000', 'black']);

class HeraldicSVGCanvas extends FizikoSVGCanvas {

  // Inherits FizikoSVGCanvas's findSymbol-only lookups; opt-in is per
  // class (see SVGCanvas.js).
  static get LAZY_SYMBOLS() {
    return true;
  }

  constructor(container) {
    super(container);
    this.ground = 'paper';
  }

  // Laid paper behind the drawing ('plain' drops the laid lines); false
  // leaves the page's background (and white backing under the hatching).
  set ground(value) {
    this._ground = value;
    const style = this.canvas.style;
    style.backgroundColor = value ? PAPER : '';
    style.backgroundImage = value && value !== 'plain' ? PAPER_TEXTURE : '';
  }

  get ground() {
    return this._ground;
  }

  // Hatching gaps show the paper (or plate), not white patches.
  get backingColor() {
    return this.ground ? PAPER : super.backingColor;
  }

  // Ser/Thr label and backbone: the engraving's own ink, which turns with
  // the paper.
  get inkColor() {
    return this.ground ? INK : super.inkColor;
  }

  // Per shape, after the tincture is chosen: black outlines and sable's
  // black hatching are the engraver's ink, so they turn with the paper
  // (black lines would vanish into the dark plate); argent is the blank
  // field, so it's the paper itself rather than a white patch on it, kept
  // outlined in ink. Other tinctures keep their SNFG-coloured lines.
  renderTexturedShape(clipEl, geometry, opts, rng) {
    if (this.ground) {
      opts = { ...opts };
      if (BLACK.has(String(opts.stroke).toLowerCase())) {
        opts.stroke = INK;
      }
      if (opts.tincture === 'sable') {
        opts.fill = INK;
      } else if (opts.tincture === 'argent') {
        opts.fill = PAPER;
        if (!opts.stroke || opts.stroke === 'none') {
          opts.stroke = INK;
        }
      }
    }
    return super.renderTexturedShape(clipEl, geometry, opts, rng);
  }

  get fontFamily() {
    return HERALDIC_FONT_FAMILY;
  }

  get labelFontFamily() {
    return HERALDIC_LABEL_FONT_FAMILY;
  }

  buildFontFaceCSS() {
    return `@font-face {
      font-family: 'Fondamento';
      src: url(data:font/truetype;charset=utf-8;base64,${FONDAMENTO_BASE64}) format('truetype');
    }
    @font-face {
      font-family: 'Fondamento Italic';
      src: url(data:font/truetype;charset=utf-8;base64,${FONDAMENTO_ITALIC_BASE64}) format('truetype');
    }`;
  }

  // Linkage labels in ink too.
  text(x, y, text, options = {}) {
    const el = super.text(x, y, text, options);
    if (this.ground) {
      el.setAttribute('fill', INK);
    }
    return el;
  }

}

export default HeraldicSVGCanvas;
