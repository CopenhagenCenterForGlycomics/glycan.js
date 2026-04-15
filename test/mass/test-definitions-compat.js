/*global QUnit*/

/**
 * Compatibility test: verifies that monosaccharides.json + InChITerminii
 * produce terminii strings that exactly match the hand-coded DEFINITIONS.
 *
 * DEFINITIONS is intentionally kept here as the historical reference.
 * Mass.js no longer uses it at runtime.
 */

import { inchiToTerminii } from '../../js/InChITerminii.js';
import monosaccharideData from '../../js/data/monosaccharides.json';

const DEFINITIONS = `
terminii:r1:x;2:x;3:x;4:x
name:P
type:ion
composition:P:1;H:2;O:3

terminii:r1:x;2:x;3:x;4:x
name:S
type:ion
composition:S:1;H:1;O:3

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:Hex
composition:C:6;H:12;O:6

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HOH
name:Gal
type:Hex

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:Glc
type:Hex

terminii:r1:OH;2ax:OH;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:Man
type:Hex

terminii:r1:OH;2eq:OH;3ax:OH;4ax:CHOHCHHOH
name:Galf
type:Hex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:CHOHCHHOH
name:Glcf
type:Hex

terminii:r1:OH;2ax:OH;3eq:OH;4ax:CHOHCHHOH
name:Manf
type:Hex

terminii:r1:OH;2eq:NHAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:HexNAc
composition:C:8;H:13;N:1;O:5

terminii:r1:OH;2eq:NHAc;3eq:OH;4ax:OH;5eq:-;6eq:HOH
name:GalNAc
type:HexNAc

terminii:r1:OH;2eq:NHAc;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:GlcNAc
type:HexNAc

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OO
name:HexA
composition:C:6;H:8;O:6

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OO
name:GlcA
type:HexA

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:-;6eq:OO
name:IdoA
type:HexA

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOH
name:NeuAc
type:NeuAc
composition:C:11;H:17;N:1;O:8

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHAc;6eq:-;7:OH;8:OH;9:HOHAc
name:NeuAc9Ac
type:NeuAc9Ac
composition:C:12;H:17;N:1;O:8

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHGc;6eq:-;7:OH;8:OH;9:HOH
name:NeuGc
type:NeuGc
composition:C:11;H:17;N:1;O:9

terminii:1ax:OO;r2:O;3ax:H;4eq:OH;5eq:NHGc;6eq:-;7:OH;8:OH;9:HOHAc
name:NeuGc9Ac
type:NeuGc9Ac
composition:C:11;H:17;N:1;O:8

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:dHex
composition:C:6;H:10;O:4

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:Fuc
type:dHex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:-;6eq:HH
name:Rha
type:dHex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Pent
composition:C:5;H:8;O:4

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Xyl
type:Pent

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Ara
type:Pent

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:HexN
composition:C:6;H:11;N:1;O:4

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:GlcN
type:HexN

terminii:r1:H
name:Me
type:alkyl
composition:C:1;H:3
`;

/** Parse DEFINITIONS into a Map<name, terminiiString>. */
function parseDefinitionsTerminii() {
  const result = new Map();
  for (const block of DEFINITIONS.replace(/^\n/, '').split('\n\n')) {
    let name = null, terminii = null;
    for (const line of block.split('\n')) {
      const m = line.match(/^([^:]+):(.*)/);
      if (!m) continue;
      const [, field, value] = m;
      if (field === 'name') name = value;
      if (field === 'terminii') terminii = value;
    }
    if (name && terminii) result.set(name, terminii);
  }
  return result;
}

const defTerminii = parseDefinitionsTerminii();

QUnit.module('DEFINITIONS compat - coverage', {});

QUnit.test('monosaccharides.json covers all DEFINITIONS names', function(assert) {
  const jsonNames = new Set(monosaccharideData.map(e => e.name));
  for (const name of defTerminii.keys()) {
    assert.ok(jsonNames.has(name), `${name} is present in monosaccharides.json`);
  }
});

QUnit.test('DEFINITIONS covers all monosaccharides.json names', function(assert) {
  for (const entry of monosaccharideData) {
    assert.ok(defTerminii.has(entry.name), `${entry.name} is present in DEFINITIONS`);
  }
});

QUnit.module('DEFINITIONS compat - InChI-derived terminii', {});

QUnit.test('InChI entries: inchiToTerminii matches DEFINITIONS exactly', function(assert) {
  for (const entry of monosaccharideData) {
    if (!entry.inchi || entry.terminii) continue; // terminii field = explicit override, skip InChI derivation
    const { terminii } = inchiToTerminii(entry.name, entry.inchi);
    const expected = defTerminii.get(entry.name);
    assert.equal(terminii, expected, `${entry.name}: InChI-derived terminii`);
  }
});

QUnit.module('DEFINITIONS compat - hardcoded terminii', {});

QUnit.test('Terminii-only entries in JSON match DEFINITIONS', function(assert) {
  for (const entry of monosaccharideData) {
    if (!entry.terminii) continue; // covers both terminii-only and inchi+terminii (explicit override) entries
    const expected = defTerminii.get(entry.name);
    assert.equal(entry.terminii, expected, `${entry.name}: JSON terminii matches DEFINITIONS`);
  }
});
