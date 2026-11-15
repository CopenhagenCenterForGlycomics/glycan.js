import Repeat from './Repeat.js';

// A radial layout in the manner of Haeckel's plates: the glycan grows out
// of a centre in every direction instead of up a tree.
//
// RadialLayout(base) wraps another layout engine (as FragmentLayout does):
// it keeps the base engine's LINKS and CalculateIdentifier and replaces
// only PerformLayout, so it can stand in wherever sviewer hands a renderer
// its engine. Positions are the same objects the other layouts produce
// ({x, y, width, height, r} per residue, residue units, r 0.5).
//
// The centre is the first residue from the reducing end with two or more
// main (non-side) children: the branching core mannose of an N-glycan, the
// GalNAc of a core 2 O-glycan. The residues below it form a stalk running
// straight down; their side residues (core fucose) branch off sideways.
// Around the centre each subtree gets an angular wedge in proportion to its
// leaves (side residues such as fucose count for less), leaving a gap where
// the stalk is, and depth sets the radius: each ring sits at least one bond
// further out, and further still where its wedges are too narrow for a
// residue to fit. A linear glycan has no centre and runs straight up.
//
// Repeats are laid out by the base engine (their brackets assume it).
// Cost: O(residues) per layout.

const BOND = 1.6;              // centre-to-centre bond length with linkage labels
const BOND_NO_LINKS = 1.2;     // without
const RESIDUE_GAP = 1.25;      // the least arc length between neighbouring residues on a ring
const STALK_GAP = 70;          // degrees left free around the stalk
const SIDE_WEDGE = 50;         // degrees for a side branch off the stalk
const SIDE_WEIGHT = 0.6;       // a side residue's share of a wedge, against 1 for a leaf
const SIDE_IDENTIFIERS = new Set(['Fuc', 'HSO3', 'Me', 'P', 'Ac']);

const DEG = Math.PI / 180;

const isSide = (res) => SIDE_IDENTIFIERS.has(res.identifier) && res.children.length === 0;

// Leaf weight of each residue's subtree. O(residues).
const subtreeWeights = (root) => {
    const weights = new Map();
    const visit = (res) => {
        const w = res.children.length
            ? res.children.reduce((sum, child) => sum + visit(child), 0)
            : (isSide(res) ? SIDE_WEIGHT : 1);
        weights.set(res, w);
        return w;
    };
    visit(root);
    return weights;
};

// The centre, the stalk from it down to the reducing end, and whether the
// glycan is linear (no residue with two main children).
const findCentre = (root) => {
    const stalk = [];
    let res = root;
    for (;;) {
        const main = res.children.filter((child) => !isSide(child));
        if (main.length !== 1) {
            break;
        }
        stalk.push(res);
        res = main[0];
    }
    if (res.children.filter((child) => !isSide(child)).length < 2) {
        return { centre: root, stalk: [], linear: true };
    }
    return { centre: res, stalk, linear: false };
};

const RadialLayout = (base) => class extends base {

    static PerformLayout(sugar) {
        const root = sugar.root;
        const residues = root ? [...sugar.breadth_first_traversal()] : [];
        if (!residues.length || residues.some((res) => res instanceof Repeat.Monosaccharide)) {
            return super.PerformLayout(sugar);
        }
        const bond = this.LINKS ? BOND : BOND_NO_LINKS;
        const weights = subtreeWeights(root);
        const { centre, stalk, linear } = findCentre(root);
        const centres = new Map();     // residue -> [x, y], y down
        const wedges = new Map();      // crown residue -> [from, to] degrees
        const depth = new Map();

        // Stalk: straight down from the centre, reducing end lowest.
        centres.set(centre, [0, 0]);
        stalk.slice().reverse().forEach((res, i) => centres.set(res, [0, bond * (i + 1)]));

        // Crown: wedges by weight, all round but for a gap at the bottom
        // (where the stalk is, if there is one); a linear glycan grows upwards.
        const down = 90;
        const [from, to] = linear ? [-90, -90] : [down + STALK_GAP / 2, down + 360 - STALK_GAP / 2];
        wedges.set(centre, [from, to]);
        depth.set(centre, 0);
        const crown = [centre];
        for (let i = 0; i < crown.length; i++) {
            const res = crown[i];
            const [a0, a1] = wedges.get(res);
            const total = res.children.reduce((sum, child) => sum + weights.get(child), 0) || 1;
            let a = a0;
            for (const child of res.children) {
                const span = (a1 - a0) * weights.get(child) / total;
                wedges.set(child, [a, a + span]);
                depth.set(child, depth.get(res) + 1);
                crown.push(child);
                a += span;
            }
        }
        // Ring radii: a bond further out than the ring inside, and far enough
        // out that each residue's wedge holds RESIDUE_GAP of arc.
        const rings = [0];
        for (const res of crown.slice(1)) {
            const d = depth.get(res);
            const [a0, a1] = wedges.get(res);
            const needed = (a1 - a0) > 0 ? RESIDUE_GAP / ((a1 - a0) * DEG) : 0;
            rings[d] = Math.max(rings[d] || 0, needed);
        }
        for (let d = 1; d < rings.length; d++) {
            rings[d] = Math.max(rings[d], rings[d - 1] + bond);
        }
        for (const res of crown.slice(1)) {
            const [a0, a1] = wedges.get(res);
            const angle = (a0 === a1 ? a0 : (a0 + a1) / 2) * DEG;
            const r = rings[depth.get(res)];
            centres.set(res, [r * Math.cos(angle), r * Math.sin(angle)]);
        }

        // Side branches off the stalk (e.g. core fucose): a small radial
        // fan of their own, to the right first, then the left.
        let side = 0;
        for (const res of stalk) {
            const onStalk = new Set([...stalk, centre]);
            for (const child of res.children.filter((c) => !onStalk.has(c))) {
                const heading = side++ % 2 === 0 ? 0 : 180;
                this.layoutFan(child, centres.get(res), heading - SIDE_WEDGE / 2, heading + SIDE_WEDGE / 2, bond, weights, centres);
            }
        }

        const layout = new WeakMap();
        for (const res of residues) {
            const at = centres.get(res);
            if (!at) {
                continue;
            }
            const r = res.identifier === 'HSO3' ? 0.25 : 0.5;
            layout.set(res, { x: at[0] - r, y: at[1] - r, width: 2 * r, height: 2 * r, r, collision: [] });
        }
        return layout;
    }

    // A subtree laid out as a fan from `origin` within [a0, a1] degrees,
    // a bond further out per generation. O(subtree).
    static layoutFan(res, origin, a0, a1, bond, weights, centres, generation = 1) {
        const angle = ((a0 + a1) / 2) * DEG;
        centres.set(res, [origin[0] + generation * bond * Math.cos(angle), origin[1] + generation * bond * Math.sin(angle)]);
        const total = res.children.reduce((sum, child) => sum + weights.get(child), 0) || 1;
        let a = a0;
        for (const child of res.children) {
            const span = (a1 - a0) * weights.get(child) / total;
            this.layoutFan(child, origin, a, a + span, bond, weights, centres, generation + 1);
            a += span;
        }
    }
};

export { RadialLayout };
export default RadialLayout;
