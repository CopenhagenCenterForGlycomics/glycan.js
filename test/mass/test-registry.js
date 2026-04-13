/*global QUnit*/

import { MonosaccharideRegistry, MonosaccharideEntry, DEFAULT_REGISTRY } from '../../js/MonosaccharideRegistry.js';
import { MONOSACCHARIDES } from '../../js/Mass.js';

QUnit.module('MonosaccharideRegistry', {});

QUnit.test('DEFAULT_REGISTRY contains all entries from DEFINITIONS', function(assert) {
  const massNames = Object.keys(MONOSACCHARIDES).filter(n => n !== 'undefined');
  for (const name of massNames) {
    assert.ok(DEFAULT_REGISTRY.has(name), `Registry has entry for ${name}`);
  }
});

QUnit.test('Registry entries have correct source', function(assert) {
  const glcEntry = DEFAULT_REGISTRY.get('Glc');
  assert.ok(glcEntry instanceof MonosaccharideEntry, 'Returns MonosaccharideEntry instance');
  assert.equal(glcEntry.source, 'inchi', 'InChI-loaded entries have source=inchi');

  const hexEntry = DEFAULT_REGISTRY.get('Hex');
  assert.equal(hexEntry.source, 'hardcoded', 'Terminii-only entries have source=hardcoded');
});

QUnit.test('getPrototype follows type chain', function(assert) {
  const galEntry = DEFAULT_REGISTRY.get('Gal');
  assert.equal(galEntry.type, 'Hex', 'Gal has type Hex');

  const proto = DEFAULT_REGISTRY.getPrototype('Gal');
  assert.equal(proto.name, 'Hex', 'getPrototype returns Hex for Gal');
});

QUnit.test('getPrototype returns self for base types', function(assert) {
  const proto = DEFAULT_REGISTRY.getPrototype('Hex');
  assert.equal(proto.name, 'Hex', 'getPrototype returns self when no type');
});

QUnit.test('ring Maps from registry match those from MONOSACCHARIDES', function(assert) {
  for (const name of ['Glc', 'Gal', 'GlcNAc', 'NeuAc', 'Fuc']) {
    const massEntry = MONOSACCHARIDES[name];
    const regEntry = DEFAULT_REGISTRY.get(name);
    if (!massEntry || !massEntry.ring || !regEntry) continue;

    const massRingArr = Array.from(massEntry.ring.values()).map(e => e.atoms);
    const regRingArr = Array.from(regEntry.ring.values()).map(e => e.atoms);
    assert.deepEqual(regRingArr, massRingArr, `Ring atoms match for ${name}`);
  }
});

QUnit.test('register() adds a new manual entry', function(assert) {
  const reg = new MonosaccharideRegistry();
  reg.register('TestHex', {
    terminiiString: 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH',
    compositionString: 'C:6;H:12;O:6',
  });

  assert.ok(reg.has('TestHex'), 'Registry has newly registered entry');
  const entry = reg.get('TestHex');
  assert.equal(entry.source, 'manual', 'Manual entry has source=manual');
  assert.equal(entry.ring.size, 6, 'Ring has 6 positions');
});

QUnit.test('register() with InChI sets source=inchi', function(assert) {
  const reg = new MonosaccharideRegistry();
  reg.register('TestGlc', {
    terminiiString: 'r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH',
    inchi: 'InChI=1S/C6H12O6/...',
  });

  const entry = reg.get('TestGlc');
  assert.equal(entry.source, 'inchi', 'Entry with InChI has source=inchi');
});

QUnit.test('names() returns all registered names', function(assert) {
  const names = DEFAULT_REGISTRY.names();
  assert.ok(names.includes('Glc'), 'names() includes Glc');
  assert.ok(names.includes('NeuAc'), 'names() includes NeuAc');
  assert.ok(Array.isArray(names), 'names() returns array');
});
