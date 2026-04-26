'use strict';
import SVGRenderer from './SVGRenderer.js';
import CanvasRenderer from './CanvasRenderer.js';
import { DEFAULT_THEME, slug } from './CompositeTheme.js';
import {
  WEIGHT, SATURATION, LOG2FC, PVALUE,
  BRANCH, CORE_FUCOSE, HIGHLIGHT, SOURCES,
} from './Composite.js';

const SVGNS = 'http://www.w3.org/2000/svg';

function resolveColormap(colormap, value, range) {
  const [lo, hi] = range;
  const mid = (lo + hi) / 2;
  let t = (value - mid) / (hi - mid);
  t = Math.max(-1, Math.min(1, t));
  if (typeof colormap === 'function') return colormap(t);
  // Built-in RdBu-like: negative = blue, neutral = white, positive = red
  if (t < 0) {
    const f = -t;
    const r = Math.round(255 * (1 - f * 0.83));
    const g = Math.round(255 * (1 - f * 0.49));
    const b = 255;
    return `rgb(${r},${g},${b})`;
  } else {
    const f = t;
    const r = 255;
    const g = Math.round(255 * (1 - f * 0.49));
    const b = Math.round(255 * (1 - f * 0.86));
    return `rgb(${r},${g},${b})`;
  }
}

function unionBBox(positions) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of positions) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x + p.width > maxX) maxX = p.x + p.width;
    if (p.y + p.height > maxY) maxY = p.y + p.height;
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function cornerXY(position, corner, offset) {
  const { x, y, width, height } = position;
  const [v, h] = corner.split('-');
  const cx = h === 'right' ? x + width - offset : x + offset;
  const cy = v === 'bottom' ? y + height - offset : y + offset;
  return { x: cx, y: cy };
}

export const CompositeMixin = (BaseRenderer) => class extends BaseRenderer {
  constructor(element, layout, options = {}) {
    super(element, layout);
    this.theme = Object.assign({}, DEFAULT_THEME, options.theme || {});
    if (options.theme && options.theme.motifColors) {
      this.theme.motifColors = { ...DEFAULT_THEME.motifColors, ...options.theme.motifColors };
    }
    this.useCssVariables = options.useCssVariables !== false;
    this.emitParts = options.emitParts !== false;
    this.compositeOptions = {
      mode:                   options.mode || 'single',
      conditions:             options.conditions || null,
      colormap:               options.colormap || 'RdBu',
      significanceThreshold:  options.significanceThreshold || 0.05,
      significanceField:      options.significanceField || 'qvalue',
      arcStyle:               options.arcStyle || 'fill',
      wedgeStyle:             options.wedgeStyle || 'fill',
      sialylation:            options.sialylation || 'collapsed',
      fucosylation:           options.fucosylation || 'collapsed',
      badges:                 options.badges || false,
      log2fcRange:            options.log2fcRange || [-3, 3],
      motifColorFn:           options.motifColorFn || null,
    };
  }

  refresh() {
    return Promise.resolve(super.refresh()).then(() => {
      const SCALE = this.constructor.GLOBAL_SCALE || 100;
      for (const sugar of this.sugars) {
        const container = this.rendered.get(sugar);
        if (!container) continue;
        this.renderDecorations(container, sugar, SCALE);
      }
    });
  }

  renderIcon(container, identifier, residue, sugar) {
    if (this._isSuppressed(residue, sugar)) {
      return null;
    }
    const icon = super.renderIcon(container, identifier, residue, sugar);
    if (!icon) return icon;

    const fillSpec = this._computeFillSpec(residue);
    this.setResidueFill(icon, fillSpec);

    const strokeSpec = this._computeStrokeSpec(residue);
    if (strokeSpec) this.setResidueStroke(icon, strokeSpec);

    return icon;
  }

  renderDecorations(container, sugar, SCALE = 100) {
    this._renderHighlights(container, sugar, SCALE);
    for (const res of sugar.composition()) {
      if (this._isSuppressed(res, sugar)) continue;
      const rawPos = this.getResiduePosition(res);
      if (!rawPos) continue;
      const pos = {
        x:      rawPos.x * SCALE,
        y:      rawPos.y * SCALE,
        width:  rawPos.width * SCALE,
        height: rawPos.height * SCALE,
      };
      this._renderArcsFor(container, sugar, res, pos);
      this._renderWedgesFor(container, sugar, res, pos);
      this._renderBranchLabelFor(container, sugar, res, pos);
      if (this.compositeOptions.badges) {
        this._renderBadgeFor(container, sugar, res, pos);
      }
    }
  }

  _isSuppressed(residue, sugar) {
    if (['NeuAc', 'NeuGc'].includes(residue.identifier)) {
      if (this.compositeOptions.sialylation === 'collapsed' && residue.parent != null) {
        return true;
      }
    }
    if (residue.identifier === 'Fuc') {
      if (this.compositeOptions.fucosylation === 'collapsed' && residue.parent != null) {
        if (residue.getTag(CORE_FUCOSE)) return false;
        return true;
      }
    }
    return false;
  }

  _fillFractionFor(child, parent) {
    const mode = this.compositeOptions.mode;
    const cond = (this.compositeOptions.conditions && this.compositeOptions.conditions[0]) || 'default';
    if (mode === 'single') {
      const childWeight  = (child.getTag(WEIGHT)  || {})[cond] || 0;
      const parentWeight = (parent.getTag(WEIGHT) || {})[cond] || 1;
      return Math.min(1, childWeight / parentWeight);
    }
    if (mode === 'differential') {
      const log2fc = child.getTag(LOG2FC) || 0;
      const [lo, hi] = this.compositeOptions.log2fcRange;
      return Math.min(1, Math.abs(log2fc) / Math.max(Math.abs(lo), Math.abs(hi)));
    }
    return 1;
  }

  _renderArcsFor(container, sugar, residue, pos) {
    if (this.compositeOptions.sialylation !== 'collapsed') return;

    for (const kid of residue.children) {
      if (!['NeuAc', 'NeuGc'].includes(kid.identifier)) continue;
      const linkage    = residue.linkageOf(kid);
      let direction = linkage === 3 ? 'down' : linkage === 6 ? 'up' : 'down';
      const fillFraction = this._fillFractionFor(kid, residue);
      const color = kid.identifier === 'NeuAc'
        ? this.theme.arcColorNeuAc
        : this.theme.arcColorNeuGc;

      this.renderArc(container, pos, {
        direction,
        fillFraction,
        color,
        species: kid.identifier.toLowerCase(),
        style: this.compositeOptions.arcStyle,
        strokeStyle: (linkage > 0 && linkage <= 100) ? 'solid' : 'dashed',
        strokeWidth: this.theme.arcStrokeWidth,
        linkage: linkage || 'unknown',
      });
    }
  }

  _renderWedgesFor(container, sugar, residue, pos) {
    if (this.compositeOptions.fucosylation !== 'collapsed') return;

    for (const kid of residue.children) {
      if (kid.identifier !== 'Fuc') continue;
      if (kid.getTag(CORE_FUCOSE)) continue;

      const linkage    = residue.linkageOf(kid);
      const direction  = linkage === 2 ? 'down'
        : linkage === 3 ? 'left'
        : linkage === 4 ? 'up'
        : 'down';
      const fillFraction = this._fillFractionFor(kid, residue);

      this.renderWedge(container, pos, {
        direction,
        fillFraction,
        color: this.theme.wedgeColorFuc,
        style: this.compositeOptions.wedgeStyle,
        linkage: linkage || 'unknown',
      });
    }
  }

  _renderHighlights(container, sugar, SCALE = 100) {
    const byMotif = new Map();

    for (const res of sugar.composition()) {
      const motif = res.getTag(HIGHLIGHT);
      if (!motif) continue;
      const rawPos = this.getResiduePosition(res);
      if (!rawPos) continue;
      const pos = {
        x:      rawPos.x * SCALE,
        y:      rawPos.y * SCALE,
        width:  rawPos.width * SCALE,
        height: rawPos.height * SCALE,
      };

      if (!byMotif.has(motif)) byMotif.set(motif, []);
      byMotif.get(motif).push({ res, pos });
    }

    for (const [motif, entries] of byMotif) {
      const positions = entries.map(e => e.pos);
      const padding = this.theme.motifPadding || 4;
      const padded = positions.map(p => ({
        x: p.x - padding, y: p.y - padding,
        width: p.width + padding * 2, height: p.height + padding * 2,
      }));
      const color = (this.compositeOptions.motifColorFn
        ? this.compositeOptions.motifColorFn(motif.name, entries[0].res)
        : null) || (this.theme.motifColors && this.theme.motifColors[motif.name]) || motif.color || '#eee';

      this.renderHighlightBackground(container, padded, {
        color,
        opacity: this.theme.motifOpacity,
        cornerRadius: this.theme.motifCornerRadius,
        motifName: motif.name,
      });
    }
  }

  _renderBranchLabelFor(container, sugar, residue, pos) {
    const label = residue.getTag(BRANCH);
    if (!label) return;
    this.renderResidueBadge(container, pos, label, this.theme.branchLabelCorner, {
      kind: 'branch-label',
      fontSize: this.theme.branchLabelFontSize,
      fontFamily: this.theme.branchLabelFontFamily,
      fontWeight: this.theme.branchLabelFontWeight,
      color: this.theme.branchLabelColor,
      offset: this.theme.branchLabelOffset,
    });
  }

  _renderBadgeFor(container, sugar, residue, pos) {
    const count = residue.getTag(SOURCES);
    if (count == null) return;
    const text = String(count instanceof Set ? count.size : count);
    this.renderResidueBadge(container, pos, text, this.theme.countBadgeCorner, {
      kind: 'count',
      fontSize: this.theme.countBadgeFontSize,
      fontFamily: this.theme.countBadgeFontFamily,
      color: this.theme.countBadgeColor,
      offset: this.theme.branchLabelOffset,
    });
  }

  _computeFillSpec(residue) {
    const mode = this.compositeOptions.mode;
    const cond = (this.compositeOptions.conditions && this.compositeOptions.conditions[0]) || 'default';

    if (mode === 'single') {
      const saturation = (residue.getTag(SATURATION) || {})[cond];
      if (saturation == null) return { type: 'solid', color: null, opacity: 1 };
      return {
        type: 'desaturated',
        saturation,
      };
    }

    if (mode === 'differential') {
      const log2fc = residue.getTag(LOG2FC);
      if (log2fc == null) {
        return { type: 'solid', color: this.theme.divergingNeutralFill, opacity: 0.5 };
      }
      return {
        type: 'diverging',
        value: log2fc,
        range: this.compositeOptions.log2fcRange,
        colormap: this.compositeOptions.colormap,
      };
    }

    return { type: 'solid', color: null, opacity: 1 };
  }

  _computeStrokeSpec(residue) {
    if (this.compositeOptions.mode !== 'differential') return null;

    const pvalue = residue.getTag(PVALUE);
    const threshold = this.compositeOptions.significanceThreshold;

    if (pvalue == null || isNaN(pvalue)) {
      return { type: 'dashed', color: this.theme.nonSignificantStrokeColor, width: this.theme.nonSignificantStrokeWidth };
    }
    if (pvalue < threshold) {
      return { type: 'solid', color: this.theme.significanceStrokeColor, width: this.theme.significanceStrokeWidth };
    }
    return { type: 'dashed', color: this.theme.nonSignificantStrokeColor, width: this.theme.nonSignificantStrokeWidth };
  }
};

function svgArcPath(cx, cy, r, startAngle, endAngle, sweep) {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle) * (sweep === 1 ? 1 : -1);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle) * (sweep === 1 ? 1 : -1);
  const largeArc = (endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 ${largeArc} ${sweep} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

class SVGCompositeRendererClass extends CompositeMixin(SVGRenderer) {
  _emitStyledAttribute(element, cssProp, varName, themeValue) {
    if (this.useCssVariables) {
      element.style[cssProp] = `var(${varName}, ${themeValue})`;
    } else {
      element.style[cssProp] = String(themeValue);
    }
  }

  _addPart(element, ...tokens) {
    if (!this.emitParts) return;
    const existing = element.getAttribute('part') || '';
    const parts = new Set(existing.split(/\s+/).filter(Boolean));
    for (const t of tokens) parts.add(t);
    element.setAttribute('part', [...parts].join(' '));
  }

  _svgPathElement(container, d) {
    let doc;
    if (container.canvas) {
      doc = container.canvas.ownerDocument;
    } else if (container.element) {
      doc = container.element.ownerDocument;
    } else {
      return null;
    }
    const path = doc.createElementNS(SVGNS, 'path');
    path.setAttribute('d', d);
    if (container.appendChild) {
      container.appendChild(path);
    }
    return path;
  }

  _svgPolygonElement(container, points) {
    let doc;
    if (container.canvas) {
      doc = container.canvas.ownerDocument;
    } else if (container.element) {
      doc = container.element.ownerDocument;
    } else {
      return null;
    }
    const poly = doc.createElementNS(SVGNS, 'polygon');
    poly.setAttribute('points', points.map(p => p.join(',')).join(' '));
    if (container.appendChild) {
      container.appendChild(poly);
    }
    return poly;
  }

  renderArc(container, position, opts) {
    const cx = position.x + position.width / 2;
    const cy = opts.direction === 'up' ? position.y : position.y + position.height;
    const r  = position.width * this.theme.arcRadiusFactor;
    const sweep = opts.direction === 'up' ? 0 : 1;

    const species = opts.species || 'neuac';
    const colorVar = species === 'neugc'
      ? '--gjs-composite-arc-neugc-color'
      : '--gjs-composite-arc-neuac-color';

    if (opts.style === 'fill') {
      const outerPath = svgArcPath(cx, cy, r, 0, Math.PI, sweep);
      const outer = this._svgPathElement(container, outerPath);
      if (outer) {
        outer.setAttribute('fill', 'none');
        this._emitStyledAttribute(outer, 'stroke', colorVar, opts.color);
        outer.style.strokeOpacity = '0.2';
        this._emitStyledAttribute(outer, 'strokeWidth', '--gjs-composite-arc-stroke-width', (opts.strokeWidth || 3) + 'px');
        this._addPart(outer, 'arc', `arc-${opts.linkage}`, `arc-${species}`);
      }

      const fillEnd = Math.PI * opts.fillFraction;
      const filledPath = svgArcPath(cx, cy, r, 0, fillEnd, sweep);
      const filled = this._svgPathElement(container, filledPath);
      if (filled) {
        filled.setAttribute('fill', 'none');
        this._emitStyledAttribute(filled, 'stroke', colorVar, opts.color);
        this._emitStyledAttribute(filled, 'strokeWidth', '--gjs-composite-arc-stroke-width', (opts.strokeWidth || 3) + 'px');
        if (opts.strokeStyle === 'dashed') {
          filled.setAttribute('stroke-dasharray', this.theme.arcUnknownLinkageDash);
        }
        this._addPart(filled, 'arc', `arc-${opts.linkage}`, `arc-${species}`);
      }
    } else {
      const fullPath = svgArcPath(cx, cy, r, 0, Math.PI, sweep);
      const arc = this._svgPathElement(container, fullPath);
      if (arc) {
        arc.setAttribute('fill', 'none');
        this._emitStyledAttribute(arc, 'stroke', colorVar, opts.color);
        const thickness = this.theme.arcMinThickness + (this.theme.arcMaxThickness - this.theme.arcMinThickness) * opts.fillFraction;
        this._emitStyledAttribute(arc, 'strokeWidth', '--gjs-composite-arc-stroke-width', thickness + 'px');
        this._addPart(arc, 'arc', `arc-${opts.linkage}`, `arc-${species}`);
      }
    }
  }

  renderWedge(container, position, opts) {
    const cx   = position.x + position.width / 2;
    const cy   = position.y + position.height / 2;
    const half = position.width * this.theme.wedgeHalfWidthFactor;
    const len  = position.width * this.theme.wedgeLengthFactor *
      (opts.style === 'fill' ? opts.fillFraction : 1);

    let pts;
    switch (opts.direction) {
      case 'up':    pts = [[cx, cy - len], [cx - half, cy], [cx + half, cy]]; break;
      case 'down':  pts = [[cx, cy + len], [cx - half, cy], [cx + half, cy]]; break;
      case 'left':  pts = [[cx - len, cy], [cx, cy - half], [cx, cy + half]]; break;
      case 'right': pts = [[cx + len, cy], [cx, cy - half], [cx, cy + half]]; break;
      default:      pts = [[cx, cy + len], [cx - half, cy], [cx + half, cy]];
    }

    const poly = this._svgPolygonElement(container, pts);
    if (poly) {
      this._emitStyledAttribute(poly, 'fill', '--gjs-composite-wedge-fuc-color', opts.color);
      if (opts.style === 'thickness') {
        poly.style.fillOpacity = String(this.theme.wedgeMinOpacity + (1 - this.theme.wedgeMinOpacity) * opts.fillFraction);
      }
      this._addPart(poly, 'wedge', `wedge-${opts.linkage}`);
    }
  }

  renderHighlightBackground(container, positions, opts) {
    const bbox = unionBBox(positions);
    const rect = container.rect
      ? container.rect(bbox.x, bbox.y, bbox.width, bbox.height)
      : null;
    if (!rect) return;

    rect.setAttribute('rx', String(opts.cornerRadius || 8));
    const motifSlug = slug(opts.motifName || '');
    const fillVar   = `--gjs-composite-motif-${motifSlug}`;
    this._emitStyledAttribute(rect, 'fill', fillVar, opts.color);
    this._emitStyledAttribute(rect, 'fillOpacity', '--gjs-composite-motif-opacity', String(opts.opacity || 0.3));
    this._addPart(rect, 'highlight', `highlight-${motifSlug}`);
    container.sendToBack(rect);
  }

  renderResidueBadge(container, position, text, corner, opts) {
    const { x, y } = cornerXY(position, corner, opts.offset || 2);
    const label = container.text ? container.text(x, y, text) : null;
    if (!label) return;

    if (opts.kind === 'branch-label') {
      this._emitStyledAttribute(label, 'fill', '--gjs-composite-branch-label-color', opts.color || this.theme.branchLabelColor);
      this._emitStyledAttribute(label, 'fontSize', '--gjs-composite-branch-label-font-size', (opts.fontSize || 12) + 'px');
      this._emitStyledAttribute(label, 'fontFamily', '--gjs-composite-branch-label-font-family', opts.fontFamily || this.theme.branchLabelFontFamily);
      this._emitStyledAttribute(label, 'fontWeight', '--gjs-composite-branch-label-font-weight', opts.fontWeight || this.theme.branchLabelFontWeight);
      this._addPart(label, 'branch-label', `branch-label-${text}`);
    } else if (opts.kind === 'count') {
      this._emitStyledAttribute(label, 'fill', '--gjs-composite-count-badge-color', opts.color || this.theme.countBadgeColor);
      this._emitStyledAttribute(label, 'fontSize', '--gjs-composite-count-badge-font-size', (opts.fontSize || 10) + 'px');
      this._addPart(label, 'count-badge');
    } else if (opts.kind === 'significance') {
      this._addPart(label, 'significance-badge');
    }
  }

  setResidueFill(icon, fillSpec) {
    if (!icon || !icon.element) return;
    const el = icon.element;

    if (fillSpec.type === 'desaturated') {
      const opacity = this.theme.saturationMinOpacity + (1 - this.theme.saturationMinOpacity) * fillSpec.saturation;
      this._emitStyledAttribute(el, 'fillOpacity', '--gjs-composite-residue-opacity', String(opacity));
      el.setAttribute('data-fill-type', 'desaturated');
      el.setAttribute('data-saturation', String(fillSpec.saturation));
    } else if (fillSpec.type === 'diverging') {
      const color = resolveColormap(fillSpec.colormap, fillSpec.value, fillSpec.range);
      this._emitStyledAttribute(el, 'fill', '--gjs-composite-diverging-fill', color);
      el.setAttribute('data-fill-type', 'diverging');
    } else if (fillSpec.type === 'solid' && fillSpec.color) {
      this._emitStyledAttribute(el, 'fill', '--gjs-composite-residue-fill', fillSpec.color);
      el.style.fillOpacity = String(fillSpec.opacity != null ? fillSpec.opacity : 1);
    }
  }

  setResidueStroke(icon, strokeSpec) {
    if (!icon || !icon.element || !strokeSpec) return;
    const el = icon.element;

    if (strokeSpec.type === 'solid') {
      this._emitStyledAttribute(el, 'stroke', '--gjs-composite-sig-stroke-color', strokeSpec.color);
      this._emitStyledAttribute(el, 'strokeWidth', '--gjs-composite-sig-stroke-width', strokeSpec.width + 'px');
      this._addPart(el, 'residue-significant');
    } else if (strokeSpec.type === 'dashed') {
      this._emitStyledAttribute(el, 'stroke', '--gjs-composite-nonsig-stroke-color', strokeSpec.color);
      el.style.strokeDasharray = this.theme.nonSignificantStrokeDash;
      this._addPart(el, 'residue-not-significant');
    }
  }
}

class CanvasCompositeRendererClass extends CompositeMixin(CanvasRenderer) {
  renderArc(container, position, opts) {
    const ctx = this.element && this.element.context;
    if (!ctx) return;

    const cx = position.x + position.width / 2;
    const cy = opts.direction === 'up' ? position.y : position.y + position.height;
    const r  = position.width * this.theme.arcRadiusFactor;
    const startAngle   = opts.direction === 'up' ? Math.PI : 0;
    const endAngle     = opts.direction === 'up' ? 2 * Math.PI : Math.PI;
    const ccw = false;

    if (opts.style === 'fill') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle, ccw);
      ctx.strokeStyle = opts.color;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = opts.strokeWidth || 3;
      ctx.stroke();
      ctx.restore();

      const span = endAngle - startAngle;
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, startAngle + span * opts.fillFraction, ccw);
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = opts.strokeWidth || 3;
      if (opts.strokeStyle === 'dashed') ctx.setLineDash([3, 2]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, startAngle, endAngle, ccw);
      ctx.strokeStyle = opts.color;
      ctx.lineWidth = this.theme.arcMinThickness + (this.theme.arcMaxThickness - this.theme.arcMinThickness) * opts.fillFraction;
      ctx.stroke();
    }
  }

  renderWedge(container, position, opts) {
    const ctx = this.element && this.element.context;
    if (!ctx) return;

    const cx   = position.x + position.width / 2;
    const cy   = position.y + position.height / 2;
    const half = position.width * this.theme.wedgeHalfWidthFactor;
    const len  = position.width * this.theme.wedgeLengthFactor *
      (opts.style === 'fill' ? opts.fillFraction : 1);

    let pts;
    switch (opts.direction) {
      case 'up':    pts = [[cx, cy - len], [cx - half, cy], [cx + half, cy]]; break;
      case 'down':  pts = [[cx, cy + len], [cx - half, cy], [cx + half, cy]]; break;
      case 'left':  pts = [[cx - len, cy], [cx, cy - half], [cx, cy + half]]; break;
      case 'right': pts = [[cx + len, cy], [cx, cy - half], [cx, cy + half]]; break;
      default:      pts = [[cx, cy + len], [cx - half, cy], [cx + half, cy]];
    }

    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
    ctx.fillStyle = opts.color;
    if (opts.style === 'thickness') {
      ctx.globalAlpha = this.theme.wedgeMinOpacity + (1 - this.theme.wedgeMinOpacity) * opts.fillFraction;
    }
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  renderHighlightBackground(container, positions, opts) {
    const ctx = this.element && this.element.context;
    if (!ctx) return;

    const bbox = unionBBox(positions);
    const r = opts.cornerRadius || 8;
    const { x, y, width: w, height: h } = bbox;

    ctx.save();
    ctx.globalAlpha = opts.opacity || 0.3;
    ctx.fillStyle = opts.color;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  renderResidueBadge(container, position, text, corner, opts) {
    const ctx = this.element && this.element.context;
    if (!ctx) return;

    const { x, y } = cornerXY(position, corner, opts.offset || 2);
    const fontSize   = opts.fontSize || 12;
    const fontFamily = opts.fontFamily || 'sans-serif';
    const fontWeight = opts.fontWeight || 'normal';
    ctx.save();
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = opts.color || '#222';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  setResidueFill(icon, fillSpec) {
    if (!icon) return;
    if (!this._pendingFills) this._pendingFills = new Map();
    this._pendingFills.set(icon, fillSpec);
  }

  setResidueStroke(icon, strokeSpec) {
    if (!icon) return;
    if (!this._pendingStrokes) this._pendingStrokes = new Map();
    this._pendingStrokes.set(icon, strokeSpec);
  }
}

export const SVGCompositeRenderer    = SVGCompositeRendererClass;
export const CanvasCompositeRenderer = CanvasCompositeRendererClass;
