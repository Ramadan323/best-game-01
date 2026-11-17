// LUMEN — tuning constants and palette. One place for every number the game
// balances on, so tuning never means hunting through the rules.
export const FIELD = { width: 1280, height: 720 };

// The wisp: a mote of light. Light is health and fuel at once — it drains as
// time passes, and faster while the wisp moves. Collect orbs to feed it.
export const WISP = {
  radius: 14,
  accel: 2600,
  maxSpeed: 340,
  friction: 0.86,
  lightMax: 100,
  lightDrain: 1.6, // per second, standing still
  lightDrainMoving: 2.6, // per second, at full speed
  lightOnHit: 14, // drained when a shadow touches the wisp
  lightOnBurst: 12, // spent by one burst
  burstRadius: 150,
  burstPush: 620,
  burstCooldown: 0.9,
  invulnerableAfterHit: 1.0,
};

// Orbs: the food. Each one restores light and scores, and quick chains build
// a combo multiplier that makes the next orb worth more.
export const ORB = {
  radius: 9,
  lightGain: 9,
  score: 10,
  maxOnField: 7,
  spawnEvery: 1.4, // seconds between spawns while below the cap
  comboWindow: 3.0, // seconds to keep a chain alive
  comboStep: 0.5, // multiplier gained per chained orb
  comboMax: 5,
};

// Shadows: the dark that hunts the light. Three kinds, each with its own job.
export const SHADOW = {
  spawnEvery: 2.2, // seconds at level 1, shrinking as the level rises
  spawnEveryMin: 0.7,
  // chaser: the common hunter, drifts toward the wisp.
  chaser: { radius: 16, speed: 95, score: 5, weight: 10 },
  // hunter: fast, small, appears from level 2. Worth more when burst away.
  hunter: { radius: 11, speed: 175, score: 10, weight: 4, minLevel: 2 },
  // brute: big, slow, drains double on touch. Appears from level 3.
  brute: { radius: 26, speed: 55, score: 20, weight: 2, minLevel: 3, drainMult: 2 },
  // splitter: bursts into two chasers when pushed away. Appears from level 4.
  splitter: { radius: 15, speed: 80, score: 15, weight: 3, minLevel: 4 },
};

// Difficulty: the level rises with time survived, and the world answers.
export const LEVEL = {
  secondsPerLevel: 25,
  spawnFasterPerLevel: 0.88, // spawn interval multiplier per level
  speedFasterPerLevel: 1.06, // shadow speed multiplier per level
  maxLevel: 12,
};

// Scoring and the clock.
export const SCORE = {
  survivePerSecond: 1,
  burstRepel: 5, // per shadow pushed away by a burst
};

// Palette: one coherent night. Deep indigo, warm amber light, cold cyan
// accents, and the shadows' bruised magenta.
export const PALETTE = {
  bgTop: '#0d1126',
  bgBottom: '#070a18',
  star: '#cdd6ff',
  nebulaA: '#1b2450',
  nebulaB: '#3a1c4d',
  wispCore: '#fff6d8',
  wispGlow: '#f0b429',
  wispTrail: '#ffd97a',
  orbCore: '#ffe9a8',
  orbGlow: '#ffb52e',
  orbRing: '#ffdf8a',
  shadowBody: '#12081f',
  shadowEdge: '#5b2a6e',
  shadowEye: '#ff4d6d',
  hudText: '#e8ecff',
  hudDim: '#8b93b8',
  accent: '#4dd0e1',
  danger: '#ff4d6d',
  panel: 'rgba(10, 14, 32, 0.82)',
  panelEdge: 'rgba(140, 160, 255, 0.25)',
};

export const STEP = 1 / 60;
