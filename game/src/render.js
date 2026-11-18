// NOVA PULSE — everything the eye sees: the starfield, the neon entities, the
// particles, the HUD and the four screens. The renderer never changes the
// world; it paints the state it is given.
import { COLORS, FIELD, PLAYER, WAVES } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TAU = Math.PI * 2;
const HEADING_FONT = "900 64px 'Arial Black', 'Segoe UI', system-ui, sans-serif";
const SUB_FONT = "700 22px 'Segoe UI', system-ui, sans-serif";
const HUD_FONT = "700 30px 'Consolas', 'SF Mono', monospace";
const SMALL_FONT = "600 16px 'Segoe UI', system-ui, sans-serif";
const FLOAT_FONT = "700 18px 'Consolas', monospace";

function hexToRgba(hex, alpha) {
  const r = Number.parseInt(hex.slice(1, 3), 16);
  const g = Number.parseInt(hex.slice(3, 5), 16);
  const b = Number.parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function shapePath(ctx, shape, radius) {
  ctx.beginPath();
  if (shape === 'diamond') {
    ctx.moveTo(0, -radius);
    ctx.lineTo(radius * 0.8, 0);
    ctx.lineTo(0, radius);
    ctx.lineTo(-radius * 0.8, 0);
  } else if (shape === 'hexagon') {
    for (let i = 0; i < 6; i += 1) {
      const angle = (i / 6) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  } else if (shape === 'triangle') {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * TAU - Math.PI / 2;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
  } else if (shape === 'square') {
    ctx.rect(-radius * 0.85, -radius * 0.85, radius * 1.7, radius * 1.7);
  }
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');
  const glowCache = new Map();
  let background = null;
  let muted = false;

  function glowSprite(color) {
    let sprite = glowCache.get(color);
    if (sprite) return sprite;
    sprite = document.createElement('canvas');
    sprite.width = 96;
    sprite.height = 96;
    const g = sprite.getContext('2d');
    const gradient = g.createRadialGradient(48, 48, 0, 48, 48, 48);
    gradient.addColorStop(0, hexToRgba(color, 0.85));
    gradient.addColorStop(0.35, hexToRgba(color, 0.28));
    gradient.addColorStop(1, hexToRgba(color, 0));
    g.fillStyle = gradient;
    g.fillRect(0, 0, 96, 96);
    glowCache.set(color, sprite);
    return sprite;
  }

  function paintBackground(state) {
    if (!background) {
      background = document.createElement('canvas');
      background.width = FIELD.width;
      background.height = FIELD.height;
      const g = background.getContext('2d');
      const gradient = g.createLinearGradient(0, 0, 0, FIELD.height);
      gradient.addColorStop(0, COLORS.backgroundTop);
      gradient.addColorStop(1, COLORS.backgroundBottom);
      g.fillStyle = gradient;
      g.fillRect(0, 0, FIELD.width, FIELD.height);
      for (const nebula of state.nebulas) {
        const radial = g.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.radius);
        radial.addColorStop(0, nebula.color);
        radial.addColorStop(1, 'rgba(0, 0, 0, 0)');
        g.fillStyle = radial;
        g.fillRect(nebula.x - nebula.radius, nebula.y - nebula.radius, nebula.radius * 2, nebula.radius * 2);
      }
    }
    ctx.drawImage(background, 0, 0);
    const px = state.player.x;
    const py = state.player.y;
    for (const star of state.stars) {
      const depth = star.layer * 0.012;
      const x = ((star.x - px * depth) % FIELD.width + FIELD.width) % FIELD.width;
      const y = ((star.y - py * depth) % FIELD.height + FIELD.height) % FIELD.height;
      const twinkle = 0.55 + 0.45 * Math.sin(state.time * 2 + star.phase);
      ctx.globalAlpha = twinkle * (0.35 + star.layer * 0.2);
      ctx.fillStyle = '#cfe4ff';
      ctx.fillRect(x, y, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawGlow(x, y, color, radius) {
    const sprite = glowSprite(color);
    ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
  }

  function drawPlayer(state) {
    const player = state.player;
    if (!player.alive) return;
    if (player.invuln > 0 && Math.floor(state.time * 14) % 2 === 0) return; // blink while invulnerable
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    drawGlow(0, 0, COLORS.player, 46);
    ctx.beginPath();
    ctx.moveTo(20, 0);
    ctx.lineTo(-12, -11);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 11);
    ctx.closePath();
    ctx.fillStyle = COLORS.player;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.playerCore;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fillStyle = COLORS.playerCore;
    ctx.fill();
    ctx.restore();
    if (state.shield) {
      ctx.save();
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(state.time * 6);
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER.radius + 10, 0, TAU);
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7dff6a';
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawEnemy(enemy, state) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    drawGlow(0, 0, enemy.color, enemy.radius * 2.6);
    ctx.rotate(enemy.angle);
    if (enemy.kind === 'boss') {
      // A ringed core: outer ring, rotating segments, bright heart.
      ctx.lineWidth = 5;
      ctx.strokeStyle = enemy.color;
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, TAU);
      ctx.stroke();
      for (let i = 0; i < 6; i += 1) {
        const angle = (i / 6) * TAU + state.time * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, enemy.radius - 12, angle, angle + 0.7);
        ctx.lineWidth = 8;
        ctx.strokeStyle = hexToRgba(enemy.color, 0.8);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.26, 0, TAU);
      ctx.fillStyle = '#ffb199';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.15, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      const def = enemy.kind === 'mini' ? 'triangle' : enemy.kind === 'drifter' ? 'diamond' : enemy.kind === 'weaver' ? 'hexagon' : enemy.kind === 'splitter' ? 'triangle' : 'square';
      shapePath(ctx, def, enemy.radius);
      ctx.fillStyle = hexToRgba(enemy.color, 0.22);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = enemy.color;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius * 0.32, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
    if (enemy.flash > 0) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, enemy.flash * 8);
      ctx.translate(enemy.x, enemy.y);
      ctx.beginPath();
      ctx.arc(0, 0, enemy.radius, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }
  }

  function drawBullets(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const bullet of state.bullets) {
      drawGlow(bullet.x, bullet.y, COLORS.bullet, 18);
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius + 0.5, 0, TAU);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    for (const bullet of state.enemyBullets) {
      drawGlow(bullet.x, bullet.y, COLORS.enemyBullet, 19);
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.radius, 0, TAU);
      ctx.fillStyle = '#ffd7f2';
      ctx.fill();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const particle of state.particles) {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      if (particle.kind === 'ring') {
        const progress = 1 - alpha;
        ctx.globalAlpha = alpha * 0.9;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (0.2 + progress), 0, TAU);
        ctx.lineWidth = 4 * alpha + 1;
        ctx.strokeStyle = particle.color;
        ctx.stroke();
        continue;
      }
      ctx.globalAlpha = alpha;
      if (particle.kind === 'spark') {
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(particle.x, particle.y);
        ctx.lineTo(particle.x - particle.vx * 0.05, particle.y - particle.vy * 0.05);
        ctx.stroke();
      } else {
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * alpha + 0.5, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawPowerups(state) {
    const labels = { spread: 'S', rapid: 'R', shield: 'H', pulse: 'P', life: '+' };
    for (const power of state.powerups) {
      const bob = Math.sin(state.time * 3 + power.phase) * 3;
      const blink = power.life < 3 ? (Math.floor(state.time * 6) % 2 === 0 ? 0.35 : 1) : 1;
      ctx.save();
      ctx.globalAlpha = blink;
      drawGlow(power.x, power.y + bob, power.color, 30);
      ctx.beginPath();
      ctx.arc(power.x, power.y + bob, 13, 0, TAU);
      ctx.fillStyle = 'rgba(4, 6, 16, 0.85)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = power.color;
      ctx.stroke();
      ctx.fillStyle = power.color;
      ctx.font = "900 16px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[power.kind], power.x, power.y + bob + 1);
      ctx.restore();
    }
  }

  function drawFloats(state) {
    ctx.save();
    ctx.font = FLOAT_FONT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const float of state.floats) {
      ctx.globalAlpha = Math.max(0, float.life / float.maxLife);
      ctx.fillStyle = float.color;
      ctx.fillText(float.text, float.x, float.y);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawHud(state, best) {
    ctx.save();
    ctx.textBaseline = 'alphabetic';
    // Score, top left.
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.text;
    ctx.font = HUD_FONT;
    ctx.fillText(String(state.score).padStart(6, '0'), 24, 44);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(`BEST ${Math.max(best, state.score)}`, 24, 68);
    // Combo bar under the score.
    if (state.combo > 1) {
      const width = 150 * (state.comboTimer / 2.5);
      ctx.fillStyle = 'rgba(255, 215, 93, 0.25)';
      ctx.fillRect(24, 78, 150, 8);
      ctx.fillStyle = COLORS.gold;
      ctx.fillRect(24, 78, Math.max(0, width), 8);
      ctx.font = SMALL_FONT;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(`COMBO x${state.multiplier}  ·  ${state.combo} CHAIN`, 24, 108);
    }
    // Wave, top centre.
    ctx.textAlign = 'center';
    ctx.font = SUB_FONT;
    ctx.fillStyle = COLORS.text;
    const remaining = state.spawnQueue.length + state.enemies.length;
    ctx.fillText(state.boss ? 'BOSS' : `WAVE ${state.wave}`, FIELD.width / 2, 38);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(state.boss ? 'BREAK THE RING' : `${remaining} HOSTILES LEFT`, FIELD.width / 2, 62);
    // Boss bar.
    if (state.boss) {
      const width = 420;
      const ratio = Math.max(0, state.boss.hp / state.boss.maxHp);
      ctx.fillStyle = 'rgba(255, 59, 48, 0.25)';
      ctx.fillRect(FIELD.width / 2 - width / 2, 72, width, 10);
      ctx.fillStyle = '#ff3b30';
      ctx.fillRect(FIELD.width / 2 - width / 2, 72, width * ratio, 10);
    }
    // Lives + pulse, top right.
    ctx.textAlign = 'right';
    ctx.font = SUB_FONT;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('♥'.repeat(Math.max(0, state.lives)) + '♡'.repeat(Math.max(0, 5 - state.lives)), FIELD.width - 24, 38);
    const pulseReady = state.player.pulseTimer <= 0;
    ctx.font = SMALL_FONT;
    ctx.fillStyle = pulseReady ? COLORS.player : COLORS.dimText;
    ctx.fillText(
      pulseReady ? 'PULSE READY  [SHIFT / RIGHT-CLICK]' : `PULSE ${Math.ceil(state.player.pulseTimer)}s`,
      FIELD.width - 24,
      62,
    );
    // Active power-ups, bottom left.
    ctx.textAlign = 'left';
    let line = 0;
    const active = [];
    if (state.spreadTimer > 0) active.push(`SPREAD ${Math.ceil(state.spreadTimer)}s`);
    if (state.rapidTimer > 0) active.push(`RAPID ${Math.ceil(state.rapidTimer)}s`);
    if (state.shield) active.push('SHIELD');
    ctx.font = SMALL_FONT;
    for (const label of active) {
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(`◆ ${label}`, 24, FIELD.height - 24 - line * 22);
      line += 1;
    }
    // Mute + wave banner.
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(muted ? 'MUTED [M]' : 'SOUND ON [M]', FIELD.width - 24, FIELD.height - 24);
    if (state.waveBanner > 0 && state.waveState === 'fighting') {
      ctx.textAlign = 'center';
      ctx.globalAlpha = Math.min(1, state.waveBanner);
      ctx.font = HEADING_FONT;
      ctx.font = "900 44px 'Arial Black', 'Segoe UI', system-ui, sans-serif";
      ctx.fillStyle = state.wave % WAVES.bossEvery === 0 ? '#ff3b30' : COLORS.text;
      ctx.fillText(state.wave % WAVES.bossEvery === 0 ? '⚠ BOSS WAVE ⚠' : `WAVE ${state.wave}`, FIELD.width / 2, FIELD.height / 2 - 40);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function dimOverlay(alpha) {
    ctx.fillStyle = `rgba(3, 4, 12, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawTitle(state, best) {
    dimOverlay(0.55);
    ctx.save();
    ctx.textAlign = 'center';
    const cx = FIELD.width / 2;
    // Logo.
    ctx.font = HEADING_FONT;
    ctx.shadowColor = COLORS.titleA;
    ctx.shadowBlur = 34;
    ctx.fillStyle = COLORS.titleA;
    ctx.fillText('NOVA', cx - 108, 218);
    ctx.shadowColor = COLORS.titleB;
    ctx.fillStyle = COLORS.titleB;
    ctx.fillText('PULSE', cx + 118, 218);
    ctx.shadowBlur = 0;
    ctx.font = SUB_FONT;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('A NEON ARENA SURVIVAL SHOOTER', cx, 262);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText('One ship. Endless swarm. Chain kills, ride the combo, break the boss ring.', cx, 296);
    // Best score.
    if (best > 0) {
      ctx.font = SUB_FONT;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText(`BEST  ${best}`, cx, 348);
    }
    // Controls.
    ctx.font = SMALL_FONT;
    ctx.fillStyle = COLORS.text;
    ctx.fillText('WASD / ARROWS — FLY      MOUSE — AIM      HOLD CLICK / SPACE — FIRE', cx, 420);
    ctx.fillText('SHIFT / RIGHT-CLICK — PULSE SHOCKWAVE      P — PAUSE      M — MUTE', cx, 448);
    ctx.fillText('Grab power-ups:  S spread · R rapid · H shield · P pulse · + extra life', cx, 476);
    // Start prompt, pulsing.
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3.2);
    ctx.font = SUB_FONT;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('— CLICK OR PRESS SPACE TO START —', cx, 552);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawPaused() {
    dimOverlay(0.6);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = HEADING_FONT;
    ctx.font = "900 52px 'Arial Black', 'Segoe UI', system-ui, sans-serif";
    ctx.fillStyle = COLORS.text;
    ctx.fillText('PAUSED', FIELD.width / 2, 330);
    ctx.font = SUB_FONT;
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText('PRESS P OR CLICK TO RESUME', FIELD.width / 2, 384);
    ctx.restore();
  }

  function drawGameOver(state, best) {
    dimOverlay(0.62);
    ctx.save();
    ctx.textAlign = 'center';
    const cx = FIELD.width / 2;
    ctx.font = HEADING_FONT;
    ctx.font = "900 56px 'Arial Black', 'Segoe UI', system-ui, sans-serif";
    ctx.shadowColor = '#ff3b30';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#ff5d54';
    ctx.fillText('GAME OVER', cx, 240);
    ctx.shadowBlur = 0;
    const isBest = state.score >= best && state.score > 0;
    if (isBest) {
      ctx.font = SUB_FONT;
      ctx.fillStyle = COLORS.gold;
      ctx.fillText('★ NEW BEST SCORE ★', cx, 292);
    }
    ctx.font = "700 40px 'Consolas', 'SF Mono', monospace";
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(state.score).padStart(6, '0'), cx, 356);
    ctx.font = SMALL_FONT;
    ctx.fillStyle = COLORS.dimText;
    ctx.fillText(`BEST ${best}`, cx, 388);
    const accuracy = state.stats.shotsFired > 0 ? Math.round((state.stats.shotsHit / state.stats.shotsFired) * 100) : 0;
    ctx.fillStyle = COLORS.text;
    ctx.fillText(
      `WAVES ${state.stats.wavesCleared}   ·   KILLS ${state.kills}   ·   ACCURACY ${accuracy}%   ·   TIME ${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`,
      cx,
      440,
    );
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3.2);
    ctx.font = SUB_FONT;
    ctx.fillStyle = '#ffffff';
    ctx.fillText('— PRESS R OR CLICK TO PLAY AGAIN —', cx, 516);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  return {
    set muted(value) {
      muted = value;
    },
    draw(state, screen, best) {
      ctx.save();
      if (state.shake > 0.01) {
        const magnitude = state.shake * state.shake * 13;
        ctx.translate((Math.random() * 2 - 1) * magnitude, (Math.random() * 2 - 1) * magnitude);
      }
      paintBackground(state);
      drawPowerups(state);
      drawBullets(state);
      for (const enemy of state.enemies) drawEnemy(enemy, state);
      if (screen !== SCREEN_TITLE) drawPlayer(state);
      drawParticles(state);
      drawFloats(state);
      ctx.restore();
      if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawHud(state, best);
      if (screen === SCREEN_TITLE) drawTitle(state, best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawGameOver(state, best);
      if (state.flash > 0) {
        ctx.fillStyle = `rgba(255, 40, 40, ${state.flash * 0.28})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
    },
  };
}
