/*global QUnit*/
import Sugar from '../../js/Sugar';
import { IO as Iupac } from '../../js/io/CondensedIupac';
import { compose } from '../../js/Compositor';
import * as Composite from '../../js/Composite';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Motif matching', {});

QUnit.test('Type 2 chain motif is matched and tagged', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const highlighted = composite.composition_for_tag(Composite.HIGHLIGHT);
  assert.ok(highlighted.length > 0, 'at least one residue highlighted');
  for (const r of highlighted) {
    assert.equal(r.getTag(Composite.HIGHLIGHT).name, 'Type 2 chain');
  }
});

QUnit.test('Polylactosamine wins over Type 2 chain by priority', (assert) => {
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc(b1-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  const highlighted = composite.composition_for_tag(Composite.HIGHLIGHT);
  assert.ok(highlighted.length > 0);
  for (const r of highlighted) {
    assert.equal(r.getTag(Composite.HIGHLIGHT).name, 'Polylactosamine');
  }
});

QUnit.test('custom motif library overrides defaults', (assert) => {
  const customMotifs = [
    { name: 'My Motif', sequence: 'Gal(b1-4)GlcNAc', color: '#123456', priority: 50, repeats: false },
  ];
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar, motifs: customMotifs });

  const highlighted = composite.composition_for_tag(Composite.HIGHLIGHT);
  assert.ok(highlighted.length > 0);
  assert.equal(highlighted[0].getTag(Composite.HIGHLIGHT).name, 'My Motif');
});

QUnit.test('first-match-wins: lower priority motif does not overwrite higher', (assert) => {
  // Polylactosamine (priority 30) should win over Type 2 chain (priority 10)
  const composite = compose([
    { sequence: 'Gal(b1-4)GlcNAc(b1-3)Gal(b1-4)GlcNAc', weight: 1 },
  ], { SugarClass: IupacSugar });

  for (const r of composite.composition_for_tag(Composite.HIGHLIGHT)) {
    assert.notEqual(r.getTag(Composite.HIGHLIGHT).name, 'Type 2 chain');
  }
});
