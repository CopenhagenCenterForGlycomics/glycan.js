/*global QUnit*/

/**
 * Compatibility test: verifies that monosaccharides.json + InChITerminii
 * produce terminii strings that exactly match the hand-coded DEFINITIONS.
 *
 * DEFINITIONS is intentionally kept here as the historical reference.
 * Mass.js no longer uses it at runtime.
 */

import { inchiToTerminii } from '../../js/InChITerminii.js';
import monosaccharideData from '../../js/data/monosaccharides.js';

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


# C5 corrected from eq to ax on 2026-11-24. Position 5 (the ring-junction
# carbon bearing the exocyclic COOH) was never actually derived in any
# builder -- every one hardcoded a "5eq" placeholder, which happened to be
# right for every other live compound but is genuinely wrong for IdoA:
# IdoA is IdoA because it's the C5-epimer of GlcA, so C2/C3/C4 stay
# unchanged (still eq, matching GlcA) while C5 itself -- the position that
# literally defines the epimerisation -- flips to ax. See
# PUBCHEM_CID_CORRECTIONS.md section 13.
terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5ax:-;6eq:OO
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

# Rha corrected from the original 4ax (a copy of Fuc's own line -- Fuc and
# Rha used to share one hardcoded literal) to 2ax;3eq;4eq on 2026-11-24.
# Rha is 6-deoxy-L-mannose, so it must share D-mannose's axial/equatorial
# pattern (ax,eq,eq), not Fuc's (galactose's, eq,eq,ax) -- they're different
# compounds. See js/data/PUBCHEM_CID_CORRECTIONS.md section 7.
terminii:r1:OH;2ax:OH;3eq:OH;4eq:OH;5eq:-;6eq:HH
name:Rha
type:dHex

terminii:r1:OH;2eq:OH;3eq:H;4eq:OH;5eq:-;6eq:HH
name:dideoxyhex
composition:C:6;H:12;O:4

# Tyv, Abe, Par, Col added here 2026-11-24 (they used to be
# InChITerminii.js PROKARYOTIC_OVERRIDES literals with no DEFINITIONS entry
# at all, so there's no "original" value for these to differ from). Each
# one's C2/C4 pattern is cross-checked against its own known parent hexose,
# confirmed via PubChem synonyms: Tyv = 3,6-dideoxy-D-mannose (so it must
# share D-mannose's ax,eq pattern at C2/C4 -- NOT D-glucose's eq,eq, which
# the old hardcoded override wrongly gave it), Abe = 3,6-dideoxy-D-galactose
# (Gal's eq,ax), Par = 3,6-dideoxy-D-glucose (Glc's eq,eq), Col =
# 3,6-dideoxy-L-galactose (Gal's eq,ax again -- ax/eq is invariant under
# D/L mirroring). C3 is not a real stereocentre here (both substituents are
# H), so it has no derivable value; see PUBCHEM_CID_CORRECTIONS.md section 9.
terminii:r1:OH;2ax:OH;3eq:H;4eq:OH;5eq:-;6eq:HH
name:Tyv
type:dideoxyhex

terminii:r1:OH;2eq:OH;3eq:H;4ax:OH;5eq:-;6eq:HH
name:Abe
type:dideoxyhex

terminii:r1:OH;2eq:OH;3eq:H;4eq:OH;5eq:-;6eq:HH
name:Par
type:dideoxyhex

terminii:r1:OH;2eq:OH;3eq:H;4ax:OH;5eq:-;6eq:HH
name:Col
type:dideoxyhex

terminii:r1:OH;2eq:OH;3eq:OH;4ax:OH;5eq:H
name:Pent
composition:C:5;H:8;O:4

terminii:r1:OH;2eq:OH;3eq:OH;4eq:OH;5eq:H
name:Xyl
type:Pent
# C4 corrected from the original 4ax to 4eq on 2026-11-24.
# D-xylose is D-glucose with C6 removed, same C2/C3/C4 stereocentres, and
# deriving straight from Xyl's own real InChI gives the same down/up/down
# Haworth pattern as Glc -- see js/data/PUBCHEM_CID_CORRECTIONS.md section 6.


# C2/C3 corrected from eq,eq to ax,ax on 2026-11-24, after two bugs were
# fixed together: (1) the general ring-walk mirror-flip rule had an
# unvalidated default for pentoses (no exocyclic group at C5) that was
# backwards for the L-series -- only D-series pentoses had ever been
# checked, where the bug is invisible; (2) C2 was hardcoded to eq and never
# actually derived. Cross-checked against D-arabinose (CID 6902, confirmed
# via D-arabinopyranose / CHEBI:46994 / GlyTouCan:G91625IP): its real
# pattern is C2=ax, C3=ax, C4=eq, and ax/eq is invariant under D/L
# mirroring, so L-arabinose must match it exactly. See
# PUBCHEM_CID_CORRECTIONS.md section 11.
terminii:r1:OH;2ax:OH;3ax:OH;4eq:OH;5eq:H
name:Ara
type:Pent

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:HexN
composition:C:6;H:11;N:1;O:4

terminii:r1:OH;2eq:NH2;3eq:OH;4eq:OH;5eq:-;6eq:HOH
name:GlcN
type:HexN

terminii:r1:OH;2eq:NHAc;3eq:OLac;4eq:OH;5eq:-;6eq:HOH
name:MurNAc
composition:C:11;H:17;N:1;O:7

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
