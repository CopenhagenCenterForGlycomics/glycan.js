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

## Demo rendering of Sugars

```
npm start
```

Go to `http://localhost:8080/demo/`


## Testing (in the wonky docker containers)

```
DEBUG='glycanjs:*:*' ./scripts/trace_tests.sh test/test-whatever.js
PORT=9876 node ./node_modules/.bin/karma start --single-run
```

## TODOs

* Methods to mark up residues on sugars that are supported by a reaction - what to do
  when the negative rules enforce a competition dynamic? I.e. Gal -> Gal except when
  GlcGal, but another reaction can do Glc -> GalGal = Gal[Glc]Gal ? (non-terminal)...
  Do we do the trimming thing again? Test without negative - tag residues, and then
  test the negative containing ones, ignoring the first round?

## Things that seem like niche use-cases, but aren't

* Support for WebWorkers