# Glycan.js

## A tiny little library to draw sugars

It's everyone's favourite little first project to figure out how to
represent oligosaccharides using some kind of object model. There are
implementations of this library in all the big languages, so why not
one more.

## Platform targets

We hope to hit the current (latest) generations of browsers and JS environments.
There's no big focus on backwards compatibility, and since we want this library
to remain relatively modern for a pretty long time, we won't hobble it with bad
design to accomodate the older browsers.

## TODOs

* Methods to mark up residues on sugars that are supported by a reaction - what to do
  when the negative rules enforce a competition dynamic? I.e. Gal -> Gal except when
  GlcGal, but another reaction can do Glc -> GalGal = Gal[Glc]Gal ? (non-terminal)...
  Do we do the trimming thing again? Test without negative - tag residues, and then
  test the negative containing ones, ignoring the first round?

* When given a residue and donor, reduce reaction sets down to ones that are possible
  so that we can get lists of linkages that can be made.

## Things that seem like niche use-cases, but aren't

* Support for WebWorkers