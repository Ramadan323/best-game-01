// LUMEN — the game loop and the state machine. Title, play, pause and game
// over; a fixed-step world, a render each frame, and the wiring between the
// world's events and the sounds and particles that answer them.
import { FIELD, STEP, WISP, PALETTE } from './config.js';
import { makeWorld, EVENT_COLLECT, EVENT_HIT, EVENT_BURST, EVENT_LEVEL, EVENT_OVER } from './world.js';
import { makeInput } from './input.js';
import { makeAudio } from './audio.js';
import { makeParticles, makeStars } from './particles.js';
import { drawWorld, drawHUD, drawTitle, drawPause, drawGameOver, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_OVER } from './render.js';
import { stageShot } from './shots.js';
import { loadBest, saveBest } from './storage.js';
import { makeRng } from './random.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = FIELD.width;
canvas.height = FIELD.height;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const input = makeInput(canvas);
const audio = makeAudio();
const particles = makeParticles();
const stars = makeStars(makeRng(20261118), FIELD.width, FIELD.height);
const world = makeWorld(seed);

let screen = SCREEN_TITLE;
let best = loadBest();
let isNewBest = false;
let time = 0;
let last = performance.now();
let accumulator = 0;
let trailTimer = 0;

function startGame() {
  world.reset((Math.random() * 1e9) | 0);
  particles.clear();
  screen = SCREEN_PLAY;
  isNewBest = false;
  audio.unlock();
  audio.click();
}

function toTitle() {
  world.reset(seed);
  particles.clear();
  screen = SCREEN_TITLE;
}

function endGame() {
  const finalScore = Math.floor(world.state.score);
  if (finalScore > best) {
    best = saveBest(finalScore);
    isNewBest = true;
  }
  screen = SCREEN_OVER;
  audio.gameOver();
}

function handleEvents(events) {
  if (events & EVENT_COLLECT) {
    const c = world.lastCollect;
    if (c) {
      audio.collect(c.combo);
      particles.burst(c.x, c.y, PALETTE.orbGlow, 14, 160, 0.55, 3);
      particles.text(c.x, c.y - 14, `+${c.gained}`, '#ffe9a8', c.combo > 1 ? 19 : 16);
      if (c.combo > 1) particles.text(c.x, c.y - 36, `COMBO x${c.combo}`, PALETTE.wispGlow, 13);
    }
  }
  if (events & EVENT_BURST) {
    const b = world.lastBurst;
    audio.burst();
    if (b) {
      particles.ring(b.x, b.y, PALETTE.accent, 26, WISP.burstRadius);
      particles.burst(b.x, b.y, PALETTE.accent, 10, 220, 0.4, 2.5);
      if (b.repelled > 0) particles.text(b.x, b.y - 24, `REPELLED ${b.repelled}`, PALETTE.accent, 15);
    }
  }
  if (events & EVENT_HIT) {
    const h = world.lastHit;
    audio.hurt();
    if (h) particles.burst(h.x, h.y, PALETTE.danger, 18, 240, 0.6, 3.5);
  }
  if (events & EVENT_LEVEL) {
    audio.levelUp();
    audio.setLevel(world.state.level);
    particles.text(world.state.wisp.x, world.state.wisp.y - 30, `LEVEL ${world.state.level}`, PALETTE.accent, 20);
  }
  if (events & EVENT_OVER) endGame();
}

function stepOnce(dt) {
  const queued = input.consume();
  if (queued.mute) {
    const muted = audio.toggleMute();
    void muted;
  }
  if (screen === SCREEN_TITLE) {
    // A quiet demo plays behind the title so the night is alive.
    const move = { x: 0, y: 0, active: false };
    const events = world.step(dt, move, false);
    void events;
    if (queued.any || queued.restart) startGame();
    return;
  }
  if (screen === SCREEN_PLAY) {
    if (queued.pause) {
      screen = SCREEN_PAUSE;
      return;
    }
    const steer = input.steer(world.state.wisp.x, world.state.wisp.y);
    const events = world.step(dt, steer, queued.burst);
    handleEvents(events);
    // The wisp leaves a fading trail of light as it moves.
    trailTimer -= dt;
    if (world.state.wisp.moving && trailTimer <= 0) {
      trailTimer = 0.03;
      particles.burst(world.state.wisp.x, world.state.wisp.y, PALETTE.wispTrail, 1, 12, 0.5, 4);
    }
    if (queued.restart) startGame();
    return;
  }
  if (screen === SCREEN_PAUSE) {
    if (queued.pause || queued.any) screen = SCREEN_PLAY;
    return;
  }
  // Game over.
  if (queued.restart || queued.any) startGame();
}

function render() {
  ctx.save();
  // Screen shake: a hard hit rattles the frame.
  const shake = world.state.shake;
  if (shake > 0.01) {
    const mag = shake * 9;
    ctx.translate((Math.random() * 2 - 1) * mag, (Math.random() * 2 - 1) * mag);
  }
  drawWorld(ctx, world, particles, stars, time);
  ctx.restore();
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSE) {
    drawHUD(ctx, world, best, audio.muted, time);
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, best, time);
  if (screen === SCREEN_PAUSE) drawPause(ctx);
  if (screen === SCREEN_OVER) drawGameOver(ctx, world, best, isNewBest);
}

function frame(now) {
  const elapsed = Math.min(0.1, (now - last) / 1000);
  last = now;
  time += elapsed;
  accumulator += elapsed;
  while (accumulator >= STEP) {
    stepOnce(STEP);
    accumulator -= STEP;
  }
  particles.step(elapsed);
  render();
  requestAnimationFrame(frame);
}

// A screenshot scene: stage the world once, render that single frame, and
// hold it — the maker captures it as-is. The staged state is the frame; the
// loop only keeps the stars twinkling and the title pulsing.
if (shotName) {
  const staged = stageShot(shotName, world, seed);
  screen = staged.screen;
  best = Math.max(best, staged.best);
  render();
  requestAnimationFrame(function hold(now) {
    last = now;
    time += 0.016;
    particles.step(0.016);
    render();
    requestAnimationFrame(hold);
  });
} else {
  requestAnimationFrame(frame);
}
