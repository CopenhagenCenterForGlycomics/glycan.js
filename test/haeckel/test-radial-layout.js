/*global QUnit*/
'use strict';

import Sugar from '../../js/Sugar.js';
import { IO as Iupac } from '../../js/io/CondensedIupac.js';
import SugarAwareLayout from '../../js/SugarAwareLayout.js';
import RadialLayout from '../../js/RadialLayout.js';

class IupacSugar extends Iupac(Sugar) {}

const sugarOf = (sequence) => {
    const sugar = new IupacSugar();
    sugar.sequence = sequence;
    return sugar;
};

const GLYCANS = {
    'O-glycan': 'Gal(b1-3)[NeuAc(a2-6)]GalNAc',
    'biantennary': 'Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc',
    'tetra-antennary': 'NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-4)]Man(a1-3)[NeuAc(a2-6)Gal(b1-4)GlcNAc(b1-2)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-6)]Man(a1-6)]Man(b1-4)GlcNAc(b1-4)[Fuc(a1-6)]GlcNAc',
};

QUnit.module('Radial layout', {
});

for (const links of [true, false]) {
    for (const [name, sequence] of Object.entries(GLYCANS)) {
        QUnit.test(`no residues overlap: ${name}${links ? ', with linkage labels' : ''}`, function(assert) {
            const engine = RadialLayout(class extends SugarAwareLayout {});
            engine.LINKS = links;
            const sugar = sugarOf(sequence);
            const layout = engine.PerformLayout(sugar);
            const placed = sugar.composition().map((res) => layout.get(res));
            assert.ok(placed.every(Boolean), 'every residue placed');
            let closest = Infinity;
            for (let i = 0; i < placed.length; i++) {
                for (let j = i + 1; j < placed.length; j++) {
                    const a = placed[i], b = placed[j];
                    const gap = Math.hypot(a.x + a.r - b.x - b.r, a.y + a.r - b.y - b.r) - a.r - b.r;
                    closest = Math.min(closest, gap);
                }
            }
            assert.ok(closest > 0, `closest residues ${closest.toFixed(2)} apart`);
        });
    }
}

QUnit.test('a linear glycan runs straight up from its reducing end', function(assert) {
    const engine = RadialLayout(class extends SugarAwareLayout {});
    const sugar = sugarOf('Gal(b1-4)GlcNAc(b1-3)Gal(b1-4)Glc');
    const layout = engine.PerformLayout(sugar);
    const xs = sugar.composition().map((res) => layout.get(res).x);
    assert.ok(xs.every((x) => Math.abs(x - xs[0]) < 1e-9), 'one column');
});

QUnit.test('the base engine keeps LINKS and residue identifiers', function(assert) {
    const base = class extends SugarAwareLayout {};
    base.LINKS = false;
    const engine = RadialLayout(base);
    assert.equal(engine.LINKS, false);
    assert.equal(engine.CalculateIdentifier, base.CalculateIdentifier);
});
