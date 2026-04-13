#!/usr/bin/env node
/**
 * generate-glygen-fixture.mjs
 *
 * Reads the already-downloaded gzip-compressed Glygen CSV files from
 * glycan.js/test/io/ and produces a curated fixture at
 * test/fixtures/glygen-glycoct-iupac.json.
 *
 * Usage:
 *   node scripts/generate-glygen-fixture.mjs [--max N]
 *
 * For each accession the fixture stores Glygen's IUPAC condensed sequence
 * (normalised by round-tripping through IupacSugar so glycan.js's canonical
 * residue names and bracket conventions are used).  Only entries where:
 *   - readGlycoCT() succeeds and produces a non-empty sequence
 *   - the normalised Glygen IUPAC can be parsed and read back by IupacSugar
 *   - the two results agree
 * are included.  This validates the GlycoCT ↔ IUPAC correspondence against
 * external Glygen data while storing a form the test can compare exactly.
 */

import { createReadStream }  from 'fs';
import { writeFileSync }     from 'fs';
import { createGunzip }      from 'zlib';
import { pipeline }          from 'stream/promises';
import { Writable }          from 'stream';
import { fileURLToPath }     from 'url';
import path                  from 'path';

// ── Resolve glycan.js root ─────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '..');

// ── Load library modules ────────────────────────────────────────────────────
const { readGlycoCT }           = await import(path.join(ROOT, 'js/io/glycoct.js'));
const { default: Sugar }        = await import(path.join(ROOT, 'js/Sugar.js'));
const { IO: Iupac }             = await import(path.join(ROOT, 'js/io/CondensedIupac.js'));

class IupacSugar extends Iupac(Sugar) {}

// ── CLI args ────────────────────────────────────────────────────────────────
const maxArg = process.argv.indexOf('--max');
const MAX    = maxArg !== -1 ? parseInt(process.argv[maxArg + 1], 10) : 200;

// ── CSV helpers ─────────────────────────────────────────────────────────────

async function readGz(filePath) {
  let text = '';
  const sink = new Writable({
    write(chunk, _enc, cb) { text += chunk.toString('utf8'); cb(); },
  });
  await pipeline(createReadStream(filePath), createGunzip(), sink);
  return text;
}

/**
 * Parse a CSV where every field is double-quoted and no field contains
 * embedded double-quotes.
 */
function parseQuotedCsv(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const headers = lines[0].split('","').map(h => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const parts = line.split('","');
    return Object.fromEntries(headers.map((h, i) => {
      const raw = parts[i] ?? '';
      return [h, raw.replace(/^"|"$/g, '')];
    }));
  });
}

/**
 * The CSV stores GlycoCT as a single space-separated line.
 * Since every GlycoCT token contains no spaces, a simple substitution
 * reconstructs the newline-separated format that readGlycoCT expects.
 */
function normGlycoCT(s) {
  return s.replace(/ /g, '\n');
}

/**
 * Glygen IUPAC condensed strings end with an open reducing-end linkage such
 * as "(b1-" or "(?1-" that glycan.js does not include.  Strip it before
 * attempting to parse through IupacSugar.
 */
function stripReducingEnd(s) {
  return s.replace(/\([ab?]\d*-$/, '').trim();
}

/**
 * Normalise a Glygen IUPAC string by round-tripping through IupacSugar.
 * Returns the canonical string or null if parsing fails.
 */
function normaliseIupac(raw) {
  const stripped = stripReducingEnd(raw);
  if (!stripped) return null;
  try {
    const sugar    = new IupacSugar();
    sugar.sequence = stripped;
    return sugar.sequence || null;
  } catch (_) {
    return null;
  }
}

// ── Skip criteria ─────────────────────────────────────────────────────────
function shouldSkip(glycoct) {
  if (/:x-/.test(glycoct))       return 'x-anomer';
  if (/\(-1[+)]/.test(glycoct))  return 'unknown-position(-1)';
  if (/\(\?[+)]/.test(glycoct))  return 'unknown-position(?)';
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────
const GLYCOCT_GZ = path.join(ROOT, 'test/io/glycan_sequences_glycoct.csv.gz');
const IUPAC_GZ   = path.join(ROOT, 'test/io/glycan_sequences_iupac_condensed.csv.gz');
const OUT        = path.join(ROOT, 'test/fixtures/glygen-glycoct-iupac.json');

console.log('Reading CSV files…');
const [glycoctText, iupacText] = await Promise.all([
  readGz(GLYCOCT_GZ),
  readGz(IUPAC_GZ),
]);

const glycoctRows = parseQuotedCsv(glycoctText);
const iupacRows   = parseQuotedCsv(iupacText);

console.log(`  GlycoCT rows: ${glycoctRows.length}`);
console.log(`  IUPAC rows:   ${iupacRows.length}`);

const iupacMap = new Map(iupacRows.map(r => [r.glytoucan_ac, r.sequence_iupac_condensed]));

const fixture  = [];
const skipped  = {};
let   total    = 0;
let   agreed   = 0;
let   mismatch = 0;

for (const row of glycoctRows) {
  const accession  = row.glytoucan_ac;
  const rawGlycoCT = row.sequence_glycoct;
  if (!accession || !rawGlycoCT) continue;

  const rawIupac = iupacMap.get(accession);
  if (!rawIupac) continue;
  total++;

  const reason = shouldSkip(rawGlycoCT);
  if (reason) {
    if (reason == 'x-anomer') {
      console.log(accession);
    }
    skipped[reason] = (skipped[reason] ?? 0) + 1;
    continue;
  }

  // Normalise Glygen IUPAC through IupacSugar
  const iupac = normaliseIupac(rawIupac);
  if (!iupac) {
    skipped['iupac-parse-fail'] = (skipped['iupac-parse-fail'] ?? 0) + 1;
    continue;
  }

  // Parse GlycoCT and check it agrees with normalised Glygen IUPAC
  const glycoct = normGlycoCT(rawGlycoCT);
  let sugar;
  try {
    sugar = readGlycoCT(glycoct);
  } catch (err) {
    skipped['glycoct-parse-error'] = (skipped['glycoct-parse-error'] ?? 0) + 1;
    continue;
  }

  const fromGlycoCT = sugar.sequence;
  if (!fromGlycoCT) {
    skipped['unknown-mono'] = (skipped['unknown-mono'] ?? 0) + 1;
    continue;
  }

  if (fromGlycoCT !== iupac) {
    mismatch++;
    console.log(fromGlycoCT,iupac,accession);
    skipped['glycoct-iupac-mismatch'] = (skipped['glycoct-iupac-mismatch'] ?? 0) + 1;
    continue;
  }

  agreed++;
  fixture.push({ accession, glycoct, iupac });
  if (fixture.length >= MAX) break;
}

console.log(`\nResults:`);
console.log(`  Total joined:    ${total}`);
console.log(`  Agreed & stored: ${agreed}`);
console.log(`  Mismatches:      ${mismatch}`);
for (const [reason, count] of Object.entries(skipped)) {
  console.log(`  Skipped (${reason}): ${count}`);
}
console.log(`\nFixture entries:   ${fixture.length}`);

writeFileSync(OUT, JSON.stringify(fixture, null, 2) + '\n');
console.log(`Written → ${OUT}`);
