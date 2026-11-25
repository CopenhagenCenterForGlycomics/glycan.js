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
 *  - HaworthSVG.js's renderGlycanSVG resolves stick-only positions once for
 *    a whole pre-built residues+linkages array (see its own
 *    stickOnlyByResidue map); here renderIcon is called once per residue
 *    with no such whole-sugar pass, so residueHaworthLayout below derives
 *    the same set from a single residue's own tree relationships instead
 *    (its children's attachment positions, and its own donor position on
 *    its parent) -- equivalent result, just computed locally rather than
 *    globally.
 *  - The icon framework's layout engines (CondensedLayout/SugarAwareLayout)
 *    size every icon as a ~1x1 "unit" square by default (position.r = 0.5),
 *    with DELTA_X/DELTA_Y controlling only the GAP between residue centers,
 *    not their own footprint -- this renderer's ring+substituent-stick
 *    footprint is drawn at a fixed real pixel size regardless (same
 *    geometry HaworthLayout.js's standalone renderers use), so whatever
 *    layout engine this renderer is given gets wrapped in its own
 *    anonymous subclass with DELTA_X/DELTA_Y overridden to match
 *    (haworthLayoutEngine, below) -- similar in spirit to
 *    SugarTextRenderer.js's stretchLayoutSpacing, which does the same job
 *    for its own much-wider-than-a-unit-square text labels by mutating the
 *    engine it's given instead.
 */

import SVGRenderer from '../SVGRenderer.js';

import {
  layoutResidue,
  residueSVGParts,
  anchorPoint,
  substituentPositionFor,
  shortenToward,
  placeholderSVGParts,
  LINKAGE_LABEL_GAP,
} from './HaworthSVG.js';
import { MODIFICATION_LABELS } from './HaworthLayout.js';

import { resolveResidueData, detectRingShape } from './SugarLayout.js';
import { MONOSACCHARIDE } from '../reference_monosaccharides.js';

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

// SugarAwareLayout.js's own LayoutMonosaccharide places a single Fuc
// sibling (its "stub along a chain" case) at a FIXED, absolute 0.75-unit
// offset, bypassing DELTA_X entirely -- sized for that framework's own
// ~1-unit-square icons, not this renderer's much larger ring+stick
// footprint (a ring alone is already ~0.86 units wide at this renderer's
// own DELTA_X), so the stub's ring ends up overlapping its parent's own
// substituent labels (its OH stick reads as if it belongs to the parent,
// not the stub -- the actual bug report this constant fixes). 0.75 is
// SugarAwareLayout's own sentinel for exactly this one case (every other
// branch scales with DELTA_X/DELTA_Y already, even its OTHER Fuc-rotation
// branch just below it), so haworthLayoutEngine's own LayoutMonosaccharide
// override below targets that precise value -- a magic-number coupling to
// SugarAwareLayout.js's own source, worth re-checking if that file's own
// constant ever changes.
const FUC_STUB_DELTA_X_RATIO = 0.75;
// Enough room for the stub's own OH stick+label to clearly read as its
// own, without pushing it so far out it stops looking attached -- found by
// visual check against a core-fucosylated N-glycan render.
const FUC_STUB_SPACING = 0.95;

// This renderer's own spacing/stub-placement tweaks are its own concern,
// not something the layout engine itself should need to know about -- so
// rather than reaching into whatever engine sviewer hands this renderer
// and mutating it in place (which would leak into any OTHER renderer or
// element still holding a reference to that same engine), this wraps it in
// a fresh, throwaway anonymous subclass every time LayoutEngine is
// assigned (set LayoutEngine, below) and uses that instead -- the engine
// the caller gave us is never touched, so there's nothing to clean up on
// disconnect either. `BaseLayout` is sometimes the real SugarAwareLayout
// class itself (not always a fresh `class extends SugarAwareLayout {}`,
// e.g. a caller following test-basicRender.js's own precedent of passing
// the base class directly) -- real `extends`/`super` here resolves
// correctly either way, through the real prototype chain, unlike reaching
// past it with Object.getPrototypeOf.
function haworthLayoutEngine(BaseLayout) {
  return class extends BaseLayout {
    static get DELTA_X() { return HAWORTH_DELTA_X; }
    static get DELTA_Y() { return HAWORTH_DELTA_Y; }

    static LayoutMonosaccharide(...args) {
      const result = super.LayoutMonosaccharide(...args);
      const monosaccharide = args[1];
      if (monosaccharide.monosaccharide === MONOSACCHARIDE.Fuc && Math.abs(result.dx) === FUC_STUB_DELTA_X_RATIO) {
        result.dx = Math.sign(result.dx) * FUC_STUB_SPACING * this.DELTA_X;
      }
      return result;
    }
  };
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

  const stickOnlyPositions = new Set();
  const labelOverrides = new Map();

  // Every position where one of this residue's OWN children attaches keeps
  // its stick but drops the label -- that position's own real up/down
  // stereochemistry is what the glycosidic bond continues on from (see
  // anchorPoint), not the bare ring vertex (substituentPositionFor remaps
  // ring position 6 onto the hexagon's actual C5 vertex, same as
  // HaworthSVG.js's own substituentPositionFor usage). A MODIFICATION
  // child (e.g. HSO3) is the odd one out: it isn't drawn as a separate
  // residue at all (see renderIcon/renderLinkage below), so instead of a
  // glycosidic-bond stick it swaps this position's own label for the
  // modification's real chemistry (a sulfate ester REPLACES the hydroxyl
  // it esterifies, rather than sitting beside it).
  for (const child of residue.children ?? []) {
    const parentPosition = residue.linkageOf(child);
    if (!Number.isInteger(parentPosition)) continue;
    const modLabel = MODIFICATION_LABELS[child.identifier];
    if (modLabel) {
      labelOverrides.set(substituentPositionFor(parentPosition), modLabel);
    } else {
      stickOnlyPositions.add(substituentPositionFor(parentPosition));
    }
  }

  // This residue's own donor position on ITS parent gets the same
  // treatment -- see anchorPoint, used the same way in renderLinkage
  // below. Always hexagon position 1: a glycosidic bond only ever donates
  // from a residue's own anomeric carbon, and hexagon position 1 IS this
  // renderer's fixed "anomeric slot" for every shape by convention (see
  // HaworthLayout.js), regardless of that shape's own real/native
  // numbering -- hexose/furanose's real anomeric carbon already happens to
  // be numbered "1" (residue.parent_linkage agrees trivially), but
  // sialic's real anomeric carbon is C2 (residue.parent_linkage is 2
  // there, e.g. NeuAc(a2-6)Gal) -- using that raw number directly here
  // would anchor at hexagon C2 (sialic's real C3, a plain non-stereocentre
  // CH2 with nothing drawn there) instead of hexagon C1 (sialic's real
  // C2, where the OH/COOH pair actually live). renderGlycanSVG's own
  // identical glycosidic-bond loop already hardcodes this same "1" for
  // exactly this reason.
  if (residue.parent) {
    stickOnlyPositions.add(1);
  }

  return layoutResidue(data.terminii, data.inchi, {
    anomer: residue.anomer === 'a' ? 'a' : 'b',
    shape,
    stickOnlyPositions,
    labelOverrides,
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
    // The base Renderer constructor itself does `this.LayoutEngine = layout`
    // (only when both container and layout are given) -- `this` already has
    // this subclass's full prototype chain at that point, so it runs
    // through the overridden setter below, which does the actual
    // decoration. Nothing further needed here.
    super(container, layout);
  }

  // sviewer can swap in an entirely different layout-engine instance after
  // construction (lite.js's `linkangles` attribute handler reassigns
  // `renderer.LayoutEngine` to switch between SugarAwareLayout's and
  // LinkageLayout's own fresh per-element subclass). Wrapping whatever's
  // given in a fresh haworthLayoutEngine() each time this setter runs
  // means every assignment gets this renderer's own spacing, with nothing
  // to undo later (no disconnect() override needed -- see
  // haworthLayoutEngine's own comment).
  set LayoutEngine(engine) {
    super.LayoutEngine = engine ? haworthLayoutEngine(engine) : engine;
  }

  get LayoutEngine() {
    return super.LayoutEngine;
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

    // A modification (e.g. HSO3 -- see MODIFICATION_LABELS) draws as a
    // label swap on its PARENT's own ring instead (residueHaworthLayout's
    // labelOverrides, applied when the parent's own icon is rendered) --
    // nothing of its own to draw here. Still a real, located group (same
    // bookkeeping as any other residue), just an empty one.
    if (!MODIFICATION_LABELS[residue.identifier]) {
      const layout = residueHaworthLayout(residue);
      const markup = layout
        ? residueSVGParts(layout, { x: 0, y: 0 }).join('')
        : placeholderSVGParts(residue.identifier, { x: 0, y: 0 }).join('');
      group.appendChild(parseSVGFragment(group.element.ownerDocument, markup));
    }

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
  // configuration) to the parent's own linked-position stick (that
  // position's own real up/down stereochemistry -- see
  // residueHaworthLayout's stickOnlyPositions and HaworthSVG.js's
  // anchorPoint, applied symmetrically to both ends), with the bridging
  // oxygen sitting inline in a gap at the midpoint -- the same convention
  // renderGlycanSVG's own glycosidic-bond loop uses, just reading
  // positions from the icon framework's own position objects (icon-unit
  // x/y/width/height, pre-SCALE) instead of renderGlycanSVG's plain
  // per-residue x/y.
  renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas) {
    if (!parent_pos) return null;
    // A modification (e.g. HSO3) draws as a label swap on its parent's own
    // ring (see residueHaworthLayout/renderIcon) -- no bond to draw to it.
    if (MODIFICATION_LABELS[child.identifier]) return null;

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
    // Always hexagon position 1 -- see residueHaworthLayout's identical
    // donor-side comment (child.parent_linkage is sialic's real C2 for a
    // sialic child, not this renderer's own hexagon numbering).
    const acceptorPosition = parent.linkageOf(child);

    const rawA = childLayout ? anchorPoint(childLayout, 1, childCenter) : null;
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

    // Both ends connect straight on from their own stick -- no further
    // inset needed (a residue shape with no real ring/stick at all was
    // already bailed out to the plain-line fallback above, see
    // renderGlycanSVG's identical treatment of its own placeholder case).
    const a = rawA;
    const b = rawB;
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

export { HaworthRenderer, HaworthRenderer as default };
