// Define the position of the thing
// in some user space

let Renderable = class {
  get rendered() {
    // Get the actual rendered element / reference to element
    // so that we can add other stuff to the rendered thing
  }
  get cx() {

  }
  set cx(cx) {
    this.cx=cx;
  }
  get cy() {

  }
  set cy(cy) {
    this.cy=cy;
  }
  get radius() {

  }
  set radius(radius) {
    this.radius=radius;
  }
  get box() {

  }
  get locked() {

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
