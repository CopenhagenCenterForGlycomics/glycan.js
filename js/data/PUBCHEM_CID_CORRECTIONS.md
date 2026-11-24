# PubChem CID corrections, and the `InChITerminii.js` ring-geometry fix (2026-11-24)

## 1. Wrong PubChem CIDs

While fetching 2D depiction coordinates (`monosaccharide-2d.js`) for every residue in
`monosaccharides.js`, several `pubchemCid` values turned out not to identify the sugar they
were supposed to represent at all. Each replacement below was verified independently of
formula matching, via PubChem synonym data carrying the matching SNFG/ChEBI/GlyTouCan tag
(e.g. CID 94715 lists `SNFG:GlcA`, `ChEBI:4178`, `GlyTouCan:G33059TI`) — not just "the
formula matches" or "an automated InChI→CID lookup returned something":

| Residue | Old (wrong) CID | Actual compound at old CID                      | Corrected CID |
|---------|-----------------|--------------------------------------------------|---------------|
| Fuc     | 2723808         | tetramethylazanium fluoride tetrahydrate          | 17106         |
| GalNAc  | 10137           | unrelated bicyclic hydrocarbon (C15H24)           | 35717         |
| GlcA    | 65533           | a phosphorylated sugar (C6H13O9P)                 | 94715         |
| NeuAc   | 65309           | wrong formula / dehydrated variant                | 439197        |
| GlcN    | 439234          | unrelated folate-like heterocycle                 | 439213        |

Two of these went through a *second*, more subtle wrong CID before landing on the one
above, which is worth recording as a cautionary note: an automated InChI→CID lookup against
PubChem is not sufficient on its own to confirm identity, even when the formula matches,
because it can silently resolve to a different real stereoisomer:

- **GalNAc** was briefly "fixed" to CID 439281 — which turned out, on synonym lookup, to be
  **N-acetyl-D-mannosamine (ManNAc)**, the C2 epimer of GalNAc, not GalNAc itself. Caught
  because the geometry fix below flagged it (GalNAc's ring-derived terminii didn't match
  the known-correct `DEFINITIONS` reference until the CID was corrected to 35717).
- **GlcN** was briefly "fixed" to CID 9834117 — which turned out to be **D-Talosamine**, a
  different hexosamine stereoisomer, not D-glucosamine. Same story: caught because its
  derived stereochemistry disagreed with known chemistry (D-glucosamine should be
  all-equatorial, matching D-glucose, since amination at C2 doesn't change ring geometry)
  until corrected to the real D-glucosamine CID, 439213.

**Takeaway:** when resolving a CID from an InChI string that might itself be slightly off
(as the old hand-authored ones in this file were — see below), always confirm the result's
identity via synonyms/cross-references, not just formula or a successful lookup.

## 2. The hand-authored `inchi` strings were not standard InChI

Independent of the CID mixups, the `inchi` field recorded for most residues in this file
was not genuine, machine-generated standard InChI — it was a syntactically similar but
hand-authored notation. Two symptoms gave this away:

- For Fuc, GlcA and NeuAc, PubChem's own InChI parser rejected the stored strings outright
  (`"Failed to generate PC-Compound from InChI string"`).
- For Gal, Glc, Man, GlcNAc and GlcA, the stored `/t` (stereo) layer differed from
  PubChem's real InChI for the same compound in more than just the missing `?`
  (undefined-anomeric-center) marker — e.g. real Gal is `t2-,3+,4+,5-,6?`, the stored one
  was `t2-,3+,4-,5+`. Same connectivity, genuinely different sign pattern.

All of these have now been replaced with PubChem's real, standard InChI (verified via the
same CID lookup discipline as above). `Rha` and `IdoA`'s stored InChI were already real and
didn't need changing.

## 3. `InChITerminii.js`'s ring-position mapping was non-portable (now fixed)

`InChITerminii.js` used to read a hard-coded InChI atom *index* per ring position (e.g.
"InChI atom 4 is always ring carbon C4") with a fixed `{'+': 'eq', '-': 'ax'}` sign table.
That convention was reverse-engineered to fit the specific (non-standard) hand-authored
strings above, and is not a property of standard InChI in general — a genuine InChI's
canonical atom numbering depends on the whole molecular graph, so e.g. a hexuronic acid's
exocyclic COOH (vs a plain hexose's exocyclic CH2OH) shifts which atom index lands on which
ring position. This first surfaced as: fixing GlcA's `inchi` to the real PubChem string
made `InChITerminii.js` derive `4ax:OH` instead of the correct `4eq:OH`.

The fix (`js/InChIRingGeometry.js`) replaces the fixed-position table with a real
ring-walk: parse the InChI `/c` connectivity layer into a bond graph, find the ring,
identify the anomeric carbon by connectivity (the ring-oxygen-adjacent carbon with an
*exocyclic oxygen*, as opposed to the other ring-oxygen neighbor which has an exocyclic
carbon), and walk the ring from there — giving real sugar positions C1, C2, C3... regardless
of the molecule's particular InChI canonical numbering. Each position's `/t` sign is then
resolved against an idealized 3D chair via the literal rule from the InChI Technical Manual
(v1.04, p.39-40): *"Tetrahedral parity is '+' if the canonical numbers of neighbors increase
clockwise when observed from a hydrogen atom or an atom that has the smallest canonical
number."* The only free parameter — whether to mirror-flip the predicted handedness — is
read directly from the InChI's own `/m` layer (`flip = (m === '0')`), not guessed or tuned
per molecule.

Validated with zero per-molecule tuning against every InChI-derived ring stereocentre
reachable from this file (Hex: Gal/Glc/Man; HexA: GlcA/IdoA; HexN: GlcN; HexNAc:
GalNAc/GlcNAc), 22/22 positions correct. See `test/mass/test-inchi-ring-geometry.js` and
the added GlcA/IdoA cases in `test/mass/test-inchi-terminii.js`.

`buildHexose`, `buildHexN` and `buildHexNAc` in `InChITerminii.js` now call this general
derivation first, falling back to the old fixed-position heuristic only if the general
method can't identify a ring/anomeric center (e.g. for some future non-standard or
incomplete InChI) — so behavior degrades gracefully rather than throwing. The sialic-acid,
L-series-deoxyhex, pentose and heptose builders were left untouched: they either don't read
`/t` at all (formula-only or explicitly hardcoded, the latter for the same reason this bug
existed — see the comment in `buildDeoxyhex`) or weren't exercised by any residue currently
in this file, so there was no real data to validate a change against.

## 4. Full quality pass (all 19 CIDs + InChI, 2026-11-24)

After the above, every `pubchemCid` and `inchi` pair in `monosaccharides.js` was checked
again from scratch — formula + InChI cross-checked against a fresh PubChem fetch per CID,
and identity independently confirmed via synonyms/cross-references (SNFG tag, ChEBI,
GlyTouCan, or an unambiguous common name — not just "the formula matches"), given that two
earlier "fixes" in this file (GalNAc→439281, GlcN→9834117) had themselves turned out to be
wrong compounds (ManNAc and D-Talosamine respectively) despite matching formula.

Result: **all 19 CIDs are confirmed to be the correct compound.** Two residual InChI issues
turned up and were fixed:

- **Xyl**: still carried the old non-standard connectivity string (never touched earlier
  since its CID was never flagged as wrong by formula). Replaced with the real PubChem
  InChI for CID 135191. This didn't change any derived output — `buildPentose` hardcodes
  C4 and treats C3 as sign-independent, so the stale string was inert, but it was exactly
  the kind of latent landmine that bit GlcA/Gal/Glc/Man earlier.
- **GalNAc, GlcN**: their `inchi` was missing the `?` (undefined anomeric stereocenter)
  marker that the real PubChem InChI has, left out during an earlier minimal-diff edit.
  Added back for consistency — every residue's `inchi` in this file is now byte-identical
  to PubChem's own reported InChI for its `pubchemCid` (where a `?` marker exists at all;
  a few residues' real InChI has that position fully defined instead, which is correct and
  left as-is).

`test/mass/test-inchi-terminii.js`'s `XYL_INCHI` fixture was updated to match.

## 5. MurNAc's InChI was the open-chain form, not the cyclic pyranose (2026-11-24)

Found while auditing every builder in `InChITerminii.js` for hardcoded/non-derived output
(prompted by a question about whether Haworth rendering still had special-casing left in
it). `js/InChIRingGeometry.js`'s ring-walk returned `null` for every position on MurNAc's
stored InChI — tracing it down, the connectivity graph parsed from its `/c` layer has zero
cycles at all (19 atoms, 19 bonds minus... actually 20 atoms, 19 bonds = a tree). The old
CID (82756)'s own IUPAC name confirms it: `"...1-oxohexan-3-yl..."` is open-chain aldehyde
naming, not the `"...oxan-3-yl..."` pattern every other cyclic residue in this file has.
Re-checking all 19 IUPAC names from the section 4 quality pass for this same "oxan(e)/
oxolane vs oxohexan(e)" distinction, MurNAc was the only one affected.

Corrected to CID 5462244 (confirmed via synonyms: `SNFG:MurNAc`), a real cyclic pyranose
InChI. Re-running the ring-walk on it resolves correctly and gives C2/C3/C4 = down/up/down,
matching GlcNAc exactly (as expected: muramic acid is GlcNAc with the C3-OH etherified to
lactate, same stereocentre, not a different configuration).

## 6. A likely pre-existing error in DEFINITIONS itself: Xyl's C4 (flagged, not fixed)

`buildPentose` in `InChITerminii.js` doesn't derive C4 from InChI at all — it's a literal
`const c4 = 'ax'; // always ax per DEFINITIONS`, and C3's lookup table maps both `+` and
`-` to `'eq'`, which is a derivation in name only. Running Xyl's real InChI through
`deriveAxialEquatorial`/`deriveHaworthOrientation` directly (bypassing this hardcode)
gives **C4 = eq**, not ax. Cross-checked against Glc's own independently-derived C2/C3/C4
pattern (down/up/down): Xyl gives the identical down/up/down pattern, which is exactly what
real chemistry requires (D-xylose's C2/C3/C4 stereocentres are the same as D-glucose's --
xylose is glucose with C6 removed). Ara's hardcoded `4ax` does match its own real
derivation, so this looks specific to Xyl.

This means the historical `DEFINITIONS` reference in `test/mass/test-definitions-compat.js`
(line ~109-115, `Pent`/`Xyl`/`Ara` all share the literal `"...4ax:OH;5eq:H"`) is itself
likely wrong for Xyl, not just under-derived in `InChITerminii.js`. Changing this affects
`Mass.js`'s mass-calculation output for xylose-containing glycans, not just rendering, so
it was **not changed here** -- flagging for a decision rather than fixing silently, since
`DEFINITIONS` is documented as "the historical reference" and correcting it is a bigger,
separate call than the rendering work this investigation was for.

(Update: this one *was* fixed -- see section 7's intro for why pentose was safe where
deoxyhexose, below, was not.)

## 7. Status of "can every residue just be a new InChI, no hardcoding": not yet, and here's why

Asked directly whether every hardcoded/special-cased spot catalogued in sections 5-6 (plus
`PROKARYOTIC_OVERRIDES`, `buildDeoxyhex`'s L-series branch, `buildDideoxyhex`, `buildHeptose`,
`buildSialic`, `buildKdo`) is safe to remove in favor of pure InChI derivation, so that adding
a new monosaccharide is just adding its InChI. Short answer: **some yes, most not yet.**

**Converted to real derivation this session** (`resolveRingPosition`, falling back to the old
heuristic only if the ring-walk can't resolve an InChI): `buildHexose` (Hex, HexA -- Gal, Glc,
Man, GlcA, IdoA), `buildHexN` (GlcN), `buildHexNAc` (GalNAc, GlcNAc), `buildPentose` (Xyl, Ara).
These four builders cover every currently-"live" Hex/HexA/HexN/HexNAc/pentose residue, and the
ring shape in each case has been validated against independent ground truth (real anomer-specific
InChI, or a same-stereocentre relative like Gal/Xyl's relationship to Glc).

**Investigated and found NOT safe yet: `buildDeoxyhex`'s L-series branch (Fuc, Rha).** The
natural next step -- apply the same `resolveRingPosition` treatment -- was tested and rejected.
Real derivation gives Fuc = ax,ax,eq (C2/C3/C4) and Rha = eq,ax,ax: genuinely different from each
other (correct -- they're different compounds) and both different from the current shared
hardcoded string (`2eq,3eq,4ax` for both, which is wrong for at least one). But cross-checking
Fuc against its own parent compound -- fucose is literally 6-deoxy-L-galactose, so its C2/C3/C4
must carry the *same* axial/equatorial classification as galactose's (ax/eq is invariant under
D/L mirroring; only R/S labels flip) -- exposed that the derivation was giving Fuc's pattern as
the exact *inverse* of Gal's (ax,ax,eq vs Gal's eq,eq,ax), when it should match. Tracing it down:
the `/m`-layer-driven mirror flip in `InChIRingGeometry.js` (`flip = mLayer === '0'`), which held
up across every Hex/HexA/HexN/HexNAc/pentose case tested, does **not** hold for the deoxyhexose
ring shape -- turning the flip off entirely reproduces Gal's pattern correctly for Fuc. In other
words: **the `/m`-based flip is not actually the universal invariant it looked like from four
ring shapes agreeing** -- it's something that happens to track `/m` for those shapes and doesn't
for this one. I don't yet know the real general rule (likely something about how the local
canonical-number ranking pattern around the ring shifts when the exocyclic C6 group changes from
CH2OH to CH3, rather than `/m` itself). Shipping a shape-specific `flip=false` patch for dHex
without understanding *why* would just be another hardcode wearing a geometry costume, so this
was left alone -- `buildDeoxyhex`'s existing hardcode stays, Fuc/Rha are unchanged.

**Not attempted (no live residue currently exercises these, so nothing to validate against):**
`buildDideoxyhex`, `buildHeptose`, and the 16 `PROKARYOTIC_OVERRIDES` entries other than MurNAc
(Tyv/Abe/Par/Col, Kdo/Kdx, HepI/HepII, FucNAc/QuiNAc/RhaNAc/ManNAc/AllNAc, Leg/Pse, Bac). Several
of these have a deeper architectural obstacle beyond "needs validating": `classifyMonosaccharide`
buckets purely by formula (C/N/O counts), and Leg/Pse/Bac all carry **two** nitrogens, which
doesn't match any existing bucket (`hexnac`/`hexn` both assume exactly one) -- they'd fall
through to the formula-only fallback, not a wrong derivation but no derivation at all. Kdo/Kdx
and the sialic acids (`buildSialic`) are ketoses (the anomeric carbon is a hemiketal with no H,
bonded to ring-O + an exocyclic COOH-carbon + an exocyclic OH), not aldoses -- `InChIRingGeometry.js`'s
anomeric-carbon detection currently assumes the aldose pattern (ring-O neighbor bearing a single
exocyclic *oxygen*, with an H), which doesn't fit a quaternary ketose center at all; that's a
separate, deliberate scope boundary from the start of the Haworth work, not a new finding.

**Bottom line for "just add a new InChI":** true today for Hex, HexA, HexN, HexNAc and pentose
residues. For deoxyhexoses, dideoxyhexoses, heptoses, and anything with 2+ nitrogens or a ketose
anomeric center, it isn't -- either the geometric method needs more per-shape validation work
(deoxyhex, dideoxyhex, heptose), or the architecture needs extending first (multi-nitrogen
classification, ketose anomeric detection). Removing those hardcodes now, rather than after that
validation, would trade a known, documented approximation for a silent, undocumented one.
