/*global QUnit*/

import { readGlycoCT, writeGlycoCT } from '../../js/io/glycoct.js';

// G00051MO — Lewis X trisaccharide (GlcNAc + Fuc + Gal), no NeuAc
const G00051MO = `RES
1b:b-dglc-HEX-1:5
2s:n-acetyl
3b:a-lgal-HEX-1:5|6:d
4b:b-dgal-HEX-1:5
LIN
1:1d(2+1)2n
2:1o(3+1)3d
3:1o(4+1)4d
`;

// G17689DH — biantennary complex N-glycan with NeuAc and core Fuc
const G17689DH = `RES
1b:b-dglc-HEX-1:5
2s:n-acetyl
3b:b-dglc-HEX-1:5
4s:n-acetyl
5b:b-dman-HEX-1:5
6b:a-dman-HEX-1:5
7b:b-dglc-HEX-1:5
8s:n-acetyl
9b:b-dgal-HEX-1:5
10b:a-dgro-dgal-NON-2:6|1:a|2:keto|3:d
11s:n-acetyl
12b:a-dman-HEX-1:5
13b:b-dglc-HEX-1:5
14s:n-acetyl
15b:b-dgal-HEX-1:5
16b:a-dgro-dgal-NON-2:6|1:a|2:keto|3:d
17s:n-acetyl
18b:a-lgal-HEX-1:5|6:d
LIN
1:1d(2+1)2n
2:1o(4+1)3d
3:3d(2+1)4n
4:3o(4+1)5d
5:5o(3+1)6d
6:6o(2+1)7d
7:7d(2+1)8n
8:7o(4+1)9d
9:9o(3+2)10d
10:10d(5+1)11n
11:5o(6+1)12d
12:12o(2+1)13d
13:13d(2+1)14n
14:13o(4+1)15d
15:15o(3+2)16d
16:16d(5+1)17n
17:1o(6+1)18d
`;

QUnit.module('readGlycoCT / writeGlycoCT', {});

QUnit.test('G00051MO produces correct Lewis X residues and linkages', function(assert) {
  const sugar = readGlycoCT(G00051MO);
  const seq = sugar.sequence;
  assert.ok(seq.includes('Fuc(a1-3)[Gal(b1-4)]GlcNAc'),'Contains correct sequence');
  assert.ok(seq.includes('Gal(b1-4)'),   'Gal beta-1-4 linkage');
  assert.ok(seq.includes('Fuc(a1-3)'),   'Fuc alpha-1-3 linkage');
});

QUnit.test('G17689DH contains NeuAc', function(assert) {
  const sugar = readGlycoCT(G17689DH);
  assert.ok(sugar.sequence.includes('NeuAc'), 'Sequence contains NeuAc');
});

QUnit.test('G17689DH contains Fuc', function(assert) {
  const sugar = readGlycoCT(G17689DH);
  assert.ok(sugar.sequence.includes('Fuc'), 'Sequence contains Fuc');
});

QUnit.test('round-trip G00051MO: write then re-read gives identical sequence', function(assert) {
  const sugar1  = readGlycoCT(G00051MO);
  const written = writeGlycoCT(sugar1);
  const sugar2  = readGlycoCT(written);
  assert.equal(sugar2.sequence, sugar1.sequence, 'Round-trip sequence matches');
});

QUnit.test('round-trip G17689DH (sialylated): write then re-read gives identical sequence', function(assert) {
  const sugar1  = readGlycoCT(G17689DH);
  const written = writeGlycoCT(sugar1);
  const sugar2  = readGlycoCT(written);
  assert.equal(sugar2.sequence, sugar1.sequence, 'Round-trip sialylated sequence matches');
});

QUnit.test('unknown descriptor throws', function(assert) {
  const bad = `RES\n1b:z-dunknown-HEX-1:5\nLIN\n`;
  assert.throws(() => readGlycoCT(bad), /Unknown descriptor/, 'Unknown descriptor throws');
});

QUnit.test('multi-block GlycoCT uses first block', function(assert) {
  const multi = G00051MO + '\n\n' + G17689DH;
  const sugar = readGlycoCT(multi);
  const seq = sugar.sequence;
  // First block is G00051MO (Lewis X), second is G17689DH (sialylated)
  assert.ok(seq.includes('Gal(b1-4)') && seq.includes('Fuc(a1-3)') && !seq.includes('NeuAc'),
    'First block (Lewis X) parsed, not sialylated glycan');
});
