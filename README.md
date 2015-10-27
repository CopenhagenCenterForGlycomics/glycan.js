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

## ES6 Niceities that should be safe to use

* Classes (Do we need to transpile?)
* Arrow functions (Should be safe-ish)
* Promises (shipping most places)
* Module loading mechanism?

## Things that seem like niche use-cases, but aren't

* Support for WebWorkers