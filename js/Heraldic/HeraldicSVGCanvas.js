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

class HeraldicSVGCanvas extends FizikoSVGCanvas {

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

}

export default HeraldicSVGCanvas;
