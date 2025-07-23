
import { FragmentResidue } from './Fragmentor';
import SVGRenderer  from './SVGRenderer';
import { perpendicular_line, half_perpendicular_line, point_along_line, str } from './Renderer';

const FRAGMENT_SYMBOLS = `
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
    <symbol id="fragment_3_5_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="#999"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="#999"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="#999"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_3_5_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="#999"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_1_3_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="#999"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_1_3_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="#999"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="#999"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="#999"/>
    </symbol>
    <symbol id="fragment_1_5_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="#999"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_1_5_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="#999"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="#999"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="#999"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_2_4_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="#999"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="#999"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="#999"/>
    </symbol>
    <symbol id="fragment_2_4_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="#999"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_0_2_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="#999"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_0_2_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="#999"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="#999"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="#999"/>
    </symbol>
    <symbol id="fragment_0_4_x" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="#999"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="#999"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="#999"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="none"/>
    </symbol>
    <symbol id="fragment_0_4_a" viewBox="0 0 100 100">
        <path d="M70 15.36 30 15.36 10 50 30 84.64 70 84.64 90 50 70 15.36z" fill="#fff" stroke="#aaa" stroke-miterlimit="10" stroke-width="3"/>
        <path d="M90 50 50 50 70 15.36 90 50z" fill="none"/>
        <path d="M90 50 70 84.64 50 50 90 50z" fill="none"/>
        <path d="M70 84.64 30 84.64 50 50 70 84.64z" fill="none"/>
        <path d="M50 50 30 84.64 10 50 50 50z" fill="none"/>
        <path d="M50 50 10 50 30 15.36 50 50z" fill="none"/>
        <path d="M70 15.36 50 50 30 15.36 70 15.36z" fill="#999"/>
    </symbol>
    </defs>
</svg>
`;

const FragmentLayout = (baselayout) => class extends baselayout {
    static PerformLayout(renderable) {
        if (renderable.original) {
            let ref_layout = baselayout.PerformLayout(renderable.original);
            let result = new WeakMap();
            for (let residue of renderable.composition()) {
                let original_layout = ref_layout.get(residue.original);
                if (renderable.root == residue) {
                    original_layout = Object.assign({},original_layout);
                    original_layout.dx = 0;
                    original_layout.dy = 0;
                }
                result.set(residue, original_layout);
            }
            return result;
        }
        return baselayout.PerformLayout(renderable);
    }
}

const fix_rotate = function(position) {
    const ROTATE = this.rotate;
    const LTR = this.leftToRight;

    let xval = position.x;
    let yval = position.y;
    if (ROTATE) {
        position.x = LTR? -1*(yval + position.height) : yval;
        position.y = LTR? xval : -1*(xval + position.width);
    }
}

const FragmentRenderer = (baserenderer) => class extends baserenderer {

    static async AppendSymbols(element) {
        await SVGRenderer.AppendSymbols(element);
        await SVGRenderer.AppendSymbols(element,FRAGMENT_SYMBOLS);
    }


    get LayoutEngine() {
      return super.LayoutEngine;
    }

    set LayoutEngine(engine) {
      super.LayoutEngine = FragmentLayout(engine);
    }

    renderGlycosidicCleavage(canvas,child_pos,parent_pos,child,parent,flip) {

        const SCALE = 100;

        child_pos = Object.assign({}, child_pos);
        parent_pos = Object.assign({}, parent_pos);

        fix_rotate.call(this,child_pos);
        fix_rotate.call(this,parent_pos);

        const extents = [
          SCALE*(child_pos.x + child_pos.width / 2),
          SCALE*(child_pos.y + child_pos.height / 2),
          SCALE*(parent_pos.x + parent_pos.width / 2),
          SCALE*(parent_pos.y + parent_pos.height / 2)
        ];

        let is_angled = child_pos.y - parent_pos.y;

        const reverse_cap = flip ? 3 : -3;

        let bracket_scale = 2/3;

        if (is_angled != 0) {
            bracket_scale = 0.5;
        }

        let group = canvas.group();


        let extent_fraction = flip ? 0.75 : 0.25;

        const bracket_position = point_along_line(...extents, extent_fraction );
        const perpendicular = perpendicular_line( bracket_position[0],bracket_position[1], extents[2],extents[3] , SCALE * child_pos.width * bracket_scale );
        const cap = half_perpendicular_line( ...perpendicular , reverse_cap*SCALE * child_pos.width / 8 );
        const cap_end = half_perpendicular_line( perpendicular[2],perpendicular[3],perpendicular[0],perpendicular[1] , reverse_cap*-1*SCALE * child_pos.width / 8 );

        group.line(...perpendicular, { 'stroke-width': str(10*SCALE/100), 'stroke': '#f00' });
        if (is_angled <= 0) {
            group.line(...cap_end, { 'stroke-width': str(10*SCALE/100), 'stroke': '#f00' });
        } else {
            group.line(...cap, { 'stroke-width': str(10*SCALE/100), 'stroke': '#f00' });
        }

    }

    renderIcon(container,identifier,residue,sugar) {

        let resolved_identifier = identifier;

        if (residue instanceof FragmentResidue) {
            const fragment = sugar;
            if (fragment.chord.indexOf(residue) >= 0) {
                let type = fragment.type.split('/')[fragment.chord.indexOf(residue)];
                if (type.match(/\d+,\d+/)) {
                    let clean_type = type.replace(/[\,\-]/g,'_').replace(/\d+[a-z]$/,'');
                    resolved_identifier = `fragment_${clean_type}`;
                }
                if (type.match(/^[bz]/)) {
                    let base_layout = this.LayoutEngine.PerformLayout(fragment.original);
                    this.renderGlycosidicCleavage(container,base_layout.get(residue.original),base_layout.get(residue.original.parent), residue.original, residue.original.parent, true );
                }
                console.log(type,identifier,resolved_identifier);
            }
            if (fragment.chord.map( res => res.parent ).indexOf(residue) >= 0) {
                let chord_parents = fragment.chord.map( res => res.parent );
                let chord_indices = chord_parents.map( res => res == residue ).map( (o,i) => i );
                let base_layout = this.LayoutEngine.PerformLayout(fragment.original);
                for (let chord_index of chord_indices) {
                    let chord_residue = fragment.chord[chord_index]
                    let type = fragment.type.split('/')[chord_index];
                    if (! type.match(/^[yz]/)) {
                        continue;
                    }
                    console.log(sugar,type);
                    this.renderGlycosidicCleavage(container,base_layout.get(chord_residue.original),base_layout.get(residue.original), chord_residue.original, residue.original );
                }
            }
        }
        const baseIcon = super.renderIcon(container,resolved_identifier,residue,sugar);

        return baseIcon;
    }
};


export { FragmentRenderer, FRAGMENT_SYMBOLS };