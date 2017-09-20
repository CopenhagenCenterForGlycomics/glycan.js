/*global QUnit*/

import Reaction from "../../js/Reaction";
import {IO as Iupac} from "../../js/CondensedIupac";

class IupacReaction extends Iupac(Reaction) {}

QUnit.module("Test that we can create Reactions from string representations", {
});

QUnit.test( "Read in a simple reaction" , function( assert ) {
  let base_sequence = "Gal(b1-2)Man(b1-3)[Gal(b1-2)Gal(b1-4)]GlcNAc";
  let sequence = `${base_sequence}+"{Man(b1-4)}@y3a"`;
  let sugar = new IupacReaction();
  sugar.sequence = sequence;
  assert.ok(sugar.sequence === base_sequence, "Has the same sequence");
});

// Reactions should be able to be tested against a Sugar
// reaction.possible(sugar)
// reaction.execute(sugar) (in-place modification)