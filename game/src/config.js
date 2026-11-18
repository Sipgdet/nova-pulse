// NOVA PULSE — tuning: every number the game balances on lives here, in one
// place, so a balance change is one edit and the dossier's outline reads clean.
export const STEP = 1 / 60;
export const FIELD = { width: 1280, height: 720 };
export const BEST_KEY = 'nova-pulse-best';

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 360,
  drag: 3.2,
  lives: 3,
  fireInterval: 0.125,
  bulletSpeed: 760,
  bulletRadius: 4,
  invulnerableSeconds: 2.0,
  pulseRadius: 280,
  pulseDamage: 3,
  pulseCooldown: 6,
};

export const BULLET = { playerDamage: 1, enemyRadius: 5, enemySpeed: 230 };

// Enemy kinds: each has its own shape, colour, movement and score, so a wave
// reads at a glance. hp is hits to kill; speed is px/s; score is base points.
export const ENEMY_KINDS = {
  drifter: { hp: 1, speed: 95, radius: 14, score: 50, color: '#ff5da2', shape: 'diamond' },
  weaver: { hp: 1, speed: 165, radius: 12, score: 75, color: '#ffb347', shape: 'hexagon' },
  splitter: { hp: 2, speed: 72, radius: 17, score: 100, color: '#7dff6a', shape: 'triangle' },
  mini: { hp: 1, speed: 195, radius: 8, score: 25, color: '#c8ff5d', shape: 'triangle' },
  tank: { hp: 4, speed: 46, radius: 25, score: 200, color: '#b678ff', shape: 'square' },
  boss: { hp: 70, speed: 42, radius: 54, score: 2000, color: '#ff3b30', shape: 'boss' },
};

export const WAVES = {
  baseCount: 6, // enemies in wave 1; +3 each wave after
  perWave: 3,
  spawnInterval: 0.9, // seconds between spawns at wave 1; shrinks per wave
  spawnIntervalMin: 0.28,
  spawnIntervalStep: 0.05,
  clearBonus: 500, // x wave number
  breatherSeconds: 2.5,
  bossEvery: 5,
};

export const COMBO = {
  windowSeconds: 2.5, // a kill inside this window extends the chain
  perTier: 5, // kills per multiplier tier
  maxMultiplier: 8,
};

export const POWERUPS = {
  dropChance: 0.12,
  lifeChance: 0.02, // of drops; the rest split evenly over spread/rapid/shield/pulse
  magnetRadius: 130,
  pickupRadius: 30,
  spreadSeconds: 12,
  rapidSeconds: 12,
};

export const COLORS = {
  backgroundTop: '#070a1c',
  backgroundBottom: '#04050e',
  player: '#4de8ff',
  playerCore: '#eafcff',
  bullet: '#aef4ff',
  enemyBullet: '#ff6ad5',
  text: '#e8f4ff',
  dimText: '#8fa8c8',
  titleA: '#4de8ff',
  titleB: '#ff5da2',
  gold: '#ffd75d',
};
