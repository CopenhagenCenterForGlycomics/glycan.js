/*global QUnit*/

import Sugar from '../../js/Sugar';
import Monosaccharide from '../../js/Monosaccharide';

import Repeat from '../../js/Repeat';

import {IO as Iupac} from '../../js/CondensedIupac';

class IupacSugar extends Iupac(Sugar) {}

function get_sugars() {
  let sequence = "A(a1-2){B(a1-2)[E(a1-4)D(a1-4)]C(a1-2)@y3a}3F(a1-2)G";
  let collapsed = new IupacSugar();
  collapsed.sequence = sequence;
  collapsed.repeats[0].mode = Repeat.MODE_MINIMAL;
  let expanded = new IupacSugar();
  expanded.sequence = sequence;
  expanded.repeats[0].mode = Repeat.MODE_EXPAND;
  let plain = new IupacSugar();
  plain.sequence = expanded.sequence;
  return { plain, collapsed, expanded };
}

function perform_remove_child(sugar,location,assert) {
  let child = sugar.locate_monosaccharide(location);
  if ( ! child.parent ) {
    return;
  }
  let parent = child.parent;
  let parent_location = sugar.location_for_monosaccharide(parent);
  parent.removeChild(parent.linkageOf(child),child);
  parent = sugar.locate_monosaccharide(parent_location);
  assert.ok(parent.children.indexOf(child) < 0,`Did not remove child of type ${child.constructor.name} at ${location}`);
}

function perform_replace_child(sugar,location,assert) {
  let child = sugar.locate_monosaccharide(location);
  if ( ! child.parent ) {
    return;
  }
  let parent = child.parent;
  let parent_location = sugar.location_for_monosaccharide(parent);

  let replacement = new Monosaccharide('Z');
  parent.replaceChild(child,replacement,parent.linkageOf(child));
  parent = sugar.locate_monosaccharide(parent_location);
  assert.ok(parent.children.indexOf(child) < 0,`Did not remove child of type ${child.constructor.name} at ${location}`);
  assert.ok(parent.children.indexOf(replacement) >= 0,`Did not add child to replace ${child.constructor.name} at ${location}`);
}

QUnit.module('Test that monosaccharide modification operations work as expected on repeat sugars', {
});

QUnit.test( 'Expanded sugars have the same sequence' , function( assert ) {
  let { expanded, plain } = get_sugars();
  assert.equal(expanded.sequence,plain.sequence);
});

QUnit.test( 'Test removing children', function( assert )  {
  let { expanded, plain } = get_sugars();
  let locations = plain.composition().map( res => plain.location_for_monosaccharide(res) );
  for (let location of locations) {
    let { expanded : test_expanded ,  plain : test_plain } = get_sugars();
    perform_remove_child(test_plain,location,assert);
    perform_remove_child(test_expanded,location,assert);
    assert.equal(test_expanded.sequence,test_plain.sequence,`Removing residue at ${location}`);
  }
});

QUnit.test( 'Test replacing children', function( assert )  {
  let { expanded, plain } = get_sugars();
  let locations = plain.composition().map( res => plain.location_for_monosaccharide(res) );
  for (let location of locations) {
    let { expanded : test_expanded ,  plain : test_plain } = get_sugars();
    perform_replace_child(test_plain,location,assert);
    perform_replace_child(test_expanded,location,assert);
    assert.equal(test_expanded.sequence,test_plain.sequence,`Replacing residue at ${location}`);
  }
});