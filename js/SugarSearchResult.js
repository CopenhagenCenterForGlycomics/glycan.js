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
      let cloned = new this.constructor(this.original);
      cloned.original = this.original;
      cloned.wanted = this.wanted;
      return cloned;
    }
  };
};

let build_sugar = function(target,original,wanted) {
  let wrap_class = wrap_monosaccharide(original);
  target.constructor._mono = wrap_class;
  // let wrap_map = new WeakMap();

  // let to_clone = Object.create(original);

  // let cloned = to_clone.clone((res) => {
  //   if ( res instanceof wrap_class) {
  //     return res;
  //   }
  //   let wrapped = wrap_map.get(res);
  //   if ( ! wrapped ) {
  //     wrapped = new wrap_class(res,wanted.indexOf(res) >= 0);
  //     wrap_map.set(res,wrapped);
  //   }

  //   if (res.parent) {
  //     wrapped.parent = wrap_map.get(res.parent);
  //   } else {
  //     to_clone.root = wrapped;
  //   }
  //   return wrapped;
  // });
  target.root = new wrap_class(wanted[0]);
  // // Get all the residues from the deepest to the shallowest
  // let composition = [...target.breadth_first_traversal()].reverse();
  // console.log(composition.map( res => [res.identifier, res.wanted ] ));
  return target;
};

let clone_and_add_monosaccharide = function(wrapped_sugar,parent,child) {
  wrapped_sugar.composition().forEach( res => res.wanted = false );
  parent.wanted = true;
  let new_sugar = wrapped_sugar.clone();
  parent = new_sugar.composition().filter( res => res.wanted )[0];
  let wrapped_child = new wrapped_sugar.constructor.Monosaccharide(child);
  parent.addChild(parent.original.linkageOf(child),wrapped_child);
  return { sugar: new_sugar, child: wrapped_child};
};

let attach_via_cloning = (result_sugar,attachment,mapped_list,child) => {
  let clone_results = clone_and_add_monosaccharide(result_sugar,attachment,child);
  mapped_list.push(child);
  return clone_results.sugar;
};


let trace_sugar = function(result,search,search_root,template,comparator) {
  let cursor_mapping = {};
  let sugar_sets = [];
  let attachment_to_sugar = new WeakMap();
  console.log('Tracing',template.sequence,'onto',search.sequence);
  let res = [...template.breadth_first_traversal(template.root, cursor => {
    console.log('Template cursor is',cursor.identifier);
    attachment_to_sugar = new WeakMap();
    if ( ! cursor.parent ) {
      console.log('We map this to the search root that is',search_root.identifier);
      sugar_sets.push(build_sugar(result,search,[ search_root ]));
      cursor_mapping[cursor] = [ sugar_sets[0].composition()[0].original ];
      return cursor;
    }

    console.log('Mapped parent is',cursor_mapping[cursor.parent].map( res => res.identifier));
    let wanted_linkage = cursor.parent.linkageOf(cursor);

    // We only want the sugar sets that have mapped the parent residue of the current cursor
    sugar_sets = sugar_sets.filter( sug => sug.composition().filter( residue => cursor_mapping[cursor.parent].indexOf(residue.original) >= 0 ).length > 0 );

    console.log('Current sets of sugars are',sugar_sets);

    // The attachment points on the results are found by finding the monosaccharides corresponding to cursor parent
    let attachment_points = sugar_sets.map( sugar => {
      let attach_point = sugar.composition().filter( residue => cursor_mapping[cursor.parent].indexOf(residue.original) >= 0 )[0];
      attachment_to_sugar.set(attach_point,sugar);
      return attach_point;
    });

    sugar_sets = [];
    cursor_mapping[cursor] = [];

    console.log('List of attachment points (i.e. search roots) on the sets of sugars',attachment_points.map( res => res.identifier ));

    for (let attachment of attachment_points) {
      // Get all the children that could possibly match this linkage we are after
      let search_parent = attachment.original;
      console.log('Testing an attachment point for linkage',search_parent.identifier,wanted_linkage);
      let search_kids = wanted_linkage == 0 ? search_parent.children : search_parent.child_linkages.get(wanted_linkage);

      // Check to find all the children matching the original children at the attachment point
      console.log('We have a set of kids of length',(search_kids || []).length);
      let valid_search_kids = [].concat(search_kids).filter( comparator.bind(null,cursor) ).filter( res => res );

      if (valid_search_kids.length >= 1) {
        let attach_child_residue = attach_via_cloning.bind(null,attachment_to_sugar.get(attachment),attachment,cursor_mapping[cursor]);
        console.log('Valid search kids are',valid_search_kids);
        let sets_of_new_sugars = valid_search_kids.map( attach_child_residue );
        sugar_sets = sugar_sets.concat(sets_of_new_sugars);
        console.log('Now have',sugar_sets.length,'valid sets');
      }
    }
  })];
  console.log('Ignore',res.length);
  // Careful about which array we are pointing to here.
  console.log(sugar_sets.map( sug => sug.sequence ));
  return sugar_sets;
};

let SearchResultWrapper = function(base) {
  return class SugarSearchResult extends base {
    constructor(original,start,template,comparator) {
      super();
      if ( ! original ) {
        return;
      }
      this.sets = trace_sugar(this,original,start,template,comparator);
    }

    static get Monosaccharide() {
      return this._mono;
    }
  };
};

export default SearchResultWrapper;
