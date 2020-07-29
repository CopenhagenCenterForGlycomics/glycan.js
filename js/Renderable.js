// Define the position of the thing
// in some user space

const position_symbol = Symbol('position');


let Renderable = class {
  get rendered() {
    // Get the actual rendered element / reference to element
    // so that we can add other stuff to the rendered thing
    return undefined;
  }
  get cx() {
    return this[position_symbol].cx;
  }
  set cx(cx) {
    this[position_symbol].cx = cx;
  }
  get cy() {
    return this[position_symbol].cy;
  }
  set cy(cy) {
    this[position_symbol].cy = cy;
  }
  get radius() {
    return this.radius;
  }
  set radius(radius) {
    this.radius=radius;
  }
  get box() {
    return undefined;
  }
  get locked() {
    return undefined;
  }
  lock(others) {
    // Return new box that wraps around this
    // and the other elements.
    // Movement of this will affect all the
    // elemnents that are part of the lock.

    // We would like to assign particular sets of elements to locks
    // and then manage the layout of those locked elements
    // using something else.
    others.locked = true;
  }

  // Other methods for calculating the 
  // width, shifting across etc.
};

export { Renderable };
