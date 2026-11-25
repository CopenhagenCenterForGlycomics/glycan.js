'use strict';

/**
 * Plugs the chair-conformation renderer (ChairLayout.js/ChairSVG.js's own
 * string-building SVG) into glycan.js's generic icon-based Renderer
 * framework -- a sibling to HaworthRenderer.js, bridging the exact same two
 * frameworks the exact same way (see that file's own module docstring for
 * the full rationale: string markup parsed into real nodes once per
 * residue, stick-only/label-override positions derived locally per residue
 * rather than from a whole-sugar pass, and the layout engine wrapped in an
 * anonymous subclass for this renderer's own real-pixel spacing). Only the
 * geometry underneath differs -- ChairSVG.js's own ring/stick functions in
 * place of HaworthSVG.js's.
 */

import SVGRenderer from '../SVGRenderer.js';

import {
  layoutChairResidue,
  chairResidueSVGParts,
  chairAnchorPoint,
} from './ChairSVG.js';
import {
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

// Sized for this renderer's own fixed-pixel ring+stick footprint -- same
// starting values as HaworthRenderer.js's own (its ring is a comparable
// size; ChairLayout.js's own chairGeometry spans a similar range), found by
// visual check against an N-glycan-core-style render, same way that file's
// own constant was tuned.
const CHAIR_DELTA_X = 230 / SCALE;
const CHAIR_DELTA_Y = 170 / SCALE;

// Same fix as HaworthRenderer.js's own FUC_STUB_DELTA_X_RATIO/
// FUC_STUB_SPACING pair (see that file's own comment for the full
// rationale) -- SugarAwareLayout.js's single-Fuc-stub case places it at a
// fixed 0.75-unit offset sized for ~1-unit-square SNFG icons, overlapping
// this renderer's own much larger ring+stick footprint unless widened.
const FUC_STUB_DELTA_X_RATIO = 0.75;
const FUC_STUB_SPACING = 1.5;

function chairLayoutEngine(BaseLayout) {
  return class extends BaseLayout {
    static get DELTA_X() { return CHAIR_DELTA_X; }
    static get DELTA_Y() { return CHAIR_DELTA_Y; }

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
 * A residue's own chair ring+substituent layout, suppressed/stick-only/
 * label-overridden exactly where its own tree relationships require --
 * see HaworthRenderer.js's residueHaworthLayout, this is its direct chair
 * counterpart (identical logic, ChairSVG.js's layoutChairResidue in place
 * of HaworthSVG.js's layoutResidue). Returns null for a shape with no
 * chair geometry -- every HaworthLayout.js-unsupported shape, PLUS
 * furanose (a real chair doesn't meaningfully apply to a 5-membered ring --
 * see ChairLayout.js) -- so the caller falls back to a placeholder/line.
 */
function residueChairLayout(residue) {
  const data = resolveResidueData(residue.identifier);
  const shape = data && detectRingShape(data.terminii);
  if (!shape || shape === 'furanose') return null;

  const stickOnlyPositions = new Set();
  const labelOverrides = new Map();

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

  // Always hexagon position 1 -- see HaworthRenderer.js's identical
  // donor-side comment (same reasoning, same convention, reused as-is).
  if (residue.parent) {
    stickOnlyPositions.add(1);
  }

  return layoutChairResidue(data.terminii, data.inchi, {
    anomer: residue.anomer === 'a' ? 'a' : 'b',
    shape,
    stickOnlyPositions,
    labelOverrides,
  });
}

// Same DOMParser technique as HaworthRenderer.js's own parseSVGFragment.
function parseSVGFragment(doc, markup) {
  const wrapped = `<svg xmlns="${SVGNS}"><g>${markup}</g></svg>`;
  const parsedRoot = new DOMParser().parseFromString(wrapped, 'image/svg+xml').documentElement;
  return doc.importNode(parsedRoot.firstChild, true);
}

class ChairRenderer extends SVGRenderer {
  constructor(container, layout) {
    super(container, layout);
  }

  set LayoutEngine(engine) {
    super.LayoutEngine = engine ? chairLayoutEngine(engine) : engine;
  }

  get LayoutEngine() {
    return super.LayoutEngine;
  }

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

    // A modification (e.g. HSO3) draws as a label swap on its parent's own
    // ring instead -- see HaworthRenderer.js's identical renderIcon.
    if (!MODIFICATION_LABELS[residue.identifier]) {
      const layout = residueChairLayout(residue);
      const markup = layout
        ? chairResidueSVGParts(layout, { x: 0, y: 0 }).join('')
        : placeholderSVGParts(residue.identifier, { x: 0, y: 0 }).join('');
      group.appendChild(parseSVGFragment(group.element.ownerDocument, markup));
    }

    return { element: group.element };
  }

  setIconPosition(icon, x, y, width, height) {
    const cx = x + width / 2;
    const cy = y + height / 2;
    icon.element.setAttribute('transform', `translate(${cx.toFixed(1)},${cy.toFixed(1)})`);
  }

  renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas) {
    if (!parent_pos) return null;
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

    const childLayout = residueChairLayout(child);
    const parentLayout = residueChairLayout(parent);
    const acceptorPosition = parent.linkageOf(child);

    const rawA = childLayout ? chairAnchorPoint(childLayout, 1, childCenter) : null;
    const rawB = parentLayout ? chairAnchorPoint(parentLayout, acceptorPosition, parentCenter) : null;

    if (!rawA || !rawB) {
      group.line(childCenter.x, childCenter.y, parentCenter.x, parentCenter.y, {
        stroke: 'currentColor',
        'stroke-width': '1.3',
      });
      return group;
    }

    const a = rawA;
    const b = rawB;
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const aEnd = shortenToward(a, mid, LINKAGE_LABEL_GAP);
    const bEnd = shortenToward(b, mid, LINKAGE_LABEL_GAP);

    group.line(a.x, a.y, aEnd.x, aEnd.y, { stroke: 'currentColor', 'stroke-width': '1.8' });
    group.line(b.x, b.y, bEnd.x, bEnd.y, { stroke: 'currentColor', 'stroke-width': '1.8' });
    group.text(mid.x, mid.y + 4.2, 'O', { 'font-size': '12', 'text-anchor': 'middle' }).setAttribute('fill', 'currentColor');

    return group;
  }
}

export { ChairRenderer, ChairRenderer as default };
