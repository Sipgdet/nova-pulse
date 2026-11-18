# NOVA PULSE — a neon arena survival shooter

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Sipgdet/nova-pulse/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Sipgdet/nova-pulse/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

A neon arena survival shooter that runs offline from static files with no
network request: open `game/index.html` in desktop Chrome and play. One ship
against an endless swarm, in a starfield lit by the explosions you cause.

## The game

You are the last pulse-ship in the drift. The swarm comes in waves — five
enemy kinds, each with its own shape, colour and movement — and every fifth
wave a boss ring drops in with radial bullet bursts and drifter escorts.

- **Waves:** each wave spawns more enemies than the last, in a harder mix.
  Clear a wave for a bonus of 500 × the wave number, then a short breather.
- **Combo:** kills inside 2.5 seconds chain into a multiplier, up to x8.
  Getting hit breaks the chain.
- **Power-ups:** fallen enemies drop spread shot, rapid fire, a shield that
  eats one hit, a pulse recharge, and (rarely) an extra life. They drift
  toward you when you fly close.
- **Pulse:** Shift or right-click fires a shockwave that damages and throws
  everything within range — your escape button, on a 6-second cooldown.
- **Lives:** 3, up to 5 with extra-life drops. The run ends at zero; the
  game-over screen shows your score, best, waves cleared, kills, accuracy
  and time, and restarts on R or a click.

## Controls

WASD / arrows — fly · mouse — aim · hold click / Space — fire ·
Shift / right-click — pulse · P — pause · M — mute · R — restart.

## Play it

```sh
node serve.ts            # serves game/ on http://localhost:8080
```

## Screenshots

`?shot=start|play|boss|end&seed=1` stages a deterministic frame for each
screenshot in `screenshots/` — title, mid-wave action, the boss fight, and
game over.

## Entry

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/`
to `/output` and writes `/output/dossier.json` with the vendored make.fun
library (`vendor/makefun-game.ts`, unchanged from the kit).

## Licence

MIT — see `LICENSE`.

<sub>Entered on [make.fun](https://make.fun/?ref=hg93qv6n&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
