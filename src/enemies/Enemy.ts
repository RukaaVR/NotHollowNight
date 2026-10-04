import { Entity, type HitInfo, type HitResult } from '../world/Entity';
import type { GameWorld } from '../world/GameWorld';
import { makeBody, stepBody, type Body, type MoveOpts } from '../world/physics';
import { T, TILE } from '../world/tiles';
import { clamp, dist, sign, type Rect } from '../core/math';
import { sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { hurtPlayerRect } from '../combat/combat';
import { glow } from '../rendering/draw';
import { semanticColors } from '../accessibility/settings';
import { PK } from '../vfx/Particles';
import { setFlag } from '../progression/Progress';

export type AIState = 'idle' | 'patrol' | 'alert' | 'chase' | 'attack' | 'recover' | 'stagger' | 'search' | 'return' | 'hidden';

export type EnemyCategory = 'melee' | 'ranged' | 'flying' | 'ambush' | 'armored' | 'swarm' | 'shielded' | 'explosive' | 'environmental' | 'elite';

export interface EnemyDef {
  id: string;
  name: string;
  region: string;
  category: EnemyCategory;
  hp: number;
  dmg: number;
  w: number;
  h: number;
  frags: number;
  sight: number;
  weight: number;
  stagger: number;
  flying?: boolean;
  aquatic?: boolean;
  gravity?: number;
  armor?: 'front' | 'top' | 'all';
  noContact?: boolean;
  corrupt?: number;
  poison?: number;
  color: string;
  pitch: number;
  role: string;
  weakness: string;
  lore: string;
  think: (e: Enemy, dt: number) => void;
  draw: (ctx: CanvasRenderingContext2D, e: Enemy) => void;
  init?: (e: Enemy) => void;
  onDeath?: (e: Enemy) => void;
}

export class Enemy extends Entity {
  readonly body: Body;
  hp: number;
  maxHp: number;
  state: AIState = 'idle';
  stateT = 0;
  facing = -1;
  home: { x: number; y: number };
  cd = 0;
  atkT = 0;
  atkPhase = 0;
  atkEnter = false;
  atkKind = 0;
  staggerHits = 0;
  staggerT = 0;
  burnT = 0;
  burnTick = 0;
  flashT = 0;
  hitT = 0;
  deathT = -1;
  t = fxRng.next() * 10;
  alertMark = 0;
  hidden = false;
  /** Seconds since the player was last seen. */
  lostT = 0;
  lastSeen = { x: 0, y: 0 };
  vars: Record<string, number> = {};
  /** Optional dynamic guard (shielded foes). */
  guard = false;
  /** Guard blocks from every direction (orbiting shields). */
  guardAll = false;
  telegraph = 0;
  ignoreGravity = false;

  constructor(world: GameWorld, readonly def: EnemyDef, fx: number, fy: number, readonly elite: boolean, readonly flag?: string) {
    super(world);
    const ng = world.progress.ngPlus > 0 ? 1.4 : 1;
    this.maxHp = Math.round(def.hp * (elite ? 1.9 : 1) * ng);
    this.hp = this.maxHp;
    this.body = makeBody(fx - def.w / 2, fy - def.h, def.w, def.h);
    this.w = def.w;
    this.h = def.h;
    this.x = this.body.x;
    this.y = this.body.y;
    this.home = { x: fx, y: fy };
    this.team = 'enemy';
    this.hittable = true;
    this.layer = 40;
    this.facing = world.player.cx < fx ? -1 : 1;
    if (elite) this.light = { r: 50, color: semanticColors(world.settings).elite, intensity: 0.6 };
    def.init?.(this);
    world.progress.bestiary[def.id] ??= 0;
  }

  get p() {
    return this.world.player;
  }

  get moveOpts(): MoveOpts {
    return { phase: false, drop: false, openEdges: false, ignoreOneWay: !!this.def.flying };
  }

  /** Attack cooldown scaled by difficulty and elite status. */
  cooldown(base: number): number {
    return base * this.world.diff.aggression * (this.elite ? 0.75 : 1) * (this.world.progress.ngPlus > 0 ? 0.85 : 1) * (0.85 + fxRng.next() * 0.3);
  }

  /** Telegraph time scaled for accessibility. */
  tele(base: number): number {
    return base * this.world.diff.telegraph * (this.world.settings.telegraphBoost ? 1.3 : 1);
  }

  setState(s: AIState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
    this.atkT = 0;
    this.atkPhase = 0;
  }

  /**
   * Advance a three-phase attack. Returns 1 (windup), 2 (active), 3 (recovery) or 4 (finished).
   * `atkEnter` is true on the first frame of each phase.
   */
  atk(dt: number, windup: number, active: number, recover: number): number {
    const w = this.tele(windup);
    this.atkT += dt;
    const t = this.atkT;
    const ph = t < w ? 1 : t < w + active ? 2 : t < w + active + recover ? 3 : 4;
    this.atkEnter = ph !== this.atkPhase;
    this.atkPhase = ph;
    this.telegraph = ph === 1 ? clamp(t / w, 0, 1) : 0;
    if (this.atkEnter && ph === 1) sfx('enemy_attack', this.cx, this.cy, 0.35, this.def.pitch);
    return ph;
  }

  distToPlayer(): number {
    return dist(this.cx, this.cy, this.p.cx, this.p.cy);
  }

  dxToPlayer(): number {
    return this.p.cx - this.cx;
  }

  facePlayer(): void {
    const dx = this.dxToPlayer();
    if (Math.abs(dx) > 2) this.facing = sign(dx);
  }

  sees(range = this.def.sight): boolean {
    const p = this.p;
    if (p.state === 'dead') return false;
    const d = this.distToPlayer();
    if (d > range) return false;
    const facingOk = sign(p.cx - this.cx) === this.facing || d < 70 || this.state !== 'patrol' && this.state !== 'idle';
    if (!facingOk) return false;
    if (!this.world.lineOfSight(this.cx, this.cy - 4, p.cx, p.cy - 4)) return false;
    this.lastSeen.x = p.cx;
    this.lastSeen.y = p.cy;
    return true;
  }

  /** Is there floor in front of us (ledge awareness) and no hazard? */
  safeAhead(dir: number): boolean {
    const g = this.world.grid;
    const fx = dir > 0 ? this.body.x + this.body.w + 2 : this.body.x - 2;
    const tx = Math.floor(fx / TILE);
    const footRow = Math.floor((this.body.y + this.body.h + 2) / TILE);
    const below = g.tile(tx, footRow);
    if (below === T.Spike || below === T.Acid || below === T.Thorn || below === T.Water) return false;
    const solidBelow = g.isSolidAt(tx, footRow) || below === T.OneWay;
    if (!solidBelow) {
      // allow single-tile steps down
      const below2 = g.tile(tx, footRow + 1);
      if (!(g.isSolidAt(tx, footRow + 1) || below2 === T.OneWay)) return false;
    }
    const at = g.tile(tx, footRow - 1);
    if (at === T.Spike || at === T.Acid || at === T.Thorn) return false;
    return true;
  }

  wallAhead(dir: number): boolean {
    const g = this.world.grid;
    const fx = dir > 0 ? this.body.x + this.body.w + 1 : this.body.x - 1;
    const tx = Math.floor(fx / TILE);
    const r0 = Math.floor((this.body.y + 2) / TILE);
    const r1 = Math.floor((this.body.y + this.body.h - 2) / TILE);
    for (let r = r0; r <= r1; r++) if (g.isSolidAt(tx, r) || g.tile(tx, r) === T.Phase) return true;
    for (const s of this.world.solids) {
      if (!s.active || s.oneWay) continue;
      if (fx >= s.x && fx <= s.x + s.w && this.body.y + this.body.h > s.y && this.body.y < s.y + s.h) return true;
    }
    return false;
  }

  /** Walk horizontally with ledge/wall awareness. Returns false if blocked. */
  walk(dir: number, speed: number, dt: number, accel = 900): boolean {
    const b = this.body;
    if (dir === 0) {
      b.vx = approach(b.vx, 0, accel * dt);
      return true;
    }
    this.facing = dir;
    if (b.onGround && (!this.safeAhead(dir) || this.wallAhead(dir))) {
      b.vx = approach(b.vx, 0, accel * 2 * dt);
      return false;
    }
    b.vx = approach(b.vx, dir * speed, accel * dt);
    return true;
  }

  /** Steer a flyer toward a point. */
  fly(tx: number, ty: number, speed: number, dt: number, accel = 500): void {
    const dx = tx - this.cx;
    const dy = ty - this.cy;
    const d = Math.hypot(dx, dy) || 1;
    const s = Math.min(speed, d * 4);
    this.body.vx = approach(this.body.vx, (dx / d) * s, accel * dt);
    this.body.vy = approach(this.body.vy, (dy / d) * s, accel * dt);
    if (Math.abs(dx) > 4) this.facing = sign(dx);
  }

  /** Damage the player with a rectangle (melee active frames). */
  strike(r: Rect, dmg = this.def.dmg): boolean {
    return hurtPlayerRect(this.world, r.x, r.y, r.w, r.h, dmg, this.cx, { corrupt: this.def.corrupt, poison: this.def.poison, source: this });
  }

  frontRect(reach: number, h: number, oy = 0): Rect {
    const b = this.body;
    return { x: this.facing > 0 ? b.x + b.w - 2 : b.x - reach + 2, y: b.y + oy, w: reach, h };
  }

  update(dt: number): void {
    this.t += dt;
    const b = this.body;
    this.flashT = Math.max(0, this.flashT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    this.alertMark = Math.max(0, this.alertMark - dt);
    this.cd = Math.max(0, this.cd - dt);
    this.stateT += dt;
    if (this.deathT >= 0) {
      this.deathT += dt;
      b.vx *= 0.9;
      if (!this.def.flying) b.vy = Math.min(b.vy + 1200 * dt, 400);
      else b.vy += 300 * dt;
      stepBody(this.world.grid, this.world.solids, b, dt, this.moveOpts);
      this.x = b.x;
      this.y = b.y;
      if (this.deathT > 0.55) this.dead = true;
      return;
    }
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.burnTick -= dt;
      if (fxRng.next() < 0.5) this.world.fx.embers(this.cx, this.cy, 1);
      if (this.burnTick <= 0) {
        this.burnTick = 0.5;
        this.applyDamage(1.5 * this.world.stats.globalDamage, false);
        if (this.deathT >= 0) return;
      }
    }
    if (this.staggerT > 0) {
      this.staggerT -= dt;
      this.staggered = this.staggerT > 0;
      b.vx = approach(b.vx, 0, 600 * dt);
      if (this.def.flying) b.vy = approach(b.vy, 40, 300 * dt);
      if (!this.staggered) {
        this.staggerHits = 0;
        this.setState('chase');
      }
    } else {
      this.def.think(this, dt);
    }
    if (!this.def.flying && !this.ignoreGravity) {
      const g = this.def.gravity ?? 1300;
      b.vy = Math.min(b.vy + g * dt, 520);
    }
    stepBody(this.world.grid, this.world.solids, b, dt, this.moveOpts);
    // Keep inside the room
    b.x = clamp(b.x, 0, this.world.grid.pw - b.w);
    if (b.y > this.world.grid.ph + 40) {
      this.dead = true;
      return;
    }
    this.x = b.x;
    this.y = b.y;
    // Contact damage
    if (!this.def.noContact && !this.hidden && this.world.diff.contactDamage !== false) {
      if (this.state !== 'stagger' && !(this.def.noContact)) this.strike({ x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 });
    } else if (!this.def.noContact && !this.hidden && this.atkPhase === 2) {
      this.strike({ x: b.x + 1, y: b.y + 1, w: b.w - 2, h: b.h - 2 });
    }
    // Combat heat for dynamic music
    if ((this.state === 'chase' || this.state === 'attack') && this.distToPlayer() < 260) {
      this.world.combatHeat = 2;
      if (this.elite) this.world.eliteHeat = 2;
    }
    if (this.elite && fxRng.next() < 0.25) {
      this.world.fx.spawn(PK.Ember, this.cx + (fxRng.next() - 0.5) * this.w, this.bottom - fxRng.next() * this.h, 0, -30, 0.6, 1.2, semanticColors(this.world.settings).elite, { additive: true });
    }
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.deathT >= 0 || this.hidden) return { hit: false };
    const w = this.world;
    // Armour checks
    let armored = false;
    const heavy = hit.source === 'charged' || hit.source === 'drop' || hit.source === 'lance' || hit.source === 'spire';
    if (!this.staggered && !heavy) {
      if (this.def.armor === 'front' && hit.dir === -this.facing && hit.dirY === 0) armored = true;
      if (this.def.armor === 'top' && hit.dirY > 0) armored = true;
      if (this.def.armor === 'all') armored = true;
      if (this.guard && (this.guardAll || hit.dir === -this.facing)) armored = true;
    }
    this.hitT = 0.25;
    if (armored) {
      this.applyDamage(hit.damage * 0.15, hit.crit);
      w.fx.sparks(hit.x - hit.dir * this.w * 0.4, hit.y, -hit.dir, 10, '#fff4c8', 240);
      sfx('hit_armor', this.cx, this.cy);
      this.staggerHits += hit.stagger * 0.3;
      this.body.vx += hit.dir * 30 * this.def.weight;
      this.onArmorHit?.(hit);
      return { hit: true, armored: true, aether: false, bounce: true };
    }
    if (hit.burn) this.burnT = Math.max(this.burnT, hit.burn);
    const dmg = hit.damage * w.debugDamageMult;
    this.flashT = 0.12;
    // Knockback
    const kb = 150 * hit.knock * this.def.weight;
    this.body.vx = hit.dir * kb;
    if (this.def.flying) this.body.vy = hit.dirY * kb * 0.6 - 20;
    else if (hit.dirY < 0) this.body.vy = -kb * 0.6;
    // Effects
    const color = hit.crit ? '#ffcf5a' : '#fff2c0';
    w.fx.sparks(hit.x, hit.y, hit.dir, hit.crit ? 16 : 8, color, hit.crit ? 320 : 240);
    w.fx.burst(hit.x, hit.y, 5, this.def.color, 100, 0.4, 2);
    if (hit.crit) w.fx.ring(hit.x, hit.y, 3, 22, 0.25, '#ffcf5a');
    sfx(hit.crit ? 'crit' : heavy ? 'hit_heavy' : 'hit', this.cx, this.cy, 1, this.def.pitch);
    // Stagger
    this.staggerHits += hit.stagger;
    if (this.staggerHits >= this.def.stagger && this.staggerT <= 0) {
      this.staggerT = 1.1;
      this.staggered = true;
      this.atkPhase = 0;
      this.telegraph = 0;
      this.setState('stagger');
      w.fx.ring(this.cx, this.cy, 4, 26, 0.35, '#ffffff');
    }
    // Being hit always reveals the attacker
    if (this.state === 'idle' || this.state === 'patrol' || this.state === 'search' || this.state === 'return') {
      this.facing = sign(this.p.cx - this.cx) || this.facing;
      this.setState('chase');
    }
    this.onHurt?.(hit);
    this.applyDamage(dmg, hit.crit);
    return { hit: true, killed: this.deathT >= 0, aether: true };
  }

  onHurt?(hit: HitInfo): void;
  onArmorHit?(hit: HitInfo): void;

  applyDamage(dmg: number, _crit: boolean): void {
    this.hp -= dmg;
    if (this.hp <= 0) this.die();
  }

  die(): void {
    if (this.deathT >= 0) return;
    const w = this.world;
    this.deathT = 0;
    this.hittable = false;
    this.telegraph = 0;
    this.atkPhase = 0;
    w.progress.bestiary[this.def.id] = (w.progress.bestiary[this.def.id] ?? 0) + 1;
    w.progress.stats.kills++;
    if (this.flag) setFlag(w.progress, this.flag);
    w.dropFragments(this.cx, this.cy, Math.round(this.def.frags * (this.elite ? 3 : 1) * (w.progress.ngPlus > 0 ? 1.25 : 1)));
    if (this.elite) {
      this.p.gainAether(33);
      w.fx.ring(this.cx, this.cy, 6, 50, 0.5, semanticColors(w.settings).elite);
    }
    w.fx.burst(this.cx, this.cy, 18, this.def.color, 150, 0.7, 2.5);
    w.fx.smoke(this.cx, this.cy, 4, 'rgba(20,16,24,0.6)');
    w.fx.shards(this.cx, this.cy, 6, this.def.color, 160);
    w.hitstop(0.05);
    w.camera.shake(0.25, 0.1);
    sfx('enemy_die', this.cx, this.cy, 1, this.def.pitch);
    this.def.onDeath?.(this);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.hidden && this.def.category !== 'ambush') return;
    const fade = this.deathT >= 0 ? Math.max(0, 1 - this.deathT / 0.55) : 1;
    ctx.save();
    ctx.globalAlpha = fade;
    // Telegraph glow
    if (this.telegraph > 0) {
      const c = semanticColors(this.world.settings);
      const boost = this.world.settings.telegraphBoost ? 1.6 : 1;
      glow(ctx, this.cx, this.cy, (this.w + 18) * boost, c.dangerGlow, (0.3 + this.telegraph * 0.6) * boost);
    }
    if (this.elite) glow(ctx, this.cx, this.cy, this.w + 10, semanticColors(this.world.settings).elite, 0.25);
    this.def.draw(ctx, this);
    if (this.flashT > 0) {
      // White hit flash: redraw silhouette with additive tint
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fade * (this.flashT / 0.12) * 0.7;
      this.def.draw(ctx, this);
    }
    ctx.restore();
    if (this.alertMark > 0 && this.deathT < 0) {
      ctx.fillStyle = semanticColors(this.world.settings).danger;
      ctx.font = 'bold 10px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', this.cx, this.y - 6 - (0.5 - this.alertMark) * 8);
      ctx.textAlign = 'left';
    }
    if (this.staggered) {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const a = this.t * 4 + (i * Math.PI * 2) / 3;
        ctx.beginPath();
        ctx.arc(this.cx + Math.cos(a) * 7, this.y - 4 + Math.sin(a) * 2, 1.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}

function approach(v: number, target: number, delta: number): number {
  if (v < target) return Math.min(v + delta, target);
  if (v > target) return Math.max(v - delta, target);
  return target;
}
