// Keyboard and mouse, read by the world each step. The wisp follows the
// pointer when the pointer moves, and WASD / arrow keys drive it too —
// whichever the player reaches for, the game answers.
export function makeInput(canvas) {
  const input = {
    left: false,
    right: false,
    up: false,
    down: false,
    burstQueued: false,
    pauseQueued: false,
    restartQueued: false,
    muteQueued: false,
    anyQueued: false,
    pointerX: 0,
    pointerY: 0,
    pointerActive: false,
    pointerDown: false,
  };

  const keyMap = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'up',
    KeyW: 'up',
    ArrowDown: 'down',
    KeyS: 'down',
  };

  function toLocal(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    const field = keyMap[event.code];
    if (field) {
      input[field] = true;
      event.preventDefault();
      return;
    }
    if (event.code === 'Space') {
      input.burstQueued = true;
      input.anyQueued = true;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      input.pauseQueued = true;
      input.anyQueued = true;
    } else if (event.code === 'KeyR' || event.code === 'Enter') {
      input.restartQueued = true;
      input.anyQueued = true;
    } else if (event.code === 'KeyM') {
      input.muteQueued = true;
    }
  });

  window.addEventListener('keyup', (event) => {
    const field = keyMap[event.code];
    if (field) input[field] = false;
  });

  canvas.addEventListener('pointermove', (event) => {
    const at = toLocal(event);
    input.pointerX = at.x;
    input.pointerY = at.y;
    input.pointerActive = true;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const at = toLocal(event);
    input.pointerX = at.x;
    input.pointerY = at.y;
    input.pointerActive = true;
    input.pointerDown = true;
    input.burstQueued = true;
    input.anyQueued = true;
  });

  canvas.addEventListener('pointerup', () => {
    input.pointerDown = false;
  });

  canvas.addEventListener('pointerleave', () => {
    input.pointerActive = false;
  });

  // The world consumes the one-shot queues each step so a press fires once.
  input.consume = function consume() {
    const queued = {
      burst: input.burstQueued,
      pause: input.pauseQueued,
      restart: input.restartQueued,
      mute: input.muteQueued,
      any: input.anyQueued,
    };
    input.burstQueued = false;
    input.pauseQueued = false;
    input.restartQueued = false;
    input.muteQueued = false;
    input.anyQueued = false;
    return queued;
  };

  // Steering: keys win while held, otherwise the wisp chases the pointer.
  input.steer = function steer(x, y) {
    let dx = 0;
    let dy = 0;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      return { x: dx / len, y: dy / len, active: true };
    }
    if (input.pointerActive) {
      const px = input.pointerX - x;
      const py = input.pointerY - y;
      const dist = Math.hypot(px, py);
      if (dist > 6) return { x: px / dist, y: py / dist, active: true };
    }
    return { x: 0, y: 0, active: false };
  };

  return input;
}
