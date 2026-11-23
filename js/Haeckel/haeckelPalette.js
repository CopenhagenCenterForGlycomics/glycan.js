'use strict';

// Colours for the Haeckel renderer: sepia ink on cream paper, and SNFG
// colours softened into watercolour tints - lighter and less saturated,
// but far enough from grey that Gal yellow, Man green and GlcNAc blue stay
// distinct. Cost: a few arithmetic operations per distinct colour (once
// per cached icon).

const PAPER_HEX = '#f3ead6';
const INK_HEX = '#3a2a1f';      // sepia, brown-black
// In a dark page theme the plate turns over: dark sepia paper, cream ink.
// The washes keep their light-paper mix (pigment is pigment), so only these
// two change. light-dark() resolves per element, so no re-render is needed
// when the theme flips; saved SVGs and data: URLs resolve to the light pair.
const PAPER = 'light-dark(#f3ead6, #231b14)';
const INK = 'light-dark(#3a2a1f, #e8dcc2)';

// '#rrggbb' (or '#rgb') -> [r, g, b]; null for anything else.
const parseHex = (hex) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) {
        return null;
    }
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const toHex = (rgb) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('')}`;

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

const rgbToHsl = ([r, g, b]) => {
    [r, g, b] = [r / 255, g / 255, b / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) {
        return [0, 0, l];
    }
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h / 6, s, l];
};

const hslToRgb = ([h, s, l]) => {
    if (!s) {
        return [l, l, l].map((v) => v * 255);
    }
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

const TINT_SATURATION = 0.72;   // share of the SNFG saturation kept
const TINT_LIGHT_FLOOR = 0.4;   // lightness lifted: floor + share * SNFG lightness
const TINT_LIGHT_SHARE = 0.5;
const TINT_PAPER = 0.1;         // share of paper mixed in

// An SNFG colour as a watercolour wash: [wash, pooled edge] as hex.
const washFor = (snfg) => {
    const rgb = parseHex(snfg) || [200, 200, 200];
    const [h, s, l] = rgbToHsl(rgb);
    const wash = mix(hslToRgb([h, s * TINT_SATURATION, Math.min(0.95, TINT_LIGHT_FLOOR + TINT_LIGHT_SHARE * l)]), parseHex(PAPER_HEX), TINT_PAPER);
    const pooled = mix(wash, parseHex(INK_HEX), 0.35);
    return [toHex(wash), toHex(pooled)];
};

export { PAPER, INK, washFor };
