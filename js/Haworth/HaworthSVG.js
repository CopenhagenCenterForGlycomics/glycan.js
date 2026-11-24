/**
 * Renders a single pyranose residue as a Haworth-projection SVG string,
 * from a terminii string + its real InChI (see HaworthLayout.js for
 * scope/validation notes, and why both are needed).
 */

import { layoutSubstituents, ringGeometry } from './HaworthLayout.js';

const STICK_LENGTH = 34;

function vertexForPosition(position, vertices) {
  // position 1-4 are ring carbons C1..C4; position 5 is C5, which carries
  // the exocyclic C6 group rather than its own ring substituent.
  return vertices[`C${position}`];
}

/**
 * @param {string} terminii
 * @param {string} inchi - the residue's real InChI (source of truth for
 *   orientation; see HaworthLayout.js)
 * @param {object} [opts]
 * @param {'a'|'b'} [opts.anomer='b']
 * @param {boolean} [opts.isL=false]
 * @param {number} [opts.width=260]
 * @param {number} [opts.height=220]
 * @param {string} [opts.title] - optional <title> element for accessibility/tooltips
 * @returns {string} an SVG element (no fixed stroke/fill colors -- draws in
 *   `currentColor`, so wrap it in an element with the desired `color` set)
 */
function renderResidueSVG(terminii, inchi, opts = {}) {
  const { anomer = 'b', isL = false, width = 260, height = 220, title } = opts;
  const { vertices, bonds } = ringGeometry();
  const { substituents } = layoutSubstituents(terminii, inchi, { anomer, isL });

  const cx = width / 2;
  const cy = height / 2;
  const toScreen = (p) => ({ x: p.x + cx, y: p.y + cy });

  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif" color="currentColor">`
  );
  if (title) parts.push(`<title>${title}</title>`);

  // Ring bonds
  for (const bond of bonds) {
    const a = toScreen(vertices[bond.from]);
    const b = toScreen(vertices[bond.to]);
    const strokeWidth = bond.bold ? 3 : 1.4;
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`
    );
  }
  // Ring oxygen label, nudged slightly off its vertex so the bonds aren't
  // obscured by the letter.
  const o5 = toScreen(vertices.O5);
  parts.push(
    `<text x="${o5.x.toFixed(1)}" y="${(o5.y - 6).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">O</text>`
  );

  // Substituent sticks + labels
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

  parts.push('</svg>');
  return parts.join('\n');
}

export { renderResidueSVG };
