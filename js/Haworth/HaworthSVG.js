/**
 * Renders pyranose residues as Haworth-projection SVG, from a terminii
 * string + real InChI (see HaworthLayout.js for scope/validation notes).
 *
 * Two entry points:
 *   renderResidueSVG()  -- one residue, standalone (used by the artifact
 *                          previews so far).
 *   renderGlycanSVG()   -- several residues placed side by side, connected
 *                          by real glycosidic bonds between specific ring
 *                          positions (e.g. a child's anomeric C1 to a
 *                          parent's C4), first step towards rendering a
 *                          whole parsed Sugar tree instead of one residue.
 */

import { layoutSubstituents, ringGeometry } from './HaworthLayout.js';

const STICK_LENGTH = 34;

function vertexForPosition(position, vertices) {
  // position 1-4 are ring carbons C1..C4; position 5 is C5, which carries
  // the exocyclic C6 group rather than its own ring substituent.
  return vertices[`C${position}`];
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
 * Render several residues connected by real glycosidic bonds.
 *
 * @param {Array<{id: string|number, terminii: string, inchi: string,
 *   anomer?: 'a'|'b', x: number, y: number, label?: string}>} residues
 *   `x`/`y` are this residue's ring-center position on the shared canvas.
 * @param {Array<{child: string|number, parent: string|number, parentPosition: number}>} linkages
 *   e.g. {child: 'Gal', parent: 'GlcNAc', parentPosition: 4} for a
 *   Gal-(1->4)-GlcNAc bond: the child's anomeric C1 connects to the
 *   parent's C4, in place of each residue's own OH stick there.
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
    suppressByResidue.get(link.parent)?.add(link.parentPosition);
  }

  const layouts = new Map(
    residues.map((r) => [
      r.id,
      layoutResidue(r.terminii, r.inchi, {
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
    parts.push(...residueSVGParts(layouts.get(r.id), { x: r.x, y: r.y }));
    if (r.label) {
      parts.push(
        `<text x="${r.x.toFixed(1)}" y="${(r.y + 90).toFixed(1)}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.65">${r.label}</text>`
      );
    }
  }

  // Glycosidic bonds: a straight line from the child's anomeric (C1) vertex
  // to the parent's linkage-position vertex, with the bridging oxygen
  // labelled at its midpoint.
  for (const link of linkages) {
    const child = residues.find((r) => r.id === link.child);
    const parent = residues.find((r) => r.id === link.parent);
    if (!child || !parent) continue;
    const childLayout = layouts.get(child.id);
    const parentLayout = layouts.get(parent.id);
    const c1 = childLayout.vertices.C1;
    const pPos = parentLayout.vertices[`C${link.parentPosition}`];
    if (!c1 || !pPos) continue;
    const a = { x: c1.x + child.x, y: c1.y + child.y };
    const b = { x: pPos.x + parent.x, y: pPos.y + parent.y };
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

export { renderResidueSVG, renderGlycanSVG };
