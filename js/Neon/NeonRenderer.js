'use strict';

import FizikoSVGRenderer from '../Fiziko/FizikoSVGRenderer.js';
import NeonSVGCanvas from './NeonSVGCanvas.js';
import { stringHash } from '../Fiziko/fizikoTextures.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const SCALE = FizikoSVGRenderer.GLOBAL_SCALE;   // canvas units per residue

// Ornament, in residue units unless noted.
const FRAME_PAD = 0.45;         // first diamond beyond the residues
const FRAME_STEP = 0.32;        // between the parallel diamonds
const FRAMES = 3;
const FRAME_TUBE = [[9, 0.14], [4, 0.36], [1.6, 1]];   // canvas units: [width, opacity], outermost first
const FRAME = '#ff2fa0';
const FRAME_CORE = '#ffc6e6';
const STRIPES = ['#ff3b3b', '#ff9f1c', '#ffe14d', '#3dff8b', '#2fd8ff', '#5b6bff', '#c03bff'];
const STRIPE_GAP = 15;          // canvas units between stripes
const STRIPE_RISE = 3.2;        // how far the stripes rise above the frame

let nextGradient = 0;

// Synthwave / outrun neon renderer: FizikoSVGRenderer with the neon canvas
// (dark glass residues in neon tubes of their SNFG hue, magenta linkage
// tubes, Orbitron labels, a starry night with planets and a grid floor).
// The normal layout; every residue gets the same texture, coloured by its
// own hue.
//
// Ornament (`renderer.ornament`, on by default): three parallel neon
// diamonds (squares at 45 degrees) framing the glycan, and a band of rainbow
// stripes rising from the top of the frame and fading out - drawn behind
// every residue and linkage, from their final positions.
class SNFGNeon extends FizikoSVGRenderer {
    createCanvas(container) {
        return new NeonSVGCanvas(container);
    }

    constructor(container, layout) {
        super(container, layout);
        this.ornament = true;
        this.ornaments = new WeakMap();     // sugar -> its ornament <g>
        this.element.textureFor = () => ({
            texture: 'neon',
            roughness: 1        // FizikoSVGCanvas draws buildWobblyOutline only when roughness > 0
        });
    }

    refresh() {
        const done = super.refresh();
        // Each glycan its own sky of planets, the same every time.
        this.element.skySeed = stringHash(this.sugars.map((sugar) => sugar.sequence).join('+'));
        for (const sugar of this.sugars) {
            this.ornaments.get(sugar)?.remove();
            this.ornaments.delete(sugar);
            if (this.ornament) {
                this.drawOrnament(sugar);
            }
        }
        return done;
    }

    // The frame and stripes for one glycan, as the first child of its
    // container (behind everything else in it). The diamonds are centred on
    // the residue centres' box, the first just enclosing every residue
    // (|dx| + |dy| within its half-diagonal), each FRAME_STEP further out;
    // the stripes start where they meet the outer diamond's upper edges.
    // Cost: O(residues) to find the box; 3 nodes for the frame, 2 per
    // stripe plus its gradient.
    drawOrnament(sugar) {
        const container = this.rendered.get(sugar);
        const centres = sugar.composition()
            .map((res) => this.global_layout.get(res))
            .filter(Boolean)
            .map((p) => [(p.x + p.width / 2) * SCALE, (p.y + p.height / 2) * SCALE]);
        if (!container || !centres.length) {
            return;
        }
        const xs = centres.map((c) => c[0]);
        const ys = centres.map((c) => c[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        // Half-diagonal of the smallest 45-degree diamond holding every
        // residue (each with its radius and the padding round it).
        const reach = Math.max(...centres.map(([x, y]) => Math.abs(x - cx) + Math.abs(y - cy))) + (0.5 + FRAME_PAD) * SCALE * Math.SQRT2;
        const diamonds = Array.from({ length: FRAMES }, (_, i) => [reach + i * FRAME_STEP * SCALE, reach + i * FRAME_STEP * SCALE]);

        const doc = container.element.ownerDocument;
        const group = doc.createElementNS(SVGNS, 'g');
        group.setAttribute('class', 'neon-ornament');
        const el = (name, attrs, parent = group) => {
            const node = doc.createElementNS(SVGNS, name);
            for (const [k, v] of Object.entries(attrs)) {
                node.setAttribute(k, v);
            }
            parent.appendChild(node);
            return node;
        };

        const frame = diamonds.map(([a, b]) => `M${cx},${cy - b} L${cx + a},${cy} L${cx},${cy + b} L${cx - a},${cy} Z`).join(' ');
        FRAME_TUBE.forEach(([width, opacity], i) => el('path', {
            d: frame, fill: 'none', stroke: i === FRAME_TUBE.length - 1 ? FRAME_CORE : FRAME,
            'stroke-opacity': opacity, 'stroke-width': width, 'stroke-linejoin': 'round'
        }));

        // Rainbow stripes up from the outer diamond's upper edges, each
        // fading out as it rises.
        const [A, B] = diamonds[diamonds.length - 1];
        const top = cy - B - STRIPE_RISE * SCALE;
        const defs = el('defs', {});
        STRIPES.forEach((colour, i) => {
            const x = cx + (i - (STRIPES.length - 1) / 2) * STRIPE_GAP;
            const start = cy - B * (1 - Math.abs(x - cx) / A);
            const id = `neon-stripe-${nextGradient++}`;
            const gradient = el('linearGradient', { id, gradientUnits: 'userSpaceOnUse', x1: x, y1: start, x2: x, y2: top }, defs);
            el('stop', { offset: 0, 'stop-color': colour, 'stop-opacity': 1 }, gradient);
            el('stop', { offset: 1, 'stop-color': colour, 'stop-opacity': 0 }, gradient);
            for (const [width, opacity] of [[9, 0.3], [3.2, 1]]) {
                el('line', { x1: x, y1: start, x2: x, y2: top, stroke: `url(#${id})`, 'stroke-width': width, 'stroke-opacity': opacity, 'stroke-linecap': 'round' });
            }
        });

        container.element.insertBefore(group, container.element.firstChild);
        this.ornaments.set(sugar, group);
    }
}

export { SNFGNeon };
export default SNFGNeon;
