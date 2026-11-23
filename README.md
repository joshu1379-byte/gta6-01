# SOLARA BAY

An original open-world crime game in the spirit of GTA 6 — a 2.5D top-down
canvas game with zero dependencies and no network requests. All names, art,
and music are original.

You are a driver for hire in Solara Bay, a sun-soaked coastal city. Take jobs
from the fixer Vera Solano, steal cars, outrun the police, and climb the
respect ladder from street nobody to legend of the Bay.

## How to run

```sh
node serve.ts
```

Then open <http://localhost:8080> in a desktop browser. No build step, no
install, no internet needed.

## What's in the game

- **A living city** — 6 districts (Downtown, Beachfront, Marina, Old Town,
  Palm Heights, Portside), a beach and ocean edge, parks, and a full road
  grid with a golden-hour day cycle.
- **On foot and by car** — run, sprint, punch, and shoot on foot; press E to
  jack any car, drive with real acceleration and steering, damage, smoke,
  and explosions.
- **Traffic and pedestrians** — civilian cars follow the roads, pedestrians
  walk the sidewalks and flee gunfire.
- **Wanted system** — 0–5 stars. Police interceptors chase and ram you,
  roadblocks form at higher stars, and a police helicopter hunts you at
  4+ stars. Hide to cool off. Getting caught or killed ends in BUSTED or
  WASTED.
- **8 story missions** for the fixer Vera Solano — a delivery, a car theft,
  two shootouts, a beachfront street race, a dock defense, a rescue, and a
  final tower assault — with dialogue, objectives, and a mission tracker.
- **Combat** — fists, pistol, SMG, shotgun, ammo, muzzle flashes, enemy
  gunfire, and boss enemies in the later missions.
- **HUD + minimap** — health, armor, cash, wanted stars, clock, respect
  rank, mission objective, radio station, and a live minimap (M for a
  full map).
- **Progression** — cash, respect ranks, weapon shops, a garage, food
  stands, 8 hidden packages to collect, quick save (F5) and Continue on
  the title screen.
- **Polish** — title screen, pause, game-over screens, dialogue boxes,
  procedural WebAudio sound effects, and three radio stations.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive |
| Mouse | Aim |
| Click | Shoot / punch |
| E | Enter / exit car |
| Shift | Sprint |
| 1–4 | Fists, pistol, SMG, shotgun |
| Q | Cycle weapon |
| R | Change radio station |
| N | Start next mission |
| M | Full map |
| P / Esc | Pause |
| F5 | Quick save |

## Files

- `main.ts` — builds the entry dossier (copies `game/` and `screenshots/`,
  writes `dossier.json`).
- `serve.ts` — tiny static server for local play (port 8080).
- `shots.json` — the four screenshot scenes.
- `game/index.html` — the game page (loads only local scripts).
- `game/src/config.js` — constants: districts, cars, weapons, missions.
- `game/src/random.js` — seeded RNG.
- `game/src/input.js` — keyboard + mouse state.
- `game/src/world.js` — city generation and road queries.
- `game/src/entities.js` — player, cars, pedestrians, police, helicopter.
- `game/src/missions.js` — mission state machine and dialogue.
- `game/src/combat.js` — weapons, bullets, damage, explosions, wanted.
- `game/src/audio.js` — synthesized WebAudio effects and radio.
- `game/src/render.js` — canvas renderer, HUD, minimap, screens.
- `game/src/shots.js` — staging for the four screenshot scenes.
- `game/src/main.js` — game state, main loop, save/load, screenshot mode.
- `screenshots/` — four JPEG renders of the game (cover first).
