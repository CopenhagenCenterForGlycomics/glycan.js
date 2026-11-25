'use strict';

/**
 * Plugs the Haworth ring renderer (HaworthLayout.js/HaworthSVG.js's own
 * string-building SVG, previously only reachable through its own three
 * standalone entry points) into glycan.js's generic icon-based Renderer
 * framework (Renderer.js/SVGRenderer.js) -- the same framework
 * SugarTextRenderer, FizikoSVGRenderer et al already plug into, and the one
 * sviewer's <ccg-sviewer renderer="..."> attribute dispatches to via
 * registerRenderer() (see glycome's src/js/renderers.js).
 *
 * The two frameworks disagree on several things this file bridges:
 *  - HaworthSVG.js builds plain strings of SVG tags and concatenates them;
 *    the icon framework builds real DOM nodes through SVGCanvas's small
 *    wrapper API (group()/line()/text()), which has no polygon() (needed
 *    for the tapered-wedge ring bonds) -- so a residue's markup is still
 *    built as a string (reusing residueSVGParts/placeholderSVGParts
 *    unchanged) and then parsed into real nodes once, the same technique
 *    SVGRenderer.js's own AppendSymbols uses for sugars.svg.
 *  - HaworthSVG.js's renderGlycanSVG resolves suppressed/stick-only
 *    positions once for a whole pre-built residues+linkages array (see its
 *    own suppressByResidue/stickOnlyByResidue maps); here renderIcon is
 *    called once per residue with no such whole-sugar pass, so
 *    residueHaworthLayout below derives the same two sets from a single
 *    residue's own tree relationships instead (its children's attachment
 *    positions, and its own donor position on its parent) -- equivalent
 *    result, just computed locally rather than globally.
 *  - The icon framework's layout engines (CondensedLayout/SugarAwareLayout)
 *    size every icon as a ~1x1 "unit" square by default (position.r = 0.5),
 *    with DELTA_X/DELTA_Y controlling only the GAP between residue centers,
 *    not their own footprint -- this renderer's ring+substituent-stick
 *    footprint is drawn at a fixed real pixel size regardless (same
 *    geometry HaworthLayout.js's standalone renderers use), so only
 *    DELTA_X/DELTA_Y need stretching to match it (stretchForHaworth, below)
 *    -- same technique SugarTextRenderer.js's stretchLayoutSpacing uses for
 *    its own much-wider-than-a-unit-square text labels.
 */

import SVGRenderer from '../SVGRenderer.js';

import {
  layoutResidue,
  residueSVGParts,
  anchorPoint,
  substituentPositionFor,
  shortenToward,
  placeholderSVGParts,
  LINKAGE_INSET,
  LINKAGE_LABEL_GAP,
} from './HaworthSVG.js';

import { resolveResidueData, detectRingShape } from './SugarLayout.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const GLYCANJSNS = 'https://glycocode.com/glycanjs';
const SCALE = SVGRenderer.GLOBAL_SCALE; // 100

// Sized for this renderer's own fixed-pixel ring+stick footprint (see
// HaworthLayout.js's ringGeometry/furanoseGeometry) -- the same spacing
// SugarLayout.js's own DEFAULT_SPACING_X/Y already uses for its own
// (non-icon-framework) tree layout, just expressed in DELTA_X/DELTA_Y's
// pre-SCALE "layout units" here instead of raw pixels.
const HAWORTH_DELTA_X = 145 / SCALE;
const HAWORTH_DELTA_Y = 95 / SCALE;

// Same technique as SugarTextRenderer.js's stretchLayoutSpacing -- sviewer
// hands every renderer an instance-private layout-engine subclass (a fresh
// `class extends layout_class {}` per (base layout class, <ccg-sviewer>
// element) pair -- see lite.js's get_layout_engine()), so overriding
// DELTA_X/DELTA_Y directly on this particular instance can't leak into a
// different renderer sharing the same element. disconnect() below restores
// it so switching to an icon renderer afterward gets its own normal
// spacing back, not this renderer's.
function stretchForHaworth(layout) {
  for (const [prop, value] of [['DELTA_X', HAWORTH_DELTA_X], ['DELTA_Y', HAWORTH_DELTA_Y]]) {
    Object.defineProperty(layout, prop, {
      configurable: true,
      get() { return value; },
    });
  }
}

/**
 * A residue's own ring+substituent layout (vertices, bonds, substituent
 * sticks), suppressed/stick-only exactly where ITS OWN tree relationships
 * require -- see this module's own docstring. Returns null for a ring
 * shape HaworthLayout.js doesn't support (pentoses, non-ring residues,
 * anything not in the monosaccharide data file), so the caller can fall
 * back to a plain placeholder/line instead of guessing at ring vertices
 * that don't exist.
 */
function residueHaworthLayout(residue) {
  const data = resolveResidueData(residue.identifier);
  const shape = data && detectRingShape(data.terminii);
  if (!shape) return null;

  // Every position where one of this residue's OWN children attaches is
  // fully suppressed -- that child's own bond takes the vertex over
  // completely (substituentPositionFor remaps ring position 6 onto the
  // hexagon's actual C5 vertex, same as HaworthSVG.js's own
  // substituentPositionFor usage).
  const suppressPositions = new Set();
  for (const child of residue.children ?? []) {
    const parentPosition = residue.linkageOf(child);
    if (Number.isInteger(parentPosition)) {
      suppressPositions.add(substituentPositionFor(parentPosition));
    }
  }

  // This residue's own donor position on ITS parent (almost always 1, the
  // anomeric carbon) keeps its stick but drops the label -- the glycosidic
  // bond continues on from there instead (see anchorPoint, used the same
  // way in renderLinkage below).
  const stickOnlyPositions = new Set();
  if (residue.parent) {
    const donorPosition = Number.isInteger(residue.parent_linkage) ? residue.parent_linkage : 1;
    stickOnlyPositions.add(donorPosition);
  }

  return layoutResidue(data.terminii, data.inchi, {
    anomer: residue.anomer === 'a' ? 'a' : 'b',
    shape,
    suppressPositions,
    stickOnlyPositions,
  });
}

// Parses a fragment of raw SVG markup (residueSVGParts/placeholderSVGParts's
// own convention -- plain strings, unlike the rest of glycan.js's
// SVGCanvas-wrapped DOM building) into real nodes owned by the caller's own
// document -- the same DOMParser technique SVGRenderer.js's own
// AppendSymbols uses for sugars.svg, just per residue instead of once for a
// whole shared symbol sheet.
function parseSVGFragment(doc, markup) {
  const wrapped = `<svg xmlns="${SVGNS}"><g>${markup}</g></svg>`;
  const parsedRoot = new DOMParser().parseFromString(wrapped, 'image/svg+xml').documentElement;
  return doc.importNode(parsedRoot.firstChild, true);
}

class HaworthRenderer extends SVGRenderer {
  constructor(container, layout) {
    super(container, layout);
    this._stretchedLayout = layout || null;
    if (this._stretchedLayout) {
      stretchForHaworth(this._stretchedLayout);
    }
  }

  // Called by sviewer (lite.js's initialise_renderer_object) before
  // swapping to a different renderer -- see stretchForHaworth's own comment.
  disconnect() {
    if (this._stretchedLayout) {
      delete this._stretchedLayout.DELTA_X;
      delete this._stretchedLayout.DELTA_Y;
      this._stretchedLayout = null;
    }
  }

  // This renderer draws its own geometry outright (residueSVGParts), not
  // sugars.svg's SNFG symbol set -- nothing to append.
  static async AppendSymbols() {}

  renderIcon(container, identifier, residue, sugar) {
    const group = container.group();
    const location = sugar.location_for_monosaccharide(residue);
    group.setAttributeNS(GLYCANJSNS, 'glycanjs:identifier', residue.identifier);
    group.setAttributeNS(GLYCANJSNS, 'glycanjs:location', location);
    group.setAttributeNS(
      GLYCANJSNS,
      'glycanjs:parent',
      residue.parent ? sugar.location_for_monosaccharide(residue.parent) : ''
    );
    group.setAttribute('part', `residue_location_${location}`);

    const layout = residueHaworthLayout(residue);
    const markup = layout
      ? residueSVGParts(layout, { x: 0, y: 0 }).join('')
      : placeholderSVGParts(residue.identifier, { x: 0, y: 0 }).join('');
    group.appendChild(parseSVGFragment(group.element.ownerDocument, markup));

    return { element: group.element };
  }

  // Icon content is already centered on (0,0) in its own local frame (the
  // same convention HaworthLayout.js's own ring geometry uses), so placing
  // it is just a translate to this position's own center -- same technique
  // SugarTextRenderer.js's setIconPosition uses. A Haworth ring has no
  // sensible "self rotation" the way an SNFG icon's rotate_angle sometimes
  // implies (e.g. Fuc's -90/90 stub rotation) -- like text labels, it
  // ignores that argument entirely.
  setIconPosition(icon, x, y, width, height) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    icon.element.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)})`);
  }

  // Draws the bond from the child's own anomeric stick (its alpha/beta
  // configuration -- see residueHaworthLayout's stickOnlyPositions and
  // HaworthSVG.js's anchorPoint) to the parent's own linkage-position
  // vertex, with the bridging oxygen sitting inline in a gap at the
  // midpoint -- the same convention renderGlycanSVG's own glycosidic-bond
  // loop uses, just reading positions from the icon framework's own
  // position objects (icon-unit x/y/width/height, pre-SCALE) instead of
  // renderGlycanSVG's plain per-residue x/y.
  renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas) {
    if (!parent_pos) return null;

    const group = this.renderLinkageGroup(canvas, sugar, child);
    canvas.sendToBack(group);

    const childCenter = {
      x: SCALE * (child_pos.x + child_pos.width / 2),
      y: SCALE * (child_pos.y + child_pos.height / 2),
    };
    const parentCenter = {
      x: SCALE * (parent_pos.x + parent_pos.width / 2),
      y: SCALE * (parent_pos.y + parent_pos.height / 2),
    };

    const childLayout = residueHaworthLayout(child);
    const parentLayout = residueHaworthLayout(parent);
    const donorPosition = Number.isInteger(child.parent_linkage) ? child.parent_linkage : 1;
    const acceptorPosition = parent.linkageOf(child);

    const rawA = childLayout ? anchorPoint(childLayout, donorPosition, childCenter) : null;
    const rawB = parentLayout ? anchorPoint(parentLayout, acceptorPosition, parentCenter) : null;

    if (!rawA || !rawB) {
      // Either end is a residue shape this renderer can't draw as a real
      // ring (see residueHaworthLayout) -- a plain line between icon
      // centers rather than guessing at ring vertices that don't exist.
      group.line(childCenter.x, childCenter.y, parentCenter.x, parentCenter.y, {
        stroke: 'currentColor',
        'stroke-width': '1.3',
      });
      return group;
    }

    // The child side connects straight on from its own anomeric stick (no
    // further inset -- see renderGlycanSVG's identical treatment); only
    // the parent side is pulled in, same as every other glycosidic bond.
    const a = rawA;
    const b = shortenToward(rawA, rawB, LINKAGE_INSET);
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const aEnd = shortenToward(a, mid, LINKAGE_LABEL_GAP);
    const bEnd = shortenToward(b, mid, LINKAGE_LABEL_GAP);

    group.line(a.x, a.y, aEnd.x, aEnd.y, { stroke: 'currentColor', 'stroke-width': '1.8' });
    group.line(b.x, b.y, bEnd.x, bEnd.y, { stroke: 'currentColor', 'stroke-width': '1.8' });
    // SVGCanvas.text() has no `fill` option (only font-size/text-anchor) --
    // set directly, matching every ring/stick label's own `currentColor`.
    group.text(mid.x, mid.y + 4.2, 'O', { 'font-size': '12', 'text-anchor': 'middle' }).setAttribute('fill', 'currentColor');

    return group;
  }
}

export { HaworthRenderer as default };
