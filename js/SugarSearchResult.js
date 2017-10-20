let noop = () => {};

let wrap_monosaccharide = sugar => {
  let base = sugar.constructor.Monosaccharide;
  return class extends base {
    constructor(original,wanted) {
      super(original.identifier);
      this.original = original;
      this.wanted = wanted;
      return this;
    }
    get anomer() {
      return this.original.anomer;
    }
    get parent_linkage() {
      return this.original.parent_linkage;
    }
    get identifier() {
      return this.original.identifier;
    }
    set anomer(ignore) {
      noop(ignore);
      return this.original.anomer;
    }
    set parent_linkage(ignore) {
      noop(ignore);
      return this.original.parent_linkage;
    }
    set identifier(ignore) {
      noop(ignore);
      return this.original.identifier;
    }
    linkageOf(node) {
      return this.original.linkageOf(node.original);
    }
    clone() {
      return this;
    }
  };
};

let build_sugar = function(target,original,wanted) {
  let wrap_class = wrap_monosaccharide(original);
  let wrap_map = new WeakMap();

  let to_clone = Object.create(original);

  let cloned = to_clone.clone((res) => {
    if ( res instanceof wrap_class) {
      return res;
    }
    let wrapped = wrap_map.get(res);
    if ( ! wrapped ) {
      wrapped = new wrap_class(res,wanted.indexOf(res) >= 0);
      wrap_map.set(res,wrapped);
    }

    if (res.parent) {
      wrapped.parent = wrap_map.get(res.parent);
    } else {
      to_clone.root = wrapped;
    }
    return wrapped;
  });
  target.root = cloned.root;
  // Get all the residues from the deepest to the shallowest
  let composition = [...target.breadth_first_traversal()].reverse();
  console.log(composition.map( res => [res.identifier, res.wanted ] ));
};

let SearchResultWrapper = function(base) {
  return class SugarSearchResult extends base {
    constructor(original,residues) {
      super();
      build_sugar(this,original,residues);
    }
  };
};

export default SearchResultWrapper;
