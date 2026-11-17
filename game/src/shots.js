// The screenshot scenes behind ?shot=start|play|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot, so the frame is what a short game really looks like and
// the same seed always gives the same frame.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** Steer toward the nearest orb, repelled by close shadows. */
function autopilot(state, dangerRadius, repelWeight, burst) {
  const w = state.wisp;
  let tx = 0;
  let ty = 0;
  let best = Infinity;
  for (const orb of state.orbs) {
    const d = Math.hypot(orb.x - w.x, orb.y - w.y);
    if (d < best) {
      best = d;
      tx = orb.x;
      ty = orb.y;
    }
  }
  let dx = tx - w.x;
  let dy = ty - w.y;
  const dl = Math.hypot(dx, dy) || 1;
  dx /= dl;
  dy /= dl;
  // Shadows push the desired direction away, harder the closer they are.
  for (const sh of state.shadows) {
    const sx = w.x - sh.x;
    const sy = w.y - sh.y;
    const dist = Math.hypot(sx, sy) || 1;
    if (dist < dangerRadius) {
      const push = ((dangerRadius - dist) / dangerRadius) * repelWeight;
      dx += (sx / dist) * push;
      dy += (sy / dist) * push;
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  const steer = { x: dx / len, y: dy / len, active: true };
  // Burst when a shadow is right on top of the wisp.
  let wantBurst = false;
  if (burst) {
    for (const sh of state.shadows) {
      if (Math.hypot(sh.x - w.x, sh.y - w.y) < 95) {
        wantBurst = true;
        break;
      }
    }
  }
  return { steer, wantBurst };
}

/** The reckless pilot: it chases orbs and never looks at the shadows. */
function recklessPilot(state) {
  const w = state.wisp;
  let tx = FIELD.width / 2;
  let ty = FIELD.height / 2;
  let best = Infinity;
  for (const orb of state.orbs) {
    const d = Math.hypot(orb.x - w.x, orb.y - w.y);
    if (d < best) {
      best = d;
      tx = orb.x;
      ty = orb.y;
    }
  }
  const dx = tx - w.x;
  const dy = ty - w.y;
  const len = Math.hypot(dx, dy) || 1;
  return { steer: { x: dx / len, y: dy / len, active: true }, wantBurst: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world, seedValue) {
  world.reset(seedValue ?? 1);
  if (name !== 'play' && name !== 'end') {
    // Title: a few seconds of play behind the panel, so the night is alive.
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      const move = autopilot(world.state, 150, 1.6, true);
      world.step(STEP, move.steer, move.wantBurst);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      const move = autopilot(world.state, 170, 2.2, true);
      const events = world.step(STEP, move.steer, move.wantBurst);
      if (events & EVENT_OVER) break;
    }
    const over = world.state.over;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: Math.floor(world.state.score) };
  }
  // End: the reckless pilot is caught out, as a hurried player is. If it
  // somehow survives the limit, the light is spent so the run must end.
  for (let i = 0; i < END_LIMIT_SECONDS / STEP; i += 1) {
    const move = recklessPilot(world.state);
    const events = world.step(STEP, move.steer, move.wantBurst);
    if (events & EVENT_OVER) break;
    if (i === Math.floor(END_LIMIT_SECONDS / STEP) - 1) world.state.wisp.light = 1;
  }
  // Keep stepping (no steering) until the light runs out.
  for (let i = 0; i < 60 / STEP && !world.state.over; i += 1) {
    world.step(STEP, { x: 0, y: 0, active: false }, false);
  }
  return { screen: SCREEN_OVER, best: Math.floor(world.state.score) };
}
