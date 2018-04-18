/*global QUnit*/

import Monosaccharide from '../../js/Monosaccharide';
import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';


class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can read in sequences', {
});

QUnit.test( 'Reading in a simple glycoconjugate' , function( assert ) {
  var sequence = 'GlcNAc(b1-4)GlcNAc(b1-N)Asn';
  var sug = new IupacSugar();
  sug.sequence = sequence;
  assert.strictEqual(sug.root.identifier,'Asn','Can use amino acid as root');
  assert.strictEqual(sug.sequence,sequence,'Returns the same sequence');
  assert.strictEqual(sug.root.linkageOf(sug.root.children[0]), Monosaccharide.LINKAGES.N,'Can read amino acid linkages');
});

QUnit.test( 'Reading in a simple glycoconjugate' , function( assert ) {
  var sequence = 'Gal(b1-3)GalNAc(b1-O)Ser';
  var sug = new IupacSugar();
  sug.sequence = sequence;
  assert.strictEqual(sug.root.identifier,'Ser','Can use amino acid as root');
  assert.strictEqual(sug.sequence,sequence,'Returns the same sequence');
  assert.strictEqual(sug.root.linkageOf(sug.root.children[0]), Monosaccharide.LINKAGES.O,'Can read amino acid linkages');
});
