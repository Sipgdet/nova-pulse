// The screenshot scenes behind ?shot=start|play|boss|end. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (aim at the nearest enemy, keep a fighting distance, fire
// always, pulse when crowded), so the frame is what a short game really looks
// like and the same seed always gives the same frame. Staging runs with the
// player invulnerable, except the end scene, whose pilot is reckless and dies
// the way a hurried player does.
import { FIELD, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const BOSS_LIMIT_SECONDS = 150;
const BOSS_FIGHT_SECONDS = 30;
const END_LIMIT_SECONDS = 600;
const SAMPLE = 1 / 30;

/** The autopilot's orders for one step: move, aim, fire, pulse. */
function autopilot(state, reckless, casual = false) {
  const player = state.player;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const enemy of state.enemies) {
    const distance = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = enemy;
    }
  }
  if (!nearest) {
    return { move: { x: 0, y: 0 }, aim: { x: player.x, y: player.y - 100 }, firing: false, pulse: false };
  }
  const aim = { x: nearest.x, y: nearest.y };
  if (reckless) {
    // Chases the nearest enemy and rams it: a hurried player, caught out fast.
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return { move: { x: dx / length, y: dy / length }, aim, firing: true, pulse: false };
  }
  if (casual) {
    // A middling player: fires in bursts and aims a little wide, so the swarm
    // stays thick around the ship — the frame a real mid-game looks like.
    const wobble = Math.sin(state.time * 2.1) * 70;
    const dx = nearest.x - player.x;
    const dy = nearest.y - player.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const casualAim = { x: nearest.x + (-dy / length) * wobble, y: nearest.y + (dx / length) * wobble };
    const firing = (state.time % 1.4) < 0.8;
    const awayX = (player.x - nearest.x) / Math.max(nearestDistance, 1);
    const awayY = (player.y - nearest.y) / Math.max(nearestDistance, 1);
    let mx = 0;
    let my = 0;
    if (nearestDistance < 190) {
      mx = awayX;
      my = awayY;
    } else if (nearestDistance > 330) {
      mx = -awayX;
      my = -awayY;
    }
    const strafe = Math.sin(state.time * 1.7) * 0.7;
    mx += -awayY * strafe;
    my += awayX * strafe;
    const moveLength = Math.hypot(mx, my);
    const move = moveLength > 0.01 ? { x: mx / moveLength, y: my / moveLength } : { x: 0, y: 0 };
    return { move, aim: casualAim, firing, pulse: false };
  }
  // Keeps a fighting distance: back off when crowded, close in when clear,
  // and strafes so the ship is always moving.
  const awayX = (player.x - nearest.x) / Math.max(nearestDistance, 1);
  const awayY = (player.y - nearest.y) / Math.max(nearestDistance, 1);
  const strafe = Math.sin(state.time * 1.7) * 0.7;
  let mx = 0;
  let my = 0;
  if (nearestDistance < 190) {
    mx = awayX;
    my = awayY;
  } else if (nearestDistance > 330) {
    mx = -awayX;
    my = -awayY;
  }
  mx += -awayY * strafe;
  my += awayX * strafe;
  const length = Math.hypot(mx, my);
  const move = length > 0.01 ? { x: mx / length, y: my / length } : { x: 0, y: 0 };
  let crowded = 0;
  for (const enemy of state.enemies) {
    if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < 280) crowded += 1;
  }
  return { move, aim, firing: true, pulse: crowded >= 4 };
}

/**
 * Set `world` to the named scene (start, play, boss or end; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'boss' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, firing: false, pulse: false }, { attract: true });
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'end') {
    let over = false;
    for (let index = 0; index < END_LIMIT_SECONDS / STEP; index += 1) {
      const events = world.step(STEP, autopilot(world.state, true), { godMode: false });
      if (events & EVENT_OVER) {
        over = true;
        break;
      }
    }
    // Let the death flash decay and the particles settle before the frame, so
    // the game-over screen reads instead of drowning in red.
    if (over) {
      for (let index = 0; index < 60; index += 1) {
        world.step(STEP, { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, firing: false, pulse: false }, {});
      }
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  if (name === 'boss') {
    let fought = 0;
    for (let index = 0; index < BOSS_LIMIT_SECONDS / STEP; index += 1) {
      world.step(STEP, autopilot(world.state, false), { godMode: true });
      const boss = world.state.boss;
      if (boss) {
        fought += 1;
        if (boss.hp <= boss.maxHp * 0.65 || fought > BOSS_FIGHT_SECONDS / STEP) break;
      }
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  // Stage the frame the moment the field is thick: from wave 4 on, once ten
  // enemies are alive at once, so the frame shows a real mid-game swarm.
  for (let index = 0; index < 90 / STEP; index += 1) {
    world.step(STEP, autopilot(world.state, false, true), { godMode: true });
    if (world.state.wave >= 4 && world.state.enemies.length >= 10) break;
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
