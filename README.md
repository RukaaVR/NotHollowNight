# VEILFALL

An original 2D action metroidvania built with TypeScript, Vite, Canvas 2D and the Web Audio API.
It uses no external assets. Every sprite, background, tile, sound effect and piece of music is generated
procedurally at runtime.

You play Aeren, a masked wanderer carrying the Veilblade, who descends through **the Veil**: fifteen
regions of a buried kingdom whose sun went dark.

```bash
npm install          # .npmrc sets legacy-peer-deps
npm run dev          # http://localhost:5173
npm run validate     # typecheck → lint → unit tests → build → Playwright screenshot tests
```

`?debug=1` (or **F2**) enables the developer tools. Open them from the pause menu (System → Developer Tools)
or with **Down + R** in game. `?scene=game&room=<id>` jumps straight into a room.

## Controls (default, all rebindable)

| Action | Keyboard | Gamepad |
|---|---|---|
| Move / look | Arrows or WASD | D-pad |
| Jump (hold for height) | Space / Z | A |
| Strike (hold to charge) | J / X | X |
| Veil Dash | K / C | RT / B |
| Mend (hold) | L / V | Y |
| Veil Art (Lance) | U / F | LB |
| Shadow Step | I / L-Shift | RB |
| Aether Grapple | O / G | LT |
| Interact | E / ↑ | D-pad ↑ |
| Map | Tab / M | Back |
| Pause | Esc / P | Start |
| Previous / next tab | Q / R | LB / RB |

## Content

| | Count | Notes |
|---|---|---|
| Regions | 15 | The Threshold, Lanternwake (hub), Mourning Grove, Gloamspore Warrens, The Drowned City, Lumen Caverns, Ashen Foundry, The Sunken Archive, Thorn Chapel, The Black Reservoir, Starwell Observatory, The Veiled Garden, The Hollow Engine, The Abyss, Hall of Echoes |
| Rooms | 93 | Each region has its own palette, tile style, parallax backdrop, weather, ambience and music theme |
| Enemy types | 35 | Each has its own AI states, telegraphs and hit reactions. Any type can spawn as an elite. |
| Bosses | 14 | Multi-phase fights with a title card and a phase-ticked health bar. All 14 can be rematched in the Hall of Echoes (normal, *Ascended* or *One Breath*), with best times recorded. |
| NPCs | 28 | Dialogue changes with your progress. Six of them run shops. |
| Quests | 11 | Each has a stage tracker and a real reward |
| Abilities | 10 | Veil Dash, Veil Lance, Wall Grip, Lumen Lantern, Shadow Step, Deep Dive, Abyss Drop, Veil Glide, Phase Walk, Aether Grapple |
| Relics | 34 | Equipped at shrines within a thread budget (3 at start, 9 max) |
| Collectibles | 24 Memory Shards · 7 Echoes · 6 Lost Relics · 16 Vigor Embers · 9 Aether Phial shards · 4 Veilsteel Ore · ~37 lore tablets · map pages · key items | |
| Endings | 3 | *The Long Lullaby* (standard), *Dawnbreak* (true: all 7 Echoes, the Great Lamp lit, the Grieving Crown spared), *The Unmasked* (secret). Each has its own cinematic, music and credits. |
| New Game+ | Veilfall+ | Keeps relics, threads, blade, journal and records. Enemies and bosses get tougher. |

## Systems

* **Movement.** Acceleration, variable jump, coyote time, input buffering, fast fall, wall grip and wall jump,
  ledge grab, ladders, swimming and diving, glide, dash, shadow step through hazards, a grapple that chains
  between anchors, a downward slam, and phasing through wards.
* **Combat.** Attacks have startup, active and recovery frames. Also: hitstop, crits, charged, aerial, up and
  down (pogo) attacks, knockback, enemy stagger meters, directional armour and guards, burn, and a lance
  projectile.
* **Death.** Aeren returns to the last shrine. Half of the carried fragments stay behind as a visible
  **remnant** where Aeren last stood on safe ground; dying again before you reach it loses it. The Lantern
  Vault in Lanternwake banks fragments safely.
* **Veil Shrines.** Save, heal, swap relics, and review the map, abilities and journal. **Veil Gates** handle
  fast travel between attuned gates.
* **Music.** Generative music per region, layered by state: exploration, combat, elite, boss, low health,
  victory, discovery and story. Each boss and each ending has its own theme. The mix includes ambience
  beds, positional SFX synthesis and an underwater low-pass filter.
* **Rendering.** Chunk-cached tiles, four parallax layers, a lightmap with coloured bloom, weather, a
  particle pool with per-quality budgets, post effects, and a photo mode with filters and poses.
* **Accessibility and assists.** Camera shake 0–100 %, reduced particles and flashes, high contrast,
  three colour-blind palettes, text and HUD scale, full key and pad remapping, five audio buses, and
  vibration. Difficulty presets change aggression, telegraph length and resource gain rather than enemy
  health. Separate assists cover damage taken, game speed, extra i-frames, longer telegraphs, keeping
  Aether on death and safe hazards.
* **Saves.** Three versioned slots in localStorage. Each save carries a checksum. A backup is written
  before every overwrite, and loading falls back to it automatically. A damaged save is never deleted or
  silently reset, and an erased slot is kept as a recovery copy. Old save versions are migrated forward
  (v1→v3).
* **Performance.** LOW/MEDIUM/HIGH/ULTRA presets plus *Adaptive Quality*, which steps the preset down when
  the frame rate stays below 50.
* **Debug tools.** God mode, infinite Aether, unlock abilities, relics or the whole map, +fragments,
  damage multiplier, game speed, gravity, run speed, hitbox/hurtbox and collision views, teleport to any
  room, spawn any enemy (elite optional), go to any boss, and a diagnostics overlay (room, position,
  state, fps, frame time, entities, particles, lights, chunk builds, JS heap).

## Architecture

```
src/
  core/         Game loop (fixed 60 Hz steps), input (keyboard + gamepad + virtual), events, math, rng
  world/        GameWorld (simulation hub), rooms/tiles/physics, regions, spawn factory, world objects
  rooms/        RoomBuilder, world LAYOUT/LINKS, per-region room designs, reachability checker
  player/       Player state machine, tuning constants, procedural Aeren drawing
  combat/       Strikes, projectiles
  enemies/      Enemy base + shared AI brains, 35 enemy definitions
  bosses/       Boss base (intro/phase/stagger/reward flow), 14 bosses
  npc/ quests/ story/ dialogue/   Characters, shops, quests, lore, cinematics
  progression/  Save-data model, derived stats
  rendering/    Renderer, tile painter, parallax backdrops, drawing helpers
  audio/        Procedural music and SFX engine
  ui/           HUD, pause/shrine menus, map, settings, overlays, photo mode
  scenes/       Title, Opening, Game, Ending
  save/         Versioned, checksummed save system
  debug/        Developer tools
```

The simulation knows nothing about presentation. It emits events (sfx, music, toasts, shake, rumble)
and calls a narrow `WorldUI` interface. This lets the unit tests run the real game world headlessly.

## Testing

* `npm test` runs 54 Vitest unit tests:
  * **Movement:** run, variable jump, coyote time, buffering, dash, wall grip.
  * **World integrity:** every room fits its layout, doors match on both sides, the world is connected,
    and every region is reachable with the abilities available at that point. A reachability checker
    models jump arcs, dash, glide, grip, grapple, dive and phase. It proves that every ability, echo,
    shard, lost relic, key, ore and relic can be reached, and that each ability gate actually blocks
    without its ability.
  * **Saves:** round-trip, corruption with and without a backup, refusal of future versions, v1
    migration, erase recovery.
  * **Combat and enemies:** every enemy type simulates, i-frames, the One Breath modifier, the remnant
    on death.
  * **Systems:** healing, relic stats and the thread budget, quest flow, pickups, the true-ending
    checklist, fast travel, a door transition, all 14 bosses simulating, phase thresholds and defeat
    records, audio event triggers, settings sanitising, Veilfall+.
* `npm run test:e2e` runs 12 Playwright tests in Chromium. They drive the built game deterministically
  (`?manual=1`) and capture screenshots of the title, the difficulty select, the opening cinematic,
  gameplay, combat, the map, the inventory, settings, NPC dialogue, the shrine, the boss intro, the boss
  fight and victory, death, an ending, and one room from every region. Every test fails on any page
  error or console error. The screenshots are written to `test-results/screens/`.

## Known limitations

These are written to be honest rather than flattering.

* **Performance.** I only measured it in headless Chromium with software rasterisation. There, simulation
  takes about 0.2 ms per frame. Rendering at 1280×720 takes about 40 ms on High and about 1–2 ms on
  Low. GPU-accelerated browsers should be far faster, but I have not measured on real hardware.
  *Adaptive Quality* is there as a safety net.
* **Playtesting.** Nobody has played the game start to finish. Traversal is proven by the automated
  reachability checker and by runtime tests of specific rooms, transitions and fights. Boss and enemy
  balance, difficulty curve and pacing still need human playtesting.
* **Audio.** Tests check which sound and music events fire, but nobody has listened to the synthesised
  output critically. Gamepad support follows the standard mapping and hasn't been tried on physical
  controllers.
* **Art.** The art is procedural vector illustration drawn at runtime. It aims for a hand-drawn feel but
  is not hand-painted.
* **Screenshot tests.** They capture images and assert on game state; they do not pixel-diff against
  stored baselines.
* **No Quit option.** The title screen has none, because a browser tab cannot close itself.
* **Bundle size.** The JS bundle is a single chunk of about 530 kB (about 175 kB gzipped).
