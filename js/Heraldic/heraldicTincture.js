'use strict';

// Heraldic tincture hatching (the Petra Sancta / Silvestre system - see
// https://en.wikipedia.org/wiki/Hatching_(heraldry)): each named heraldic
// color ("tincture") has a conventional line/dot pattern standing in for it
// in monochrome print. Here that's used the other way round - every SNFG
// residue already has its own fixed color, so it's classified to its
// nearest tincture and drawn with that tincture's pattern as a fiziko-style
// "ink" texture (the texture/hatchAngle/spacing options FizikoSVGCanvas's
// paintTexture already knows how to draw).

const hexToHsl = (hex) => {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) {
    return { h: 0, s: 0, l };
  }
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) {
    h = (g - b) / d + (g < b ? 6 : 0);
  } else if (max === g) {
    h = (b - r) / d + 2;
  } else {
    h = (r - g) / d + 4;
  }
  return { h: h * 60, s, l };
};

// Petra Sancta pattern per tincture. Angles follow fizikoTextures'
// hatchLines convention (0 = horizontal, 90 = vertical, 45/-45 = the two
// diagonals). jitter/roughness are kept low - heraldic hatching is
// conventionally crisp technical line work, not a hand-sketched texture.
const HERALDIC_PATTERNS = {
  argent: { tincture: 'argent', texture: 'solid' },
  or: { tincture: 'or', texture: 'dots', spacing: 6, dotRadius: 1.1 },
  gules: { tincture: 'gules', texture: 'hatch', hatchAngle: 90, spacing: 4 },
  azure: { tincture: 'azure', texture: 'hatch', hatchAngle: 0, spacing: 4 },
  sable: { tincture: 'sable', texture: 'crosshatch', hatchAngle: 0, hatchAngle2: 90, spacing: 4 },
  vert: { tincture: 'vert', texture: 'hatch', hatchAngle: 45, spacing: 4 },
  purpure: { tincture: 'purpure', texture: 'hatch', hatchAngle: -45, spacing: 4 },
  tenne: { tincture: 'tenne', texture: 'crosshatch', hatchAngle: 0, hatchAngle2: 45, spacing: 5 },
  sanguine: { tincture: 'sanguine', texture: 'crosshatch', hatchAngle: 45, hatchAngle2: -45, spacing: 5 }
};

// Buckets an arbitrary fill color into its nearest named tincture by
// hue/saturation/lightness - a stylistic classification (SNFG colors are
// already loose approximations of these named colors), not a colorimetric
// match.
const classifyTincture = (hex) => {
  const { h, s, l } = hexToHsl(hex);
  if (l > 0.92 && s < 0.15) {
    return 'argent';
  }
  if (l < 0.15 || s < 0.12) {
    return 'sable';
  }
  if (h < 15 || h >= 345) {
    return l > 0.65 ? 'sanguine' : 'gules';
  }
  if (h < 45) {
    return 'tenne';
  }
  if (h < 65) {
    return 'or';
  }
  if (h < 170) {
    return 'vert';
  }
  if (h < 255) {
    return 'azure';
  }
  if (h < 320) {
    return 'purpure';
  }
  return 'sanguine';
};

const tinctureForColor = (hex) => {
  if (!hex || hex === 'none') {
    return HERALDIC_PATTERNS.argent;
  }
  return HERALDIC_PATTERNS[classifyTincture(hex)];
};

export { tinctureForColor, classifyTincture, HERALDIC_PATTERNS };
export default tinctureForColor;
