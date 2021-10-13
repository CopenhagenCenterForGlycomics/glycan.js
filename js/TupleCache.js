
const uuid_path = Symbol('uuid');
const uuid_map = new WeakMap();

function uuidv4() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

class TupleCache {
  constructor() {
    this._cache = new Map();
  }
  has(tuple) {
    return this._cache.get(tuple.map( obj => uuid_map.get(obj)).join('#')) != null;
  }
  get(tuple) {
    return this._cache.get(tuple.map( obj => uuid_map.get(obj) ).join('#'));
  }
  set(tuple,value) {
    const uuids = tuple.map( obj => {
      let curr_uuid = uuid_map.get(obj);
      if ( ! curr_uuid ) {
        curr_uuid = uuidv4();
        uuid_map.set(obj,curr_uuid);
      }
      return curr_uuid;
    });
    this._cache.set(uuids.join('#'),value);
  }
}

export default TupleCache