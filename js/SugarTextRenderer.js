import SVGRenderer from './SVGRenderer.js';
import X11_FIXED_BOLD_BASE64    from './fonts/x11FixedFont.js';
import X11_FIXED_REGULAR_BASE64 from './fonts/x11FixedRegularFont.js';

const SVGNS      = 'http://www.w3.org/2000/svg';
const GLYCANJSNS = 'https://glycocode.com/glycanjs';
const SCALE      = SVGRenderer.GLOBAL_SCALE;   // 100
const str        = n => n.toFixed(1);

// The actual X11 "Fixed" bitmap font (7x13 bold) libgd's default text
// functions (gdFontSmall et al) were themselves derived from - the chunky,
// pixelated look of early-2000s Perl-generated glycan images. See
// fonts/LICENSE-x11-fixed.md. Falls back to an ordinary monospace font if
// the embedded font ever fails to parse/load.
const SUGAR_TEXT_FONT_FAMILY = "'X11 Fixed Bold', 'Courier New', monospace";

// Same family, regular (medium) weight, used for linkage labels so they
// read as secondary/annotation text rather than competing with residue
// names - subsetted to just the characters linkage labels ever render (see
// fonts/LICENSE-x11-fixed.md), so it stays tiny despite the unsubsetted
// file being far larger than the bold weight.
const LINKAGE_FONT_FAMILY = "'X11 Fixed Regular', 'Courier New', monospace";

const buildFontFaceCSS = () => `@font-face {
  font-family: 'X11 Fixed Bold';
  src: url(data:font/truetype;charset=utf-8;base64,${X11_FIXED_BOLD_BASE64}) format('truetype');
}
@font-face {
  font-family: 'X11 Fixed Regular';
  src: url(data:font/truetype;charset=utf-8;base64,${X11_FIXED_REGULAR_BASE64}) format('truetype');
}`;

// Same mapping Renderer.js's private render_link_label() uses - duplicated
// here (3 lines) rather than exported from there, since that function isn't
// otherwise reusable for this renderer's different label layout.
const fancyAnomer = anomer => anomer === 'b' ? 'β' : anomer === 'a' ? 'α' : '?';

const point_along_line = (x0, y0, x1, y1, t) => [(1 - t) * x0 + t * x1, (1 - t) * y0 + t * y1];

const RESIDUE_FONT_SIZE = SCALE * 0.4;   // matches renderIcon()'s font-size
const LINKAGE_FONT_SIZE = SCALE * 0.33;  // smaller than residue labels
// Both fonts here are monospace (SUGAR_TEXT_FONT_FAMILY), so a residue
// label's rendered width is predictable from its character count alone -
// no getBBox() measurement needed (which would also be unreliable in a
// headless/svgdom export context). ~0.62x font-size is a reasonable advance
// width for the embedded X11 Fixed Bold/Courier New stack.
const MONOSPACE_CHAR_WIDTH = 0.62;
const LABEL_GAP = SCALE * 0.15;
const MIN_LABEL_GAP = SCALE * 0.12; // keep the two linkage labels from ever touching on a very short/wordy link

// How far a linkage label must travel from a residue's own center, along
// the link's own direction (ux,uy, a unit vector), to clear that residue's
// text bounding box (half-width x half-height - text never rotates, see
// setIconPosition below, so this box is always axis-aligned regardless of
// which way the link runs). A line leaving a box's center in direction
// (ux,uy) exits it at distance min(halfWidth/|ux|, halfHeight/|uy|) - the
// usual "rectangle doesn't fully contain a radius" fix: using a direction-
// agnostic circumscribed radius (hypot of both halves) would always account
// for the text's full *width* even on a near-vertical branch, where the
// link barely needs to clear the much smaller height.
const residueClearance = (identifier, ux, uy) => {
  const halfWidth  = (identifier.length * RESIDUE_FONT_SIZE * MONOSPACE_CHAR_WIDTH) / 2;
  const halfHeight = RESIDUE_FONT_SIZE / 2;
  const distances = [];
  if (Math.abs(ux) > 1e-6) distances.push(halfWidth / Math.abs(ux));
  if (Math.abs(uy) > 1e-6) distances.push(halfHeight / Math.abs(uy));
  const distance = distances.length ? Math.min(...distances) : Math.max(halfWidth, halfHeight);
  return distance + LABEL_GAP;
};

// Residue labels are words ('GalNAc'), much wider than the icons the layout
// engine's DELTA_X/DELTA_Y spacing was tuned for - so residues need more
// room between them in this renderer specifically. The spacing itself is
// rightly a layout concern (DELTA_X/DELTA_Y, in CondensedLayout.js/
// SugarAwareLayout.js), not something this renderer should own outright,
// but sviewer already hands each renderer an instance-private layout-engine
// subclass (see get_layout_engine() in sviewer/js/sviewer/lite.js - a fresh
// subclass per (base layout class, <ccg-sviewer> element) pair, specifically
// so one renderer's tweaks can't leak into another renderer on the same or
// a different element) - so it's safe to stretch spacing on just that
// private class from here, and restore it in disconnect() so switching back
// to an icon renderer on the same element isn't affected.
const SPACING_MULTIPLIER = 1.3;

const stretchLayoutSpacing = (layout) => {
  const superclass = Object.getPrototypeOf(layout);
  for (const prop of ['DELTA_X', 'DELTA_Y']) {
    Object.defineProperty(layout, prop, {
      configurable: true,
      // Reflect.get's receiver argument keeps `this` bound to `layout`
      // (not `superclass`) when the inherited getter runs, so e.g.
      // CondensedLayout's `this.LINKS` check still resolves against the
      // real instance state instead of always taking its default branch.
      get() { return Reflect.get(superclass, prop, layout) * SPACING_MULTIPLIER; }
    });
  }
};

export class SugarTextRenderer extends SVGRenderer {

  constructor(container, layout) {
    super(container, layout);
    if (this.element) {
      this.element.canvas.style.setProperty('--stroke-color', '#7B2FBE');
      // Lives on the <svg> root (not just this in-memory DOM) so it's
      // captured by whatever clones/serializes the canvas for save/preview -
      // a plain <style> is ordinary content as far as XMLSerializer is
      // concerned. Same technique as Fiziko/HeraldicSVGCanvas's
      // buildFontFaceCSS(), just inlined here since this renderer doesn't
      // have its own SVGCanvas subclass to hang it off.
      const fontStyle = this.element.createElement('style');
      fontStyle.textContent = buildFontFaceCSS();
      this.element.appendChild(fontStyle);
    }
    this._stretchedLayout = layout || null;
    if (this._stretchedLayout) {
      stretchLayoutSpacing(this._stretchedLayout);
    }
  }

  // Called by sviewer (lite.js's initialise_renderer_object) before
  // swapping to a different renderer - undoes stretchLayoutSpacing() so a
  // later icon-based renderer reusing the same instance-private layout
  // class (see stretchLayoutSpacing's comment above) gets its normal,
  // un-stretched DELTA_X/DELTA_Y back, not this renderer's wider spacing.
  disconnect() {
    if (this._stretchedLayout) {
      delete this._stretchedLayout.DELTA_X;
      delete this._stretchedLayout.DELTA_Y;
      this._stretchedLayout = null;
    }
  }

  static async AppendSymbols() {}

  renderIcon(container, identifier, residue, sugar) {
    const doc    = container.element.ownerDocument;
    const textEl = doc.createElementNS(SVGNS, 'text');

    textEl.setAttribute('text-anchor',       'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('font-family',       SUGAR_TEXT_FONT_FAMILY);
    textEl.setAttribute('font-size',         str(SCALE * 0.4));
    textEl.setAttribute('fill',              '#1a56db');
    // A thick background-colored stroke, painted before the fill, gives
    // each glyph a halo that occludes a linkage line running behind it —
    // text (unlike a solid icon shape) has gaps a line would otherwise show
    // through. var() so a page on a non-white background can override it.
    textEl.setAttribute('paint-order',       'stroke fill');
    textEl.setAttribute('stroke',            'var(--sugar-text-halo-color, #fff)');
    textEl.setAttribute('stroke-width',      str(SCALE * 0.08));
    textEl.setAttribute('stroke-linejoin',   'round');
    // `identifier` is CalculateIdentifier's lowercased form (used by icon
    // renderers to key a '#sugar_xxx' symbol lookup) — this renderer has no
    // such lookup, so use residue.identifier directly for its real casing
    // (e.g. 'GalNAc', 'Ser'), not the all-lowercase 'galnac'/'ser'.
    textEl.textContent = residue.identifier;

    const location = sugar.location_for_monosaccharide(residue);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:identifier', residue.identifier);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:location',   location);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:parent',
      residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
    textEl.setAttribute('part', `residue_location_${location}`);

    container.appendChild(textEl);
    return { element: textEl };
  }

  // Text labels stay upright regardless of rotation — the base Renderer
  // computes a rotate angle from both branch-direction layout (position.rotate)
  // and, in horizontal mode, a 90°-ish compensation that icon renderers need
  // to keep icons feeling "horizontal" (see Renderer.js's render_sugar and
  // position.keep_horizontal, which exempts a handful of icon identifiers
  // with embedded text/asymmetric shapes from that compensation). A text
  // label has no shape to align, so it ignores the rotate argument entirely
  // rather than needing its own per-identifier exemption list.
  setIconPosition(icon, x, y, width, height) {
    const cx = x + width  / 2;
    const cy = y + height / 2;
    icon.element.setAttribute('transform', `translate(${str(cx)},${str(cy)})`);
  }

  // The base render_linkage() (what Renderer.renderLinkage() calls by
  // default) draws the line, repeat-unit brackets for polymer structures,
  // and ONE combined label like 'β3' (anomer + only the parent's acceptor
  // position) offset to one side of the line to avoid overlapping it. For
  // text mode we want two separate labels sitting right on the line's own
  // axis instead: 'β1' (anomer + the child's own donor carbon,
  // child.parent_linkage) near the child end, and '3' (the acceptor
  // position alone) near the parent end.
  //
  // Rather than re-deriving the line/bracket drawing (real, used feature -
  // e.g. GAG repeat brackets), delegate to the inherited behaviour with its
  // own label suppressed (show_labels=false), then add these two labels
  // into the same returned group.
  renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas, show_labels) {
    const group = super.renderLinkage(child_pos, parent_pos, child, parent, sugar, canvas, false);
    if (!show_labels || !parent_pos) {
      return group;
    }

    const childX  = SCALE * (child_pos.x + child_pos.width / 2);
    const childY  = SCALE * (child_pos.y + child_pos.height / 2);
    const parentX = SCALE * (parent_pos.x + parent_pos.width / 2);
    const parentY = SCALE * (parent_pos.y + parent_pos.height / 2);

    // Each side clears its OWN residue's rendered text footprint (e.g.
    // 'GalNAc' needs far more clearance than 'Ser') rather than a generic
    // fixed/fractional offset - otherwise a short link next to a long name
    // lands the linkage label under that residue's own label. The clearance
    // is direction-aware (ux,uy) so a near-vertical branch - where the link
    // barely has to clear the text's much shorter height - doesn't get
    // pushed out by the text's full width for no reason.
    const length = Math.hypot(childX - parentX, childY - parentY) || 1;
    const ux = (childX - parentX) / length;
    const uy = (childY - parentY) / length;
    let childClearance  = residueClearance(child.identifier,  ux, uy);
    let parentClearance = residueClearance(parent.identifier, ux, uy);
    // ...but cap both so the two labels can't cross (or touch) on a link
    // too short for their combined clearance, scaling both down together
    // to preserve their relative weighting.
    const available = length - MIN_LABEL_GAP;
    if (childClearance + parentClearance > available && available > 0) {
      const scale = available / (childClearance + parentClearance);
      childClearance  *= scale;
      parentClearance *= scale;
    }

    const addLabel = (position, text) => {
      if (text === null) {
        return null;
      }
      const [x, y] = position;
      // Built directly (not via SVGCanvas's text()/tspan wrapper used for
      // the repeat-unit labels above) to match renderIcon()'s technique
      // exactly, including its dominant-baseline handling - needed for
      // these labels to actually center on the line's y, not float above it.
      const label = group.element.ownerDocument.createElementNS(SVGNS, 'text');
      label.setAttribute('x', str(x));
      label.setAttribute('y', str(y));
      label.setAttribute('text-anchor',       'middle');
      label.setAttribute('dominant-baseline', 'central');
      label.setAttribute('font-family',       LINKAGE_FONT_FAMILY);
      label.setAttribute('font-size',         str(LINKAGE_FONT_SIZE));
      label.setAttribute('fill',              '#333');
      // Same halo technique as the residue labels in renderIcon() above,
      // just a thinner stroke since these are single characters, not whole
      // words - occludes the line passing directly behind the label.
      label.setAttribute('paint-order',     'stroke fill');
      label.setAttribute('stroke',          'var(--sugar-text-halo-color, #fff)');
      label.setAttribute('stroke-width',    str(SCALE * 0.04));
      label.setAttribute('stroke-linejoin', 'round');
      label.textContent = text;
      group.element.appendChild(label);
      return label;
    };

    // Monosaccharide.js's LINKAGES sentinels ('O': -100, 'N': -200) mean
    // "attached via this non-numbered linkage type", not a real carbon
    // position - never display one of those raw as if it were a number.
    const donorLinkage    = child.parent_linkage;
    const acceptorLinkage = parent.linkageOf(child);

    addLabel(
      point_along_line(childX, childY, parentX, parentY, childClearance / length),
      donorLinkage > 0 ? `${fancyAnomer(child.anomer)}${donorLinkage}` : null
    );
    addLabel(
      point_along_line(parentX, parentY, childX, childY, parentClearance / length),
      acceptorLinkage > 0 ? `${acceptorLinkage}` : null
    );

    return group;
  }
}
