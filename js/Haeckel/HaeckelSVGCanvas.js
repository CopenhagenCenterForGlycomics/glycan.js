'use strict';

import FizikoSVGCanvas from '../Fiziko/FizikoSVGCanvas.js';
import { mulberry32, hashSeed, circlePoints, lightVector, inkDensityAt } from '../Fiziko/fizikoTextures.js';
import { handDrawnStroke, stipplePoints, dotsPath } from './haeckelGeometry.js';
import { PAPER, INK, washFor } from './haeckelPalette.js';
import EB_GARAMOND_ITALIC_BASE64 from './fonts/ebGaramondFont.js';

// A naturalist's lithograph plate after Haeckel's Kunstformen der Natur,
// on FizikoSVGCanvas's clip-path machinery (icon extraction, clipping,
// <symbol> caching all reused). Each residue, bottom to top: paper, a
// translucent watercolour wash slightly off register with a darker edge
// where the pigment pools, stippled tone lit from the upper left, and a
// hand-drawn sepia outline. Linkages are pen strokes with a slight bow.
// Labels in a small italic serif.

const FONT_FAMILY = "'EB Garamond Italic', Georgia, 'Times New Roman', serif";
const LIGHT_ANGLE = -135;       // upper left (y down)
const WASH_OPACITY = 0.82;
const MISREGISTER = 2.2;        // icon units (viewBox 100): about 1 px at usual sizes
const POOL_WIDTH = 5;           // icon units: the pooled edge, inside the shape
const DOT_RADIUS = [0.55, 1.05];  // icon units
const LINE_WIDTH = 2.6;         // canvas units, at the middle of a linkage
const LINE_SAMPLES = 14;        // per linkage: not cached, so kept small
const LINE_BOW = 0.03;          // the most a linkage bows, as a share of its length

// The outline of a shape as points (polygons/paths carry them; circles
// are sampled). O(samples).
const loopOf = (geometry) => geometry.points || circlePoints(geometry.center, geometry.radius, 48);

const loopPath = (points) => `M${points.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')} Z`;

class HaeckelSVGCanvas extends FizikoSVGCanvas {

    constructor(container) {
        super(container);
        this.lineWidth = LINE_WIDTH;
        this.wobble = 1.2;              // icon units: about 0.6 px at usual sizes
        this.stippleDensity = 1.0;
        this.ground = 'paper';
    }

    static get LAZY_SYMBOLS() {
        return true;
    }

    // Cream paper behind the drawing; false leaves the page's background.
    set ground(value) {
        this._ground = value;
        this.canvas.style.backgroundColor = value ? PAPER : '';
    }

    get ground() {
        return this._ground;
    }

    get fontFamily() {
        return FONT_FAMILY;
    }

    // Drawn on paper: the amino-acid label and backbone stay sepia ink in
    // either page theme, like every other line on the plate.
    get inkColor() {
        return INK;
    }

    get labelFontFamily() {
        return FONT_FAMILY;
    }

    buildFontFaceCSS() {
        return `@font-face {
      font-family: 'EB Garamond Italic';
      src: url(data:font/truetype;charset=utf-8;base64,${EB_GARAMOND_ITALIC_BASE64}) format('truetype');
    }`;
    }

    // The light should come from the upper left of the screen however the
    // residue is turned, so the icon's rotation goes into its texture
    // options (one cached icon per rotation in use) and the light is turned
    // back by it in paintTexture.
    use(ref, x, y, width, height, rotation = 0) {
        const textureFor = this.textureFor;
        this.textureFor = (r) => {
            const requested = textureFor(r) || {};
            return requested.texture === 'haeckel' ? { ...requested, iconRotation: Math.round(rotation) } : requested;
        };
        try {
            return super.use(ref, x, y, width, height, rotation);
        } finally {
            this.textureFor = textureFor;
        }
    }

    // The 'haeckel' texture, inside the shape's clip (appendClippedTexture):
    // paper (Fiziko's backing is white), the wash shape filled and nudged
    // off register, its pooled edge, then stipple as one path of dots.
    // Cost per distinct icon: O(bbox area / spacing^2) for the stipple
    // (about 100-300 dots, one node), O(outline) for the rest.
    paintTexture(target, geometry, opts, rng) {
        if (opts.texture !== 'haeckel') {
            return super.paintTexture(target, geometry, opts, rng);
        }
        const { bbox, center } = geometry;
        const [wash, pooled] = washFor(opts.fill);
        const paper = this.createElement('rect');
        paper.setAttribute('x', bbox.x - 2);
        paper.setAttribute('y', bbox.y - 2);
        paper.setAttribute('width', bbox.width + 4);
        paper.setAttribute('height', bbox.height + 4);
        paper.setAttribute('fill', PAPER);
        paper.setAttribute('stroke', 'none');
        target.appendChild(paper);

        const angle = rng() * Math.PI * 2;
        const shift = MISREGISTER * (0.5 + 0.5 * rng());
        const washGroup = this.createElement('g');
        washGroup.setAttribute('transform', `translate(${(shift * Math.cos(angle)).toFixed(2)} ${(shift * Math.sin(angle)).toFixed(2)})`);
        const shape = loopPath(loopOf(geometry));
        const fill = this.createElement('path');
        fill.setAttribute('d', shape);
        fill.setAttribute('fill', wash);
        fill.setAttribute('fill-opacity', WASH_OPACITY);
        fill.setAttribute('stroke', pooled);
        fill.setAttribute('stroke-opacity', 0.3);
        fill.setAttribute('stroke-width', POOL_WIDTH * 2);   // half falls outside the clip
        washGroup.appendChild(fill);
        target.appendChild(washGroup);

        // Tone: a dome lit from the upper left (screen), so denser dots on
        // the lower right and towards the edges.
        const light = lightVector(LIGHT_ANGLE - (opts.iconRotation || 0));
        const R = geometry.radius || Math.max(bbox.width, bbox.height) / 2;
        const density = (x, y) => {
            const nx = (x - center.cx) / R;
            const ny = (y - center.cy) / R;
            const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
            return Math.min(1, Math.pow(inkDensityAt([nx, ny, nz], light), 1.6) * 0.75 * this.stippleDensity);
        };
        const dots = stipplePoints(bbox, { spacing: opts.spacing, density, rng });
        const radii = dots.map(() => DOT_RADIUS[0] + (DOT_RADIUS[1] - DOT_RADIUS[0]) * rng());
        const stipple = this.createElement('path');
        stipple.setAttribute('d', dotsPath(dots, (i) => radii[i]));
        stipple.setAttribute('fill', INK);
        stipple.setAttribute('fill-opacity', 0.75);
        stipple.setAttribute('stroke', 'none');
        target.appendChild(stipple);
    }

    // A hand-drawn sepia outline: the shape's own outline as one closed
    // pen stroke with a slow wobble and gently varying width.
    // O(outline samples).
    buildWobblyOutline(geometry, opts, rng) {
        const outline = this.createElement('path');
        outline.setAttribute('d', handDrawnStroke(loopOf(geometry), {
            width: opts.strokeWidth, wobble: this.wobble, closed: true, samples: 44, rng
        }));
        outline.setAttribute('fill', INK);
        outline.setAttribute('fill-rule', 'evenodd');
        return outline;
    }

    // A linkage as a pen stroke: a quadratic curve bowed slightly to one
    // side (at most LINE_BOW of its length), swelling mid-stroke and
    // tapering at the ends, which sit exactly on (x,y) and (x2,y2).
    // O(LINE_SAMPLES) per linkage.
    line(x, y, x2, y2) {
        const rng = mulberry32(hashSeed(x, y, x2, y2));
        const dx = x2 - x;
        const dy = y2 - y;
        const len = Math.hypot(dx, dy) || 1;
        const bow = len * LINE_BOW * (rng() * 2 - 1);
        const cx = (x + x2) / 2 - dy / len * bow;
        const cy = (y + y2) / 2 + dx / len * bow;
        const curve = [];
        for (let i = 0; i <= LINE_SAMPLES; i++) {
            const t = i / LINE_SAMPLES;
            const u = 1 - t;
            curve.push([u * u * x + 2 * u * t * cx + t * t * x2, u * u * y + 2 * u * t * cy + t * t * y2]);
        }
        const path = this.createElement('path');
        path.setAttribute('d', handDrawnStroke(curve, {
            width: this.lineWidth, wobble: 0.5, taper: 0.3, samples: LINE_SAMPLES, rng
        }));
        path.setAttribute('fill', INK);
        path.setAttribute('stroke', 'none');
        this.appendChild(path);
        return path;
    }

    text(x, y, text, options = {}) {
        const el = super.text(x, y, text, options);
        el.setAttribute('fill', INK);
        return el;
    }
}

export default HaeckelSVGCanvas;
