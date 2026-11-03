/*global QUnit*/

import Sugar from '../../js/Sugar';
import { Mass, REDUCING_END_FREE, REDUCING_END_PROCAINAMIDE, REDUCING_END_RAPIFLUOR_MS }  from '../../js/Mass';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Mass(Iupac(Sugar)) {}

QUnit.module('Test the procainamide and RapiFluor-MS reducing-end labels', {
});

const massWith = (sequence, reducing_end) => {
    let sugar = new IupacSugar();
    sugar.sequence = sequence;
    sugar.reducing_end = reducing_end;
    return sugar.mass;
};

// Net additions over the free glycan, from the Waters application notes:
// procainamide +219.173 (C13H21N3), RapiFluor-MS +311.175 (C17H21N5O).
QUnit.test( 'Labels add their net mass over the free glycan' , function( assert ) {
    for (let sequence of ['GlcNAc', 'Man(a1-3)Man(b1-4)GlcNAc(b1-4)GlcNAc', 'NeuAc(a2-3)Gal(b1-3)GalNAc']) {
        let free = massWith(sequence, REDUCING_END_FREE);
        assert.close( massWith(sequence, REDUCING_END_PROCAINAMIDE) - free, 219.1735, 1e-03, 'Procainamide on '+sequence );
        assert.close( massWith(sequence, REDUCING_END_RAPIFLUOR_MS) - free, 311.1746, 1e-03, 'RapiFluor-MS on '+sequence );
    }
});

QUnit.test( 'Procainamide-labelled HexNAc Y1 [M+H]+' , function( assert ) {
    const PROTON = 1.0072765;
    assert.close( massWith('GlcNAc', REDUCING_END_PROCAINAMIDE) + PROTON, 441.2708, 1e-03, 'GlcNAc-ProA' );
});
