import debug from 'debug';

const cache = {};

function get(t, k, r, name) {
  const defProp = Reflect.get(t, k, r) || Reflect.get(debug, k, r);
  if (defProp && defProp !== debug) {
    return defProp;
  } else {
    if (name) {
      k = `${name}:${k}`;
    }
    return cache[k] || (cache[k] = debugAny(k));
  }
}

const set = (target, key, value) => Reflect.set(debug, key, value);

const debugAny = new Proxy((name, ...rest) => {
	let result = new Proxy(debug(name, ...rest), { get: (...args) => get(...args, name), set });
	return result;
}, { get, set }) ;


export { debugAny as default };