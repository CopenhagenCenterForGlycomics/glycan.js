/*global QUnit*/

import Sugar from '../../js/Sugar';
import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

QUnit.module('Test that we can get the location of residues from a sugar', {
});

QUnit.test( 'Reads out locations on a simple sugar for individual monosaccharides' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-3)GlcNAc';
  let locations = sugar.composition().map( res => [ res.identifier, sugar.location_for_monosaccharide(res) ] );
  assert.deepEqual(locations,[ ['GlcNAc','y1a'],['Gal','y2a'] ]);
  console.log();
});


QUnit.test( 'Reads out locations on a simple sugar for individual monosaccharides' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-2)[Glc(b1-3)]GlcNAc';
  let locations = sugar.composition().map( res => [ res.identifier, sugar.location_for_monosaccharide(res) ] );
  assert.deepEqual(locations,[ ['GlcNAc','y1a'],['Gal','y2a'],['Glc','y2b'] ]);
});

QUnit.test( 'Reads out locations on a simple sugar for individual monosaccharides with ambiguity' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-?)[Glc(b1-?)]GlcNAc';
  let locations = sugar.composition().map( res => [ res.identifier, sugar.location_for_monosaccharide(res) ] );
  assert.deepEqual(locations,[ ['GlcNAc','y1a'],['Gal','y2a'],['Glc','y2b'] ]);
});

QUnit.test( 'Reads out locations on a simple sugar for individual monosaccharides with repeated linkages' , function( assert ) {
  var sugar = new IupacSugar();
  sugar.sequence = 'Gal(b1-2)[Glc(b1-2)]GlcNAc';
  let locations = sugar.composition().map( res => [ res.identifier, sugar.location_for_monosaccharide(res) ] );
  assert.deepEqual(locations,[ ['GlcNAc','y1a'],['Gal','y2a'],['Glc','y2b'] ]);
});
