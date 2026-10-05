import { Camera, VIEW_H, VIEW_W } from '../camera/Camera';
import { clamp, dist } from '../core/math';
import { events, sfx, type MusicState } from '../core/events';
import type { InputState } from '../core/input';
import { fxRng } from '../core/rng';
import { difficultyParams, qualityParams, type DifficultyParams, type Settings } from '../accessibility/settings';
import { computeStats, type PlayerStats } from '../progression/stats';
import { type Progress, hasFlag, setFlag } from '../progression/Progress';
import { Player } from '../player/Player';
import { Particles, PK } from '../vfx/Particles';
import { Projectile, type ProjKind, type ProjOpts } from '../combat/Projectile';
import { newHitId, playerStrike } from '../combat/combat';
import { lineOfSight, type Solid } from './physics';
import { region, type RegionDef, type RegionPalette } from './regions';
import { T, TILE } from './tiles';
import type { RoomDef, RoomGrid } from './Room';
import type { Entity, Team } from './Entity';
import { WorldMap } from './WorldMap';
import { createEntity } from './spawnFactory';
import type { DialogueScript } from '../dialogue/types';
import { Remnant, FragmentOrb } from './objects/pickups';
import { Spire } from './objects/effects';

export interface WindZone {
  x: number;
  y: number;
  w: number;
  h: number;
  fx: number;
  fy: number;
}

/** Presentation hooks the simulation calls into (implemented by GameScene; stubbed in tests). */
export interface WorldUI {
  toast(text: string, sub?: string, kind?: 'item' | 'ability' | 'quest' | 'area' | 'info'): void;
  hint(text: string): void;
  flashAether(): void;
  dialogue(script: DialogueScript, onDone?: () => void): void;
  openShrine(): void;
  openTravel(): void;
  openShop(id: string): void;
  abilityGet(id: string): void;
  itemGet(title: string, desc: string, color: string, onDone?: () => void): void;
  lore(title: string, text: string): void;
  cutscene(id: string, onDone?: () => void): void;
  ending(id: string): void;
  challengeMenu(id: string): void;
}

export interface BossLike extends Entity {
  bossName: string;
  bossTitle: string;
  hp: number;
  maxHp: number;
  phase: number;
  phases: number;
  staggerMeter: number;
  bossActive: boolean;
}

export interface Transition {
  phase: 'out' | 'in';
  t: number;
  target: string;
  fx: number;
  fy: number;
  vx: number;
  vy: number;
  edge: 'left' | 'right' | 'up' | 'down' | 'warp';
}

export class GameWorld {
  readonly map: WorldMap;
  readonly camera = new Camera();
  readonly fx = new Particles();
  readonly player: Player;
  stats: PlayerStats;
  diff: DifficultyParams;

  room!: RoomDef;
  grid!: RoomGrid;
  regionDef!: RegionDef;
  entities: Entity[] = [];
  solids: Solid[] = [];
  anchors: Entity[] = [];
  windZones: WindZone[] = [];
  readonly projectiles: Projectile[] = [];

  time = 0;
  timeScale = 1;
  hitstopT = 0;
  activeBoss: BossLike | null = null;
  transition: Transition | null = null;
  deathT = -1;
  cutsceneLock = false;
  combatHeat = 0;
  eliteHeat = 0;
  private musicState: MusicState | null = null;
  private umbralT = 0;
  private lastRegion = '';
  private discoveryT = 0;
  victoryT = 0;
  /** Additional darkness applied by boss arenas (0..1). */
  extraDarkness = 0;
  /** Boss currently being re-fought in the Hall of Echoes. */
  challengeBoss: string | null = null;
  challengeStart = 0;
  challengeHit = false;
  challengeReturn: { room: string; x: number; y: number } | null = null;

  // Debug
  godMode = false;
  /** Boss rematch modifier: 0 normal, 1 Ascended (×1.5 HP, ×2 damage), 2 One Breath. */
  challengeMod = 0;
  infiniteAether = false;
  debugDamageMult = 1;
  debugSpeed = 1;
  /** Ghost mode for debug teleporting. */
  noclip = false;

  /** Number of steps simulated, for deterministic tests. */
  steps = 0;

  constructor(
    rooms: RoomDef[],
    public progress: Progress,
    public settings: Settings,
    public input: InputState,
    public ui: WorldUI,
    public saveFn: (p: Progress) => void,
  ) {
    this.map = new WorldMap(rooms);
    this.player = new Player(this);
    this.stats = computeStats(progress);
    this.diff = difficultyParams(settings.difficulty);
    for (let i = 0; i < 160; i++) this.projectiles.push(new Projectile());
    this.applySettings();
  }

  applySettings(): void {
    this.diff = difficultyParams(this.settings.difficulty);
    const q = qualityParams(this.settings.quality, this.settings.reducedParticles);
    this.fx.budget = q.particleBudget;
    this.fx.density = this.settings.reducedParticles ? 0.45 : 1;
    this.camera.shakeMult = this.settings.shake;
  }

  get palette(): RegionPalette {
    return this.regionDef.palette;
  }

  refreshStats(): void {
    const prevMax = this.stats?.maxVigor ?? 0;
    this.stats = computeStats(this.progress);
    if (this.stats.maxVigor > prevMax && prevMax > 0) this.player.vigor += this.stats.maxVigor - prevMax;
    this.player.vigor = Math.min(this.player.vigor, this.player.maxVigor);
    this.player.aether = Math.min(this.player.aether, this.stats.maxAether);
    if (!this.stats.has.has('warding_lantern')) this.player.shield = 0;
  }

  // ------------------------------------------------------------------
  // Room management

  /** Start a game session at the current save point. */
  begin(entry: 'shrine' | 'start' | { room: string; x: number; y: number }): void {
    this.refreshStats();
    this.player.vigor = this.player.maxVigor;
    if (entry === 'start') {
      const id = this.progress.room;
      const g = this.map.grid(id);
      const s = g.playerStart ?? { x: 48, y: g.ph - 32 };
      this.loadRoom(id, s.x, s.y);
    } else if (entry === 'shrine') {
      this.respawnAtShrine(false);
    } else {
      this.loadRoom(entry.room, entry.x, entry.y);
    }
  }

  loadRoom(id: string, fx: number, fy: number): void {
    for (const e of this.entities) e.dispose?.();
    const def = this.map.get(id);
    if (!def) throw new Error(`Unknown room ${id}`);
    this.room = def;
    this.grid = this.map.grid(id);
    this.grid.reset(new Set(this.progress.broken[id] ?? []));
    this.regionDef = region(def.region);
    this.entities = [];
    this.solids = [];
    this.anchors = [];
    this.windZones = [];
    for (const p of this.projectiles) p.active = false;
    this.fx.clear();
    this.activeBoss = null;
    this.camera.lock = null;
    this.camera.focus = null;
    this.camera.targetZoom = 1;
    this.combatHeat = 0;
    this.extraDarkness = 0;
    if (this.challengeBoss && def.id !== this.challengeRoom()) this.challengeBoss = null;
    for (const pl of this.grid.placements) {
      const e = createEntity(this, pl);
      if (e) this.add(e);
    }
    const rem = this.progress.remnant;
    if (rem && rem.room === id) this.add(new Remnant(this, rem.x, rem.y, rem.amount));
    this.player.placeAt(fx, fy);
    this.camera.setBounds(this.grid.pw, this.grid.ph);
    this.camera.snap(this.player.cx, this.player.cy);
    const firstVisit = !this.progress.visited[id];
    this.progress.visited[id] = true;
    this.progress.room = id;
    if (def.enterFlag) setFlag(this.progress, def.enterFlag);
    events.emit('roomEnter', { id });
    if (def.region !== this.lastRegion) {
      this.lastRegion = def.region;
      events.emit('musicTheme', { theme: def.music ?? def.region });
      const key = `area_${def.region}`;
      if (!hasFlag(this.progress, key)) {
        setFlag(this.progress, key);
        events.emit('areaTitle', { name: this.regionDef.name, sub: this.regionDef.sub });
        sfx('discover');
      } else {
        events.emit('areaTitle', { name: this.regionDef.name, sub: '' });
      }
    } else if (def.music) {
      events.emit('musicTheme', { theme: def.music });
    }
    if (firstVisit && def.title) this.ui.toast(def.title, undefined, 'area');
  }

  add(e: Entity): Entity {
    this.entities.push(e);
    return e;
  }

  // ------------------------------------------------------------------
  // Main update

  update(rawDt: number): void {
    this.steps++;
    const dt = rawDt * this.settings.gameSpeed * this.debugSpeed;
    this.time += dt;
    if (!this.cutsceneLock && this.deathT < 0) this.progress.playTime += rawDt;

    if (this.transition) {
      this.updateTransition(rawDt);
      if (this.transition && this.transition.phase === 'out') return;
    }

    if (this.hitstopT > 0) {
      this.hitstopT -= rawDt;
      this.camera.update(rawDt, this.player.cx, this.player.cy, 0, this.player.facing, this.player.lookDir, this.player.onGround);
      return;
    }

    const sdt = dt * this.timeScale;
    if (this.timeScale < 1) this.timeScale = Math.min(1, this.timeScale + rawDt * 0.8);

    if (this.infiniteAether) this.player.aether = this.stats.maxAether;
    if (this.godMode) this.player.vigor = this.player.maxVigor;

    // Mechanisms (platforms) update before the player so riders are carried correctly.
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i] as Entity & { early?: boolean };
      if (e.early) e.update(sdt);
    }
    this.player.update(sdt);
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i] as Entity & { early?: boolean };
      if (!e.early && !e.dead) e.update(sdt);
    }
    for (let i = this.entities.length - 1; i >= 0; i--) if (this.entities[i].dead) {
      this.entities[i].dispose?.();
      this.entities.splice(i, 1);
    }
    for (const p of this.projectiles) if (p.active) p.update(this, sdt);
    this.fx.update(sdt);
    this.updateCrumble(sdt);
    this.updateUmbral(sdt);
    this.ambientParticles(sdt);

    if (this.deathT >= 0) this.updateDeath(rawDt);
    else this.checkRoomExit();

    const p = this.player;
    const ab = this.activeBoss;
    this.camera.attend = ab?.bossActive && !ab.dead && ab.hp > 0 ? { x: ab.cx, y: ab.cy } : null;
    this.camera.update(rawDt, p.cx, p.cy, p.body.vx, p.facing, p.lookDir, p.onGround);
    this.updateMusic(rawDt);
  }

  private challengeRoom(): string | null {
    return this.challengeBoss ? this.challengeRoomFor(this.challengeBoss) : null;
  }

  /** Overridden by GameScene with the boss registry lookup to avoid import cycles. */
  challengeRoomFor: (bossId: string) => string | null = () => null;

  /** Begin a boss rematch from the Hall of Echoes. */
  startChallenge(bossId: string): void {
    const room = this.challengeRoomFor(bossId);
    if (!room) return;
    const g = this.map.grid(room);
    const start = g.playerStart ?? { x: TILE * 3, y: g.ph - TILE };
    this.challengeReturn = { room: this.room.id, x: this.player.cx, y: this.player.y + this.player.h };
    this.challengeBoss = bossId;
    this.challengeHit = false;
    this.challengeStart = this.progress.playTime;
    this.warp(room, start.x, start.y);
  }

  onChallengeComplete(bossId: string): void {
    const t = this.progress.playTime - this.challengeStart;
    const rec = (this.progress.challenges[bossId] ??= { bestTime: 0, noHit: false, clears: 0 });
    rec.clears++;
    if (rec.bestTime === 0 || t < rec.bestTime) rec.bestTime = Math.round(t * 10) / 10;
    if (!this.challengeHit) rec.noHit = true;
    this.ui.toast('Memory overcome', `Time ${t.toFixed(1)}s${this.challengeHit ? '' : ' · Flawless'}`, 'quest');
    this.challengeBoss = null;
    const back = this.challengeReturn;
    this.challengeReturn = null;
    if (back) this.warp(back.room, back.x, back.y);
    this.save();
  }

  hitstop(t: number): void {
    this.hitstopT = Math.max(this.hitstopT, t);
  }

  // ------------------------------------------------------------------
  // Transitions

  private checkRoomExit(): void {
    const p = this.player;
    if (p.state === 'dead' || this.transition) return;
    const g = this.grid;
    let edge: Transition['edge'] | null = null;
    if (p.cx < 0) edge = 'left';
    else if (p.cx > g.pw) edge = 'right';
    else if (p.y + p.h < 2) edge = 'up';
    else if (p.y > g.ph) edge = 'down';
    if (!edge) return;
    const gx = this.room.pos[0] * TILE + p.cx;
    const gy = this.room.pos[1] * TILE + (edge === 'up' ? p.y + p.h - 8 : edge === 'down' ? p.y + 4 : p.cy);
    const probeX = edge === 'left' ? gx - 4 : edge === 'right' ? gx + 4 : gx;
    const probeY = edge === 'up' ? gy - 12 : edge === 'down' ? gy + 12 : gy;
    const target = this.map.roomAt(Math.floor(probeX / TILE), Math.floor(probeY / TILE), this.room.id);
    if (!target) {
      // Sealed edge: keep the player inside.
      if (edge === 'left') p.body.x = 0 - p.w / 2 + 1;
      if (edge === 'right') p.body.x = g.pw - p.w / 2 - 1;
      if (edge === 'up') { p.body.y = 0; p.body.vy = Math.max(0, p.body.vy); }
      if (edge === 'down') p.hazard();
      return;
    }
    const fx = gx - target.pos[0] * TILE;
    const fy = this.room.pos[1] * TILE + p.y + p.h - target.pos[1] * TILE;
    this.transition = { phase: 'out', t: 0, target: target.id, fx, fy, vx: p.body.vx, vy: p.body.vy, edge };
  }

  warp(roomId: string, fx: number, fy: number): void {
    this.transition = { phase: 'out', t: 0, target: roomId, fx, fy, vx: 0, vy: 0, edge: 'warp' };
  }

  private updateTransition(dt: number): void {
    const tr = this.transition!;
    tr.t += dt;
    if (tr.phase === 'out' && tr.t >= 0.16) {
      const keepState = this.player.state;
      this.loadRoom(tr.target, tr.fx, tr.fy);
      const p = this.player;
      const b = p.body;
      b.vx = tr.vx;
      b.vy = tr.vy;
      if (tr.edge === 'left') b.x = this.grid.pw - b.w - 1;
      if (tr.edge === 'right') b.x = 1;
      if (tr.edge === 'down') {
        b.y = 1;
      }
      if (tr.edge === 'up') {
        b.y = this.grid.ph - b.h - 2;
        b.vy = Math.min(b.vy, -380);
        // Nudge toward a ledge so upward exits always land.
        b.vx = p.facing * 60;
      }
      if (tr.edge === 'warp') {
        b.vx = 0;
        b.vy = 0;
      }
      if (keepState === 'dash' || keepState === 'swim' || keepState === 'grapple') p.setState(keepState === 'grapple' ? 'normal' : keepState);
      if (keepState === 'step') p.setState('normal');
      p.stepping = false;
      this.camera.snap(p.cx, p.cy);
      tr.phase = 'in';
      tr.t = 0;
    } else if (tr.phase === 'in' && tr.t >= 0.24) {
      this.transition = null;
    }
  }

  /** 0..1 black overlay amount for the renderer. */
  get fadeAmount(): number {
    const tr = this.transition;
    let a = 0;
    if (tr) a = tr.phase === 'out' ? tr.t / 0.16 : 1 - tr.t / 0.24;
    if (this.player.hazardFading) a = Math.max(a, Math.min(1, this.player.stateT / 0.2));
    else if (this.player.hazardFade > 0) a = Math.max(a, this.player.hazardFade / 0.4);
    if (this.deathT >= 0) a = Math.max(a, clamp((this.deathT - 1.6) / 0.8, 0, 1));
    return clamp(a, 0, 1);
  }

  // ------------------------------------------------------------------
  // Death and respawn

  onPlayerDeath(): void {
    this.deathT = 0;
    this.timeScale = 0.3;
    this.progress.stats.deaths++;
    events.emit('playerDied', {});
    events.emit('music', { state: 'silence' });
    this.musicState = 'silence';
    sfx('player_die', this.player.cx, this.player.cy);
    this.camera.shake(0.6, 0.3);
    this.camera.targetZoom = 1.25;
    this.fx.shards(this.player.cx, this.player.cy, 24, '#e8e4f0', 220);
    this.fx.burst(this.player.cx, this.player.cy, 30, '#7fd6ff', 160, 1.2, 3);
    this.input.rumble(1, 1, 500);
  }

  private updateDeath(dt: number): void {
    this.deathT += dt;
    if (this.deathT > 2.6) {
      this.deathT = -1;
      this.respawnAtShrine(true);
    }
  }

  respawnAtShrine(fromDeath: boolean): void {
    const p = this.player;
    if (fromDeath) {
      const amount = Math.floor(this.progress.fragments / 2);
      if (this.progress.remnant && amount > 0) this.ui.toast('A remnant faded', `${this.progress.remnant.amount} Veil Fragments were lost to the dark.`, 'info');
      if (amount > 0) {
        this.progress.remnant = { room: this.room.id, x: p.lastSafe.x, y: p.lastSafe.y - 14, amount };
        this.progress.fragments -= amount;
      }
      if (!this.settings.keepAetherOnDeath) p.aether = 0;
    }
    const shrineRoom = this.progress.shrine;
    const g = this.map.grid(shrineRoom);
    let sx = g.playerStart?.x ?? g.pw / 2;
    let sy = g.playerStart?.y ?? g.ph - 32;
    const sp = g.placements.find((pl) => pl.ch === 'S');
    if (sp) {
      sx = sp.tx * TILE + TILE / 2;
      sy = (sp.ty + 1) * TILE;
    }
    p.setState('normal');
    p.poison = 0;
    p.corruption = 0;
    p.gloamed = false;
    this.camera.targetZoom = 1;
    this.timeScale = 1;
    this.loadRoom(shrineRoom, sx, sy);
    p.vigor = p.maxVigor;
    p.iframes = 1;
    if (fromDeath) {
      this.transition = { phase: 'in', t: 0, target: shrineRoom, fx: sx, fy: sy, vx: 0, vy: 0, edge: 'warp' };
      this.ui.hint(this.progress.remnant ? 'Your remnant waits where you fell. Recover it to reclaim your fragments.' : 'The Veil remembers you.');
    }
  }

  // ------------------------------------------------------------------
  // Shrines and saving

  restAtShrine(): void {
    const p = this.player;
    this.progress.shrine = this.room.id;
    this.progress.shrines[this.room.id] = true;
    p.vigor = p.maxVigor;
    p.poison = 0;
    p.corruption = 0;
    p.gloamed = false;
    p.vigor = p.maxVigor;
    p.setState('rest');
    sfx('shrine', p.cx, p.cy);
    this.fx.burst(p.cx, p.cy, 30, '#ffe8b0', 90, 1.4, 2.5);
    this.fx.ring(p.cx, p.cy, 8, 60, 0.8, '#ffe8b0');
    this.save();
    this.ui.openShrine();
  }

  save(): void {
    this.progress.room = this.room.id;
    this.progress.savedAt = Date.now();
    this.saveFn(this.progress);
    sfx('save');
  }

  // ------------------------------------------------------------------
  // Helpers used by entities

  lineOfSight(x0: number, y0: number, x1: number, y1: number): boolean {
    return lineOfSight(this.grid, x0, y0, x1, y1);
  }

  nearestInteractable(): Entity | null {
    const p = this.player;
    let best: Entity | null = null;
    let bd = Infinity;
    for (const e of this.entities) {
      if (e.interactRange <= 0 || !e.interact || e.dead) continue;
      const d = dist(p.cx, p.cy, e.cx, e.cy);
      if (d < e.interactRange && d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  windAt(x: number, y: number): number {
    for (const z of this.windZones) if (x >= z.x && x < z.x + z.w && y >= z.y && y < z.y + z.h) return Math.sign(z.fx) * 0.8;
    const wt = this.regionDef?.weather;
    return wt === 'rain' || wt === 'snow' || wt === 'leaves' ? Math.sin(this.time * 0.6) * 0.25 + 0.15 : 0;
  }

  spawnProjectile(kind: ProjKind, x: number, y: number, vx: number, vy: number, o: ProjOpts = {}): Projectile | null {
    for (const p of this.projectiles) {
      if (!p.active) {
        const opts = { ...o };
        if (opts.team !== 'player' && opts.dmg === undefined) opts.dmg = 1;
        p.init(kind, x, y, vx, vy, opts);
        return p;
      }
    }
    return null;
  }

  spawnLance(x: number, y: number, dir: number): void {
    const st = this.stats;
    this.spawnProjectile('lance', x, y, dir * 520, 0, {
      team: 'player', r: st.lancePierce ? 6 : 4.5, dmg: 16 * st.lanceMult * st.globalDamage * this.debugDamageMult, pierce: st.lancePierce, life: 0.9,
    });
    sfx('lance', x, y);
    this.camera.kick(-dir * 2, 0);
  }

  spawnSpire(x: number, footY: number): void {
    this.add(new Spire(this, x, footY));
    sfx('lance', x, footY, 1, 0.7);
  }

  spawnEmberTrail(x: number, y: number): void {
    this.spawnProjectile('ember', x, y, 0, -10, { team: 'player', r: 5, dmg: 3, life: 0.5, pierce: true, wall: false });
  }

  explosion(x: number, y: number, r: number, team: Team, dmg: number): void {
    this.fx.ring(x, y, 4, r, 0.35, '#ffcf8a');
    this.fx.burst(x, y, 20, '#ffb060', 160, 0.5, 3);
    this.fx.smoke(x, y, 6);
    this.camera.shake(0.4, 0.15);
    sfx('explode', x, y);
    if (team === 'enemy') {
      const p = this.player;
      if (dist(x, y, p.cx, p.cy) < r + 6) p.hurt(dmg, x);
    } else {
      playerStrike(this, { x: x - r, y: y - r, w: r * 2, h: r * 2 }, { base: dmg, dir: 0, dirY: 0, knock: 1.2, stagger: 2, source: 'fire', hitId: newHitId(), breaks: true, canCrit: false });
    }
  }

  echoPulse(x: number, y: number): void {
    this.fx.ring(x, y, 6, 56, 0.4, '#ff8fa3');
    playerStrike(this, { x: x - 48, y: y - 40, w: 96, h: 80 }, { base: 8 * this.stats.globalDamage, dir: 0, dirY: 0, knock: 2, stagger: 2, source: 'pulse', hitId: newHitId(), breaks: false, canCrit: false });
  }

  toll(x: number, y: number): void {
    this.spawnProjectile('toll', x, y, 0, 0, { team: 'player', r: 10, dmg: 9 * this.stats.globalDamage, life: 0.4, pierce: true, wall: false });
    sfx('bell', x, y, 0.6, 1.4);
  }

  reflectNear(x: number, y: number): void {
    for (const p of this.projectiles) {
      if (!p.active || p.team !== 'enemy') continue;
      if (dist(x, y, p.x, p.y) < 70) {
        p.team = 'player';
        p.vx = -p.vx * 1.3;
        p.vy = -p.vy * 1.3;
        p.dmg = 14;
        p.reflected = true;
        p.hitId = newHitId();
      }
    }
  }

  hitSwitches(x: number, y: number, r: number): void {
    for (const e of this.entities) {
      const sw = e as Entity & { lanceHit?: () => void };
      if (sw.lanceHit && x + r > e.x && x - r < e.x + e.w && y + r > e.y && y - r < e.y + e.h) sw.lanceHit();
    }
  }

  breakTile(tx: number, ty: number): void {
    const g = this.grid;
    const i = ty * g.w + tx;
    g.set(tx, ty, T.Empty);
    const list = (this.progress.broken[this.room.id] ??= []);
    if (!list.includes(i)) list.push(i);
    this.fx.shards(tx * TILE + 8, ty * TILE + 8, 10, this.palette.tileHi, 200);
    this.fx.smoke(tx * TILE + 8, ty * TILE + 8, 3, 'rgba(60,55,60,0.5)');
    sfx('break', tx * TILE, ty * TILE);
    this.camera.shake(0.3, 0.1);
  }

  breakFragileUnder(x: number, footY: number, w: number): boolean {
    const g = this.grid;
    const row = Math.floor((footY + 1) / TILE);
    const l = Math.floor(x / TILE);
    const r = Math.floor((x + w - 0.01) / TILE);
    let broke = false;
    for (let c = l; c <= r; c++) {
      if (g.tile(c, row) === T.Fragile) {
        // Flood-fill contiguous fragile tiles so whole floors give way.
        const stack = [[c, row]];
        let n = 0;
        while (stack.length && n < 64) {
          const [cx, cy] = stack.pop()!;
          if (g.tile(cx, cy) !== T.Fragile) continue;
          this.breakTile(cx, cy);
          n++;
          stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
        }
        broke = true;
      }
    }
    if (broke) {
      this.camera.shake(0.6, 0.2);
      this.discoverSecret(true);
    }
    return broke;
  }

  discoverSecret(silent = false): void {
    this.progress.stats.secrets++;
    if (!silent) {
      sfx('discover');
      this.discoveryT = 2.5;
      events.emit('music', { state: 'discovery' });
      this.musicState = 'discovery';
    }
  }

  dropFragments(x: number, y: number, amount: number): void {
    let n = Math.round(amount * this.stats.fragmentMult);
    while (n > 0) {
      const v = n >= 25 ? 25 : n >= 5 ? 5 : 1;
      n -= v;
      this.add(new FragmentOrb(this, x, y, v));
    }
  }

  // ------------------------------------------------------------------
  // Environment

  private updateCrumble(dt: number): void {
    const g = this.grid;
    const p = this.player;
    // Start crumble under the player's feet.
    if (p.onGround) {
      const row = Math.floor((p.y + p.h + 1) / TILE);
      const l = Math.floor(p.x / TILE);
      const r = Math.floor((p.x + p.w - 0.01) / TILE);
      for (let c = l; c <= r; c++) {
        if (g.tile(c, row) === T.Crumble) {
          const i = row * g.w + c;
          if (g.crumble[i] === 0) {
            g.crumble[i] = 0.0001;
            sfx('crumble', c * TILE, row * TILE, 0.5);
          }
        }
      }
    }
    for (let i = 0; i < g.crumble.length; i++) {
      if (g.crumble[i] > 0) {
        const before = g.crumble[i];
        g.crumble[i] += dt;
        if (before < 0.55 && g.crumble[i] >= 0.55) {
          const tx = i % g.w;
          const ty = Math.floor(i / g.w);
          this.fx.shards(tx * TILE + 8, ty * TILE + 8, 6, this.palette.tileHi, 80);
          this.fx.dust(tx * TILE + 8, ty * TILE + 12, 3);
          g.version++;
        }
        if (g.crumble[i] > 3.2) {
          // Reform, unless the player is standing inside it.
          const tx = i % g.w;
          const ty = Math.floor(i / g.w);
          const inside = p.x < (tx + 1) * TILE && p.x + p.w > tx * TILE && p.y < (ty + 1) * TILE && p.y + p.h > ty * TILE;
          if (!inside) {
            g.crumble[i] = 0;
            g.version++;
          }
        }
      }
    }
  }

  private updateUmbral(dt: number): void {
    if (this.room.dark !== 2 || this.progress.abilities.lantern || this.player.state === 'dead') {
      this.umbralT = 0;
      return;
    }
    const p = this.player;
    for (const e of this.entities) {
      if (e.light && e.light.r > 24 && dist(e.cx + (e.light.ox ?? 0), e.cy + (e.light.oy ?? 0), p.cx, p.cy) < e.light.r * 0.7) {
        this.umbralT = Math.max(0, this.umbralT - dt * 2);
        return;
      }
    }
    this.umbralT += dt;
    if (this.umbralT > 4.5) {
      this.umbralT = 0;
      if (!hasFlag(this.progress, 'hint_umbral')) {
        setFlag(this.progress, 'hint_umbral');
        this.ui.hint('The umbral dark gnaws at you. Keep to the light.');
      }
      if (!this.godMode) {
        p.vigor = Math.max(0, p.vigor - 0.5);
        p.flashT = 0.3;
        events.emit('flash', { color: '#20103a', time: 0.4, alpha: 0.3 });
        sfx('player_hurt', p.cx, p.cy, 0.4, 0.6);
        if (p.vigor <= 0) p.die();
      }
    }
  }

  get umbralPressure(): number {
    return this.room.dark === 2 && !this.progress.abilities.lantern ? this.umbralT / 4.5 : 0;
  }

  private ambientParticles(dt: number): void {
    const wt = this.regionDef.weather;
    const q = qualityParams(this.settings.quality, this.settings.reducedParticles);
    const rate = q.weatherDensity * dt;
    const cam = this.camera;
    const l = cam.left - 20;
    const t = cam.top - 20;
    const vw = cam.viewW + 40;
    const vh = cam.viewH + 40;
    const fx = this.fx;
    const roll = (n: number) => fxRng.next() < n * rate;
    switch (wt) {
      case 'snow':
        if (roll(30)) fx.spawn(PK.Mote, l + fxRng.next() * vw, t, 6 + fxRng.next() * 10, 18 + fxRng.next() * 14, 8, 0.8 + fxRng.next(), 'rgba(230,236,255,0.75)');
        break;
      case 'rain':
        if (roll(90)) fx.spawn(PK.Drop, l + fxRng.next() * vw, t, -20, 320 + fxRng.next() * 80, 1.2, 0.8, 'rgba(160,210,240,0.45)');
        break;
      case 'ash':
        if (roll(20)) fx.spawn(PK.Mote, l + fxRng.next() * vw, t, 4, 12 + fxRng.next() * 8, 9, 0.9, 'rgba(180,170,170,0.6)');
        break;
      case 'embers':
        if (roll(14)) fx.spawn(PK.Ember, l + fxRng.next() * vw, t + vh, (fxRng.next() - 0.5) * 20, -20 - fxRng.next() * 30, 6, 0.8 + fxRng.next(), '#ff9a50', { additive: true });
        break;
      case 'spores':
        if (roll(16)) fx.spawn(PK.Glow, l + fxRng.next() * vw, t + fxRng.next() * vh, (fxRng.next() - 0.5) * 8, -4 - fxRng.next() * 6, 6, 1 + fxRng.next(), 'rgba(230,160,255,0.6)', { additive: true });
        break;
      case 'leaves':
        if (roll(5)) fx.spawn(PK.Leaf, l + fxRng.next() * vw, t, 10, 20 + fxRng.next() * 10, 10, 2 + fxRng.next(), fxRng.next() < 0.5 ? '#6a7a48' : '#8a6a3a', { vr: (fxRng.next() - 0.5) * 4 });
        break;
      case 'petals':
        if (roll(6)) fx.spawn(PK.Leaf, l + fxRng.next() * vw, t, 14, 16 + fxRng.next() * 8, 10, 1.8, fxRng.next() < 0.5 ? '#f4c8e0' : '#fff0f6', { vr: (fxRng.next() - 0.5) * 5 });
        break;
      case 'pages':
        if (roll(2)) fx.spawn(PK.Leaf, l + fxRng.next() * vw, t, 6, 14, 12, 3, 'rgba(230,220,190,0.8)', { vr: (fxRng.next() - 0.5) * 2 });
        break;
      case 'motes':
        if (roll(10)) fx.spawn(PK.Glow, l + fxRng.next() * vw, t + fxRng.next() * vh, (fxRng.next() - 0.5) * 6, -3 - fxRng.next() * 5, 5, 0.8 + fxRng.next(), this.palette.accent, { additive: true });
        break;
      case 'stars':
        if (roll(8)) fx.spawn(PK.Glow, l + fxRng.next() * vw, t + fxRng.next() * vh, 0, 0, 3, 0.6 + fxRng.next() * 0.8, '#e8ecff', { additive: true });
        break;
      case 'mist':
        if (roll(3)) fx.spawn(PK.Smoke, l + fxRng.next() * vw, t + vh * (0.5 + fxRng.next() * 0.5), 8, 0, 6, 18, 'rgba(120,170,180,0.07)', { size2: 40 });
        break;
      case 'void':
        if (roll(12)) fx.spawn(PK.Glow, l + fxRng.next() * vw, t + vh, (fxRng.next() - 0.5) * 6, -10 - fxRng.next() * 10, 7, 0.8 + fxRng.next(), 'rgba(170,120,255,0.6)', { additive: true });
        break;
      case 'bubbles':
        if (roll(6)) fx.bubbles(l + fxRng.next() * vw, t + vh, 1);
        break;
      default:
        break;
    }
    // Liquids and water surfaces emit bubbles where the player is.
    if (this.player.inWater && fxRng.next() < 0.02) fx.bubbles(this.player.cx, this.player.y, 1);
  }

  // ------------------------------------------------------------------
  // Music state machine

  private updateMusic(dt: number): void {
    if (this.deathT >= 0) return;
    this.combatHeat = Math.max(0, this.combatHeat - dt);
    this.eliteHeat = Math.max(0, this.eliteHeat - dt);
    this.discoveryT = Math.max(0, this.discoveryT - dt);
    this.victoryT = Math.max(0, this.victoryT - dt);
    let s: MusicState = 'exploration';
    if (this.cutsceneLock) s = 'story';
    else if (this.victoryT > 0) s = 'victory';
    else if (this.activeBoss?.bossActive) s = 'boss';
    else if (this.eliteHeat > 0) s = 'elite';
    else if (this.combatHeat > 0) s = 'combat';
    else if (this.discoveryT > 0) s = 'discovery';
    else if (this.player.vigor <= 1 && this.player.maxVigor > 1) s = 'lowhealth';
    if (s !== this.musicState) {
      this.musicState = s;
      events.emit('music', { state: s });
    }
  }

  /** Visible rect in room coordinates (for culling). */
  viewRect(): { x: number; y: number; w: number; h: number } {
    return { x: this.camera.left, y: this.camera.top, w: VIEW_W / this.camera.zoom, h: VIEW_H / this.camera.zoom };
  }
}
