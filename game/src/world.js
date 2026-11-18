// NOVA PULSE — the rules and the state: one fixed-step advance of the whole
// game. The world owns the player, the enemies, the bullets, the particles, the
// waves, the combo and the score; the renderer only paints what is here, and the
// loop only feeds it input. A step returns event flags the loop turns into
// sounds and screen changes.
import { BULLET, COLORS, COMBO, ENEMY_KINDS, FIELD, PLAYER, POWERUPS, STEP, WAVES } from './config.js';

export const EVENT_NONE = 0;
export const EVENT_KILL = 1;
export const EVENT_HIT = 2;
export const EVENT_OVER = 4;
export const EVENT_WAVE_CLEAR = 8;
export const EVENT_BOSS = 16;
export const EVENT_POWERUP = 32;
export const EVENT_PULSE = 64;

const TAU = Math.PI * 2;
const POWERUP_KINDS = ['spread', 'rapid', 'shield', 'pulse'];
const POWERUP_COLORS = {
  spread: '#ffd75d',
  rapid: '#4de8ff',
  shield: '#7dff6a',
  pulse: '#ff5da2',
  life: '#ff8a5d',
};

function edgePoint(random, player) {
  for (let tries = 0; tries < 12; tries += 1) {
    const side = random.int(0, 3);
    const margin = 30;
    let x = 0;
    let y = 0;
    if (side === 0) {
      x = random.range(margin, FIELD.width - margin);
      y = margin;
    } else if (side === 1) {
      x = random.range(margin, FIELD.width - margin);
      y = FIELD.height - margin;
    } else if (side === 2) {
      x = margin;
      y = random.range(margin, FIELD.height - margin);
    } else {
      x = FIELD.width - margin;
      y = random.range(margin, FIELD.height - margin);
    }
    if (Math.hypot(x - player.x, y - player.y) > 240) return { x, y };
  }
  return { x: 40, y: 40 };
}

function buildWaveQueue(random, wave) {
  if (wave % WAVES.bossEvery === 0) return ['boss', 'drifter', 'drifter', 'drifter', 'drifter'];
  const count = WAVES.baseCount + WAVES.perWave * (wave - 1);
  const queue = [];
  for (let index = 0; index < count; index += 1) {
    const roll = random.next();
    if (wave >= 4 && roll < 0.12) queue.push('tank');
    else if (wave >= 3 && roll < 0.32) queue.push('splitter');
    else if (wave >= 2 && roll < 0.55) queue.push('weaver');
    else queue.push('drifter');
  }
  return queue;
}

export function createWorld(random) {
  const state = {
    time: 0,
    score: 0,
    kills: 0,
    wave: 1,
    lives: PLAYER.lives,
    player: { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, fireTimer: 0, invuln: 0, pulseTimer: 0, alive: true },
    spreadTimer: 0,
    rapidTimer: 0,
    shield: false,
    combo: 0,
    comboTimer: 0,
    multiplier: 1,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    particles: [],
    powerups: [],
    floats: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveState: 'fighting',
    breatherTimer: 0,
    boss: null,
    shake: 0,
    flash: 0,
    lastKillBig: false,
    waveBanner: 0,
    stars: [],
    nebulas: [],
    stats: { shotsFired: 0, shotsHit: 0, wavesCleared: 0 },
  };

  function makeStars() {
    const stars = [];
    for (let index = 0; index < 110; index += 1) {
      stars.push({
        x: random.range(0, FIELD.width),
        y: random.range(0, FIELD.height),
        layer: random.int(1, 3),
        size: random.range(0.6, 2.2),
        phase: random.range(0, TAU),
      });
    }
    return stars;
  }

  function makeNebulas() {
    return [
      { x: 240, y: 150, radius: 420, color: 'rgba(77, 120, 255, 0.14)' },
      { x: 1050, y: 560, radius: 460, color: 'rgba(255, 93, 162, 0.11)' },
      { x: 700, y: 90, radius: 300, color: 'rgba(125, 255, 106, 0.07)' },
    ];
  }

  function spawnEnemy(kind) {
    const def = ENEMY_KINDS[kind];
    const point = edgePoint(random, state.player);
    const enemy = {
      kind,
      x: point.x,
      y: point.y,
      vx: 0,
      vy: 0,
      hp: kind === 'boss' ? def.hp + 15 * (state.wave / WAVES.bossEvery - 1) : def.hp,
      maxHp: kind === 'boss' ? def.hp + 15 * (state.wave / WAVES.bossEvery - 1) : def.hp,
      radius: def.radius,
      speed: def.speed,
      score: def.score,
      color: def.color,
      angle: random.range(0, TAU),
      spin: random.range(-1.6, 1.6),
      wobble: random.range(0, TAU),
      burstTimer: 2.0,
      spawnTimer: 6.0,
      flash: 0,
    };
    state.enemies.push(enemy);
    if (kind === 'boss') state.boss = enemy;
    return enemy;
  }

  function burst(x, y, color, count, speed, kind = 'dot') {
    for (let index = 0; index < count; index += 1) {
      if (state.particles.length > 700) state.particles.shift();
      const angle = random.range(0, TAU);
      const power = random.range(0.25, 1) * speed;
      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power,
        life: random.range(0.35, 0.8),
        maxLife: 0.8,
        size: random.range(1.5, 3.5),
        color,
        kind,
      });
    }
  }

  function addFloat(x, y, text, color) {
    state.floats.push({ x, y, text, color, life: 1.0, maxLife: 1.0 });
  }

  function dropPowerup(x, y, forceKind = null) {
    const kind = forceKind ?? (random.next() < POWERUPS.lifeChance ? 'life' : random.pick(POWERUP_KINDS));
    state.powerups.push({
      x,
      y,
      vx: random.range(-30, 30),
      vy: random.range(-30, 30),
      kind,
      color: POWERUP_COLORS[kind],
      life: 12,
      phase: random.range(0, TAU),
    });
  }

  function killEnemy(enemy, index) {
    state.enemies.splice(index, 1);
    state.kills += 1;
    state.combo += 1;
    state.comboTimer = COMBO.windowSeconds;
    state.multiplier = Math.min(1 + Math.floor(state.combo / COMBO.perTier), COMBO.maxMultiplier);
    const gained = enemy.score * state.multiplier;
    state.score += gained;
    state.lastKillBig = enemy.kind === 'tank' || enemy.kind === 'boss';
    burst(enemy.x, enemy.y, enemy.color, enemy.kind === 'boss' ? 90 : enemy.kind === 'tank' ? 36 : 18, enemy.kind === 'boss' ? 420 : 300);
    burst(enemy.x, enemy.y, '#ffffff', 6, 200, 'spark');
    addFloat(enemy.x, enemy.y - enemy.radius, `+${gained}`, enemy.color);
    if (enemy.kind === 'splitter') {
      for (let i = 0; i < 2; i += 1) {
        const mini = spawnEnemy('mini');
        mini.x = enemy.x + random.range(-14, 14);
        mini.y = enemy.y + random.range(-14, 14);
      }
    }
    if (enemy.kind === 'boss') {
      state.boss = null;
      state.shake = 1;
      dropPowerup(enemy.x - 40, enemy.y, 'life');
      dropPowerup(enemy.x + 40, enemy.y, random.pick(POWERUP_KINDS));
      dropPowerup(enemy.x, enemy.y - 40, random.pick(POWERUP_KINDS));
    } else if (random.next() < POWERUPS.dropChance) {
      dropPowerup(enemy.x, enemy.y);
    }
  }

  function damagePlayer() {
    if (state.player.invuln > 0) return EVENT_NONE;
    if (state.shield) {
      state.shield = false;
      state.player.invuln = 1.2;
      burst(state.player.x, state.player.y, '#7dff6a', 24, 320);
      return EVENT_HIT;
    }
    state.lives -= 1;
    state.player.invuln = PLAYER.invulnerableSeconds;
    state.flash = 1;
    state.shake = 1;
    state.combo = 0;
    state.multiplier = 1;
    burst(state.player.x, state.player.y, COLORS.player, 40, 380);
    if (state.lives <= 0) {
      state.player.alive = false;
      burst(state.player.x, state.player.y, '#ffffff', 60, 460);
      return EVENT_HIT | EVENT_OVER;
    }
    return EVENT_HIT;
  }

  function firePulse() {
    const player = state.player;
    if (player.pulseTimer > 0) return EVENT_NONE;
    player.pulseTimer = PLAYER.pulseCooldown;
    state.particles.push({
      x: player.x,
      y: player.y,
      vx: 0,
      vy: 0,
      life: 0.6,
      maxLife: 0.6,
      size: PLAYER.pulseRadius,
      color: COLORS.player,
      kind: 'ring',
    });
    state.shake = Math.max(state.shake, 0.5);
    let events = EVENT_PULSE;
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
      if (distance > PLAYER.pulseRadius + enemy.radius) continue;
      const push = Math.max(1 - distance / PLAYER.pulseRadius, 0.2) * 520;
      const angle = Math.atan2(enemy.y - player.y, enemy.x - player.x);
      enemy.vx += Math.cos(angle) * push;
      enemy.vy += Math.sin(angle) * push;
      enemy.hp -= PLAYER.pulseDamage;
      enemy.flash = 0.12;
      if (enemy.hp <= 0) {
        killEnemy(enemy, index);
        events |= EVENT_KILL;
      }
    }
    return events;
  }

  function stepPlayer(dt, move, aim, firing, pulse) {
    const player = state.player;
    if (!player.alive) return EVENT_NONE;
    player.vx += move.x * PLAYER.accel * dt;
    player.vy += move.y * PLAYER.accel * dt;
    const damp = Math.max(0, 1 - PLAYER.drag * dt);
    player.vx *= damp;
    player.vy *= damp;
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > PLAYER.maxSpeed) {
      player.vx = (player.vx / speed) * PLAYER.maxSpeed;
      player.vy = (player.vy / speed) * PLAYER.maxSpeed;
    }
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + player.vx * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + player.vy * dt));
    player.angle = Math.atan2(aim.y - player.y, aim.x - player.x);
    player.fireTimer -= dt;
    player.invuln = Math.max(0, player.invuln - dt);
    player.pulseTimer = Math.max(0, player.pulseTimer - dt);
    let events = EVENT_NONE;
    if (pulse) events |= firePulse();
    if (firing && player.fireTimer <= 0) {
      const interval = PLAYER.fireInterval / (state.rapidTimer > 0 ? 1.8 : 1);
      player.fireTimer = interval;
      state.stats.shotsFired += 1;
      const angles = state.spreadTimer > 0 ? [-0.16, 0, 0.16] : [0];
      for (const offset of angles) {
        const angle = player.angle + offset;
        state.bullets.push({
          x: player.x + Math.cos(angle) * (PLAYER.radius + 6),
          y: player.y + Math.sin(angle) * (PLAYER.radius + 6),
          vx: Math.cos(angle) * PLAYER.bulletSpeed,
          vy: Math.sin(angle) * PLAYER.bulletSpeed,
          radius: PLAYER.bulletRadius,
        });
      }
      state.particles.push({
        x: player.x + Math.cos(player.angle) * (PLAYER.radius + 8),
        y: player.y + Math.sin(player.angle) * (PLAYER.radius + 8),
        vx: 0,
        vy: 0,
        life: 0.12,
        maxLife: 0.12,
        size: 10,
        color: COLORS.bullet,
        kind: 'dot',
      });
    }
    // Engine trail.
    if (speed > 60 && random.chance(0.6)) {
      state.particles.push({
        x: player.x - Math.cos(player.angle) * PLAYER.radius,
        y: player.y - Math.sin(player.angle) * PLAYER.radius,
        vx: -player.vx * 0.2 + random.range(-20, 20),
        vy: -player.vy * 0.2 + random.range(-20, 20),
        life: random.range(0.2, 0.4),
        maxLife: 0.4,
        size: random.range(1.5, 3),
        color: COLORS.player,
        kind: 'dot',
      });
    }
    return events;
  }

  function stepEnemies(dt) {
    const player = state.player;
    for (const enemy of state.enemies) {
      enemy.flash = Math.max(0, enemy.flash - dt);
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / distance;
      const ny = dy / distance;
      if (enemy.kind === 'weaver') {
        const wobble = Math.sin(state.time * 4 + enemy.wobble) * 0.8;
        enemy.vx = (nx - ny * wobble) * enemy.speed;
        enemy.vy = (ny + nx * wobble) * enemy.speed;
      } else if (enemy.kind === 'boss') {
        // Holds a firing range, circles slowly, bursts radially, calls drifters.
        const want = distance > 300 ? 1 : distance < 220 ? -0.6 : 0;
        enemy.vx = nx * enemy.speed * want + -ny * 26;
        enemy.vy = ny * enemy.speed * want + nx * 26;
        enemy.burstTimer -= dt;
        if (enemy.burstTimer <= 0) {
          enemy.burstTimer = enemy.hp < enemy.maxHp * 0.3 ? 1.6 : 2.4;
          const base = random.range(0, TAU);
          for (let i = 0; i < 12; i += 1) {
            const angle = base + (i / 12) * TAU;
            state.enemyBullets.push({
              x: enemy.x + Math.cos(angle) * (enemy.radius + 6),
              y: enemy.y + Math.sin(angle) * (enemy.radius + 6),
              vx: Math.cos(angle) * BULLET.enemySpeed,
              vy: Math.sin(angle) * BULLET.enemySpeed,
              radius: BULLET.enemyRadius,
            });
          }
        }
        enemy.spawnTimer -= dt;
        if (enemy.spawnTimer <= 0) {
          enemy.spawnTimer = 6;
          spawnEnemy('drifter');
          spawnEnemy('drifter');
        }
      } else {
        enemy.vx = nx * enemy.speed;
        enemy.vy = ny * enemy.speed;
      }
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.angle += enemy.spin * dt;
    }
    // Gentle separation so enemies do not stack into one blob.
    for (let a = 0; a < state.enemies.length; a += 1) {
      for (let b = a + 1; b < state.enemies.length; b += 1) {
        const ea = state.enemies[a];
        const eb = state.enemies[b];
        const dx = eb.x - ea.x;
        const dy = eb.y - ea.y;
        const min = ea.radius + eb.radius;
        const dist = Math.hypot(dx, dy);
        if (dist > 0.01 && dist < min) {
          const push = (min - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          ea.x -= nx * push;
          ea.y -= ny * push;
          eb.x += nx * push;
          eb.y += ny * push;
        }
      }
    }
  }

  function stepBullets(dt) {
    let events = EVENT_NONE;
    for (let index = state.bullets.length - 1; index >= 0; index -= 1) {
      const bullet = state.bullets[index];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.bullets.splice(index, 1);
        continue;
      }
      for (let e = state.enemies.length - 1; e >= 0; e -= 1) {
        const enemy = state.enemies[e];
        const radius = enemy.radius + bullet.radius;
        if (Math.abs(enemy.x - bullet.x) > radius || Math.abs(enemy.y - bullet.y) > radius) continue;
        if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) > radius) continue;
        state.bullets.splice(index, 1);
        state.stats.shotsHit += 1;
        enemy.hp -= BULLET.playerDamage;
        enemy.flash = 0.1;
        burst(bullet.x, bullet.y, enemy.color, 3, 140);
        if (enemy.hp <= 0) {
          killEnemy(enemy, e);
          events |= EVENT_KILL;
        }
        break;
      }
    }
    for (let index = state.enemyBullets.length - 1; index >= 0; index -= 1) {
      const bullet = state.enemyBullets[index];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      if (bullet.x < -20 || bullet.x > FIELD.width + 20 || bullet.y < -20 || bullet.y > FIELD.height + 20) {
        state.enemyBullets.splice(index, 1);
        continue;
      }
      const player = state.player;
      if (!player.alive) continue;
      const radius = PLAYER.radius + bullet.radius - 2;
      if (Math.hypot(player.x - bullet.x, player.y - bullet.y) <= radius) {
        state.enemyBullets.splice(index, 1);
        events |= damagePlayer();
      }
    }
    return events;
  }

  function stepCollisions() {
    let events = EVENT_NONE;
    const player = state.player;
    if (!player.alive) return events;
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      const radius = enemy.radius + PLAYER.radius - 2;
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) > radius) continue;
      if (enemy.kind === 'boss') {
        events |= damagePlayer();
        continue;
      }
      state.enemies.splice(index, 1);
      burst(enemy.x, enemy.y, enemy.color, 14, 260);
      events |= damagePlayer();
      if (events & EVENT_OVER) break;
    }
    for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
      const power = state.powerups[index];
      if (Math.hypot(power.x - player.x, power.y - player.y) > POWERUPS.pickupRadius + PLAYER.radius) continue;
      state.powerups.splice(index, 1);
      if (power.kind === 'spread') state.spreadTimer = POWERUPS.spreadSeconds;
      else if (power.kind === 'rapid') state.rapidTimer = POWERUPS.rapidSeconds;
      else if (power.kind === 'shield') state.shield = true;
      else if (power.kind === 'pulse') player.pulseTimer = 0;
      else if (power.kind === 'life') state.lives = Math.min(5, state.lives + 1);
      addFloat(player.x, player.y - 26, power.kind.toUpperCase(), power.color);
      events |= EVENT_POWERUP;
    }
    return events;
  }

  function stepParticles(dt) {
    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const particle = state.particles[index];
      particle.life -= dt;
      if (particle.life <= 0) {
        state.particles.splice(index, 1);
        continue;
      }
      if (particle.kind === 'ring') continue;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= Math.max(0, 1 - 2.4 * dt);
      particle.vy *= Math.max(0, 1 - 2.4 * dt);
    }
    for (let index = state.floats.length - 1; index >= 0; index -= 1) {
      const float = state.floats[index];
      float.life -= dt * 0.9;
      float.y -= 42 * dt;
      if (float.life <= 0) state.floats.splice(index, 1);
    }
    for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
      const power = state.powerups[index];
      power.life -= dt;
      if (power.life <= 0) {
        state.powerups.splice(index, 1);
        continue;
      }
      const player = state.player;
      const distance = Math.hypot(player.x - power.x, player.y - power.y);
      if (player.alive && distance < POWERUPS.magnetRadius) {
        const pull = 420 * (1 - distance / POWERUPS.magnetRadius);
        power.vx += ((player.x - power.x) / Math.max(distance, 1)) * pull * dt;
        power.vy += ((player.y - power.y) / Math.max(distance, 1)) * pull * dt;
      }
      power.x += power.vx * dt;
      power.y += power.vy * dt;
      power.vx *= Math.max(0, 1 - 1.5 * dt);
      power.vy *= Math.max(0, 1 - 1.5 * dt);
    }
  }

  function stepWaves(dt) {
    let events = EVENT_NONE;
    if (state.waveState === 'breather') {
      state.breatherTimer -= dt;
      if (state.breatherTimer <= 0) {
        state.waveState = 'fighting';
        state.wave += 1;
        state.spawnQueue = buildWaveQueue(random, state.wave);
        state.spawnTimer = 0.4;
        state.waveBanner = 2.2;
        if (state.wave % WAVES.bossEvery === 0) events |= EVENT_BOSS;
      }
      return events;
    }
    if (state.spawnQueue.length > 0) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        const interval = Math.max(WAVES.spawnIntervalMin, WAVES.spawnInterval - WAVES.spawnIntervalStep * (state.wave - 1));
        state.spawnTimer = interval;
        spawnEnemy(state.spawnQueue.shift());
      }
      return events;
    }
    if (state.enemies.length === 0) {
      const bonus = WAVES.clearBonus * state.wave;
      state.score += bonus;
      state.stats.wavesCleared += 1;
      addFloat(FIELD.width / 2, FIELD.height / 2 - 60, `WAVE ${state.wave} CLEAR  +${bonus}`, COLORS.gold);
      state.waveState = 'breather';
      state.breatherTimer = WAVES.breatherSeconds;
      state.waveBanner = 2.2;
      events |= EVENT_WAVE_CLEAR;
    }
    return events;
  }

  function stepAttract(dt) {
    // Title-screen backdrop: enemies drift across the field on their own, no
    // player, no collisions — a living scene behind the title.
    state.time += dt;
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.enemies.length < 12) {
      state.spawnTimer = 0.8;
      const kind = random.pick(['drifter', 'weaver', 'splitter']);
      const enemy = spawnEnemy(kind);
      enemy.vx = random.range(-60, 60);
      enemy.vy = random.range(20, 70);
    }
    for (let index = state.enemies.length - 1; index >= 0; index -= 1) {
      const enemy = state.enemies[index];
      enemy.x += enemy.vx * dt;
      enemy.y += enemy.vy * dt;
      enemy.angle += enemy.spin * dt;
      if (enemy.y > FIELD.height + 60 || enemy.x < -60 || enemy.x > FIELD.width + 60) {
        state.enemies.splice(index, 1);
      }
    }
    stepParticles(dt);
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.kills = 0;
    state.wave = 1;
    state.lives = PLAYER.lives;
    state.player = { x: FIELD.width / 2, y: FIELD.height / 2, vx: 0, vy: 0, angle: -Math.PI / 2, fireTimer: 0, invuln: 0, pulseTimer: 0, alive: true };
    state.spreadTimer = 0;
    state.rapidTimer = 0;
    state.shield = false;
    state.combo = 0;
    state.comboTimer = 0;
    state.multiplier = 1;
    state.enemies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.particles = [];
    state.powerups = [];
    state.floats = [];
    state.spawnQueue = buildWaveQueue(random, 1);
    state.spawnTimer = 0.8;
    state.waveState = 'fighting';
    state.breatherTimer = 0;
    state.boss = null;
    state.shake = 0;
    state.flash = 0;
    state.lastKillBig = false;
    state.waveBanner = 2.2;
    state.stars = makeStars();
    state.nebulas = makeNebulas();
    state.stats = { shotsFired: 0, shotsHit: 0, wavesCleared: 0 };
  }

  reset();

  return {
    state,
    reset,
    /**
     * Advance one fixed step. `controls` is { move, aim, firing, pulse };
     * `opts` is { godMode, attract }. Returns event flags.
     */
    step(dt, controls, opts = {}) {
      const stepSeconds = dt || STEP;
      if (opts.attract) {
        stepAttract(stepSeconds);
        return EVENT_NONE;
      }
      state.time += stepSeconds;
      state.waveBanner = Math.max(0, state.waveBanner - stepSeconds);
      state.shake = Math.max(0, state.shake - stepSeconds * 1.6);
      state.flash = Math.max(0, state.flash - stepSeconds * 2.2);
      state.spreadTimer = Math.max(0, state.spreadTimer - stepSeconds);
      state.rapidTimer = Math.max(0, state.rapidTimer - stepSeconds);
      if (state.comboTimer > 0) {
        state.comboTimer -= stepSeconds;
        if (state.comboTimer <= 0) {
          state.combo = 0;
          state.multiplier = 1;
        }
      }
      let events = EVENT_NONE;
      events |= stepPlayer(stepSeconds, controls.move, controls.aim, controls.firing, controls.pulse);
      stepEnemies(stepSeconds);
      events |= stepBullets(stepSeconds);
      if (!(opts.godMode) && state.player.alive) events |= stepCollisions();
      stepParticles(stepSeconds);
      if (state.player.alive) events |= stepWaves(stepSeconds);
      return events;
    },
  };
}
