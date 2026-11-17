// The world: the wisp, the orbs, the shadows, and every rule that moves them.
// A fixed step (STEP) keeps the game deterministic from a seed, so a
// screenshot staged from that seed always shows the same frame.
import { FIELD, WISP, ORB, SHADOW, LEVEL, SCORE, STEP } from './config.js';
import { makeRng, range, pickWeighted } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_COLLECT = 1;
export const EVENT_HIT = 2;
export const EVENT_BURST = 4;
export const EVENT_LEVEL = 8;
export const EVENT_OVER = 16;

export const KIND_CHASER = 'chaser';
export const KIND_HUNTER = 'hunter';
export const KIND_BRUTE = 'brute';
export const KIND_SPLITTER = 'splitter';

function kindDef(kind) {
  return SHADOW[kind];
}

export function makeWorld(seed) {
  const world = {
    rng: makeRng(seed ?? 1),
    state: null,
    orbTimer: 0,
    shadowTimer: 0,
    time: 0,
    // The last thing that happened, for sounds, particles and floating text.
    lastCollect: null,
    lastBurst: null,
    lastHit: null,
  };

  world.reset = function reset(seedValue) {
    world.rng = makeRng(seedValue ?? 1);
    world.state = {
      wisp: {
        x: FIELD.width / 2,
        y: FIELD.height / 2,
        vx: 0,
        vy: 0,
        light: WISP.lightMax,
        burstCooldown: 0,
        invulnerable: 0,
        moving: false,
      },
      orbs: [],
      shadows: [],
      score: 0,
      combo: 0,
      comboTimer: 0,
      bestCombo: 0,
      orbsCollected: 0,
      shadowsRepelled: 0,
      bursts: 0,
      hits: 0,
      level: 1,
      over: false,
      shake: 0,
    };
    world.orbTimer = 0.4;
    world.shadowTimer = 1.2;
    world.time = 0;
    spawnOrb();
    spawnOrb();
    spawnOrb();
  };

  function spawnOrb() {
    const s = world.state;
    if (s.orbs.length >= ORB.maxOnField) return;
    const margin = 50;
    s.orbs.push({
      x: range(world.rng, margin, FIELD.width - margin),
      y: range(world.rng, margin, FIELD.height - margin),
      radius: ORB.radius,
      phase: world.rng() * Math.PI * 2,
      born: world.time,
    });
  }

  function shadowKindsFor(level) {
    const kinds = [];
    for (const kind of [KIND_CHASER, KIND_HUNTER, KIND_BRUTE, KIND_SPLITTER]) {
      const def = kindDef(kind);
      if (level >= (def.minLevel ?? 1)) kinds.push({ kind, weight: def.weight });
    }
    return kinds;
  }

  function spawnShadow() {
    const s = world.state;
    const level = s.level;
    const picked = pickWeighted(world.rng, shadowKindsFor(level));
    const def = kindDef(picked.kind);
    const speed = def.speed * Math.pow(LEVEL.speedFasterPerLevel, level - 1);
    // Spawn at a random edge, never on top of the wisp.
    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 8; tries += 1) {
      const edge = Math.floor(world.rng() * 4);
      if (edge === 0) {
        x = range(world.rng, 0, FIELD.width);
        y = -30;
      } else if (edge === 1) {
        x = range(world.rng, 0, FIELD.width);
        y = FIELD.height + 30;
      } else if (edge === 2) {
        x = -30;
        y = range(world.rng, 0, FIELD.height);
      } else {
        x = FIELD.width + 30;
        y = range(world.rng, 0, FIELD.height);
      }
      const dx = x - s.wisp.x;
      const dy = y - s.wisp.y;
      if (Math.hypot(dx, dy) > 240) break;
    }
    s.shadows.push({
      kind: picked.kind,
      x,
      y,
      vx: 0,
      vy: 0,
      radius: def.radius,
      speed,
      score: def.score,
      drainMult: def.drainMult ?? 1,
      phase: world.rng() * Math.PI * 2,
      wobble: range(world.rng, 0.4, 1.0),
    });
  }

  function burstAt(x, y) {
    const s = world.state;
    let repelled = 0;
    for (let i = s.shadows.length - 1; i >= 0; i -= 1) {
      const sh = s.shadows[i];
      const dx = sh.x - x;
      const dy = sh.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > WISP.burstRadius + sh.radius) continue;
      repelled += 1;
      const nx = dist > 0.01 ? dx / dist : 1;
      const ny = dist > 0.01 ? dy / dist : 0;
      if (sh.kind === KIND_SPLITTER) {
        // A splitter bursts into two chasers, flung outward by the blast.
        s.shadows.splice(i, 1);
        for (const side of [-1, 1]) {
          const def = kindDef(KIND_CHASER);
          s.shadows.push({
            kind: KIND_CHASER,
            x: sh.x + nx * 10 + side * 12,
            y: sh.y + ny * 10,
            vx: nx * WISP.burstPush + side * 120,
            vy: ny * WISP.burstPush,
            radius: def.radius,
            speed: def.speed * Math.pow(LEVEL.speedFasterPerLevel, s.level - 1),
            score: def.score,
            drainMult: 1,
            phase: world.rng() * Math.PI * 2,
            wobble: 0.7,
          });
        }
        continue;
      }
      sh.vx = nx * WISP.burstPush;
      sh.vy = ny * WISP.burstPush;
      sh.pushed = 0.55;
    }
    return repelled;
  }

  // One fixed step. `steer` is {x, y, active} from input; `wantBurst` is a
  // one-shot burst request. Returns an event bitmask for sounds and juice.
  world.step = function step(dt, steer, wantBurst) {
    const s = world.state;
    if (!s || s.over) return EVENT_NONE;
    let events = EVENT_NONE;
    world.time += dt;
    const w = s.wisp;

    // Level rises with time survived.
    const level = Math.min(LEVEL.maxLevel, 1 + Math.floor(world.time / LEVEL.secondsPerLevel));
    if (level !== s.level) {
      s.level = level;
      events |= EVENT_LEVEL;
    }

    // Steering: accelerate toward the input direction, then friction.
    if (steer.active) {
      w.vx += steer.x * WISP.accel * dt;
      w.vy += steer.y * WISP.accel * dt;
      w.moving = true;
    } else {
      w.moving = false;
    }
    const speed = Math.hypot(w.vx, w.vy);
    if (speed > WISP.maxSpeed) {
      w.vx = (w.vx / speed) * WISP.maxSpeed;
      w.vy = (w.vy / speed) * WISP.maxSpeed;
    }
    w.vx *= Math.pow(WISP.friction, dt * 60);
    w.vy *= Math.pow(WISP.friction, dt * 60);
    w.x = Math.min(FIELD.width - WISP.radius, Math.max(WISP.radius, w.x + w.vx * dt));
    w.y = Math.min(FIELD.height - WISP.radius, Math.max(WISP.radius, w.y + w.vy * dt));

    // Light drains with time, faster while moving. Empty light ends the run.
    const drain = (w.moving ? WISP.lightDrainMoving : WISP.lightDrain) * dt;
    w.light -= drain;
    if (w.burstCooldown > 0) w.burstCooldown -= dt;
    if (w.invulnerable > 0) w.invulnerable -= dt;
    if (s.shake > 0) s.shake = Math.max(0, s.shake - dt * 2.2);

    // Burst: spend light for a shockwave that flings shadows away.
    if (wantBurst && w.burstCooldown <= 0 && w.light > WISP.lightOnBurst + 1) {
      w.light -= WISP.lightOnBurst;
      w.burstCooldown = WISP.burstCooldown;
      s.bursts += 1;
      const repelled = burstAt(w.x, w.y);
      s.shadowsRepelled += repelled;
      if (repelled > 0) s.score += repelled * SCORE.burstRepel;
      world.lastBurst = { x: w.x, y: w.y, repelled };
      events |= EVENT_BURST;
    }

    // Orbs: spawn on a timer, drift in place, and feed the wisp on touch.
    world.orbTimer -= dt;
    if (world.orbTimer <= 0) {
      world.orbTimer = ORB.spawnEvery;
      spawnOrb();
    }
    if (s.comboTimer > 0) {
      s.comboTimer -= dt;
      if (s.comboTimer <= 0) s.combo = 0;
    }
    for (let i = s.orbs.length - 1; i >= 0; i -= 1) {
      const orb = s.orbs[i];
      const dx = orb.x - w.x;
      const dy = orb.y - w.y;
      if (Math.hypot(dx, dy) < WISP.radius + orb.radius + 6) {
        s.orbs.splice(i, 1);
        s.orbsCollected += 1;
        s.combo = s.comboTimer > 0 ? s.combo + 1 : 1;
        s.bestCombo = Math.max(s.bestCombo, s.combo);
        s.comboTimer = ORB.comboWindow;
        const mult = 1 + (s.combo - 1) * ORB.comboStep;
        const gained = Math.round(ORB.score * Math.min(mult, 1 + (ORB.comboMax - 1) * ORB.comboStep));
        s.score += gained;
        w.light = Math.min(WISP.lightMax, w.light + ORB.lightGain);
        world.lastCollect = { x: orb.x, y: orb.y, gained, combo: s.combo };
        events |= EVENT_COLLECT;
      }
    }

    // Shadows: spawn on a quickening timer, then hunt the wisp.
    const interval = Math.max(
      SHADOW.spawnEveryMin,
      SHADOW.spawnEvery * Math.pow(LEVEL.spawnFasterPerLevel, s.level - 1),
    );
    world.shadowTimer -= dt;
    if (world.shadowTimer <= 0) {
      world.shadowTimer = interval;
      spawnShadow();
    }
    for (let i = s.shadows.length - 1; i >= 0; i -= 1) {
      const sh = s.shadows[i];
      const dx = w.x - sh.x;
      const dy = w.y - sh.y;
      const dist = Math.hypot(dx, dy) || 0.001;
      // A wobble makes the hunt feel alive instead of robotic.
      const wob = Math.sin(world.time * 2.2 * sh.wobble + sh.phase) * 0.45;
      const nx = dx / dist;
      const ny = dy / dist;
      const px = nx - ny * wob;
      const py = ny + nx * wob;
      const plen = Math.hypot(px, py) || 1;
      if (sh.pushed > 0) {
        sh.pushed -= dt;
      } else {
        sh.vx += (px / plen) * sh.speed * 2.4 * dt;
        sh.vy += (py / plen) * sh.speed * 2.4 * dt;
        const sp = Math.hypot(sh.vx, sh.vy);
        if (sp > sh.speed) {
          sh.vx = (sh.vx / sp) * sh.speed;
          sh.vy = (sh.vy / sp) * sh.speed;
        }
      }
      sh.x += sh.vx * dt;
      sh.y += sh.vy * dt;
      // A shadow that drifts far off the field is gone for good.
      if (sh.x < -120 || sh.x > FIELD.width + 120 || sh.y < -120 || sh.y > FIELD.height + 120) {
        s.shadows.splice(i, 1);
        continue;
      }
      // Touch drains light, knocks the wisp back, and grants a brief grace.
      if (w.invulnerable <= 0 && Math.hypot(sh.x - w.x, sh.y - w.y) < sh.radius + WISP.radius - 2) {
        w.light -= WISP.lightOnHit * sh.drainMult;
        w.invulnerable = WISP.invulnerableAfterHit;
        s.hits += 1;
        s.shake = 1;
        const kx = (w.x - sh.x) / dist;
        const ky = (w.y - sh.y) / dist;
        w.vx += kx * 420;
        w.vy += ky * 420;
        s.combo = 0;
        s.comboTimer = 0;
        world.lastHit = { x: w.x, y: w.y };
        events |= EVENT_HIT;
      }
    }

    // Surviving scores, one point a second.
    s.score += SCORE.survivePerSecond * dt;

    if (w.light <= 0) {
      w.light = 0;
      s.over = true;
      events |= EVENT_OVER;
    }
    return events;
  };

  world.reset(seed);
  return world;
}
