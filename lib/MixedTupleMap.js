// generate a random hash delimiter to avoid malicious hash collisions
function MixedTupleMap() {
  this.clear();
}

MixedTupleMap.prototype = {
  toString: function() {
    return '[object MixedTupleMap]';
  },
  // The difference between MixedTupleMap and WeakTupleMap is that this one has
  // a hash method that sorts key parts by putting non-primitive parts first.
  // This enables optimal garbage collection of values in the map.
  _hash: function( tuple ) {
    // Speed up hash generation for the folowing pattern:
    // if ( !cache.has(t) ) { cache.set( t, slowFn(t) ); }
    if ( tuple === this._lastTuple ) {
      return this._lastHash;
    }

    let l = tuple.length;
    let prim = [];
    let primOrder = [];
    let nonPrimOrder = [];

    for( let i = 0; i < l; i++) {
      let arg = tuple[i];
      let argType = typeof arg;
      if ( argType !== null && ( argType === 'object' || argType === 'function' ) ) {
        nonPrimOrder.push( i );
      } else {
        prim.push( argType === 'string' ? '"' + arg + '"' : '' + arg );
        primOrder.push( i );
      }
    }

    if ( nonPrimOrder.length === 0 ) {
      throw new Error('Tuple must have at least one non-primitive part');
    }

    prim.push('[' + nonPrimOrder.concat( primOrder ).join() + ']');

    this._lastTuple = tuple;
    this._lastHash = {
      nonPrimOrder,
      // concatenate serialized arguments using a complex separator
      // (to avoid key collisions)
      primHash: prim.join('/<[MI_SEP]>/')
    };

    return this._lastHash;
  },

  has: function( tuple ) {
    let curr = this._cache;
    const hash = this._hash( tuple );
    const l = hash.nonPrimOrder.length;

    for( let i = 0; i < l; i++) {
      const arg = tuple[hash.nonPrimOrder[i]];
      if ( curr.has && curr.has(arg) ) {
        curr = curr.get(arg);
      } else {
        return false;
      }
    }

    return ( curr.has || false ) && curr.has( hash.primHash );
  },

  set: function( tuple, value ) {
    let curr = this._cache;
    const hash = this._hash( tuple );
    const l = hash.nonPrimOrder.length;
    let mustCreate = false;

    for( let i = 0; i < l; i++) {
      const arg = tuple[hash.nonPrimOrder[i]];
      if ( !mustCreate && curr.has(arg) ) {
        curr = curr.get(arg);
      } else {
        mustCreate = true;
        curr.set( arg, ( curr = ( i < l - 1 ) ? new WeakMap() : new Map() ) );
      }
    }

    curr.set(hash.primHash, value);

    return this;
  },

  get: function( tuple ) {
    let curr = this._cache;
    const hash = this._hash( tuple );
    const l = hash.nonPrimOrder.length;

    for( let i = 0; i < l; i++) {
      const arg = tuple[hash.nonPrimOrder[i]];
      const ret = curr.get && curr.get(arg);
      if ( ret === undefined ) {
        return ret;
      } else {
        curr = ret;
      }
    }

    return curr.get && curr.get( hash.primHash );
  },

  clear: function() {
    this._cache = new WeakMap();
    delete this._lastTuple;
    delete this._lastHash;
  },
};

export default MixedTupleMap;