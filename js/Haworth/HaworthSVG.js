/**
 * Renders pyranose residues as Haworth-projection SVG, from a terminii
 * string + real InChI (see HaworthLayout.js for scope/validation notes).
 *
 * Three entry points:
 *   renderResidueSVG()   -- one residue, standalone (used by the artifact
 *                           previews so far).
 *   renderGlycanSVG()    -- several residues at caller-supplied positions,
 *                           connected by real glycosidic bonds between
 *                           specific ring positions (e.g. a child's
 *                           anomeric C1 to a parent's C4). Branching is
 *                           just several linkages sharing a parent.
 *   renderSugarTreeSVG() -- a whole real residue tree (e.g. `sugar.root`),
 *                           positions computed automatically, branches
 *                           included -- see SugarLayout.js.
 */

import {
  layoutSubstituents,
  ringGeometry,
  layoutFuranoseSubstituents,
  furanoseGeometry,
  layoutSialicSubstituents,
} from './HaworthLayout.js';
import { sugarToHaworthInput } from './SugarLayout.js';

const STICK_LENGTH = 34;
const PLACEHOLDER_RADIUS = 40;

// Per-shape geometry + substituent-layout builder (see HaworthLayout.js).
// Sialic reuses the hexose hexagon outright -- same 6-membered ring, only
// the substituent-to-position mapping differs (handled inside
// layoutSialicSubstituents itself).
const SHAPE_BUILDERS = {
  hexose: { geometry: ringGeometry, layout: (terminii, inchi, opts) => layoutSubstituents(terminii, inchi, opts) },
  furanose: { geometry: furanoseGeometry, layout: (terminii, _inchi, opts) => layoutFuranoseSubstituents(terminii, opts) },
  sialic: { geometry: ringGeometry, layout: (terminii, inchi, opts) => layoutSialicSubstituents(terminii, inchi, opts) },
};

function vertexForPosition(position, vertices) {
  // position 1-4 are ring carbons C1..C4; position 5 is C5, which carries
  // the exocyclic C6 group rather than its own ring substituent. A
  // glycosidic linkage at ring position 6 (e.g. Man(a1-6)Man, an N-glycan
  // core branch) has no separate ring vertex of its own -- it bonds where
  // that exocyclic group already hangs, off C5. (A furanose ring never
  // uses position 6 at all; a sialic ring's position 6 -- its own real C6 --
  // already IS hexagon C5, so this remains correct there too.)
  if (position === 6) return vertices.C5;
  return vertices[`C${position}`];
}

// The ring oxygen vertex is named O5 for the hexose/sialic hexagon
// (position 5's neighbor) but O4 for the furanose pentagon (position 4's
// neighbor) -- found generically rather than hardcoding either name.
function ringOxygenVertex(vertices) {
  const key = Object.keys(vertices).find((k) => k[0] === 'O');
  return key ? vertices[key] : null;
}

// The exocyclic C6 group (CH2OH, COOH, CH3...) is always reported by
// layoutSubstituents as attached AT ring position 5 (there is no separate
// "position 6" substituent -- see HaworthLayout.js), so a linkage recorded
// at position 6 must suppress position 5's stick, not look for a
// nonexistent one of its own.
function substituentPositionFor(ringPosition) {
  return ringPosition === 6 ? 5 : ringPosition;
}

/**
 * Compute one residue's ring + substituent geometry, in its own local
 * coordinate frame (centered on (0,0)), without stringifying to SVG yet.
 * `suppressPositions` (a Set of ring positions) leaves out a substituent
 * stick at those positions -- used where a glycosidic bond takes its place.
 * `shape` ('hexose' | 'furanose' | 'sialic', default 'hexose') picks which
 * geometry + substituent layout to use -- see HaworthLayout.js.
 */
function layoutResidue(terminii, inchi, opts = {}) {
  const { anomer = 'b', suppressPositions = new Set(), shape = 'hexose' } = opts;
  const builder = SHAPE_BUILDERS[shape] ?? SHAPE_BUILDERS.hexose;
  const { vertices, bonds } = builder.geometry();
  const { substituents } = builder.layout(terminii, inchi, { anomer });
  return {
    vertices,
    bonds,
    // neverSuppress: some shapes (sialic) put two independent substituents
    // on the same vertex (the anomeric OH a glycosidic bond replaces, and
    // the COOH that's always there regardless) -- see
    // layoutSialicSubstituents.
    substituents: substituents.filter((s) => s.neverSuppress || !suppressPositions.has(s.position)),
  };
}

const BOLD_STROKE_WIDTH = 4.2;
const THIN_STROKE_WIDTH = 1.3;
const RING_LABEL_GAP = 11; // how far a ring bond stops short of a vertex that carries a letter label (the ring oxygen)

// Pull a line's endpoint back by `gap` along its own direction, so it stops
// just short of a labeled atom instead of running underneath its glyph --
// standard structural-drawing convention (and the same idea is used for
// every substituent stick below, where the gap is implicit in how far the
// label sits from the stick's own endpoint).
function shortenToward(from, to, gap) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= gap) return to;
  const t = (len - gap) / len;
  return { x: from.x + dx * t, y: from.y + dy * t };
}

const BOND_WIDTH = { thin: THIN_STROKE_WIDTH, bold: BOLD_STROKE_WIDTH };

// A ring bond whose two endpoints have the same width draws as a plain
// line; one whose endpoints differ (the hexose ring's tapered front-face
// wedge -- see ringGeometry()) draws as a filled trapezoid instead, since
// plain SVG strokes can't vary in width along their own length.
function bondPolygonPoints(a, b, wFrom, wTo) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const corners = [
    { x: a.x + (px * wFrom) / 2, y: a.y + (py * wFrom) / 2 },
    { x: b.x + (px * wTo) / 2, y: b.y + (py * wTo) / 2 },
    { x: b.x - (px * wTo) / 2, y: b.y - (py * wTo) / 2 },
    { x: a.x - (px * wFrom) / 2, y: a.y - (py * wFrom) / 2 },
  ];
  return corners.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function residueSVGParts(layout, offset) {
  const { vertices, bonds, substituents } = layout;
  const toScreen = (p) => ({ x: p.x + offset.x, y: p.y + offset.y });
  const parts = [];

  const ringOKey = Object.keys(vertices).find((k) => k[0] === 'O');

  for (const bond of bonds) {
    let a = toScreen(vertices[bond.from]);
    let b = toScreen(vertices[bond.to]);
    // Leave room for the ring oxygen's own "O" glyph, drawn at its exact
    // vertex position below, instead of running the bond lines all the way
    // under it.
    if (bond.to === ringOKey) b = shortenToward(a, b, RING_LABEL_GAP);
    if (bond.from === ringOKey) a = shortenToward(b, a, RING_LABEL_GAP);
    const wFrom = BOND_WIDTH[bond.widthFrom ?? (bond.bold ? 'bold' : 'thin')];
    const wTo = BOND_WIDTH[bond.widthTo ?? (bond.bold ? 'bold' : 'thin')];
    if (wFrom === wTo) {
      parts.push(
        `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="currentColor" stroke-width="${wFrom}" stroke-linecap="round"/>`
      );
    } else {
      parts.push(`<polygon points="${bondPolygonPoints(a, b, wFrom, wTo)}" fill="currentColor"/>`);
    }
  }
  const ringO = toScreen(ringOxygenVertex(vertices));
  parts.push(
    `<text x="${ringO.x.toFixed(1)}" y="${(ringO.y + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">O</text>`
  );

  for (const sub of substituents) {
    const ring = vertexForPosition(sub.position, vertices);
    if (!ring) continue;
    const screenRing = toScreen(ring);
    const dy = sub.orientation === 'up' ? -STICK_LENGTH : STICK_LENGTH;
    // Vertical wherever possible, per preference -- even though a purely
    // vertical stick from a corner vertex (C5, next to the ring oxygen) can
    // cross back through the ring's own interior when its orientation
    // points toward the opposite edge (e.g. IdoA's axial COOH at C5, or a
    // sialic acid's glycerol tail). Known, not fixed here.
    const stickEnd = { x: screenRing.x, y: screenRing.y + dy };
    // The label's own first character sits right where its stick ends (a
    // small vertical clearance only, not a separate floating gap), anchored
    // toward whichever side of the ring this vertex is on (not the stick's
    // own, now-vertical, direction) so it reads outward rather than back
    // over the ring.
    const textAnchor = ring.x > 1 ? 'start' : ring.x < -1 ? 'end' : 'middle';
    const textY = stickEnd.y + (dy < 0 ? -3 : 12);
    parts.push(
      `<line x1="${screenRing.x.toFixed(1)}" y1="${screenRing.y.toFixed(1)}" x2="${stickEnd.x.toFixed(1)}" y2="${stickEnd.y.toFixed(1)}" stroke="currentColor" stroke-width="${THIN_STROKE_WIDTH}"/>`
    );
    parts.push(
      `<text x="${stickEnd.x.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="${textAnchor}" font-size="13" fill="currentColor">${sub.label}</text>`
    );
  }
  return parts;
}

// A residue outside HaworthLayout.js's documented ring-shape scope (see
// SugarLayout.js's detectRingShape) is drawn as a plain labeled
// placeholder instead of a real Haworth ring, so a whole real glycan tree
// can still render without crashing or silently misreading its terminii.
function placeholderSVGParts(label, offset) {
  return [
    `<circle cx="${offset.x.toFixed(1)}" cy="${offset.y.toFixed(1)}" r="${PLACEHOLDER_RADIUS}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4 3"/>`,
    `<text x="${offset.x.toFixed(1)}" y="${(offset.y + 4).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">${label}</text>`,
  ];
}

// Where a glycosidic bond should touch this residue: a real ring vertex, or
// just the placeholder's own center (it has no ring positions of its own).
function anchorPoint(layout, position, offset) {
  if (layout.placeholder) return { x: offset.x, y: offset.y };
  const v = vertexForPosition(position, layout.vertices);
  return v ? { x: v.x + offset.x, y: v.y + offset.y } : null;
}

/**
 * @param {string} terminii
 * @param {string} inchi - the residue's real InChI (source of truth for
 *   orientation; see HaworthLayout.js)
 * @param {object} [opts]
 * @param {'a'|'b'} [opts.anomer='b']
 * @param {'hexose'|'furanose'|'sialic'} [opts.shape='hexose']
 * @param {number} [opts.width=260]
 * @param {number} [opts.height=220]
 * @param {string} [opts.title] - optional <title> element for accessibility/tooltips
 * @returns {string} an SVG element (no fixed stroke/fill colors -- draws in
 *   `currentColor`, so wrap it in an element with the desired `color` set)
 */
function renderResidueSVG(terminii, inchi, opts = {}) {
  const { anomer = 'b', shape = 'hexose', width = 260, height = 220, title } = opts;
  const layout = layoutResidue(terminii, inchi, { anomer, shape });
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif" color="currentColor">`
  );
  if (title) parts.push(`<title>${title}</title>`);
  parts.push(...residueSVGParts(layout, { x: width / 2, y: height / 2 }));
  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Render several residues connected by real glycosidic bonds. Branching is
 * just several linkages sharing the same parent -- there's nothing
 * chain-specific here, only the caller-supplied x/y per residue (see
 * SugarLayout.js's sugarToHaworthInput() for computing those automatically
 * from a real residue tree, branches included).
 *
 * @param {Array<{id: object, terminii: string|null, inchi: string|null,
 *   anomer?: 'a'|'b', shape?: 'hexose'|'furanose'|'sialic', x: number,
 *   y: number, label?: string, placeholder?: boolean}>} residues
 *   `x`/`y` are this residue's ring-center position on the shared canvas.
 *   `id` just needs to be usable as a Map key and compared with `===` --
 *   an object reference (e.g. the Monosaccharide node itself) works fine.
 *   `shape` defaults to 'hexose' if omitted. `placeholder: true` (with
 *   `terminii`/`inchi` left null) draws a plain labeled circle instead of a
 *   real Haworth ring, for a residue shape this renderer doesn't handle yet
 *   (see SugarLayout.js's detectRingShape).
 * @param {Array<{child: object, parent: object, parentPosition: number}>} linkages
 *   e.g. {child: gal, parent: glcNAc, parentPosition: 4} for a
 *   Gal-(1->4)-GlcNAc bond: the child's anomeric C1 connects to the
 *   parent's C4, in place of each residue's own OH stick there.
 *   parentPosition 6 bonds at C5 (where the exocyclic C6 group hangs off --
 *   there's no separate ring vertex for it).
 * @param {object} [opts]
 * @param {number} [opts.width=600]
 * @param {number} [opts.height=260]
 * @returns {string} an SVG element (draws in `currentColor`)
 */
function renderGlycanSVG(residues, linkages, opts = {}) {
  const { width = 600, height = 260 } = opts;

  const suppressByResidue = new Map(residues.map((r) => [r.id, new Set()]));
  for (const link of linkages) {
    suppressByResidue.get(link.child)?.add(1);
    suppressByResidue.get(link.parent)?.add(substituentPositionFor(link.parentPosition));
  }

  const layouts = new Map(
    residues.map((r) => [
      r.id,
      r.placeholder
        ? { placeholder: true }
        : layoutResidue(r.terminii, r.inchi, {
          anomer: r.anomer ?? 'b',
          shape: r.shape ?? 'hexose',
          suppressPositions: suppressByResidue.get(r.id),
        }),
    ])
  );

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif" color="currentColor">`
  );

  for (const r of residues) {
    const layout = layouts.get(r.id);
    if (layout.placeholder) {
      parts.push(...placeholderSVGParts(r.label ?? '?', { x: r.x, y: r.y }));
      continue;
    }
    parts.push(...residueSVGParts(layout, { x: r.x, y: r.y }));
    if (r.label) {
      parts.push(
        `<text x="${r.x.toFixed(1)}" y="${(r.y + 90).toFixed(1)}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.65">${r.label}</text>`
      );
    }
  }

  // Glycosidic bonds: a straight line from the child's anomeric (C1) point
  // to the parent's linkage-position point, with the bridging oxygen
  // labelled at its midpoint. Either end may be a placeholder (see above),
  // in which case the bond just touches its center.
  for (const link of linkages) {
    const child = residues.find((r) => r.id === link.child);
    const parent = residues.find((r) => r.id === link.parent);
    if (!child || !parent) continue;
    const a = anchorPoint(layouts.get(child.id), 1, { x: child.x, y: child.y });
    const b = anchorPoint(layouts.get(parent.id), link.parentPosition, { x: parent.x, y: parent.y });
    if (!a || !b) continue;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="currentColor" stroke-width="1.8"/>`
    );
    parts.push(
      `<text x="${mid.x.toFixed(1)}" y="${(mid.y - 5).toFixed(1)}" text-anchor="middle" font-size="12" fill="currentColor">O</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Render a whole real residue tree (e.g. `sugar.root`), automatically
 * resolving each residue's terminii/InChI and laying out branches without
 * overlap. Thin wrapper around sugarToHaworthInput() + renderGlycanSVG().
 *
 * @param {object} root - a Monosaccharide (e.g. a parsed Sugar's `.root`)
 * @param {object} [opts] - forwarded to sugarToHaworthInput() (spacing/margins)
 * @returns {{ svg: string, unsupported: Array }} `unsupported` lists any
 *   residues drawn as a placeholder instead of a real ring -- see
 *   SugarLayout.js.
 */
function renderSugarTreeSVG(root, opts = {}) {
  const { residues, linkages, width, height, unsupported } = sugarToHaworthInput(root, opts);
  const svg = renderGlycanSVG(residues, linkages, { width, height });
  return { svg, unsupported };
}

export { renderResidueSVG, renderGlycanSVG, renderSugarTreeSVG };
