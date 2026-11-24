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

import { layoutSubstituents, ringGeometry } from './HaworthLayout.js';
import { sugarToHaworthInput } from './SugarLayout.js';

const STICK_LENGTH = 34;
const PLACEHOLDER_RADIUS = 40;

function vertexForPosition(position, vertices) {
  // position 1-4 are ring carbons C1..C4; position 5 is C5, which carries
  // the exocyclic C6 group rather than its own ring substituent. A
  // glycosidic linkage at ring position 6 (e.g. Man(a1-6)Man, an N-glycan
  // core branch) has no separate ring vertex of its own -- it bonds where
  // that exocyclic group already hangs, off C5.
  if (position === 6) return vertices.C5;
  return vertices[`C${position}`];
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
 */
function layoutResidue(terminii, inchi, opts = {}) {
  const { anomer = 'b', suppressPositions = new Set() } = opts;
  const { vertices, bonds } = ringGeometry();
  const { substituents } = layoutSubstituents(terminii, inchi, { anomer });
  return {
    vertices,
    bonds,
    substituents: substituents.filter((s) => !suppressPositions.has(s.position)),
  };
}

function residueSVGParts(layout, offset) {
  const { vertices, bonds, substituents } = layout;
  const toScreen = (p) => ({ x: p.x + offset.x, y: p.y + offset.y });
  const parts = [];

  for (const bond of bonds) {
    const a = toScreen(vertices[bond.from]);
    const b = toScreen(vertices[bond.to]);
    const strokeWidth = bond.bold ? 3 : 1.4;
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
    );
  }
  const o5 = toScreen(vertices.O5);
  parts.push(
    `<text x="${o5.x.toFixed(1)}" y="${(o5.y - 6).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">O</text>`
  );

  for (const sub of substituents) {
    const ring = vertexForPosition(sub.position, vertices);
    if (!ring) continue;
    const screenRing = toScreen(ring);
    const dy = sub.orientation === 'up' ? -STICK_LENGTH : STICK_LENGTH;
    const labelY = screenRing.y + dy;
    const textAnchor = sub.position === 5 ? (dy < 0 ? 'end' : 'start') : 'middle';
    parts.push(
      `<line x1="${screenRing.x.toFixed(1)}" y1="${screenRing.y.toFixed(1)}" x2="${screenRing.x.toFixed(1)}" y2="${(labelY + (dy < 0 ? 8 : -8)).toFixed(1)}" stroke="currentColor" stroke-width="1.4"/>`
    );
    parts.push(
      `<text x="${screenRing.x.toFixed(1)}" y="${(labelY + (dy < 0 ? -2 : 10)).toFixed(1)}" text-anchor="${textAnchor}" font-size="13" fill="currentColor">${sub.label}</text>`
    );
  }
  return parts;
}

// A residue outside HaworthLayout.js's documented ring-shape scope (see
// SugarLayout.js's isSupportedRingShape) is drawn as a plain labeled
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
 * @param {number} [opts.width=260]
 * @param {number} [opts.height=220]
 * @param {string} [opts.title] - optional <title> element for accessibility/tooltips
 * @returns {string} an SVG element (no fixed stroke/fill colors -- draws in
 *   `currentColor`, so wrap it in an element with the desired `color` set)
 */
function renderResidueSVG(terminii, inchi, opts = {}) {
  const { anomer = 'b', width = 260, height = 220, title } = opts;
  const layout = layoutResidue(terminii, inchi, { anomer });
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
 *   anomer?: 'a'|'b', x: number, y: number, label?: string,
 *   placeholder?: boolean}>} residues
 *   `x`/`y` are this residue's ring-center position on the shared canvas.
 *   `id` just needs to be usable as a Map key and compared with `===` --
 *   an object reference (e.g. the Monosaccharide node itself) works fine.
 *   `placeholder: true` (with `terminii`/`inchi` left null) draws a plain
 *   labeled circle instead of a real Haworth ring, for a residue shape this
 *   renderer doesn't handle yet (see SugarLayout.js's isSupportedRingShape).
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
