import CondensedLayout from "./CondensedLayout";


let SugarAwareLayout = class extends CondensedLayout {
	performLayout() {
		// Identify locked components
		// and lock them together
		super.performLayout();	
	}

};

export {SugarAwareLayout};