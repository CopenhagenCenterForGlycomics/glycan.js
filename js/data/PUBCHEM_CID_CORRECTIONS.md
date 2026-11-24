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

## 7. Status of "can every residue just be a new InChI, no hardcoding": resolved for deoxyhexoses (see section 8)

Asked directly whether every hardcoded/special-cased spot catalogued in sections 5-6 (plus
`PROKARYOTIC_OVERRIDES`, `buildDeoxyhex`'s L-series branch, `buildDideoxyhex`, `buildHeptose`,
`buildSialic`, `buildKdo`) is safe to remove in favor of pure InChI derivation, so that adding
a new monosaccharide is just adding its InChI.

**Converted to real derivation this session** (`resolveRingPosition`, falling back to the old
heuristic only if the ring-walk can't resolve an InChI): `buildHexose` (Hex, HexA -- Gal, Glc,
Man, GlcA, IdoA), `buildHexN` (GlcN), `buildHexNAc` (GalNAc, GlcNAc), `buildPentose` (Xyl, Ara),
and -- after the fix in section 8 -- `buildDeoxyhex` (Fuc, Rha) too. These cover every
currently-"live" Hex/HexA/HexN/HexNAc/pentose/deoxyhexose residue, each validated against
independent ground truth (real anomer-specific InChI, or a same-stereocentre relative like
Gal/Xyl's or Fuc/Gal's relationship).

**First attempt at `buildDeoxyhex` found a real problem, which section 8 then root-caused and
fixed properly** -- the following paragraph is kept for the record of how that was found, since
the method (cross-checking a derived result against an independent relative, not just trusting
self-consistency) is the point, not just the answer:

Applying the same `resolveRingPosition` treatment to `buildDeoxyhex` initially looked like it
should just work, but cross-checking Fuc against its own parent compound -- fucose is literally
6-deoxy-L-galactose, so its C2/C3/C4 must carry the *same* axial/equatorial classification as
galactose's (ax/eq is invariant under D/L mirroring; only R/S labels flip) -- exposed that the
derivation was giving Fuc's pattern as the exact *inverse* of Gal's. The `/m`-layer-driven mirror
flip in `InChIRingGeometry.js`, which held up across every Hex/HexA/HexN/HexNAc/pentose case
tested, does not hold for the deoxyhexose ring shape. See section 8 for the real, general fix
(not a per-shape patch).

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

**Bottom line for "just add a new InChI":** true today for Hex, HexA, HexN, HexNAc, pentose and
deoxyhexose residues (see section 8 for why deoxyhexose needed one more real fix, not a
shape-specific patch, to get there). For dideoxyhexoses, heptoses, and anything with 2+
nitrogens or a ketose anomeric center, it isn't yet -- either the geometric method needs
per-shape validation work extended to them (dideoxyhex, heptose), or the architecture needs
extending first (multi-nitrogen classification, ketose anomeric detection).

## 8. The real fix for deoxyhexoses: the `/m` flip isn't universal, but a structural rule is

Section 7 left `buildDeoxyhex` unfixed because the `/m`-layer-driven mirror flip that worked for
every other ring shape gave Fuc's exact inverse. Re-reading the InChI Technical Manual's actual
definition of `/m` (p.46-47) explains why there's no contradiction to resolve by chemistry alone:

> "InChI considers both enantiomers and selects the one that has the 'smaller' identifier. /m0
> signifies that the selected one has exactly the same stereo arrangement as the input structure;
> /m1 means that the selected one has the inverse arrangement."

"Smaller" is chosen by InChI's own canonicalization algorithm, per molecular graph -- there is no
reason that choice has to agree across different ring shapes, and empirically it doesn't. So
`/m` alone can't tell you whether this module's own idealized-chair convention needs a matching
flip; that's a property of the *shape*, not something `/m` encodes on its own.

The fix: compare what's attached at ring position 5 (the last ring carbon, bonded to the ring
oxygen on the non-anomeric side) -- if its exocyclic substituent has further heavy-atom
neighbors (CH2OH for Hex/HexN/HexNAc, COOH for HexA), or there's no exocyclic substituent at all
(pentose), the `/m`-driven flip applies. If it's a single terminal atom (a deoxyhexose's CH3),
it doesn't. This is read directly off the same bond graph the ring-walk already parses --
`InChIRingGeometry.js`'s `shapeNeedsMirrorFlip()` -- no external chemical classification needed.
Re-validated against all 8 ring-shape/residue combinations tested so far (33/33 positions,
including Fuc and Rha both now correct and correctly *different* from each other): Gal, Glc, Man,
GalNAc, GlcNAc, GlcA, IdoA, GlcN, Xyl, Ara, Fuc, Rha, MurNAc.

One more place this same shape-dependence showed up: `HaworthLayout.js`'s anomeric-position
formula (`alpha-D and beta-L share a ring face`) was calibrated against the *old, buggy* Fuc
Haworth output and needed re-deriving too -- it now calls `shapeNeedsMirrorFlip()` itself rather
than assuming every L-series residue mirrors its D-series counterpart. Confirmed against real
anomer-specific InChI for alpha/beta-D-glucopyranose and alpha/beta-L-fucopyranose: for the
deoxyhexose shape, L-series does *not* mirror D-series at the anomeric centre either -- alpha-L-
Fuc's anomeric OH matches alpha-D-Glc's face directly, not its mirror.

`buildDeoxyhex` in `InChITerminii.js` now derives Fuc and Rha for real (same `resolveRingPosition`
pattern as the other builders), and `DEFINITIONS` (`test/mass/test-definitions-compat.js`) was
corrected: Rha's line used to be a copy of Fuc's (`4ax` for both), which was wrong for at least
one of them since they're different compounds -- Rha now reads `2ax;3eq;4eq`, matching D-mannose's
pattern as it must (Rha is 6-deoxy-L-mannose). Fuc's line was already correct (apparently by
coincidence, since the old hardcode and the new real derivation agree) and didn't need to change.

## 9. Dideoxyhexoses (Tyv, Abe, Par, Col): fixed for real, and a real discovery about ax/eq itself

Extending the same treatment to `buildDideoxyhex` (3,6-dideoxyhexoses: Tyv, Abe, Par, Col, all
previously `PROKARYOTIC_OVERRIDES` literals, not live in `monosaccharides.js`). Fetched real
InChI for all four (verified via PubChem synonyms) and found each one is literally a named
derivative of a hexose already in this dataset: **Tyv = 3,6-dideoxy-D-mannose, Abe = 3,6-dideoxy-
D-galactose, Par = 3,6-dideoxy-D-glucose, Col = 3,6-dideoxy-L-galactose.** Since removing C3/C6
oxygens doesn't touch C2 or C4, each one's C2/C4 axial/equatorial pattern must match its named
parent's exactly -- and all 8 positions (C2+C4 x 4 compounds) do, against `deriveAxialEquatorial`
with no changes needed to the method itself (same `shapeNeedsMirrorFlip` logic as Fuc/Rha, since
C5 still bears a terminal CH3 here too).

This caught a real, independent bug: the old hardcoded override gave all four compounds the same
`2eq`, but Tyvelose (mannose-configured) needs `2ax`, the same way D-mannose itself does. Fixed in
`buildDideoxyhex`, and all four added to `monosaccharides.js` as real InChI-backed entries,
removed from `PROKARYOTIC_OVERRIDES` entirely -- the first worked example of the actual goal
("adding a monosaccharide is just adding its InChI") for a residue family that used to be 100%
hand-typed with no InChI at all.

**Separately, investigating ring position 3 (always `H`, the C3 deoxy position) turned up
something that reframes earlier sections' urgency:** position 3 in a 3,6-dideoxyhexose is not a
stereocentre at all -- it's a plain CH2 (both substituents are H), confirmed by there being no
`/t` entry for it in real InChI at all, not even an undefined one. The old code's "use `/t` atom 3
as a proxy for C3" wasn't just unprincipled, it was reading the wrong atom entirely for this ring
shape (the same fixed-position mistake that broke GlcA back in section 3). But chasing what that
label was *supposed* to mean led to checking whether anything downstream actually reads it --

**`Mass.js`'s `parse_terminii` never reads the `ax`/`eq` part of any terminii label, for any
residue, ever** (`grep -n "'ax'\|'eq'\|axial\|equatorial" js/Mass.js` -- zero matches; the parser
only extracts the ring position number and the substituent after the colon). This means every
`ax`/`eq` fix in this document, from section 3 onward, changed zero actual mass-calculation output
-- `ax`/`eq` is purely documentary in this codebase today, read only by `test-definitions-compat.js`'s
exact-string check and now by the Haworth renderer, which is the first real consumer of the
distinction. Worth knowing before assuming a terminii-string diff is behaviourally significant
anywhere outside those two places.

Given that, position 3's historical `ax`/`eq` label (even disregarding the wrong-atom bug) was never
going to correspond to real geometry -- there's no second observable state to distinguish at a true
CH2. It's kept as a fixed, honestly-documented placeholder (`3eq:H`, matching what the historical
literals already used) rather than guessed at or silently dropped.

## 10. Sialic acids: a real parser bug found, then a second genuine exception to the /m rule

Attempting the same treatment for `buildSialic` (NeuAc, NeuGc, NeuAc9Ac, all already live with
real InChI) surfaced two separate things, in order.

**A real bug in `parseCLayer` itself.** `InChIRingGeometry.js`'s connection-table parser didn't
handle a parenthesized group holding *several comma-separated branches off the same atom* (e.g.
`"11(20,10(18)19)"` -- atom 11 bonded to 20 AND, separately, to 10 -- not atom 20 chained on to
atom 10). It silently mis-parsed this as a chain, producing a wrong bond. This had never been hit
by any live code path before (`buildSialic` never called `ringWalk` at all, so nothing was
affected in production), but it's exactly the shape a branching carboxylate group produces, which
sialic acids have. Fixed: a comma now resets the current chain back to that group's branch point.
Covered by a direct unit test (`test/mass/test-inchi-ring-geometry.js`), and re-ran every existing
test afterward to confirm no earlier result depended on the old (broken) behaviour -- none of them
had a comma in their `/c` layer at all, so this was purely additive.

**A second genuine exception to `shapeNeedsMirrorFlip`, found the same way as the first (section
8): cross-check the derived answer against independently-known chemistry, don't trust internal
self-consistency alone.** Neu5Ac's anomeric centre (sialic C2) is a ketose -- quaternary, bonded to
the ring O, the ring, an exocyclic OH, AND an exocyclic COOH carbon, not the aldose's one-O-plus-H
pattern every other shape so far has had. Deriving sialic C4/C5/C6 (the module's own ring-walk
positions 3/4/5, since its position 1 is this ketose anomeric carbon) with the existing rule gave
ax/ax/ax; well-documented Neu5Ac chemistry (the preferred 2C5 conformation: C4/C5/C6 equatorial,
only the anomeric COOH axial) says eq/eq/eq. Turning the `/m` flip off entirely gives the correct
answer -- but **this is not the same exception as the deoxyhexose one.** Sialic acid's own
C5-equivalent ring position (ring-walk position 5) has a *branching* exocyclic chain (C7-C8-C9),
structurally the same shape as a plain hexose's CH2OH (which DOES need the flip), not a terminal
CH3 like a deoxyhexose. So "does ring position 5 branch further" doesn't predict this case; what
does is the anomeric centre's own ketose-vs-aldose shape, a genuinely separate structural
condition. `needsMirrorFlip` now checks both, explicitly, as two labeled exceptions rather than one
heuristic stretched to cover both -- see its comment for why neither is claimed to be *the*
universal rule (InChI's own "smaller identifier" choice is an algorithm artifact per the Technical
Manual, section 8), just what's been validated so far.

`buildSialic` now derives sialic C4/C5/C6 for real; output is byte-identical to the old hardcoded
values for all three live compounds (NeuAc, NeuGc, NeuAc9Ac) -- the historical values were already
chemically correct, now properly derived instead of asserted. Position 1 (the COOH's own
orientation -- anomer/instance-level, same situation as every other family's anomeric position)
and position 3 (C3, a plain CH2, same non-stereocentre situation as a dideoxyhexose's deoxy
position) are left as documented fixed values, same reasoning as section 9.

## 11. HexNAc/pentose C2 was still hardcoded; the pentose /m-flip default was never actually validated

Continuing the same audit (every live builder function in `InChITerminii.js`, checked for any
remaining position that isn't actually derived from the InChI): two more gaps, found together.

**`buildHexNAc`'s C2 was still a literal (`2eq:NHAc`), never derived**, for every live HexNAc
(GalNAc, GlcNAc). HexNAc shares its parent hexose's exact ring shape at C2 (the amide nitrogen
replaces the hydroxyl but doesn't change the ring stereocentre), so it's derived the same way
`buildHexose` derives C2, cross-checked against GalNAc/GlcNAc each matching their own parent
(Gal/Glc, both eq) -- no change in output for either, since `eq` was already the right answer
here, just asserted instead of derived. **`buildPentose`'s C2 was the same situation**
(`2eq:OH` literal) -- except here the hardcode turned out to be *wrong* for one live compound,
which leads to the second bug.

**A second, more serious bug: `shapeNeedsMirrorFlip`'s default for "no exocyclic group at ring
position 5" (the pentose case, added in section 8) was never properly validated -- only D-series
pentoses (Xyl) had been tested against it, and the bug is invisible there.** The default was set to
`true`. Checking it now against an L-series pentose (Ara) the same way every other exception in
this file was checked -- fetch and identity-verify an independent reference compound, compare its
known ax/eq pattern, which must be invariant under D/L mirroring -- exposed the bug: D-arabinose
(CID 6902, confirmed via synonyms `D-arabinopyranose` / `CHEBI:46994` / `GlyTouCan:G91625IP`) has
a real pattern of C2=ax, C3=ax, C4=eq. Live L-arabinose (CID 439195) was deriving the *exact
inverse* at C2/C3 (eq, eq) -- consistent with the flip default being backwards, not with any other
kind of bug, since D- and L-arabinose share the identical `/t` layer and differ only in `/m` (D is
`/m1`, L is `/m0`; see section 8 on why `/m` is a per-graph canonicalization artifact, not a
universal invariant). Fixed by changing the default to `false`: a pentose ring position 5 genuinely
has no exocyclic substituent at all (it's pentose sugar-C5, the "H" terminus, not a CH2OH/COOH/CH3
like every other shape checked so far), a third distinct case from the hexose and deoxyhexose/
ketose shapes, and empirically it does not need the flip either.

With both fixes applied together, live Ara's terminii changed from `2eq;3eq;4ax` to the corrected
`2ax;3ax;4eq` (matching D-arabinose exactly, as required). Xyl, GalNAc, and GlcNAc's derived output
did not change (their hardcoded C2 values happened to already be correct). `DEFINITIONS` in
`test/mass/test-definitions-compat.js` updated for Ara; new regression tests added to
`test/mass/test-inchi-ring-geometry.js` covering the pentose `shapeNeedsMirrorFlip` default and the
D-arabinose-vs-L-arabinose cross-check, mirroring the existing Fuc-vs-Gal and Tyv-vs-Man tests.

As of this section, every live InChI-backed builder function (`buildHexose`, `buildDeoxyhex`,
`buildDideoxyhex`, `buildHexN`, `buildHexNAc`, `buildPentose`, `buildSialic`) derives every real
ring stereocentre from the InChI itself -- no hardcoded axial/equatorial value remains for any
position that is actually a stereocentre. The only literals left anywhere are for positions that
are genuinely *not* stereocentres (a plain CH2, a terminal CH3/H) or are instance-level/anomeric
(position 1, set per-glycosidic-linkage rather than per-monosaccharide), which is a different,
correct kind of "hardcoded."
