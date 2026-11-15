'use strict';

import FizikoSVGCanvas from '../Fiziko/FizikoSVGCanvas.js';
import { mulberry32, circlePoints } from '../Fiziko/fizikoTextures.js';
import ORBITRON_BASE64 from './fonts/orbitronFont.js';

// Synthwave / outrun neon on FizikoSVGCanvas's clip-path machinery (icon
// extraction, clipping, <symbol> caching all reused). Residues are dark
// glass with a faint inner rim and scanlines, outlined in a neon tube of
// their own SNFG hue at full saturation; linkages are hot-magenta tubes;
// the ground is a violet night with stars and a magenta grid floor.
//
// Glow without filters: each tube is three strokes - wide and faint,
// medium, then a bright core. An SVG blur filter would be re-evaluated per
// pixel on every repaint; strokes cost nothing extra. The ground is CSS
// backgrounds on the root <svg> (small data-URI images and gradients),
// rasterised once by the browser and shared by every glycan on a page.

const FONT_FAMILY = "'Orbitron', 'Trebuchet MS', Verdana, sans-serif";
const LABEL = '#7df9ff';               // linkage labels: cyan
const LINK = '#ff2fa0';                // linkages: hot magenta
const LINK_CORE = '#ffd3ec';
const TUBE = [[24, 0.16], [11, 0.42], [4.6, 1]];       // icon units: [width, opacity], outermost first
const LINK_TUBE = [[16, 0.16], [7.5, 0.4], [3, 1]];    // canvas units
const SCANLINE_SPACING = 5;            // icon units

// '#rrggbb' (or '#rgb') -> [r, g, b]; null for anything else.
const parseHex = (hex) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) {
        return null;
    }
    const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const hueOf = ([r, g, b]) => {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max === min) {
        return null;      // grey or white: no hue
    }
    const d = max - min;
    const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return h * 60;
};

// An SNFG colour as neon: [tube, core, glass] as CSS colours - the hue at
// full saturation (yellow, green, blue, red, purple all stay apart), a
// near-white core of it, and a near-black glass tinted with it. Colourless
// residues glow white.
const neonFor = (snfg) => {
    const rgb = parseHex(snfg) || [200, 200, 200];
    const h = hueOf(rgb);
    if (h === null || Math.max(...rgb) - Math.min(...rgb) < 25) {
        return ['#e8f6ff', '#ffffff', '#0d0b1c'];
    }
    return [`hsl(${h.toFixed(0)}, 100%, 58%)`, `hsl(${h.toFixed(0)}, 100%, 88%)`, `hsl(${h.toFixed(0)}, 60%, 8%)`];
};

// The ground. Stars: a 300 px tile of seeded dots. Grid: a perspective
// floor - lines from a vanishing point above the image, rungs bunching up
// towards the horizon - stretched over the bottom of the drawing.
const STAR_TILE = 300;
const STARS = (() => {
    const rng = mulberry32(1977);
    let dots = '';
    for (let i = 0; i < 46; i++) {
        const r = (0.4 + rng() * rng() * 1.4).toFixed(2);
        dots += `<circle cx='${(rng() * STAR_TILE).toFixed(1)}' cy='${(rng() * STAR_TILE).toFixed(1)}' r='${r}' fill='white' opacity='${(0.35 + rng() * 0.6).toFixed(2)}'/>`;
    }
    return `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${STAR_TILE}' height='${STAR_TILE}'>${dots}</svg>`)}")`;
})();
const GRID = (() => {
    const w = 1000;
    const h = 300;
    let lines = '';
    for (let i = -14; i <= 14; i++) {
        lines += `M${(w / 2 + i * 18).toFixed(1)},0 L${(w / 2 + i * 150).toFixed(1)},${h} `;
    }
    for (let k = 0; k < 12; k++) {
        const y = h * Math.pow(k / 11, 1.9);
        lines += `M0,${y.toFixed(1)} L${w},${y.toFixed(1)} `;
    }
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'>`
        + `<path d='${lines}' stroke='#ff2fa0' stroke-width='5' opacity='0.1' fill='none'/>`
        + `<path d='${lines}' stroke='#ff6ec7' stroke-width='1.6' opacity='0.42' fill='none'/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

// Planets: square SVGs of a shaded sphere in one hue (bright highlight to
// dark edge) with a faint halo of it, some speckled.
const planet = (hue, { speckle, rng }) => {
    let dots = '';
    for (let i = 0; i < speckle; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 40;
        dots += `<circle cx='${(50 + r * Math.cos(a)).toFixed(1)}' cy='${(50 + r * Math.sin(a)).toFixed(1)}' r='${(0.5 + rng()).toFixed(2)}' fill='white' opacity='${(0.15 + rng() * 0.3).toFixed(2)}'/>`;
    }
    const stops = [[0, 92, 88], [0.32, 90, 58], [0.72, 80, 28], [1, 85, 9]]
        .map(([offset, sat, light]) => `<stop offset='${offset}' stop-color='hsl(${hue}, ${sat}%, ${light}%)'/>`).join('');
    const halo = `hsl(${hue}, 100%, 62%)`;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>`
        + `<defs><radialGradient id='s' cx='35%' cy='32%' r='70%'>${stops}</radialGradient>`
        + `<radialGradient id='h'><stop offset='0.8' stop-color='${halo}' stop-opacity='0.35'/><stop offset='1' stop-color='${halo}' stop-opacity='0'/></radialGradient></defs>`
        + `<circle cx='50' cy='50' r='50' fill='url(#h)'/><circle cx='50' cy='50' r='42' fill='url(#s)'/>${dots}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

const PLANET_HUES = [350, 330, 305, 275, 220, 195, 172, 24];   // red, pink, magenta, violet, blue, cyan, teal, orange

// A sky of planets for `seed`: two to four, at most one large (it may hang
// off an edge), the rest small, in the upper part of the sky and kept
// apart, each in its own hue. As background layers: [image, size, position].
// Cost: a few rng calls and one small SVG string per planet.
const planetsFor = (seed) => {
    const rng = mulberry32(seed);
    const hues = [...PLANET_HUES].sort(() => rng() - 0.5);
    const count = 2 + Math.floor(rng() * 3);
    const placed = [];
    for (let i = 0; i < count; i++) {
        const big = i === 0 && rng() < 0.75;
        const size = big ? 20 + rng() * 14 : 4 + rng() * 8;           // % of the width
        for (let tries = 0; tries < 12; tries++) {
            const x = big ? (rng() < 0.5 ? -8 + rng() * 14 : 94 + rng() * 14) : 4 + rng() * 92;
            const y = big ? -24 + rng() * 22 : 4 + rng() * 30;
            if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > (p.size + size) * 0.75 + 6)) {
                placed.push({ x, y, size, hue: hues[i % hues.length], speckle: rng() < 0.5 ? 20 + Math.floor(rng() * 12) : 0 });
                break;
            }
        }
    }
    return placed.map((p) => [planet(p.hue, { speckle: p.speckle, rng }), `${p.size.toFixed(1)}% auto`, `${p.x.toFixed(1)}% ${p.y.toFixed(1)}%`]);
};

class NeonSVGCanvas extends FizikoSVGCanvas {

    constructor(container) {
        super(container);
        this._planets = planetsFor(1977);
        this.ground = 'grid';
    }

    // A new sky of planets, the same for the same seed (the renderer seeds
    // it with the glycan's sequence).
    set skySeed(seed) {
        if (seed === this._skySeed) {
            return;
        }
        this._skySeed = seed;
        this._planets = planetsFor(seed);
        this.ground = this._ground;
    }

    static get LAZY_SYMBOLS() {
        return true;
    }

    // 'grid' (night, planets, stars, grid floor), 'stars' (no floor), or
    // false (the page's own background).
    set ground(value) {
        this._ground = value;
        const style = this.canvas.style;
        if (!value) {
            style.background = '';
            return;
        }
        const layers = [
            ...this._planets.map(([image, size, position]) => [image, size, position, 'no-repeat']),
            [STARS, `${STAR_TILE}px ${STAR_TILE}px`, '0 0', 'repeat'],
            ...(value === 'grid' ? [[GRID, '100% 28%', 'bottom', 'no-repeat']] : []),
            ['radial-gradient(ellipse at 50% 100%, rgba(255, 47, 160, 0.35), transparent 62%)', '100% 100%', '0 0', 'no-repeat'],
            ['linear-gradient(#090118, #1b0636 72%, #2c0848)', '100% 100%', '0 0', 'no-repeat']
        ];
        style.backgroundColor = '#090118';
        style.backgroundImage = layers.map((l) => l[0]).join(', ');
        style.backgroundSize = layers.map((l) => l[1]).join(', ');
        style.backgroundPosition = layers.map((l) => l[2]).join(', ');
        style.backgroundRepeat = layers.map((l) => l[3]).join(', ');
    }

    get ground() {
        return this._ground;
    }

    get fontFamily() {
        return FONT_FAMILY;
    }

    get labelFontFamily() {
        return FONT_FAMILY;
    }

    buildFontFaceCSS() {
        return `@font-face {
      font-family: 'Orbitron';
      src: url(data:font/truetype;charset=utf-8;base64,${ORBITRON_BASE64}) format('truetype');
    }`;
    }

    // Scanlines run level on screen however the residue is turned, so the
    // icon's rotation goes into its texture options (one cached icon per
    // rotation in use) and paintTexture turns them back by it.
    use(ref, x, y, width, height, rotation = 0) {
        const textureFor = this.textureFor;
        this.textureFor = (r) => {
            const requested = textureFor(r) || {};
            return requested.texture === 'neon' ? { ...requested, iconRotation: Math.round(rotation) } : requested;
        };
        try {
            return super.use(ref, x, y, width, height, rotation);
        } finally {
            this.textureFor = textureFor;
        }
    }

    // The 'neon' texture, inside the shape's clip: dark glass tinted with
    // the hue, scanlines (one path), and an inner rim of light (the shape's
    // own edge stroked wide, half of it clipped away).
    // Cost per distinct icon: three nodes and O(height / spacing) lines.
    paintTexture(target, geometry, opts, rng) {
        if (opts.texture !== 'neon') {
            return super.paintTexture(target, geometry, opts, rng);
        }
        const { bbox, center } = geometry;
        const [tube, , glass] = neonFor(opts.fill);
        const pad = Math.max(bbox.width, bbox.height);
        const dark = this.createElement('rect');
        dark.setAttribute('x', bbox.x - pad);
        dark.setAttribute('y', bbox.y - pad);
        dark.setAttribute('width', bbox.width + 2 * pad);
        dark.setAttribute('height', bbox.height + 2 * pad);
        dark.setAttribute('fill', glass);
        dark.setAttribute('stroke', 'none');
        target.appendChild(dark);

        let d = '';
        for (let y = bbox.y - pad; y < bbox.y + bbox.height + pad; y += SCANLINE_SPACING) {
            d += `M${(bbox.x - pad).toFixed(1)},${y.toFixed(1)}H${(bbox.x + bbox.width + pad).toFixed(1)}`;
        }
        const scan = this.createElement('path');
        scan.setAttribute('d', d);
        scan.setAttribute('stroke', tube);
        scan.setAttribute('stroke-opacity', 0.16);
        scan.setAttribute('stroke-width', 1);
        scan.setAttribute('fill', 'none');
        if (opts.iconRotation) {
            scan.setAttribute('transform', `rotate(${-opts.iconRotation} ${center.cx} ${center.cy})`);
        }
        target.appendChild(scan);

        const rim = this.createElement('path');
        rim.setAttribute('d', this.loopPath(geometry));
        rim.setAttribute('fill', 'none');
        rim.setAttribute('stroke', tube);
        rim.setAttribute('stroke-opacity', 0.3);
        rim.setAttribute('stroke-width', 14);
        target.appendChild(rim);
    }

    loopPath(geometry) {
        const points = geometry.points || circlePoints(geometry.center, geometry.radius, 64);
        return `M${points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')} Z`;
    }

    // The outline as a neon tube: three strokes of the shape's edge,
    // widest and faintest first, a near-white core last.
    buildWobblyOutline(geometry, opts) {
        const [tube, core] = neonFor(opts.fill);
        const group = this.createElement('g');
        const d = this.loopPath(geometry);
        TUBE.forEach(([width, opacity], i) => {
            const stroke = this.createElement('path');
            stroke.setAttribute('d', d);
            stroke.setAttribute('fill', 'none');
            stroke.setAttribute('stroke', i === TUBE.length - 1 ? core : tube);
            stroke.setAttribute('stroke-opacity', opacity);
            stroke.setAttribute('stroke-width', width);
            stroke.setAttribute('stroke-linejoin', 'round');
            group.appendChild(stroke);
        });
        return group;
    }

    // A linkage as a magenta neon tube: three straight strokes, ending
    // exactly on (x,y) and (x2,y2). Three nodes per linkage.
    line(x, y, x2, y2) {
        const group = this.createElement('g');
        LINK_TUBE.forEach(([width, opacity], i) => {
            const stroke = this.createElement('line');
            stroke.setAttribute('x1', x);
            stroke.setAttribute('y1', y);
            stroke.setAttribute('x2', x2);
            stroke.setAttribute('y2', y2);
            stroke.setAttribute('stroke', i === LINK_TUBE.length - 1 ? LINK_CORE : LINK);
            stroke.setAttribute('stroke-opacity', opacity);
            stroke.setAttribute('stroke-width', width);
            stroke.setAttribute('stroke-linecap', 'round');
            group.appendChild(stroke);
        });
        this.appendChild(group);
        return group;
    }

    // Labels in glowing cyan: the same text stroked wide and faint behind
    // its fill (paint-order), no filter.
    text(x, y, text, options = {}) {
        const el = super.text(x, y, text, options);
        el.setAttribute('fill', LABEL);
        el.setAttribute('stroke', LABEL);
        el.setAttribute('stroke-opacity', 0.3);
        el.setAttribute('stroke-width', 4);
        el.setAttribute('paint-order', 'stroke');
        return el;
    }
}

export default NeonSVGCanvas;
