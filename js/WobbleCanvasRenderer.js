/*global */
'use strict';

import CanvasRenderer from './CanvasRenderer.js';

// A renderer whose icons bake their own continuous wobble (isomer-glycan.js,
// zdog-glycan.js) needs the shared tick loop to keep repainting forever,
// not just while a layout tween is in flight -- CanvasRenderer's own
// `animating` only covers the latter. Centralising that override here (it
// was previously copy-pasted verbatim into both IsomerCanvasRenderer and
// ZDogCanvasRenderer) also gives both renderers a single, shared place for
// `applySway` below, instead of each reimplementing the same bbox-center
// math independently.
class WobbleCanvasRenderer extends CanvasRenderer {
  get animating() {
    return true;
  }

  // CanvasRenderer.render() calls this once per paint, right before it
  // descends into the tree, with the save/restore already applied around
  // it -- so anything done to `ctx` here (a translate/rotate here) composes
  // underneath every icon's own independent save/translate/restore. `bbox`
  // is the whole tree's bounding box, already computed by render() for
  // sizing the canvas.
  //
  // A flat 2D canvas only ever has ONE rotation to give -- there's no
  // separate X/Y tilt available here the way there is in each package's own
  // 3D scene -- so the whole-molecule sway always uses channel `z` of the
  // wobble vector below. By convention, channel `z` is whichever of a
  // renderer's own 3D axes represents "spin around the vertical world axis"
  // for that library (see isomer-glycan.js/zdog-glycan.js's own render_icon
  // for how each one maps it onto its own axes).
  applySway(ctx, bbox) {
    const wobble = this.constructor.wobble;
    if (!wobble) {
      return;
    }
    const angle = this.currentWobbleAngle(wobble);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    ctx.translate(cx, cy);
    ctx.rotate(angle.z);
    ctx.translate(-cx, -cy);

    // Stashed on the root Canvas instance (`this.element`) so the icons
    // themselves -- plain per-icon render functions in isomer-glycan.js/
    // zdog-glycan.js, with no reference back to this renderer -- can read
    // the SAME three-channel angle for their own per-icon 3D tilt, via the
    // `.parent` chain every icon already has (set by CanvasCanvas.js's
    // `appendChild`), rather than each independently recomputing (or
    // separately wiring a sensor into) a wobble of their own.
    if (this.element) {
      this.element.wobbleAngle = angle;
    }
  }

  // The {x, y, z} angle vector this frame's sway (and, via `.wobbleAngle`
  // above, every icon's own tilt) should use: live device-orientation once
  // `enableTilt()` has been granted permission and received at least one
  // reading, otherwise the original continuous time-based sine -- each
  // channel scaled independently by `wobble.amplitude`'s own {x, y, z}, so a
  // renderer can make one axis swing much further than another.
  currentWobbleAngle(wobble = this.constructor.wobble) {
    if (this._liveTiltAngle) {
      return this._liveTiltAngle;
    }
    const { amplitude, period } = wobble;
    const t = performance.now() / period * 2 * Math.PI;
    return {
      x: (amplitude.x || 0) * Math.sin(t),
      y: (amplitude.y || 0) * Math.sin(t),
      z: (amplitude.z || 0) * Math.sin(t),
    };
  }

  // Makes the sway (and every icon's own tilt) follow the device's physical
  // tilt instead of the time-based sine, once permission is granted. Must be
  // called from inside a direct user-gesture handler (a click/change
  // listener, not a Promise callback or a reactive lifecycle hook) -- iOS
  // Safari's `DeviceOrientationEvent.requestPermission()` only resolves
  // 'granted' when invoked synchronously from one; everywhere else
  // (desktop/Android) the event just needs a listener, no prompt. Resolves
  // to the permission state so the caller can store/display it; safe to call
  // more than once (a second call just re-attaches).
  enableTilt() {
    if (typeof window === 'undefined' || !window.DeviceOrientationEvent) {
      return Promise.resolve('unsupported');
    }
    const attach = () => {
      this.disconnect();
      this._tiltHandler = (event) => {
        const wobble = this.constructor.wobble ||
          { amplitude: { x: 15 * Math.PI / 180, y: 15 * Math.PI / 180, z: 30 * Math.PI / 180 }, period: 4000 };
        const amplitude = wobble.amplitude;
        const clamp = (radians, max) => Math.max(-max, Math.min(max, radians));
        // `beta` (front-back device tilt, roughly -180..180) and `gamma`
        // (left-right device tilt, roughly -90..90) are the two physical
        // tilt axes DeviceOrientationEvent gives -- mapped to channels `x`
        // and `z` respectively, each clamped to that channel's own
        // amplitude so a hard tilt doesn't swing further than the original
        // sine ever did. There's no third independent *tilt* to drive
        // channel `y` with -- the remaining field, `alpha`, is an absolute
        // 0-360 compass heading, not a tilt, and would spin the whole
        // molecule a full turn as the user turns around rather than
        // wobbling it -- so `y` keeps following the time-based sine even
        // once tilt is live.
        const t = performance.now() / wobble.period * 2 * Math.PI;
        this._liveTiltAngle = {
          x: clamp((event.beta || 0) * Math.PI / 180, amplitude.x || 0),
          y: (amplitude.y || 0) * Math.sin(t),
          z: clamp((event.gamma || 0) * Math.PI / 180, amplitude.z || 0),
        };
      };
      window.addEventListener('deviceorientation', this._tiltHandler);
      return 'granted';
    };
    if (typeof window.DeviceOrientationEvent.requestPermission === 'function') {
      return window.DeviceOrientationEvent.requestPermission().then((state) => {
        if (state === 'granted') {
          attach();
        }
        return state;
      });
    }
    return Promise.resolve(attach());
  }

  // Stops following device tilt (falls back to the time-based sine) and
  // removes the listener. Called automatically by sviewer when this
  // renderer instance is discarded (e.g. switching render mode again), so a
  // leftover listener doesn't keep driving a renderer nobody's looking at
  // any more.
  disconnect() {
    if (this._tiltHandler) {
      window.removeEventListener('deviceorientation', this._tiltHandler);
      this._tiltHandler = null;
    }
    this._liveTiltAngle = null;
  }
}

export default WobbleCanvasRenderer;
