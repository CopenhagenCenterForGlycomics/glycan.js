import SVGRenderer from './SVGRenderer.js';

const SVGNS      = 'http://www.w3.org/2000/svg';
const GLYCANJSNS = 'https://glycocode.com/glycanjs';
const SCALE      = SVGRenderer.GLOBAL_SCALE;   // 100
const str        = n => n.toFixed(1);

export class SugarTextRenderer extends SVGRenderer {

  constructor(container, layout) {
    super(container, layout);
    if (this.element) {
      this.element.canvas.style.setProperty('--stroke-color', '#7B2FBE');
    }
  }

  static async AppendSymbols() {}

  renderIcon(container, identifier, residue, sugar) {
    const doc    = container.element.ownerDocument;
    const textEl = doc.createElementNS(SVGNS, 'text');

    textEl.setAttribute('text-anchor',       'middle');
    textEl.setAttribute('dominant-baseline', 'central');
    textEl.setAttribute('font-family',       'monospace');
    textEl.setAttribute('font-size',         str(SCALE * 0.35));
    textEl.setAttribute('fill',              '#1a56db');
    textEl.textContent = identifier;

    const location = sugar.location_for_monosaccharide(residue);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:identifier', residue.identifier);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:location',   location);
    textEl.setAttributeNS(GLYCANJSNS, 'glycanjs:parent',
      residue.parent ? sugar.location_for_monosaccharide(residue.parent) : '');
    textEl.setAttribute('part', `residue_location_${location}`);

    container.appendChild(textEl);
    return { element: textEl };
  }

  setIconPosition(icon, x, y, width, height, rotate) {
    const cx = x + width  / 2;
    const cy = y + height / 2;
    const rotStr = rotate !== 0
      ? `rotate(${str(rotate)},${str(cx)},${str(cy)}) `
      : '';
    icon.element.setAttribute('transform', `${rotStr}translate(${str(cx)},${str(cy)})`);
  }
}
