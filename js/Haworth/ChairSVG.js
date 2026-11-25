/**
 * Renders pyranose residues as chair-conformation SVG -- a sibling to
 * HaworthSVG.js, same three entry points, same chemistry (layoutSubstituents/
 * layoutSialicSubstituents, imported straight from HaworthLayout.js,
 * completely unchanged), same suppression/label-override/linkage-anchoring
 * CONCEPTS (applySubstituentOverrides, shortenToward, substituentPositionFor,
 * LINKAGE_INSET/LINKAGE_LABEL_GAP, placeholderSVGParts, orientLabel -- all
 * reused directly from HaworthSVG.js, not reimplemented). What differs is
 * purely geometric: ChairLayout.js's own ring outline and substituent-stick
 * direction (axial vertical / equatorial diagonal) in place of
 * HaworthLayout.js's ellipse and always-vertical stick -- see that module's
 * own docstring for the chemistry-to-geometry mapping.
 *
 * Scoped to the hexose/sialic shapes only -- see ChairLayout.js; a furanose
 * residue falls back to the same placeholder every other unsupported shape
 * gets (see renderSugarTreeChairSVG's own `unsupported` list).
 */

import { layoutSubstituents, layoutSialicSubstituents } from './HaworthLayout.js';
import { chairGeometry, chairStickEnd, substituentZSignFor } from './ChairLayout.js';
import {
  applySubstituentOverrides,
  vertexForPosition,
  substituentPositionFor,
  shortenToward,
  placeholderSVGParts,
  orientLabel,
  LINKAGE_INSET,
  LINKAGE_LABEL_GAP,
} from './HaworthSVG.js';
import { sugarToHaworthInput } from './SugarLayout.js';

// Same values as HaworthSVG.js's own (not exported from there -- small
// enough to duplicate rather than widen that file's export surface for two
// numbers).
const BOLD_STROKE_WIDTH = 4.2;
const MEDIUM_STROKE_WIDTH = 3.2; // C2-C3's own slight taper -- see ChairLayout.js's own chairGeometry comment
const THIN_STROKE_WIDTH = 1.3;
const RING_LABEL_GAP = 11;
const LABEL_ANCHOR_NUDGE = 4.5;

const CHAIR_SHAPE_BUILDERS = {
  hexose: { geometry: chairGeometry, layout: (terminii, inchi, opts) => layoutSubstituents(terminii, inchi, opts) },
  sialic: { geometry: chairGeometry, layout: (terminii, inchi, opts) => layoutSialicSubstituents(terminii, inchi, opts) },
};

/**
 * Compute one residue's chair ring + substituent geometry -- the chair
 * counterpart to HaworthSVG.js's layoutResidue, same opts (anomer,
 * stickOnlyPositions, labelOverrides, shape), same suppression/override
 * rules (applySubstituentOverrides, reused verbatim). Returns null for a
 * shape with no chair geometry (furanose, or anything HaworthLayout.js
 * itself doesn't know), so a caller falls back to a placeholder instead of
 * guessing at a ring that was never built.
 */
function layoutChairResidue(terminii, inchi, opts = {}) {
  const { anomer = 'b', stickOnlyPositions = new Set(), labelOverrides = new Map(), shape = 'hexose' } = opts;
  const builder = CHAIR_SHAPE_BUILDERS[shape];
  if (!builder) return null;
  const { vertices, bonds } = builder.geometry();
  const { substituents } = builder.layout(terminii, inchi, { anomer });
  // A chair ring is rigid -- every position shares the same pucker
  // handedness (see ChairLayout.js's own substituentZSignFor docstring),
  // so this is resolved ONCE per residue here (from the anomeric
  // position's own real data, always present) and reused for every
  // equatorial stick on this residue, rather than re-derived per
  // substituent.
  const reference = substituents.find((s) => s.position === 1 && !s.neverSuppress) ?? substituents[0];
  const zSign = reference ? substituentZSignFor(reference.position, reference.orientation, reference.axEq) : 1;
  return {
    vertices,
    bonds,
    zSign,
    substituents: applySubstituentOverrides(substituents, { stickOnlyPositions, labelOverrides }),
  };
}

function bondWidth(w) {
  if (w === 'bold') return BOLD_STROKE_WIDTH;
  if (w === 'medium') return MEDIUM_STROKE_WIDTH;
  return THIN_STROKE_WIDTH;
}

function chairResidueSVGParts(layout, offset) {
  const { vertices, bonds, substituents } = layout;
  const toScreen = (p) => ({ x: p.x + offset.x, y: p.y + offset.y });
  const parts = [];

  const ringOKey = Object.keys(vertices).find((k) => k[0] === 'O');

  // Every chair bond is uniform-width along its own length (see
  // ChairLayout.js's own chairGeometry docstring) -- always a plain line,
  // never Haworth's tapered polygon.
  for (const bond of bonds) {
    let a = toScreen(vertices[bond.from]);
    let b = toScreen(vertices[bond.to]);
    if (bond.to === ringOKey) b = shortenToward(a, b, RING_LABEL_GAP);
    if (bond.from === ringOKey) a = shortenToward(b, a, RING_LABEL_GAP);
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="currentColor" stroke-width="${bondWidth(bond.width)}" stroke-linecap="round"/>`
    );
  }
  const ringO = toScreen(vertices[ringOKey]);
  parts.push(
    `<text x="${ringO.x.toFixed(1)}" y="${(ringO.y + 4.5).toFixed(1)}" text-anchor="middle" font-size="13" fill="currentColor">O</text>`
  );

  for (const sub of substituents) {
    const ring = vertexForPosition(sub.position, vertices);
    if (!ring) continue;
    const screenRing = toScreen(ring);
    const localStickEnd = chairStickEnd(vertices, sub.position, sub.orientation, sub.axEq, layout.zSign);
    const stickEnd = toScreen(localStickEnd);
    parts.push(
      `<line x1="${screenRing.x.toFixed(1)}" y1="${screenRing.y.toFixed(1)}" x2="${stickEnd.x.toFixed(1)}" y2="${stickEnd.y.toFixed(1)}" stroke="currentColor" stroke-width="${THIN_STROKE_WIDTH}"/>`
    );
    if (!sub.label) continue;
    // Anchored toward the STICK's own horizontal direction (an equatorial
    // stick can extend either way regardless of which side of the ring
    // its vertex sits on) -- falling back to the vertex's own side for a
    // near-vertical (axial) stick, same convention HaworthSVG.js uses for
    // its always-vertical sticks.
    const dx = localStickEnd.x - ring.x;
    const dy = localStickEnd.y - ring.y;
    const textAnchor = Math.abs(dx) > 1 ? (dx > 0 ? 'start' : 'end') : ring.x > 0 ? 'start' : 'end';
    const textY = stickEnd.y + (dy < 0 ? -3 : 12);
    const textX =
      stickEnd.x + (textAnchor === 'start' ? -LABEL_ANCHOR_NUDGE : textAnchor === 'end' ? LABEL_ANCHOR_NUDGE : 0);
    parts.push(
      `<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="${textAnchor}" font-size="13" fill="currentColor">${orientLabel(sub.label, textAnchor)}</text>`
    );
  }
  return parts;
}

// Where a glycosidic bond should touch this residue -- the chair
// counterpart to HaworthSVG.js's anchorPoint, same concept (a linkage
// child's own anomeric stick, kept unlabeled rather than suppressed
// entirely, is what the bond continues on from), just chairStickEnd's
// axial/equatorial-aware direction instead of a plain vertical one.
function chairAnchorPoint(layout, position, offset) {
  if (layout.placeholder) return { x: offset.x, y: offset.y };
  const v = vertexForPosition(position, layout.vertices);
  if (!v) return null;
  const stickPosition = substituentPositionFor(position);
  const stickSub = layout.substituents.find((s) => s.position === stickPosition && !s.label);
  const local = stickSub ? chairStickEnd(layout.vertices, stickSub.position, stickSub.orientation, stickSub.axEq, layout.zSign) : v;
  return { x: local.x + offset.x, y: local.y + offset.y };
}

/**
 * @param {string} terminii
 * @param {string} inchi
 * @param {object} [opts]
 * @param {'a'|'b'} [opts.anomer='b']
 * @param {'hexose'|'sialic'} [opts.shape='hexose']
 * @param {number} [opts.width=260]
 * @param {number} [opts.height=220]
 * @param {string} [opts.title]
 * @returns {string} an SVG element (draws in `currentColor`)
 */
function renderResidueChairSVG(terminii, inchi, opts = {}) {
  const { anomer = 'b', shape = 'hexose', width = 260, height = 220, title } = opts;
  const layout = layoutChairResidue(terminii, inchi, { anomer, shape });
  const parts = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" font-family="Georgia, 'Times New Roman', serif" color="currentColor">`
  );
  if (title) parts.push(`<title>${title}</title>`);
  parts.push(
    ...(layout ? chairResidueSVGParts(layout, { x: width / 2, y: height / 2 }) : placeholderSVGParts(title ?? '?', { x: width / 2, y: height / 2 }))
  );
  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Render several residues connected by real glycosidic bonds -- the chair
 * counterpart to HaworthSVG.js's renderGlycanSVG, identical input shape
 * (residues/linkages/modifications), identical glycosidic-bond convention
 * (both ends connect flush to their own stick, inline bridging "O" in a
 * gap at the midpoint). A residue whose shape has no chair geometry
 * (furanose) draws as a placeholder regardless of its own `placeholder`
 * flag -- see renderSugarTreeChairSVG, which computes that distinction.
 */
function renderGlycanChairSVG(residues, linkages, opts = {}) {
  const { width = 600, height = 260 } = opts;

  const stickOnlyByResidue = new Map(residues.map((r) => [r.id, new Set()]));
  for (const link of linkages) {
    stickOnlyByResidue.get(link.child)?.add(1);
    stickOnlyByResidue.get(link.parent)?.add(substituentPositionFor(link.parentPosition));
  }

  const labelOverridesByResidue = new Map(residues.map((r) => [r.id, new Map()]));
  for (const r of residues) {
    for (const mod of r.modifications ?? []) {
      labelOverridesByResidue.get(r.id)?.set(substituentPositionFor(mod.position), mod.label);
    }
  }

  const layouts = new Map(
    residues.map((r) => [
      r.id,
      r.placeholder
        ? { placeholder: true }
        : layoutChairResidue(r.terminii, r.inchi, {
          anomer: r.anomer ?? 'b',
          shape: r.shape ?? 'hexose',
          stickOnlyPositions: stickOnlyByResidue.get(r.id),
          labelOverrides: labelOverridesByResidue.get(r.id),
        }) ?? { placeholder: true },
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
    parts.push(...chairResidueSVGParts(layout, { x: r.x, y: r.y }));
    if (r.label) {
      parts.push(
        `<text x="${r.x.toFixed(1)}" y="${(r.y + 90).toFixed(1)}" text-anchor="middle" font-size="12" fill="currentColor" opacity="0.65">${r.label}</text>`
      );
    }
  }

  for (const link of linkages) {
    const child = residues.find((r) => r.id === link.child);
    const parent = residues.find((r) => r.id === link.parent);
    if (!child || !parent) continue;
    const childLayout = layouts.get(child.id);
    const parentLayout = layouts.get(parent.id);
    const rawA = chairAnchorPoint(childLayout, 1, { x: child.x, y: child.y });
    const rawB = chairAnchorPoint(parentLayout, link.parentPosition, { x: parent.x, y: parent.y });
    if (!rawA || !rawB) continue;
    const a = childLayout.placeholder ? shortenToward(rawB, rawA, LINKAGE_INSET) : rawA;
    const b = parentLayout.placeholder ? shortenToward(rawA, rawB, LINKAGE_INSET) : rawB;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const aEnd = shortenToward(a, mid, LINKAGE_LABEL_GAP);
    const bEnd = shortenToward(b, mid, LINKAGE_LABEL_GAP);
    parts.push(
      `<line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${aEnd.x.toFixed(1)}" y2="${aEnd.y.toFixed(1)}" stroke="currentColor" stroke-width="1.8"/>`
    );
    parts.push(
      `<line x1="${b.x.toFixed(1)}" y1="${b.y.toFixed(1)}" x2="${bEnd.x.toFixed(1)}" y2="${bEnd.y.toFixed(1)}" stroke="currentColor" stroke-width="1.8"/>`
    );
    parts.push(
      `<text x="${mid.x.toFixed(1)}" y="${(mid.y + 4.2).toFixed(1)}" text-anchor="middle" font-size="12" fill="currentColor">O</text>`
    );
  }

  parts.push('</svg>');
  return parts.join('\n');
}

/**
 * Render a whole real residue tree as a chair -- the chair counterpart to
 * HaworthSVG.js's renderSugarTreeSVG, reusing SugarLayout.js's own
 * sugarToHaworthInput() wholesale (tree walking/positioning is identical
 * for either drawing style -- only the per-residue ring/stick geometry
 * differs). A furanose residue is "supported" from that generic function's
 * own point of view (Haworth draws it fine), but has no chair geometry at
 * all -- added to `unsupported` here, on top of whatever that function
 * already flagged, so a chair caller gets an accurate picture of what was
 * actually approximated.
 *
 * @param {object} root
 * @param {object} [opts] - forwarded to sugarToHaworthInput()
 * @returns {{ svg: string, unsupported: Array }}
 */
function renderSugarTreeChairSVG(root, opts = {}) {
  const { residues, linkages, width, height, unsupported } = sugarToHaworthInput(root, opts);
  const chairUnsupported = unsupported.slice();
  for (const r of residues) {
    if (r.shape === 'furanose' && !r.placeholder) {
      chairUnsupported.push({ node: r.id, identifier: r.label, reason: 'no chair geometry for a furanose ring' });
      r.placeholder = true;
    }
  }
  const svg = renderGlycanChairSVG(residues, linkages, { width, height });
  return { svg, unsupported: chairUnsupported };
}

export {
  renderResidueChairSVG,
  renderGlycanChairSVG,
  renderSugarTreeChairSVG,
  layoutChairResidue,
  chairResidueSVGParts,
  chairAnchorPoint,
};
