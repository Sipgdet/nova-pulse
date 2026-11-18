// Keyboard and mouse, read once a frame: movement direction, aim point in field
// coordinates, whether the trigger is held, and one-shot actions (confirm, pause,
// pulse, mute, restart) that the loop consumes with takeActions().
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_PULSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RESTART = 16;

const KEY_DIRS = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: FIELD.width / 2, y: FIELD.height / 2 - 120, firing: false };
  let queued = 0;

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
  }

  function onKeyDown(event) {
    if (event.code === 'Space') event.preventDefault();
    if (event.repeat) return;
    keys.add(event.code);
    if (event.code === 'Space' || event.code === 'Enter') queued |= ACTION_CONFIRM;
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') queued |= ACTION_PULSE;
    if (event.code === 'KeyM') queued |= ACTION_MUTE;
    if (event.code === 'KeyR') queued |= ACTION_RESTART;
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const point = toField(event);
    mouse.x = point.x;
    mouse.y = point.y;
  }

  function onMouseDown(event) {
    if (event.button === 0) {
      mouse.firing = true;
      queued |= ACTION_CONFIRM;
    } else if (event.button === 2) {
      queued |= ACTION_PULSE;
    }
  }

  function onMouseUp(event) {
    if (event.button === 0) mouse.firing = false;
  }

  function onContextMenu(event) {
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('contextmenu', onContextMenu);

  return {
    /** Normalised movement direction from WASD / arrow keys. */
    direction() {
      let x = 0;
      let y = 0;
      for (const code of keys) {
        const dir = KEY_DIRS[code];
        if (dir) {
          x += dir[0];
          y += dir[1];
        }
      }
      if (x === 0 && y === 0) return { x: 0, y: 0 };
      const length = Math.hypot(x, y);
      return { x: x / length, y: y / length };
    },
    /** True while the left mouse button or Space is held. */
    firing() {
      return mouse.firing || keys.has('Space');
    },
    /** The aim point, in field coordinates. */
    aim() {
      return { x: mouse.x, y: mouse.y };
    },
    /** One-shot actions since the last call; calling clears them. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}
