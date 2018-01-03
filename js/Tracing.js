'use strict';
import * as debug from 'debug-any-level';

import Monosaccharide from './Monosaccharide';

const module_string='glycanjs:tracing';

const log = debug(module_string);

let noop = () => {};

class TracedMonosaccharide extends Monosaccharide {
    constructor(original) {
      super(original.identifier);
      this.original = original;
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
      cloned.copyTagsFrom(this);
      return cloned;
    }
}

let initialise_sugar = function(target,wanted) {
  target.root = new TracedMonosaccharide(wanted);
  return target;
};

let clone_and_add_monosaccharide = function(wrapped_sugar,parent,child) {
  let new_sugar = wrapped_sugar.clone();
  parent = new_sugar.composition().filter( res => res.original === parent.original )[0];
  let wrapped_child = new wrapped_sugar.constructor.Monosaccharide(child);
  wrapped_child = Object.assign(wrapped_child,child);

  parent.addChild(parent.original.linkageOf(child),wrapped_child);

  return { sugar: new_sugar, child: wrapped_child};
};

let attach_via_cloning = (result_sugar,attachment,mapped_list,template_residue,child) => {
  let clone_results = clone_and_add_monosaccharide(result_sugar,attachment,child);
  clone_results.child.copyTagsFrom(template_residue);
  mapped_list.push(child);
  return clone_results.sugar;
};

let residues_in_mapping = (sugar,mapped_list) => {
  return sugar.composition().filter( residue => mapped_list.indexOf(residue.original) >= 0 );
};

let trace_sugar = function(ResultClass,search,search_root,template,comparator) {
  let cursor_mapping = new WeakMap();
  let sugar_sets = [];
  let attachment_to_sugar = new WeakMap();

  log.info('Tracing',template.sequence,'onto',search.sequence,'moving cursor over template');

  let successful_mappings = [...template.breadth_first_traversal(template.root, cursor => {

    log.info('Template cursor is positioned at',cursor.identifier);

    attachment_to_sugar = new WeakMap();

    if ( ! cursor.parent ) {
      log.info('The cursor is at the root - the search sugar is at',search_root.identifier);
      sugar_sets.push(initialise_sugar(new ResultClass(),search_root));
      cursor_mapping.set(cursor,[ sugar_sets[0].composition()[0].original ]);
      sugar_sets[0].composition()[0].copyTagsFrom(cursor);
      log.info('Done with this cursor',cursor.identifier);
      return sugar_sets.length > 0;
    } else {
      cursor_mapping.set(cursor, []);
    }
    log.info('Residues in the search tree that correspond to the cursor parent are',cursor_mapping.get(cursor.parent).map( res => res.identifier));

    let wanted_linkage = cursor.parent.linkageOf(cursor);

    // If one of the result WrappedSugars doesn't contain the place where we will
    // attach monosaccharides (i.e. a monosaccharide wrapping the search sugar parent
    // corresponding to the parent of the cursor), we don't want that sugar

    sugar_sets = sugar_sets.filter( sug => residues_in_mapping(sug,cursor_mapping.get(cursor.parent)).length > 0);

    log.info('Current sets of sugars are',sugar_sets);

    // The attachment points on the results are found by finding the monosaccharides corresponding to cursor parent
    let attachment_points = sugar_sets.map( sugar => {
      let attach_point = residues_in_mapping(sugar,cursor_mapping.get(cursor.parent));
      if (attach_point.length > 1) {
        throw new Error('Tracing mapped a template residue to more than one residue in the search sugar');
      }
      attachment_to_sugar.set(attach_point[0],sugar);
      return attach_point[0];
    });

    sugar_sets = [];

    log.info('We need to find children of the attachment points linked via a',wanted_linkage,'linkage');

    for (let attachment of attachment_points) {
      // Get all the children that could possibly match this linkage we are after
      let search_parent = attachment.original;

      log.info('Attachment point is a wrapped residue with identifier',search_parent.identifier);

      let search_kids = wanted_linkage == 0 ? search_parent.children : search_parent.child_linkages.get(wanted_linkage);

      log.info('We want to find a match for the cursor from within',(search_kids || []).length,'possible child residues');

      // Check to find all the wrapped children of the attachment point matching against the cursor
      let valid_search_kids = [].concat(search_kids).filter( comparator.bind(null,cursor) ).filter( res => res );

      if (valid_search_kids.length >= 1) {
        let attach_child_residue = attach_via_cloning.bind(null,attachment_to_sugar.get(attachment),attachment,cursor_mapping.get(cursor),cursor);
        log.info('Valid children in search sugar are',valid_search_kids.map( res => res.identifier ));
        let sets_of_new_sugars = valid_search_kids.map( attach_child_residue );
        sugar_sets = sugar_sets.concat(sets_of_new_sugars);
      }
    }
    return sugar_sets.length > 0;
  })];

  log.info('We mapped',successful_mappings.length,'out of',template.composition().length,'residues');

  // Careful about which array we are pointing to here.
  log.info(sugar_sets.map( sug => sug.sequence ));

  return sugar_sets;
};

class Tracer {
  static trace(source,start,template,comparator) {

    let own_constructor = source.constructor;

    let TracedClass = class extends own_constructor {
      static get Monosaccharide() {
        return TracedMonosaccharide;
      }
    };

    return trace_sugar(TracedClass,source,start,template,comparator);
  }
}

export default Tracer;
