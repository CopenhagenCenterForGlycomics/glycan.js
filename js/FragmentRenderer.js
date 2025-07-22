
import { FragmentResidue } from './Fragmentor';

const FragmentRenderer = (baserenderer) => class extends baserenderer {
	renderIcon(container,identifier,residue,sugar) {
		const baseIcon = super.renderIcon(container,identifier,residue,sugar);

		if (residue instanceof FragmentResidue) {
			const fragment = sugar;
			if (fragment.chord.indexOf(residue) >= 0) {
				console.log(fragment.type,residue.identifier);
			}
		}
		return baseIcon;
	}
};


export { FragmentRenderer };