/**
 * bench-fragment-perf.mjs
 *
 * Benchmarks fragment generation to quantify gains from:
 *   A) baseline (current code, no changes)
 *   B) sugar.freeze() before fragmentation
 *   C) memoised Fragmentable class
 *   D) freeze + memoised Fragmentable combined
 *
 * Run with:
 *   node test/fragment/bench-fragment-perf.mjs
 * or with a custom structures file:
 *   GLYCANS=path/to/list.txt node test/fragment/bench-fragment-perf.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

import Sugar from '../../js/Sugar.js';
import { Mass } from '../../js/Mass.js';
import { IO as Iupac } from '../../js/CondensedIupac.js';
import Fragmentor from '../../js/Fragmentor.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Glycan structures ────────────────────────────────────────────────────────

const GLYCANS_FILE = process.env.GLYCANS
  || resolve(__dirname, '../../../workbench/search.iupac.glycans.txt');

let ALL_SEQUENCES;
try {
  ALL_SEQUENCES = readFileSync(GLYCANS_FILE, 'utf8')
    .split('\n').map(l => l.trim()).filter(Boolean);
} catch {
  // Fallback: a representative set of N- and O-glycans
  ALL_SEQUENCES = [
    'NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[NeuAc(a2-3)Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc',
    'Gal(b1-4)GlcNAc(b1-2)Man(a1-3)[Gal(b1-4)GlcNAc(b1-2)Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc',
    'Man(a1-3)[Man(a1-6)]Man(b1-4)GlcNAc(b1-4)GlcNAc',
    'NeuAc(a2-3)Gal(b1-3)GalNAc',
    'Gal(b1-3)[NeuAc(a2-6)]GalNAc',
    'NeuAc(a2-3)Gal(b1-3)[NeuAc(a2-6)]GalNAc',
    'Fuc(a1-6)[GlcNAc(b1-4)]GlcNAc',
    'GlcNAc(b1-4)GlcNAc',
  ];
  console.warn(`[bench] Could not read ${GLYCANS_FILE}, using ${ALL_SEQUENCES.length} built-in sequences`);
}

// Limit to first N sequences to keep runs short; override with LIMIT=n
const LIMIT = parseInt(process.env.LIMIT || '200', 10);
const SEQUENCES = ALL_SEQUENCES.slice(0, LIMIT);
const FRAGMENT_DEPTH = parseInt(process.env.DEPTH || '1', 10);

console.log(`[bench] ${SEQUENCES.length} structures, depth=${FRAGMENT_DEPTH}`);

// ── Sugar class ───────────────────────────────────────────────────────────────

class IupacSugar extends Mass(Iupac(Sugar)) {}

// ── Fragmentable memoisation (the proposed fix for Issue 1) ──────────────────

// Current code in Fragmentor.js creates a new class on every call:
//   const Fragment = Fragmentable(base);
// We replicate that function here via the exported class so we can test the
// memoised version without patching the source.

// We cannot import the private `Fragmentable` mixin directly, so instead we
// measure the proxy cost by timing `Fragmentor.getFragment` vs a hot path.
// The main benchmark measures the public `Fragmentor.fragment` API under the
// two conditions we *can* control: frozen vs unfrozen sugar.

// ── Benchmark helpers ─────────────────────────────────────────────────────────

function countFragments(sequences, freeze) {
  let total = 0;
  for (const seq of sequences) {
    const sugar = new IupacSugar();
    sugar.sequence = seq;
    if (freeze) sugar.freeze();
    for (const _ of Fragmentor.fragment(sugar, FRAGMENT_DEPTH)) {
      total++;
    }
  }
  return total;
}

const massInfoVisitor = frag => ({ type: frag.type, original: frag.original, mass: frag.mass });

function countFragmentsMassInfo(sequences) {
  let total = 0;
  for (const seq of sequences) {
    const sugar = new IupacSugar();
    sugar.sequence = seq;
    for (const _ of Fragmentor.fragment(sugar, FRAGMENT_DEPTH, massInfoVisitor)) {
      total++;
    }
  }
  return total;
}

function bench(label, fn, warmupRounds = 1, rounds = 3) {
  // warmup
  for (let i = 0; i < warmupRounds; i++) fn();

  const times = [];
  for (let i = 0; i < rounds; i++) {
    const t0 = performance.now();
    const result = fn();
    times.push(performance.now() - t0);
    process.stdout.write('.');
  }
  process.stdout.write('\n');

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  return { label, avg, min, max };
}

// ── Operation-level profiling ─────────────────────────────────────────────────

function profileFragmentor(sequences) {
  const timings = { parse: 0, trace: 0, chords: 0, clone: 0, composition: 0, retains: 0, rest: 0 };
  let totalFragments = 0;
  let totalCandidates = 0;

  for (const seq of sequences) {

    let t = performance.now();
    const sugar = new IupacSugar();
    sugar.sequence = seq;
    timings.parse += performance.now() - t;

    // We need to replicate what Fragmentor.fragment does but with timing hooks.
    // Instead, instrument at the Sugar level by monkey-patching clone/composition
    // on the fragment_template for this one sugar.

    // First get the baseline fragment generator to measure overall structure time
    const frags = [...Fragmentor.fragment(sugar, FRAGMENT_DEPTH)];
    totalFragments += frags.length;
  }

  // Now do a detailed pass on a single complex structure
  const complexSeq = sequences.reduce((best, s) => s.length > best.length ? s : best, '');
  const complexSugar = new IupacSugar();
  complexSugar.sequence = complexSeq;

  // Count composition() calls by wrapping the prototype temporarily
  let compositionCalls = 0;
  let cloneCalls = 0;
  let compositionTime = 0;
  let cloneTime = 0;

  const origComposition = IupacSugar.prototype.composition;
  const origClone = IupacSugar.prototype.clone;

  IupacSugar.prototype.composition = function(root) {
    compositionCalls++;
    const t0 = performance.now();
    const result = origComposition.call(this, root);
    compositionTime += performance.now() - t0;
    return result;
  };
  IupacSugar.prototype.clone = function(visitor) {
    cloneCalls++;
    const t0 = performance.now();
    const result = origClone.call(this, visitor);
    cloneTime += performance.now() - t0;
    return result;
  };

  const fragsComplex = [...Fragmentor.fragment(complexSugar, FRAGMENT_DEPTH)];

  IupacSugar.prototype.composition = origComposition;
  IupacSugar.prototype.clone = origClone;

  return { totalFragments, compositionCalls, cloneCalls, compositionTime, cloneTime, complexSeq, fragCount: fragsComplex.length };
}

// ── Run ───────────────────────────────────────────────────────────────────────

console.log('\nWarming up and running benchmarks...\n');

const results = [];

process.stdout.write('A baseline (no freeze)          ');
results.push(bench('A  baseline',        () => countFragments(SEQUENCES, false)));

process.stdout.write('B sugar.freeze() before fragment');
results.push(bench('B  sugar.freeze()',  () => countFragments(SEQUENCES, true)));

process.stdout.write('C visitor (clone-once)          ');
results.push(bench('C  visitor',          () => countFragmentsMassInfo(SEQUENCES)));

// ── Detailed profiling on one run ─────────────────────────────────────────────

console.log('\nProfiling clone() and composition() calls on most complex structure...');
const profile = profileFragmentor(SEQUENCES);

console.log(`\n  Most complex structure (${profile.complexSeq.length} chars):`);
console.log(`    Fragments generated : ${profile.fragCount}`);
console.log(`    clone()   calls     : ${profile.cloneCalls}   total time: ${profile.cloneTime.toFixed(1)} ms`);
console.log(`    composition() calls : ${profile.compositionCalls}   total time: ${profile.compositionTime.toFixed(1)} ms`);
if (profile.cloneCalls > 0)
  console.log(`    avg time per clone  : ${(profile.cloneTime / profile.cloneCalls).toFixed(3)} ms`);
if (profile.compositionCalls > 0)
  console.log(`    avg time per comp() : ${(profile.compositionTime / profile.compositionCalls).toFixed(3)} ms`);

// ── Report ────────────────────────────────────────────────────────────────────

const baseAvg = results[0].avg;

console.log('\n' + '─'.repeat(70));
console.log(
  'Scenario'.padEnd(30),
  'avg (ms)'.padStart(10),
  'min (ms)'.padStart(10),
  'max (ms)'.padStart(10),
  'speedup'.padStart(10),
);
console.log('─'.repeat(70));

for (const r of results) {
  const speedup = baseAvg / r.avg;
  console.log(
    r.label.padEnd(30),
    r.avg.toFixed(1).padStart(10),
    r.min.toFixed(1).padStart(10),
    r.max.toFixed(1).padStart(10),
    `${speedup.toFixed(2)}×`.padStart(10),
  );
}
console.log('─'.repeat(70));

// Fragment count sanity check
const countBase      = countFragments(SEQUENCES, false);
const countFrozen    = countFragments(SEQUENCES, true);
const countMassInfo  = countFragmentsMassInfo(SEQUENCES);
console.log(`\nFragment count — baseline: ${countBase}, frozen: ${countFrozen}, massInfo: ${countMassInfo}`);
let ok = true;
if (countBase !== countFrozen) {
  console.error('ERROR: fragment counts differ (baseline vs frozen)!');
  ok = false;
}
if (countBase !== countMassInfo) {
  console.error('ERROR: fragment counts differ (baseline vs massInfo)!');
  ok = false;
}
if (ok) {
  console.log('Fragment counts match ✓');
} else {
  process.exit(1);
}
