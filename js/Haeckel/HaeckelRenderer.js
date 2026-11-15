'use strict';

import FizikoSVGRenderer from '../Fiziko/FizikoSVGRenderer.js';
import HaeckelSVGCanvas from './HaeckelSVGCanvas.js';
import RadialLayout from '../RadialLayout.js';
import { mulberry32, stringHash } from '../Fiziko/fizikoTextures.js';
import { handDrawnStroke, dotsPath, ellipsePoints, fitEllipse, hexLattice, spine, haloDots } from './haeckelGeometry.js';
import { INK } from './haeckelPalette.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const SCALE = FizikoSVGRenderer.GLOBAL_SCALE;   // canvas units per residue

// Ornament, in residue units unless noted.
const CAPSULE_MARGIN = 0.4;      // capsule ring beyond the furthest residue
const LATTICE_CELL = 0.42;       // honeycomb cell (hexagon circumradius)
const SPINE_LENGTH = 1.1;
const HALO_DEPTH = 1.6;          // how far the halo reaches beyond the capsule
const HALO_DOTS = 400;
const LABEL_OFFSET = 0.28;       // linkage label: off the bond's midpoint, to its right

// Haeckel renderer: FizikoSVGRenderer with the Haeckel canvas (wash,
// stipple, hand-drawn sepia ink on cream paper) and a radial layout.
//
// Ornament (`renderer.ornament`; off here, on in SNFGHaeckelOrnate below;
// keep it off where many glycans are drawn): 'light' draws a capsule - a
// double hand-drawn elliptical ring fitted round the glycan - and a spine
// out of each non-reducing end, tipped with a dot or a small fork; 'full'
// adds a radiolarian honeycomb inside the capsule (with pores at some of
// its corners) and a stippled halo outside it. Each layer is one path, so
// a glycan's ornament is under ten nodes.
//
// The layout: whatever engine the renderer is given (sviewer passes its
// own, with LINKS and residue identifiers) is wrapped in RadialLayout,
// which replaces only PerformLayout - the same override FragmentRenderer
// uses to wrap engines in FragmentLayout.
class SNFGHaeckel extends FizikoSVGRenderer {
    createCanvas(container) {
        return new HaeckelSVGCanvas(container);
    }

    constructor(container, layout) {
        super(container, layout);
        this.ornament = false;
        this.ornaments = new WeakMap();     // sugar -> its ornament <g>
        this.element.textureFor = () => ({
            texture: 'haeckel',
            roughness: 1,        // FizikoSVGCanvas draws buildWobblyOutline only when roughness > 0
            strokeWidth: 3.6,    // the ink outline, in icon units (viewBox 0 0 100 100)
            spacing: 3.4         // stipple cell, icon units
        });
    }

    get LayoutEngine() {
        return super.LayoutEngine;
    }

    set LayoutEngine(engine) {
        super.LayoutEngine = engine ? RadialLayout(engine) : engine;
    }

    // Linkage labels placed for a radial layout. Renderer's own placement
    // assumes a tree growing up from the origin (a level bond's label is
    // pinned near y = 0 - in a radial layout that is the core, so core
    // fucose's label landed beside the core mannose). Here each label sits
    // at its bond's midpoint, LABEL_OFFSET to the right of the bond as it
    // runs from parent to child: the same side of every spoke. The bond
    // itself (and any repeat brackets) is the base renderer's, drawn with
    // its label switched off, as SugarTextRenderer does. O(1) per linkage.
    renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas, show_labels) {
        const group = super.renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas, false);
        if (!show_labels || !parent_pos || !group) {
            return group;
        }
        const cx = (child_pos.x + child_pos.width / 2) * SCALE;
        const cy = (child_pos.y + child_pos.height / 2) * SCALE;
        const px = (parent_pos.x + parent_pos.width / 2) * SCALE;
        const py = (parent_pos.y + parent_pos.height / 2) * SCALE;
        const length = Math.hypot(cx - px, cy - py) || 1;
        // Right of the direction of travel (y down): (dx, dy) -> (-dy, dx).
        const nx = -(cy - py) / length;
        const ny = (cx - px) / length;
        const anomer = child.anomer === 'b' ? '\u03B2' : child.anomer === 'a' ? '\u03B1' : '?';
        const linkage = parent.linkageOf(child);
        const text = anomer + (linkage < 0 ? '' : (linkage || '?'));
        const label = group.text((px + cx) / 2 + nx * LABEL_OFFSET * SCALE, (py + cy) / 2 + ny * LABEL_OFFSET * SCALE, text);
        label.setAttribute('font-size', Math.floor(SCALE / 3));
        label.setAttribute('text-anchor', 'middle');
        label.firstChild.setAttribute('dy', '0.35em');
        return group;
    }

    refresh() {
        const done = super.refresh();
        for (const sugar of this.sugars) {
            this.ornaments.get(sugar)?.remove();
            this.ornaments.delete(sugar);
            if (this.ornament) {
                this.drawOrnament(sugar);
            }
        }
        return done;
    }

    // The ornament for one glycan, from its residues' final positions
    // (global_layout, after any horizontal turn), as the first child of its
    // container so it sits behind every residue and linkage. Seeded by the
    // sequence, so it is the same each time.
    // Cost: O(residues) for the capsule and spines; O((capsule / cell)^2)
    // lattice edges (a few hundred, one path); HALO_DOTS dots (one path).
    drawOrnament(sugar) {
        const container = this.rendered.get(sugar);
        const at = (res) => {
            const p = this.global_layout.get(res);
            return p ? [(p.x + p.width / 2) * SCALE, (p.y + p.height / 2) * SCALE] : null;
        };
        const residues = sugar.composition().filter((res) => at(res));
        if (!container || !residues.length) {
            return;
        }
        const capsule = fitEllipse(residues.map(at), { pad: (0.5 + CAPSULE_MARGIN) * SCALE, minAxis: 0.5 * SCALE });
        const rng = mulberry32(stringHash(sugar.sequence));
        const doc = container.element.ownerDocument;
        const group = doc.createElementNS(SVGNS, 'g');
        group.setAttribute('class', 'haeckel-ornament');
        const path = (d, attrs) => {
            const el = doc.createElementNS(SVGNS, 'path');
            el.setAttribute('d', d);
            for (const [k, v] of Object.entries(attrs)) {
                el.setAttribute(k, v);
            }
            group.appendChild(el);
        };
        const inset = (e, by) => ({ ...e, a: e.a - by, b: e.b - by });

        if (this.ornament === 'full') {
            const lattice = hexLattice(inset(capsule, 0.06 * SCALE), { cell: LATTICE_CELL * SCALE, rng });
            path(lattice.edges.map((edge) => handDrawnStroke(edge, { width: 1.3, wobble: 1.2, taper: 0.5, samples: 4, rng })).join(' '),
                { fill: INK, 'fill-opacity': 0.38 });
            const pores = lattice.vertices.filter(() => rng() < 0.22);
            path(dotsPath(pores, () => 3.5 + rng() * 2), { fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-opacity': 0.4 });
            const halo = haloDots(inset(capsule, -0.1 * SCALE), HALO_DEPTH * SCALE, { count: HALO_DOTS, rng });
            path(dotsPath(halo, () => 1 + rng() * 1.2), { fill: INK, 'fill-opacity': 0.55 });
        }

        // Capsule: a double ring.
        for (const [ring, width] of [[capsule, 2.6], [inset(capsule, 0.12 * SCALE), 1.2]]) {
            path(handDrawnStroke(ellipsePoints(ring, 96), { width, wobble: 3, closed: true, samples: 96, rng }),
                { fill: INK, 'fill-rule': 'evenodd' });
        }

        // Spines from the non-reducing ends, outwards from their parents.
        const spines = [];
        const tips = [];
        for (const res of residues.filter((r) => r.parent && r.children.length === 0 && at(r.parent))) {
            const [x, y] = at(res);
            const [px, py] = at(res.parent);
            const angle = Math.atan2(y - py, x - px);
            const start = [x + 0.6 * SCALE * Math.cos(angle), y + 0.6 * SCALE * Math.sin(angle)];
            const s = spine(start, angle, SPINE_LENGTH * SCALE, { rng });
            spines.push(handDrawnStroke(s.points, { width: 2, wobble: 1, taper: 0.25, samples: 10, rng }));
            if (rng() < 0.5) {
                tips.push(dotsPath([s.tip], () => 3.2));
            } else {
                for (const turn of [-0.45, 0.45]) {
                    const fork = spine(s.tip, s.heading + turn, 0.2 * SCALE, { curl: 0.1, samples: 4, rng });
                    spines.push(handDrawnStroke(fork.points, { width: 1.4, wobble: 0.4, taper: 0.2, samples: 4, rng }));
                }
            }
        }
        if (spines.length) {
            path(spines.join(' '), { fill: INK });
        }
        if (tips.length) {
            path(tips.join(''), { fill: INK });
        }

        container.element.insertBefore(group, container.element.firstChild);
        this.ornaments.set(sugar, group);
    }
}

// The Haeckel renderer with its full ornament on: a plate rather than a
// figure, for single large drawings.
class SNFGHaeckelOrnate extends SNFGHaeckel {
    constructor(container, layout) {
        super(container, layout);
        this.ornament = 'full';
    }
}

export { SNFGHaeckel, SNFGHaeckelOrnate };
export default SNFGHaeckel;
