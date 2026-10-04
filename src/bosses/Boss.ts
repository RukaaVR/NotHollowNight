import { Entity, type HitInfo, type HitResult } from '../world/Entity';
import type { BossLike, GameWorld } from '../world/GameWorld';
import { clamp, sign, type Rect } from '../core/math';
import { events, sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { hurtPlayerRect } from '../combat/combat';
import { glow } from '../rendering/draw';
import { semanticColors } from '../accessibility/settings';
import { Pickup } from '../world/objects/pickups';
import { TILE } from '../world/tiles';
import type { PickupType } from '../world/spawns';

export type BossState = 'dormant' | 'intro' | 'fight' | 'shift' | 'dying' | 'dead';

export interface BossReward {
  kind: PickupType;
  value: string;
}

export abstract class Boss extends Entity implements BossLike {
  abstract readonly id: string;
  abstract bossName: string;
  abstract bossTitle: string;
  hp = 100;
  maxHp = 100;
  phase = 0;
  phases = 3;
  /** HP fractions at which the next phase begins. */
  thresholds: number[] = [0.66, 0.33];
  staggerMeter = 0;
  staggerMax = 14;
  staggerT = 0;
  bossActive = false;
  bstate: BossState = 'dormant';
  stateT = 0;
  t = 0;
  facing = -1;
  move = '';
  moveT = 0;
  moveEnter = false;
  movePhase = 0;
  rest = 1;
  flashT = 0;
  hitT = 0;
  telegraph = 0;
  introRange = 170;
  /** Damage multiplier on contact. */
  contact = 1;
  invuln = false;
  deathT = 0;
  rewards: BossReward[] = [];
  /** Offsets for floating text etc. */
  vars: Record<string, number> = {};
  private lastMove = '';
  protected challenge = false;

  constructor(world: GameWorld, fx: number, fy: number, w: number, h: number) {
    super(world);
    this.w = w;
    this.h = h;
    this.x = fx - w / 2;
    this.y = fy - h;
    this.team = 'enemy';
    this.hittable = true;
    this.layer = 38;
  }

  protected setup(hp: number): void {
    const ng = this.world.progress.ngPlus > 0 ? 1.5 : 1;
    this.maxHp = Math.round(hp * ng);
    this.hp = this.maxHp;
    this.challenge = this.world.challengeBoss === this.id;
  }

  get p() {
    return this.world.player;
  }

  vx = 0;
  vy = 0;
  onGround = false;
  /** Simple arena physics: gravity, floor and side walls (1-tile room border). */
  physics(dt: number, gravity = 1400): void {
    const g = this.world.grid;
    this.vy = Math.min(this.vy + gravity * dt, 700);
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const minX = TILE;
    const maxX = g.pw - TILE - this.w;
    if (this.x < minX) { this.x = minX; this.vx = 0; }
    if (this.x > maxX) { this.x = maxX; this.vx = 0; }
    this.onGround = false;
    if (this.y + this.h >= this.floorY) {
      this.y = this.floorY - this.h;
      if (this.vy > 0) this.vy = 0;
      this.onGround = true;
    }
    if (this.y < TILE) { this.y = TILE; if (this.vy < 0) this.vy = 0; }
  }

  atWall(dir: number): boolean {
    const g = this.world.grid;
    return dir < 0 ? this.x <= TILE + 1 : this.x >= g.pw - TILE - this.w - 1;
  }

  get arena(): Rect {
    return { x: 0, y: 0, w: this.world.grid.pw, h: this.world.grid.ph };
  }

  get floorY(): number {
    return this.world.grid.ph - TILE;
  }

  tele(t: number): number {
    return t * this.world.diff.telegraph * (this.world.settings.telegraphBoost ? 1.3 : 1) * (this.phase >= this.phases - 1 ? 0.9 : 1);
  }

  /** Advance the current move through phases; returns 1..n or n+1 when done. */
  step(dt: number, ...durations: number[]): number {
    this.moveT += dt;
    let acc = 0;
    let ph = durations.length + 1;
    for (let i = 0; i < durations.length; i++) {
      const d = i === 0 ? this.tele(durations[i]) : durations[i];
      acc += d;
      if (this.moveT < acc) {
        ph = i + 1;
        break;
      }
    }
    this.moveEnter = ph !== this.movePhase;
    this.movePhase = ph;
    if (ph === 1) this.telegraph = clamp(this.moveT / this.tele(durations[0]), 0, 1);
    else this.telegraph = 0;
    return ph;
  }

  startMove(name: string): void {
    this.move = name;
    this.moveT = 0;
    this.movePhase = 0;
    this.lastMove = name;
  }

  endMove(restMult = 1): void {
    this.move = '';
    this.telegraph = 0;
    const base = [1.0, 0.8, 0.6, 0.45][Math.min(3, this.phase)];
    this.rest = base * restMult * this.world.diff.aggression * (this.world.progress.ngPlus > 0 ? 0.8 : 1);
  }

  /** Pick a move from a weighted list, avoiding immediate repeats. */
  pick(options: [string, number][]): string {
    const filtered = options.filter(([m]) => m !== this.lastMove || options.length === 1);
    const total = filtered.reduce((s, [, w]) => s + w, 0);
    let r = fxRng.next() * total;
    for (const [m, w] of filtered) {
      r -= w;
      if (r <= 0) return m;
    }
    return filtered[0][0];
  }

  facePlayer(): void {
    const dx = this.p.cx - this.cx;
    if (Math.abs(dx) > 4) this.facing = sign(dx);
  }

  hurtRect(r: Rect, dmg = 1, opts?: { corrupt?: number; poison?: number }): boolean {
    return hurtPlayerRect(this.world, r.x, r.y, r.w, r.h, dmg, this.cx, { ...opts, source: this });
  }

  // ------------------------------------------------------------------

  update(dt: number): void {
    this.t += dt;
    this.stateT += dt;
    this.flashT = Math.max(0, this.flashT - dt);
    this.hitT = Math.max(0, this.hitT - dt);
    const w = this.world;
    switch (this.bstate) {
      case 'dormant':
        this.idle(dt);
        if (this.p.state !== 'dead' && Math.abs(this.p.cx - this.cx) < this.introRange && Math.abs(this.p.cy - this.cy) < 160) this.beginIntro();
        break;
      case 'intro':
        this.intro(dt);
        if (this.stateT > 3.2) {
          this.bstate = 'fight';
          this.stateT = 0;
          w.camera.focus = null;
          w.cutsceneLock = false;
          this.p.setState('normal');
          this.rest = 0.6;
        }
        break;
      case 'shift':
        this.invuln = true;
        this.shift(dt);
        if (this.stateT > 1.4) {
          this.invuln = false;
          this.bstate = 'fight';
          this.stateT = 0;
          this.rest = 0.4;
        }
        break;
      case 'fight':
        if (this.staggerT > 0) {
          this.staggerT -= dt;
          this.staggered = this.staggerT > 0;
          this.staggerTick(dt);
          if (!this.staggered) this.staggerMeter = 0;
          break;
        }
        if (this.move) this.runMove(this.move, dt);
        else {
          this.rest -= dt;
          this.idle(dt);
          if (this.rest <= 0 && this.p.state !== 'dead') this.startMove(this.chooseMove());
        }
        // Contact damage
        if (!this.invuln && this.contact > 0) for (const r of this.contactRects()) this.hurtRect(r, this.contact);
        break;
      case 'dying':
        this.dying(dt);
        if (this.stateT > 3) this.finish();
        break;
      case 'dead':
        this.deadUpdate(dt);
        break;
    }
    if (this.p.state === 'dead' && this.bossActive) {
      // Reset on player death so the fight starts fresh next time.
      this.bossActive = false;
    }
  }

  beginIntro(): void {
    const w = this.world;
    this.bstate = 'intro';
    this.stateT = 0;
    this.bossActive = true;
    w.activeBoss = this;
    w.camera.lock = { x: 0, y: 0, w: w.grid.pw, h: w.grid.ph };
    w.camera.focus = { x: this.cx, y: this.cy };
    w.cutsceneLock = true;
    this.p.setState('locked');
    this.p.cancelAttack();
    events.emit('music', { state: 'silence' });
    events.emit('musicTheme', { theme: `boss_${this.id}` });
    sfx('boss_roar', this.cx, this.cy);
    w.camera.shake(0.6, 0.8);
    events.emit('bossIntro', { name: this.bossName, title: this.bossTitle });
    this.onIntro();
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.bstate !== 'fight' || this.invuln) {
      if (this.bstate === 'dormant') this.beginIntro();
      return { hit: this.bstate === 'fight', armored: true };
    }
    const w = this.world;
    let dmg = hit.damage * w.debugDamageMult;
    if (this.staggered) dmg *= 1.25;
    const mod = this.modifyHit(hit);
    if (mod === 'block') {
      w.fx.sparks(hit.x, hit.y, -hit.dir, 10, '#fff4c8', 240);
      sfx('hit_armor', this.cx, this.cy);
      return { hit: true, armored: true, bounce: true };
    }
    dmg *= mod;
    this.hp -= dmg;
    this.flashT = 0.1;
    this.hitT = 0.2;
    w.fx.sparks(hit.x, hit.y, hit.dir, hit.crit ? 16 : 9, hit.crit ? '#ffcf5a' : '#fff2c0', hit.crit ? 320 : 240);
    w.fx.burst(hit.x, hit.y, 6, this.bloodColor(), 110, 0.45, 2.2);
    if (hit.crit) w.fx.ring(hit.x, hit.y, 3, 26, 0.25, '#ffcf5a');
    sfx(hit.crit ? 'crit' : hit.source === 'charged' ? 'hit_heavy' : 'hit', this.cx, this.cy, 1, 0.75);
    if (!this.staggered) {
      this.staggerMeter += hit.stagger;
      if (this.staggerMeter >= this.staggerMax) this.stagger();
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.die();
    } else if (this.phase < this.thresholds.length && this.hp / this.maxHp <= this.thresholds[this.phase]) {
      this.phase++;
      this.move = '';
      this.telegraph = 0;
      this.staggerT = 0;
      this.staggered = false;
      this.bstate = 'shift';
      this.stateT = 0;
      sfx('boss_phase', this.cx, this.cy);
      w.camera.shake(0.7, 0.5);
      events.emit('flash', { color: '#ffffff', time: 0.3, alpha: 0.35 });
      this.onPhase(this.phase);
    }
    return { hit: true, aether: true, bounce: true };
  }

  stagger(): void {
    this.staggerT = 2.2;
    this.staggered = true;
    this.move = '';
    this.telegraph = 0;
    this.world.fx.ring(this.cx, this.cy, 6, 60, 0.5, '#ffffff');
    this.world.camera.shake(0.4, 0.2);
    sfx('boss_phase', this.cx, this.cy, 0.6, 1.4);
    this.onStagger();
  }

  die(): void {
    const w = this.world;
    this.bstate = 'dying';
    this.stateT = 0;
    this.move = '';
    this.telegraph = 0;
    this.hittable = false;
    this.staggered = false;
    w.hitstop(0.35);
    w.timeScale = 0.25;
    w.camera.shake(1, 1.2);
    w.camera.focus = { x: this.cx, y: this.cy };
    w.camera.targetZoom = 1.15;
    events.emit('flash', { color: '#ffffff', time: 0.6, alpha: 0.7 });
    sfx('boss_die', this.cx, this.cy);
    w.input.rumble(1, 1, 900);
    // Clear hostile projectiles so the moment is clean.
    for (const p of w.projectiles) if (p.team === 'enemy') p.active = false;
    this.onDeathStart();
  }

  private finish(): void {
    const w = this.world;
    this.bstate = 'dead';
    this.stateT = 0;
    this.bossActive = false;
    w.camera.focus = null;
    w.camera.targetZoom = 1;
    w.camera.lock = null;
    w.victoryT = 6;
    if (this.challenge) {
      w.onChallengeComplete(this.id);
      return;
    }
    const first = !w.progress.bosses[this.id];
    w.progress.bosses[this.id] = Math.max(1, Math.round(w.progress.playTime));
    w.progress.flags[`boss_${this.id}`] = 1;
    events.emit('bossDefeated', { id: this.id });
    if (first) {
      this.rewards.forEach((r, i) => {
        const id = `boss_${this.id}_${i}`;
        if (w.progress.pickups[id]) return;
        const px = clamp(this.cx + (i - (this.rewards.length - 1) / 2) * 28, 24, w.grid.pw - 24);
        w.add(new Pickup(w, px - 8, this.floorY - 40, r.kind, id, r.value));
      });
      this.onDefeated();
    }
    w.save();
  }

  /** Draws a red warning rectangle for telegraphed attacks. */
  warnRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number): void {
    const c = semanticColors(this.world.settings);
    const boost = this.world.settings.telegraphBoost ? 1.6 : 1;
    ctx.fillStyle = c.dangerGlow;
    ctx.globalAlpha = Math.min(1, (0.2 + a * 0.4) * boost);
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = Math.min(1, (0.5 + a * 0.5));
    ctx.strokeStyle = c.danger;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.globalAlpha = 1;
  }

  warnCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, a: number): void {
    const c = semanticColors(this.world.settings);
    ctx.globalAlpha = Math.min(1, 0.25 + a * 0.5);
    ctx.fillStyle = c.dangerGlow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = c.danger;
    ctx.lineWidth = 0.8;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.bstate === 'dead' && !this.drawsCorpse()) return;
    ctx.save();
    if (this.telegraph > 0) {
      const c = semanticColors(this.world.settings);
      glow(ctx, this.cx, this.cy, Math.max(this.w, this.h) * 0.9, c.dangerGlow, 0.25 + this.telegraph * 0.4);
    }
    if (this.staggered) glow(ctx, this.cx, this.cy, Math.max(this.w, this.h), '#ffffff', 0.25 + 0.1 * Math.sin(this.t * 10));
    const dyingShake = this.bstate === 'dying' ? (fxRng.next() - 0.5) * 3 : 0;
    ctx.translate(dyingShake, 0);
    this.drawBoss(ctx);
    if (this.flashT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (this.flashT / 0.1) * 0.6;
      this.drawBoss(ctx);
    }
    ctx.restore();
    this.drawEffects?.(ctx);
  }

  // ---- hooks -------------------------------------------------------
  protected abstract chooseMove(): string;
  protected abstract runMove(name: string, dt: number): void;
  protected abstract drawBoss(ctx: CanvasRenderingContext2D): void;
  protected contactRects(): Rect[] {
    return [{ x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 }];
  }
  protected idle(_dt: number): void {}
  protected intro(_dt: number): void {}
  protected shift(_dt: number): void {}
  protected staggerTick(_dt: number): void {}
  protected dying(dt: number): void {
    if (fxRng.next() < 0.6) {
      const x = this.x + fxRng.next() * this.w;
      const y = this.y + fxRng.next() * this.h;
      this.world.fx.burst(x, y, 6, this.bloodColor(), 120, 0.6, 2.5);
      if (fxRng.next() < 0.2) sfx('explode', x, y, 0.4, 1.4);
    }
    void dt;
  }
  protected deadUpdate(_dt: number): void {}
  protected onIntro(): void {}
  protected onPhase(_n: number): void {}
  protected onStagger(): void {}
  protected onDeathStart(): void {}
  protected onDefeated(): void {}
  protected modifyHit(_hit: HitInfo): number | 'block' {
    return 1;
  }
  protected bloodColor(): string {
    return '#e8e0ff';
  }
  protected drawsCorpse(): boolean {
    return true;
  }
  drawEffects?(ctx: CanvasRenderingContext2D): void;
}
