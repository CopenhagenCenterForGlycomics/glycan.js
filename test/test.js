/*global QUnit*/

import * as debug from 'debug-any-level';

// Polyfill in the bind function, just in case we
// don't have it available

if (!Function.prototype.bind) {
  Function.prototype.bind = function(oThis) {
    if (typeof this !== 'function') {
      // closest thing possible to the ECMAScript 5
      // internal IsCallable function
      throw new TypeError('Function.prototype.bind - what is trying to be bound is not callable');
    }

    var aArgs   = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        fNOP    = function() {},
        fBound  = function() {
          return fToBind.apply(this instanceof fNOP ? this : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();

    return fBound;
  };
}

debug.disable();

if ( QUnit.config && QUnit.config.debug ) {
  console.log(`Enabling Debugging for ${QUnit.config.debug}`);
  debug.enable(QUnit.config.debug);
  debug.useColors = () => false;
}

// We probably want to have promises to handle
// any async stuff

QUnit.test( 'Test Promise works' , function( assert ) {
  var done = assert.async();
  Promise.resolve(true).then(function() {
    assert.ok(true, 'Can resolve promises');
    done();
  });
});
