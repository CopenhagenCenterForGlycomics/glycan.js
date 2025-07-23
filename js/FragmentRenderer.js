
import { FragmentResidue } from './Fragmentor';
import SVGRenderer from './SVGRenderer';

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

const FragmentRenderer = (baserenderer) => class extends baserenderer {

    static async AppendSymbols(element) {
        await SVGRenderer.AppendSymbols(element);
        await SVGRenderer.AppendSymbols(element,FRAGMENT_SYMBOLS);
    }

    renderIcon(container,identifier,residue,sugar) {

        let resolved_identifier = identifier;

        if (residue instanceof FragmentResidue) {
            const fragment = sugar;
            if (fragment.chord.indexOf(residue) >= 0) {
                console.log(fragment.type);
                let type = fragment.type.split('/')[fragment.chord.indexOf(residue)];
                if (type.match(/\d+,\d+/)) {
                    let clean_type = type.replace(/[\,\-]/g,'_').replace(/\d+[a-z]$/,'');
                    resolved_identifier = `fragment_${clean_type}`;
                }
                console.log(identifier,resolved_identifier);
            }
        }
        const baseIcon = super.renderIcon(container,resolved_identifier,residue,sugar);

        return baseIcon;
    }
};


export { FragmentRenderer, FRAGMENT_SYMBOLS };