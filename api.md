# Brain dump for API design docs

```
var sugar = new Sugar();
sugar.sequence = 'Gal(b1-3)GalNAc';
// Do we allow for sugar objects to be mutable
// i.e. what happens to the underlying data structure
// when we set a new sequence
sugar.sequence = 'GlcNAc(b1-4)GlcNAc';

// We probably should have support for a simple 
// method for getting a sub-tree of some kind.
// Call the method "fragment" or something..

// Depending on the mutability thing, we
// return either a new sugar, or some kind of reference
// back into the original sugar object.
var fragment = sugar.fragment('a1z');

// Of course, the question then becomes, what
// happens to the fragment when either the original
// sugar goes away, or the original sugar is modified.
// Possibly have two apis to deal with that, and decide
// which one is performant and, which one we actually 
// want to ship.

// I'm not even sure it's worth having an equality
// test for Sugars. Maybe worth having a method to
// get a unique representation for the sugar + fragment?
sugar_a == sugar_b

// It'd be nice to do an annotation on the sugars
// so that we can mark the residues 
sugar_like.annotate('some-label');
sugar_like.annotate(some_function);

// And do the labelling on single residues?
// Maybe single residue annotation should be 
// by default not recursive
sugar_like.getResidue('y1a').annotate('label',recursive=F);

// All the annotation will be nice so that
// when it comes to the time to do the rendering,
// we should be able to read the annotations, and 
// choose the rendering appropriately.

// Probably would be fun to use ES6 symbols to define the 
// property names for each of the annotations, so that
// whatever is doing the rendering, and whatever is doing the
// annotation don't write over each other.

// Building sugars should be able to be done programatically, 
// so you can add each one, and it validates the structure for
// you. We need to have support for unknown linkages and residues
// right from the start

```