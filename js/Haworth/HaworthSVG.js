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
  MODIFICATION_LABELS,
} from './HaworthLayout.js';
import { sugarToHaworthInput } from './SugarLayout.js';

const STICK_LENGTH = 19;
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

// A substituent stick's own far endpoint (same local coordinate frame as
// `ring`) -- vertical, per preference, even though a purely vertical stick
// from a corner vertex (C5, next to the ring oxygen) can cross back through
// the ring's own interior when its orientation points toward the opposite
// edge (e.g. IdoA's axial COOH at C5, or a sialic acid's glycerol tail).
// Known, not fixed here. Shared by residueSVGParts (for a labeled stick)
// and anchorPoint (a linkage child's own unlabeled anomeric stick -- see
// layoutResidue's stickOnlyPositions).
function substituentStickEnd(ring, orientation) {
  const dy = orientation === 'up' ? -STICK_LENGTH : STICK_LENGTH;
  return { x: ring.x, y: ring.y + dy };
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
 * `stickOnlyPositions` (a Set of ring positions) keeps a substituent's
 * stick but drops its label -- used at BOTH ends of a glycosidic bond: a
 * linkage CHILD's own anomeric position (1), and the PARENT's own linked
 * position (e.g. the C4 a child's C1 bonds to). Either way the position
 * still has a real substituent with its own real orientation (up/down --
 * the actual stereochemistry at that ring position) worth drawing as a
 * short stick, but what used to be its free "OH" is now the glycosidic
 * bond itself, so the stick carries no label of its own -- see
 * anchorPoint, which extends the glycosidic line out to this stick's own
 * endpoint, in that position's real direction, instead of the bare ring
 * vertex.
 * `shape` ('hexose' | 'furanose' | 'sialic', default 'hexose') picks which
 * geometry + substituent layout to use -- see HaworthLayout.js.
 * `labelOverrides` (a Map<ring position, label>) swaps in a different
 * label at that position -- e.g. a sulfation (HSO3) child modeled
 * elsewhere in the tree as its own residue (see HaworthLayout.js's
 * MODIFICATION_LABELS) real chemistry REPLACES the hydroxyl it
 * esterifies, rather than sitting beside it, so it's drawn here as a
 * label swap on the parent's own stick (keeping that position's own real
 * orientation), not as a separate ring/icon of its own. Checked before
 * stickOnlyPositions, so the two are mutually exclusive per position (a
 * caller shouldn't mark the same position both ways).
 */
function layoutResidue(terminii, inchi, opts = {}) {
  const {
    anomer = 'b',
    stickOnlyPositions = new Set(),
    labelOverrides = new Map(),
    shape = 'hexose',
  } = opts;
  const builder = SHAPE_BUILDERS[shape] ?? SHAPE_BUILDERS.hexose;
  const { vertices, bonds } = builder.geometry();
  const { substituents } = builder.layout(terminii, inchi, { anomer });
  return {
    vertices,
    bonds,
    // neverSuppress: some shapes (sialic) put two independent substituents
    // on the same vertex (the anomeric OH a glycosidic bond replaces, and
    // the COOH that's always there regardless) -- see
    // layoutSialicSubstituents. The COOH must keep its own label even when
    // its shared vertex goes stick-only (or label-overridden) for the
    // OTHER substituent there.
    substituents: substituents.map((s) => {
      if (s.neverSuppress) return s;
      if (labelOverrides.has(s.position)) return { ...s, label: labelOverrides.get(s.position) };
      if (stickOnlyPositions.has(s.position)) return { ...s, label: null };
      return s;
    }),
  };
}

const BOLD_STROKE_WIDTH = 4.2;
const THIN_STROKE_WIDTH = 1.3;
const RING_LABEL_GAP = 11; // how far a ring bond stops short of a vertex that carries a letter label (the ring oxygen)
const LINKAGE_INSET = 10; // how far a glycosidic bond's line is pulled in from each residue's own ring vertex, shortening the overall connector
const LINKAGE_LABEL_GAP = 9; // how far each half of a glycosidic bond stops short of its own midpoint, for the inline bridging "O"

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

// When a label's text extends to the LEFT of its stick (text-anchor
// 'end'), the atom actually bonded to the ring needs to stay the character
// nearest the stick -- i.e. the LAST character of the printed string, not
// the first (every one of these labels is written bonded-atom-first in its
// normal, right-extending form). This is the standard structural-drawing
// convention for a group written in reverse (e.g. "HO-" for a hydroxyl,
// "H3C-" for a methyl, "HOOC-" for a carboxyl, "AcHN-" for an acetamido --
// confirmed in the published glucofuranose and NeuAc/NeuGc reference images
// used elsewhere in this renderer's own validation). Composite tail labels
// (CH(OH)CH2OH and the like) aren't covered here -- not yet seen landing on
// a left-extending stick in practice, so left as a known gap rather than
// guessed at.
const REVERSED_LABELS = {
  OH: 'HO',
  'CH₂OH': 'HOH₂C',
  'CH₃': 'H₃C',
  COOH: 'HOOC',
  'NH₂': 'H₂N',
  NHAc: 'AcHN',
  NHGc: 'GcHN',
  // Unlike the entries above, not independently confirmed against a
  // published reference image (see HaworthLayout.js's MODIFICATION_LABELS)
  // -- derived from the same group-reversal pattern as every other entry
  // here (O | S | O3 | H -> H | O3 | S | O), worth a visual sanity check.
  OSO3H: 'HO3SO',
};

function orientLabel(label, anchor) {
  if (anchor === 'end' && REVERSED_LABELS[label]) return REVERSED_LABELS[label];
  return label;
}

// A label's first character is always the atom actually bonded to the
// ring (and, after orientLabel's reversal above, its LAST character is
// too, for a left-extending stick) -- but text-anchor 'start'/'end' pins
// that character's EDGE to the stick's endpoint, not its center, leaving
// it visibly offset to one side. This nudges the anchor point inward by
// roughly half a character's advance width (Georgia, 13px) so the bonded
// atom's glyph centers on the stick instead.
const LABEL_ANCHOR_NUDGE = 4.5;

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
    const localStickEnd = substituentStickEnd(ring, sub.orientation);
    const stickEnd = toScreen(localStickEnd);
    parts.push(
      `<line x1="${screenRing.x.toFixed(1)}" y1="${screenRing.y.toFixed(1)}" x2="${stickEnd.x.toFixed(1)}" y2="${stickEnd.y.toFixed(1)}" stroke="currentColor" stroke-width="${THIN_STROKE_WIDTH}"/>`
    );
    // A linkage child's own anomeric stick (see layoutResidue's
    // stickOnlyPositions) carries no label -- the glycosidic bond line
    // itself continues on from here instead (see anchorPoint).
    if (!sub.label) continue;
    // The label's own first character sits right where its stick ends (a
    // small vertical clearance only, not a separate floating gap), anchored
    // toward whichever side of the ring this vertex is on (not the stick's
    // own, now-vertical, direction) so it reads outward rather than back
    // over the ring.
    const dy = localStickEnd.y - ring.y;
    const textAnchor = ring.x > 1 ? 'start' : ring.x < -1 ? 'end' : 'middle';
    const textY = stickEnd.y + (dy < 0 ? -3 : 12);
    const textX =
      stickEnd.x + (textAnchor === 'start' ? -LABEL_ANCHOR_NUDGE : textAnchor === 'end' ? LABEL_ANCHOR_NUDGE : 0);
    parts.push(
      `<text x="${textX.toFixed(1)}" y="${textY.toFixed(1)}" text-anchor="${textAnchor}" font-size="13" fill="currentColor">${orientLabel(sub.label, textAnchor)}</text>`
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
// A linkage child's own anomeric position (1) keeps an unlabeled stick
// (see layoutResidue's stickOnlyPositions) showing its alpha/beta
// configuration -- the bond continues on from that stick's own far end
// instead of the bare ring vertex, so the two visually read as one
// continuous line (ring -> anomeric stick -> glycosidic bond -> parent).
//
// `position` is a caller-supplied RING position (e.g. link.parentPosition
// -- a linkage at literal position 6), which may not be where the
// substituent itself is actually recorded: layoutSubstituents always
// reports the exocyclic C6 group at hexagon position 5, the same remap
// vertexForPosition already applies for the vertex itself
// (substituentPositionFor). Without applying that same remap here too,
// the stick lookup below would silently miss it (position 6 is never a
// real substituent's own position) and fall back to the bare vertex `v`
// for every "6" (or a2-6/a2-8-style) linkage -- caught by comparing
// against the actual rendered stick endpoint, not just "does this not
// crash".
function anchorPoint(layout, position, offset) {
  if (layout.placeholder) return { x: offset.x, y: offset.y };
  const v = vertexForPosition(position, layout.vertices);
  if (!v) return null;
  const stickPosition = substituentPositionFor(position);
  const stickSub = layout.substituents.find((s) => s.position === stickPosition && !s.label);
  const local = stickSub ? substituentStickEnd(v, stickSub.orientation) : v;
  return { x: local.x + offset.x, y: local.y + offset.y };
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
 *   y: number, label?: string, placeholder?: boolean,
 *   modifications?: Array<{position: number, label: string}>}>} residues
 *   `x`/`y` are this residue's ring-center position on the shared canvas.
 *   `id` just needs to be usable as a Map key and compared with `===` --
 *   an object reference (e.g. the Monosaccharide node itself) works fine.
 *   `shape` defaults to 'hexose' if omitted. `placeholder: true` (with
 *   `terminii`/`inchi` left null) draws a plain labeled circle instead of a
 *   real Haworth ring, for a residue shape this renderer doesn't handle yet
 *   (see SugarLayout.js's detectRingShape). `modifications` swaps a
 *   different label onto this residue's own stick at `position` (e.g. a
 *   sulfation -- see HaworthLayout.js's MODIFICATION_LABELS) -- for a
 *   residue modeled elsewhere as its own small child node, not drawn here
 *   as a ring/icon of its own at all (its real chemistry replaces the
 *   hydroxyl it's linked to, rather than sitting beside it); `position`
 *   follows the same raw ring-position convention as `linkages`' own
 *   `parentPosition` below (6 bonds at C5, same remap).
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
        : layoutResidue(r.terminii, r.inchi, {
          anomer: r.anomer ?? 'b',
          shape: r.shape ?? 'hexose',
          stickOnlyPositions: stickOnlyByResidue.get(r.id),
          labelOverrides: labelOverridesByResidue.get(r.id),
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

  // Glycosidic bonds: a line from the child's own anomeric stick (its
  // alpha/beta configuration) straight on to the parent's own
  // linked-position stick (that position's own real up/down
  // stereochemistry -- see anchorPoint/layoutResidue's stickOnlyPositions,
  // now applied symmetrically to both ends), with the bridging oxygen
  // sitting inline in a gap at the midpoint -- the same label-gap
  // convention the ring oxygen itself uses (see
  // RING_LABEL_GAP/shortenToward above) -- rather than floating above the
  // line. Either end may instead be a placeholder (no ring positions, and
  // so no stick of its own) -- only then is that end pulled in by
  // LINKAGE_INSET first, same idea as RING_LABEL_GAP, so the bond doesn't
  // run all the way into the placeholder's own center.
  for (const link of linkages) {
    const child = residues.find((r) => r.id === link.child);
    const parent = residues.find((r) => r.id === link.parent);
    if (!child || !parent) continue;
    const childLayout = layouts.get(child.id);
    const parentLayout = layouts.get(parent.id);
    const rawA = anchorPoint(childLayout, 1, { x: child.x, y: child.y });
    const rawB = anchorPoint(parentLayout, link.parentPosition, { x: parent.x, y: parent.y });
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

// Exported in addition to the three entry points above for HaworthRenderer.js
// (sviewer's icon-based renderer framework, a different architecture from
// this file's own string-building one -- it needs these pieces individually:
// a residue's own layout + raw SVG markup (layoutResidue/residueSVGParts),
// a linkage's anchor point including the child's own anomeric stick
// (anchorPoint/substituentStickEnd/vertexForPosition), the position-6-onto-
// C5 remapping (substituentPositionFor), and the bond-shortening/inline-
// label-gap math (shortenToward) -- rather than this file's own
// string-concatenation render path.
export {
  renderResidueSVG,
  renderGlycanSVG,
  renderSugarTreeSVG,
  layoutResidue,
  residueSVGParts,
  anchorPoint,
  vertexForPosition,
  substituentPositionFor,
  substituentStickEnd,
  shortenToward,
  placeholderSVGParts,
  LINKAGE_INSET,
  LINKAGE_LABEL_GAP,
};
