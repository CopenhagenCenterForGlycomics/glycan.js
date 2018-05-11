/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

const NONRE_1 = `A
B
C
D
E
F
G
H
I
J`;

const RE_1 = `B
C
D
E
F
G
H
I
J`;

const NONRE_2 = `AB
AC
AD
AE
AF
AG
AH
AI
AJ
BC
BD
BE
BF
BG
BH
BI
BJ
CD
CE
CF
DE
GH
GI
GJ
IJ`;

const RE_2 = `CG
CH
CI
CJ
DF
DG
DH
DI
DJ
EF
EG
EH
EI
EJ
FG
FH
FI
FJ
HI
HJ`;

const NONRE_3 = `ACG
ACH
ACI
ACJ
ADF
ADG
ADH
ADI
ADJ
AEF
AEG
AEH
AEI
AEJ
AFG
AFH
AFI
AFJ
AHI
AHJ
BCG
BCH
BCI
BCJ
BDF
BDG
BDH
BDI
BDJ
BEF
BEG
BEH
BEI
BEJ
BFG
BFH
BFI
BFJ
BHI
BHJ
CDF
CEF
GHI
GHJ`;

const RE_3 = `CHI
CHJ
DFG
DFH
DFI
DFJ
DHI
DHJ
EFG
EFH
EFI
EFJ
EHI
EHJ
FHI
FHJ`;

QUnit.module('Test that we can clone sugars', {
});

QUnit.test( 'Generating single chords works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G','H','I','J'],'More complex dfs works');

  let pairs = [...sugar.chords(1)];
  let nonreducing_end_pairs = pairs.filter( chord => chord.root !== sugar.root || chord.chord[0] === sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  let reducing_end_pairs = pairs.filter( chord => chord.root === sugar.root && chord.chord[0] !== sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  assert.deepEqual(reducing_end_pairs,RE_1.split('\n'));
  assert.deepEqual(nonreducing_end_pairs,NONRE_1.split('\n'));
});

QUnit.test( 'Generating double chords works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G','H','I','J'],'More complex dfs works');

  let pairs = [...sugar.chords(2)];
  let nonreducing_end_pairs = pairs.filter( chord => chord.root !== sugar.root || chord.chord[0] === sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  let reducing_end_pairs = pairs.filter( chord => chord.root === sugar.root && chord.chord[0] !== sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  assert.deepEqual(reducing_end_pairs,(RE_1+'\n'+RE_2).split('\n'));
  assert.deepEqual(nonreducing_end_pairs,(NONRE_1+'\n'+NONRE_2).split('\n'));
});

QUnit.test( 'Generating triple chords works' , function( assert ) {
  let sugar = new IupacSugar();
  sugar.sequence = 'E(a1-3)D(a1-2)[F(a1-4)]C(a1-2)[H(a1-2)[J(a1-2)I(a1-3)]G(a1-3)]B(a1-2)A';
  let mapped = [...sugar.depth_first_traversal()].map( res => res.identifier );
  assert.deepEqual(mapped,['A','B','C','D','E','F','G','H','I','J'],'More complex dfs works');

  let pairs = [...sugar.chords(3)];
  let nonreducing_end_pairs = pairs.filter( chord => chord.root !== sugar.root || chord.chord[0] === sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  let reducing_end_pairs = pairs.filter( chord => chord.root === sugar.root && chord.chord[0] !== sugar.root ).map( chord => chord.chord.map( r => r.identifier ).join('') );
  assert.deepEqual(reducing_end_pairs,(RE_1+'\n'+RE_2+'\n'+RE_3).split('\n'));
  assert.deepEqual(nonreducing_end_pairs,(NONRE_1+'\n'+NONRE_2+'\n'+NONRE_3).split('\n'));
});
