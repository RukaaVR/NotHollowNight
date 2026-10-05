import { Boss } from './Boss';
import type { GameWorld } from '../world/GameWorld';
import type { Rect } from '../core/math';
import { TAU, clamp, sign, dist } from '../core/math';
import { sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { glow, ellipse, blob, fillCircle, eye } from '../rendering/draw';
import { T, TILE } from '../world/tiles';
import { PK } from '../vfx/Particles';
import { Entity, type HitInfo, type HitResult } from '../world/Entity';

// =====================================================================
// THE BELL WARDEN — Drowned City. The bells stopped; it did not.
// =====================================================================
export class BellWarden extends Boss {
  readonly id = 'bell_warden';
  bossName = 'THE BELL WARDEN';
  bossTitle = 'Who Keeps the Silent Hours';
  bells: { x: number; t: number; fell: boolean; y: number }[] = [];
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 30, 48);
    this.setup(240);
    this.staggerMax = 16;
    this.rewards = [{ kind: 'ability', value: 'dive' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const d = Math.abs(this.p.cx - this.cx);
    const opts: [string, number][] = [['toll', 2], ['charge', d > 90 ? 3 : 1], ['hammer', d < 80 ? 3 : 1]];
    if (this.phase >= 1) opts.push(['bells', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      this.facePlayer();
      const d = this.p.cx - this.cx;
      this.vx = Math.abs(d) > 70 ? sign(d) * 40 : this.vx * 0.85;
    }
    this.physics(dt);
    this.tickBells(dt);
  }

  private tickBells(dt: number): void {
    const w = this.world;
    for (const b of this.bells) {
      b.t += dt;
      if (b.t > this.tele(0.9)) {
        if (!b.fell) {
          b.y += 520 * dt;
          this.hurtRect({ x: b.x - 10, y: b.y - 12, w: 20, h: 22 });
          if (b.y >= this.floorY - 10) {
            b.fell = true;
            w.camera.shake(0.4, 0.15);
            sfx('bell', b.x, b.y, 0.8, 0.7);
            w.fx.shards(b.x, this.floorY, 10, '#c8a050', 200);
            w.spawnProjectile('wave', b.x - 12, this.floorY - 4, -140, 0, { r: 5, life: 0.9, color: '#e0c890' });
            w.spawnProjectile('wave', b.x + 12, this.floorY - 4, 140, 0, { r: 5, life: 0.9, color: '#e0c890' });
          }
        }
      }
    }
    this.bells = this.bells.filter((b) => !b.fell || b.t < this.tele(0.9) + 1.2);
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'hammer': {
        const ph = this.step(dt, 0.75, 0.15, 0.6);
        this.vx *= 0.8;
        if (ph === 2) {
          if (this.moveEnter) {
            w.camera.shake(0.55, 0.2);
            sfx('boss_slam', this.cx, this.cy);
            w.fx.dust(this.cx + this.facing * 30, this.floorY, 12, 'rgba(160,200,210,0.6)', 120);
            if (this.phase >= 1) for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + this.facing * 30 + s * 8, this.floorY - 4, s * 170, 0, { r: 6, life: 1.6, color: '#9fe8ff' });
          }
          this.hurtRect({ x: this.facing > 0 ? this.x + this.w - 4 : this.x - 44, y: this.y + 4, w: 48, h: this.h - 4 });
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'toll': {
        const reps = this.phase >= 2 ? 2 : 1;
        const ph = this.step(dt, 0.8, 0.1, 0.5);
        this.vx *= 0.8;
        if (ph === 2 && this.moveEnter) {
          const n = 12;
          const off = (this.vars.reps ?? 0) * (Math.PI / n);
          for (let i = 0; i < n; i++) {
            const a = off + (i / n) * TAU;
            w.spawnProjectile('orb', this.cx, this.y + 8, Math.cos(a) * 110, Math.sin(a) * 110, { r: 4, life: 2.6, color: '#cfe8ff' });
          }
          w.spawnProjectile('bellring', this.cx, this.y + 8, 0, 0, { r: 10, life: 0.5, wall: false, dmg: 0 });
          sfx('bell', this.cx, this.cy, 1, 0.5);
          w.camera.shake(0.35, 0.3);
        }
        if (ph === 4) {
          this.vars.reps = (this.vars.reps ?? 0) + 1;
          if (this.vars.reps < reps) {
            this.moveT = 0;
            this.movePhase = 0;
          } else {
            this.vars.reps = 0;
            this.endMove();
          }
        }
        break;
      }
      case 'charge': {
        const ph = this.step(dt, 0.7, 1.2, 0.5);
        if (ph === 1) this.vx = -this.facing * 30;
        if (ph === 2) {
          this.vx = this.facing * 300;
          if (fxRng.next() < 0.5) w.fx.dust(this.cx, this.floorY, 2);
          if (this.atWall(this.facing)) {
            w.camera.shake(0.5, 0.2);
            sfx('boss_slam', this.cx, this.cy, 0.8, 0.8);
            this.moveT = this.tele(0.7) + 1.2;
            this.vx = -this.facing * 120;
            if (this.phase === 0) {
              this.staggerT = 1.2;
              this.staggered = true;
            }
          }
        }
        if (ph === 3) this.vx *= 0.85;
        if (ph === 4) this.endMove();
        break;
      }
      case 'bells': {
        const ph = this.step(dt, 0.5, 0.1, 0.8);
        this.vx *= 0.8;
        if (ph === 2 && this.moveEnter) {
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? this.p.cx : TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4);
            this.bells.push({ x: clamp(x, TILE * 2, w.grid.pw - TILE * 2), t: -i * 0.25, fell: false, y: TILE * 1.5 });
          }
          sfx('bell', this.cx, 0, 0.6, 1.4);
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.physics(dt);
    this.tickBells(dt);
  }

  protected onPhase(n: number): void {
    if (n === 2) {
      // The water rises: the arena floods ankle-deep, slowing every step.
      const g = this.world.grid;
      for (let x = 1; x < g.w - 1; x++) {
        for (const y of [g.h - 2]) if (g.tile(x, y) === T.Empty) g.set(x, y, T.Shallow);
      }
      this.world.fx.splash(this.world.grid.pw / 2, this.floorY, 30);
      this.world.ui.hint('The drowned water rises around you.');
    }
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const by = this.y + this.h;
    ctx.save();
    ctx.translate(this.cx, by);
    ctx.scale(this.facing, 1);
    // Robed body heavy with seaweed
    ctx.fillStyle = '#1e3038';
    blob(ctx, [-15, 0, -16, -26, -8, -34, 8, -34, 16, -26, 15, 0]);
    ctx.fill();
    ctx.strokeStyle = '#3a6a4a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.moveTo(-12 + i * 6, -30);
      ctx.quadraticCurveTo(-13 + i * 6 + Math.sin(this.t * 2 + i), -14, -12 + i * 6, -2);
      ctx.stroke();
    }
    // The bell head
    const ring = this.move === 'toll' && this.movePhase === 1 ? Math.sin(this.t * 40) * 0.12 * this.telegraph : 0;
    ctx.save();
    ctx.translate(0, -34);
    ctx.rotate(ring);
    ctx.fillStyle = '#8a7040';
    ctx.beginPath();
    ctx.moveTo(-5, -14);
    ctx.quadraticCurveTo(-12, -6, -13, 2);
    ctx.lineTo(13, 2);
    ctx.quadraticCurveTo(12, -6, 5, -14);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#c8a860';
    ctx.fillRect(-13, 0, 26, 2.5);
    ctx.fillStyle = '#0a1418';
    ellipse(ctx, 0, 2, 10, 2.5);
    ctx.fill();
    eye(ctx, 0, 1, 1.8, this.telegraph > 0 ? '#ff7a50' : '#9fe8ff', 1.2);
    ctx.restore();
    // Hammer
    let ang = -0.2;
    if (this.move === 'hammer') ang = this.movePhase === 1 ? -0.2 - this.telegraph * 2.2 : 1.5;
    ctx.save();
    ctx.translate(6, -26);
    ctx.rotate(ang);
    ctx.fillStyle = '#3a3030';
    ctx.fillRect(0, -1.5, 30, 3);
    ctx.fillStyle = '#6a6070';
    ctx.fillRect(26, -8, 10, 16);
    ctx.restore();
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bells) {
      if (b.t > 0 && b.t < this.tele(0.9)) {
        this.warnRect(ctx, b.x - 10, this.floorY - 3, 20, 3, b.t / this.tele(0.9));
        ctx.strokeStyle = '#3a3030';
        ctx.beginPath();
        ctx.moveTo(b.x, 0);
        ctx.lineTo(b.x, b.y - 10);
        ctx.stroke();
      }
      if (b.t > 0) {
        ctx.fillStyle = '#8a7040';
        ctx.beginPath();
        ctx.moveTo(b.x - 3, b.y - 10);
        ctx.quadraticCurveTo(b.x - 9, b.y - 2, b.x - 10, b.y + 8);
        ctx.lineTo(b.x + 10, b.y + 8);
        ctx.quadraticCurveTo(b.x + 9, b.y - 2, b.x + 3, b.y - 10);
        ctx.fill();
      }
    }
  }
}

// =====================================================================
// THE WARDEN OF ASH — Ashen Foundry.
// =====================================================================
export class AshWarden extends Boss {
  readonly id = 'ash_warden';
  bossName = 'THE WARDEN OF ASH';
  bossTitle = 'Last Fire of the Foundry';
  flail = { x: 0, y: 0, active: false };
  geysers: { x: number; t: number }[] = [];
  walls = 0;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 28, 46);
    this.setup(260);
    this.staggerMax = 18;
    this.rewards = [{ kind: 'ability', value: 'drop' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const opts: [string, number][] = [['flail', 3], ['eruption', 2], ['dash', 2]];
    if (this.phase >= 1) opts.push(['firewave', 2]);
    if (this.phase >= 2) opts.push(['inferno', 1]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      this.facePlayer();
      const d = this.p.cx - this.cx;
      this.vx = Math.abs(d) > 90 ? sign(d) * 46 : Math.abs(d) < 40 ? -sign(d) * 30 : this.vx * 0.85;
    }
    this.physics(dt);
    this.tickHazards(dt);
  }

  private tickHazards(dt: number): void {
    const w = this.world;
    for (const g of this.geysers) {
      g.t += dt;
      const fire = this.tele(0.8);
      if (g.t > fire && g.t < fire + 0.9) {
        this.hurtRect({ x: g.x - 10, y: this.floorY - 80, w: 20, h: 80 });
        if (fxRng.next() < 0.8) w.fx.embers(g.x, this.floorY - fxRng.next() * 70, 2, '#ffb060');
      }
    }
    this.geysers = this.geysers.filter((g) => g.t < this.tele(0.8) + 1);
    if (this.walls > 0) {
      const ww = TILE * 2.5;
      this.hurtRect({ x: TILE, y: 0, w: ww - TILE, h: this.floorY });
      this.hurtRect({ x: w.grid.pw - ww, y: 0, w: ww - TILE, h: this.floorY });
      if (fxRng.next() < 0.8) {
        w.fx.embers(TILE + fxRng.next() * (ww - TILE), this.floorY - fxRng.next() * this.floorY, 1);
        w.fx.embers(w.grid.pw - ww + fxRng.next() * (ww - TILE), this.floorY - fxRng.next() * this.floorY, 1);
      }
    }
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'flail': {
        const ph = this.step(dt, 0.6, 1.2, 0.4);
        this.vx *= 0.85;
        if (ph === 1 && this.moveEnter) {
          this.vars.tx = this.p.cx;
          this.vars.ty = this.p.cy;
        }
        if (ph === 2) {
          if (this.moveEnter) sfx('swing_heavy', this.cx, this.cy, 1, 0.5);
          const u = (this.moveT - this.tele(0.6)) / 1.2;
          const k = Math.sin(u * Math.PI);
          const hx = this.cx + this.facing * 6;
          const hy = this.y + 12;
          this.flail.active = true;
          this.flail.x = hx + (this.vars.tx - hx) * k + Math.sin(u * TAU) * 20;
          this.flail.y = hy + (this.vars.ty - hy) * k - Math.sin(u * Math.PI) * 30;
          this.hurtRect({ x: this.flail.x - 8, y: this.flail.y - 8, w: 16, h: 16 });
          if (fxRng.next() < 0.6) w.fx.embers(this.flail.x, this.flail.y, 1);
        } else this.flail.active = false;
        if (ph === 4) this.endMove();
        break;
      }
      case 'eruption': {
        const ph = this.step(dt, 0.4, 0.1, 0.6);
        this.vx *= 0.85;
        if (ph === 2 && this.moveEnter) {
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? this.p.cx : TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6);
            this.geysers.push({ x, t: -i * 0.15 });
          }
          sfx('boss_charge', this.cx, this.cy, 0.8, 0.6);
          w.camera.shake(0.3, 0.6);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'dash': {
        const ph = this.step(dt, 0.55, 0.4, 0.5);
        if (ph === 2) {
          if (this.moveEnter) sfx('dash', this.cx, this.cy, 1, 0.6);
          this.vx = this.facing * 330;
          w.fx.embers(this.cx, this.cy, 1);
          if (this.moveT > this.tele(0.55) + 0.25) this.hurtRect({ x: this.facing > 0 ? this.x + this.w - 4 : this.x - 36, y: this.y + 6, w: 40, h: 34 });
        } else this.vx *= 0.8;
        if (ph === 4) this.endMove();
        break;
      }
      case 'firewave': {
        const ph = this.step(dt, 0.6, 0.1, 0.7);
        this.vx *= 0.85;
        if (ph === 2 && this.moveEnter) {
          w.spawnProjectile('wave', this.cx + this.facing * 16, this.floorY - 4, this.facing * 200, 0, { r: 9, life: 2.6, color: '#ff7a3a' });
          w.spawnProjectile('wave', this.cx - this.facing * 16, this.floorY - 4, -this.facing * 120, 0, { r: 7, life: 2.6, color: '#ff7a3a' });
          sfx('boss_slam', this.cx, this.cy, 0.8, 0.8);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'inferno': {
        const ph = this.step(dt, 0.8, 2.0, 0.6);
        this.vx *= 0.85;
        if (ph === 2 && Math.floor(this.moveT * 4) !== Math.floor((this.moveT - dt) * 4)) {
          this.geysers.push({ x: this.p.cx + (fxRng.next() - 0.5) * 20, t: 0 });
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.physics(dt);
    this.tickHazards(dt);
  }

  protected onPhase(n: number): void {
    if (n === 2) {
      this.walls = 1;
      this.world.ui.hint('The Foundry walls ignite. The arena closes in.');
    }
  }

  protected onDeathStart(): void {
    this.walls = 0;
    this.geysers = [];
    this.flail.active = false;
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const by = this.y + this.h;
    ctx.save();
    ctx.translate(this.cx, by);
    ctx.scale(this.facing, 1);
    // Legs
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(-9, -12, 6, 12);
    ctx.fillRect(3, -12, 6, 12);
    // Plated body with glowing seams
    ctx.fillStyle = '#2e2420';
    blob(ctx, [-13, -10, -14, -30, -6, -40, 6, -40, 14, -30, 13, -10]);
    ctx.fill();
    ctx.strokeStyle = '#ff8a40';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -38);
    ctx.lineTo(0, -12);
    ctx.moveTo(-10, -26);
    ctx.lineTo(10, -26);
    ctx.stroke();
    glow(ctx, 0, -26, 22, '#ff7a30', 0.5 + this.telegraph * 0.4);
    // Helm crowned with a ring of fire
    ctx.fillStyle = '#3a2e2a';
    ctx.beginPath();
    ctx.arc(0, -43, 6, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#0a0606';
    ctx.fillRect(-1, -44, 7, 2);
    eye(ctx, 3, -43, 1.3, '#ffd070', 1);
    for (let i = 0; i < 5; i++) {
      const fx = -6 + i * 3;
      const fh = 4 + Math.sin(this.t * 14 + i) * 2;
      ctx.fillStyle = '#ffb060';
      ctx.beginPath();
      ctx.moveTo(fx - 1.5, -48);
      ctx.quadraticCurveTo(fx, -48 - fh * 2, fx + 1.5, -48);
      ctx.fill();
    }
    // Arm holding the chain
    ctx.strokeStyle = '#3a2e2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(6, -32);
    ctx.lineTo(13, -24);
    ctx.stroke();
    ctx.restore();
    // Flail (world space)
    const hx = this.cx + this.facing * 13;
    const hy = this.y + this.h - 24;
    const fxp = this.flail.active ? this.flail.x : hx + this.facing * 6 + Math.sin(this.t * 3) * 3;
    const fyp = this.flail.active ? this.flail.y : hy + 14;
    ctx.strokeStyle = '#5a4a40';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 1]);
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(fxp, fyp);
    ctx.stroke();
    ctx.setLineDash([]);
    fillCircle(ctx, fxp, fyp, 6, '#3a2a24');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + this.t * 4;
      fillCircle(ctx, fxp + Math.cos(a) * 6, fyp + Math.sin(a) * 6, 1.5, '#5a4a40');
    }
    glow(ctx, fxp, fyp, 14, '#ff8a40', 0.6);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    for (const g of this.geysers) {
      const fire = this.tele(0.8);
      if (g.t > 0 && g.t < fire) this.warnRect(ctx, g.x - 10, this.floorY - 3, 20, 3, g.t / fire);
      else if (g.t >= fire) {
        const k = Math.min(1, (g.t - fire) / 0.1) * Math.max(0, 1 - (g.t - fire - 0.7) / 0.2);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,140,60,0.5)';
        ctx.fillRect(g.x - 10, this.floorY - 80 * k, 20, 80 * k);
        ctx.fillStyle = 'rgba(255,230,160,0.8)';
        ctx.fillRect(g.x - 4, this.floorY - 80 * k, 8, 80 * k);
        ctx.restore();
      }
    }
    if (this.walls > 0) {
      const ww = TILE * 2.5;
      for (const x0 of [TILE, w.grid.pw - ww]) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,110,40,${0.25 + 0.08 * Math.sin(this.t * 10)})`;
        ctx.fillRect(x0, 0, ww - TILE, this.floorY);
        ctx.restore();
      }
    }
  }

  protected bloodColor(): string {
    return '#ffb060';
  }
}

// =====================================================================
// THE INK ARCHIVIST — Sunken Archive.
// =====================================================================
class InkClone extends Entity {
  t = 0;
  fired = false;
  constructor(world: GameWorld, x: number, y: number, public owner: InkArchivist) {
    super(world);
    this.x = x - 12;
    this.y = y - 17;
    this.w = 24;
    this.h = 34;
    this.team = 'enemy';
    this.hittable = true;
    this.layer = 37;
  }
  takeHit(_h: HitInfo): HitResult {
    this.dead = true;
    this.world.fx.burst(this.cx, this.cy, 16, '#2a2040', 120, 0.6, 3);
    sfx('enemy_die', this.cx, this.cy, 0.6, 1.3);
    return { hit: true, aether: true };
  }
  update(dt: number): void {
    this.t += dt;
    if (this.owner.bstate !== 'fight') this.dead = true;
    if (!this.fired && this.t > 1.4) {
      this.fired = true;
      const p = this.world.player;
      const a = Math.atan2(p.cy - this.cy, p.cx - this.cx);
      for (let i = -1; i <= 1; i++) this.world.spawnProjectile('page', this.cx, this.cy, Math.cos(a + i * 0.25) * 140, Math.sin(a + i * 0.25) * 140, { r: 3, life: 2 });
    }
    if (this.t > 6) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = 0.85;
    this.owner.drawFigure(ctx, this.cx, this.y + this.h, this.t, false);
    ctx.globalAlpha = 1;
  }
}

export class InkArchivist extends Boss {
  readonly id = 'archivist';
  bossName = 'THE INK ARCHIVIST';
  bossTitle = 'Keeper of the Unread';
  pools: { x: number; t: number }[] = [];
  quills: { x: number; t: number }[] = [];
  fade = 1;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 24, 34);
    this.setup(240);
    this.staggerMax = 14;
    this.rewards = [{ kind: 'ability', value: 'glide' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const opts: [string, number][] = [['pages', 3], ['inkwave', 2], ['quills', 2], ['blink', 2]];
    if (this.phase >= 1) opts.push(['clones', 2]);
    if (this.phase >= 2) opts.push(['pools', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate !== 'fight') {
      this.y += Math.sin(this.t * 2) * 6 * dt;
      return;
    }
    this.facePlayer();
    const ty = this.floorY - 70 + Math.sin(this.t * 1.5) * 8;
    this.y += (ty - this.y) * Math.min(1, dt * 2);
    const tx = this.p.cx + (this.cx < this.p.cx ? -110 : 110);
    this.x += (clamp(tx, TILE * 2, this.world.grid.pw - TILE * 2) - this.cx) * Math.min(1, dt * 0.8);
    this.tickPools(dt);
  }

  private tickPools(dt: number): void {
    for (const p of this.pools) {
      p.t += dt;
      if (p.t > this.tele(0.7) && p.t < this.tele(0.7) + 2) this.hurtRect({ x: p.x - 18, y: this.floorY - 8, w: 36, h: 8 });
    }
    this.pools = this.pools.filter((p) => p.t < this.tele(0.7) + 2.2);
    for (const q of this.quills) {
      const before = q.t;
      q.t += dt;
      if (before < this.tele(0.5) && q.t >= this.tele(0.5)) this.world.spawnProjectile('needle', q.x, TILE + 2, 0, 320, { r: 3.5, life: 1.5, color: '#2a2040' });
    }
    this.quills = this.quills.filter((q) => q.t < this.tele(0.5) + 0.1);
  }

  private blinkTo(x: number, y: number): void {
    this.world.fx.burst(this.cx, this.cy, 16, '#2a2040', 100, 0.6, 3);
    this.x = clamp(x, TILE * 2, this.world.grid.pw - TILE * 2 - this.w) ;
    this.y = y;
    this.world.fx.burst(this.cx, this.cy, 16, '#2a2040', 100, 0.6, 3);
    sfx('teleport', this.cx, this.cy, 0.7, 0.8);
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'pages': {
        const ph = this.step(dt, 0.6, 0.1, 0.5);
        if (ph === 2 && this.moveEnter) {
          const a = Math.atan2(this.p.cy - this.cy, this.p.cx - this.cx);
          const n = 5 + this.phase * 2;
          for (let i = 0; i < n; i++) w.spawnProjectile('page', this.cx, this.cy, Math.cos(a + (i - (n - 1) / 2) * 0.17) * 170, Math.sin(a + (i - (n - 1) / 2) * 0.17) * 170, { r: 3.5, life: 2.4 });
          sfx('enemy_shoot', this.cx, this.cy, 1, 1.3);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'inkwave': {
        const ph = this.step(dt, 0.7, 0.1, 0.6);
        if (ph === 1) this.y += (this.floorY - this.h - this.y) * Math.min(1, dt * 6);
        if (ph === 2 && this.moveEnter) {
          for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + s * 14, this.floorY - 4, s * 160, 0, { r: 8, life: 2.4, color: '#3a2a50' });
          sfx('splash', this.cx, this.cy, 1, 0.5);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'quills': {
        const ph = this.step(dt, 0.4, 0.1, 1.2);
        if (ph === 2 && this.moveEnter) {
          const n = 10;
          const dir = this.p.cx < w.grid.pw / 2 ? 1 : -1;
          for (let i = 0; i < n; i++) {
            const x = dir > 0 ? TILE * 2 + i * ((w.grid.pw - TILE * 4) / n) : w.grid.pw - TILE * 2 - i * ((w.grid.pw - TILE * 4) / n);
            this.quills.push({ x, t: -i * 0.12 });
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'blink': {
        const ph = this.step(dt, 0.25, 0.1, 0.3);
        if (ph === 2 && this.moveEnter) this.blinkTo(TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4), this.floorY - 60 - fxRng.next() * 50);
        if (ph === 4) this.endMove(0.4);
        break;
      }
      case 'clones': {
        const ph = this.step(dt, 0.6, 0.1, 0.8);
        if (ph === 2 && this.moveEnter) {
          const n = this.phase >= 2 ? 3 : 2;
          for (let i = 0; i < n; i++) w.add(new InkClone(w, TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6), this.floorY - 60 - fxRng.next() * 40, this));
          this.blinkTo(TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6), this.floorY - 60 - fxRng.next() * 40);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'pools': {
        const ph = this.step(dt, 0.3, 0.1, 0.5);
        if (ph === 2 && this.moveEnter) {
          this.pools.push({ x: this.p.cx, t: 0 });
          this.pools.push({ x: clamp(this.p.cx + (fxRng.next() < 0.5 ? -80 : 80), 40, w.grid.pw - 40), t: 0 });
        }
        if (ph === 4) this.endMove(0.6);
        break;
      }
    }
    this.tickPools(dt);
  }

  drawFigure(ctx: CanvasRenderingContext2D, x: number, by: number, t: number, real: boolean): void {
    ctx.save();
    ctx.translate(x, by);
    ctx.scale(this.facing, 1);
    // Flowing robe of ink, hem dissolving into drips
    ctx.fillStyle = '#16101e';
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.quadraticCurveTo(-12, -22, -4, -30);
    ctx.lineTo(4, -30);
    ctx.quadraticCurveTo(12, -22, 10, -4);
    for (let i = 0; i < 6; i++) ctx.lineTo(10 - i * 4, Math.sin(t * 4 + i) * 2 + (i % 2) * 3);
    ctx.fill();
    // Page-collar
    ctx.fillStyle = '#e8dcbc';
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.translate(0, -28);
      ctx.rotate(-1.2 + i * 0.48);
      ctx.fillRect(-1.5, -8, 3, 7);
      ctx.restore();
    }
    // Face: a blank page with one written eye
    ctx.fillStyle = '#efe4c4';
    ellipse(ctx, 0, -33, 5, 6);
    ctx.fill();
    ctx.fillStyle = '#1a1020';
    ctx.font = '6px Georgia, serif';
    ctx.fillText('ʘ', -1, -31);
    if (real) {
      glow(ctx, 6, -36, 6, '#ffd860', 0.8 + 0.2 * Math.sin(t * 6));
      fillCircle(ctx, 6, -36, 1, '#fff0b0');
    }
    // Quill arms
    ctx.strokeStyle = '#efe4c4';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(4, -22);
    ctx.lineTo(14, -16 + Math.sin(t * 3) * 2);
    ctx.moveTo(-4, -22);
    ctx.lineTo(-13, -18);
    ctx.stroke();
    ctx.restore();
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    this.drawFigure(ctx, this.cx, this.y + this.h, this.t, true);
    glow(ctx, this.cx, this.cy, 30, '#6a5aa0', 0.25 + this.telegraph * 0.4);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const p of this.pools) {
      if (p.t < this.tele(0.7)) this.warnRect(ctx, p.x - 18, this.floorY - 3, 36, 3, p.t / this.tele(0.7));
      else {
        ctx.fillStyle = 'rgba(20,12,32,0.9)';
        ellipse(ctx, p.x, this.floorY - 2, 18, 3 + Math.sin(this.t * 6) * 0.5);
        ctx.fill();
      }
    }
    for (const q of this.quills) if (q.t > 0) glow(ctx, q.x, TILE + 4, 10, '#c8b8ff', q.t / this.tele(0.5));
  }

  protected bloodColor(): string {
    return '#3a2a50';
  }
}

// =====================================================================
// THE THORN SAINT — Thorn Chapel.
// =====================================================================
export class ThornSaint extends Boss {
  readonly id = 'thorn_saint';
  bossName = 'THE THORN SAINT';
  bossTitle = 'She Who Took the Wounds';
  rows: { y: number; dir: number; t: number }[] = [];
  bloomSafe: number[] = [];
  columns: { x: number; t: number }[] = [];
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 24, 40);
    this.setup(280);
    this.staggerMax = 16;
    this.rewards = [{ kind: 'ability', value: 'phase' }, { kind: 'heart', value: '' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const opts: [string, number][] = [['lances', 3], ['halo', 2], ['ascend', 2]];
    if (this.phase >= 1) opts.push(['bloom', 2]);
    if (this.phase >= 2) opts.push(['columns', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      this.facePlayer();
      const ty = this.floorY - this.h - 24 + Math.sin(this.t * 1.4) * 6;
      this.y += (ty - this.y) * Math.min(1, dt * 2);
      const tx = this.p.cx + (this.cx < this.p.cx ? -90 : 90);
      this.x += (clamp(tx, TILE * 2, this.world.grid.pw - TILE * 2) - this.cx) * Math.min(1, dt * 0.7);
    }
    this.tickRows(dt);
  }

  private tickRows(dt: number): void {
    const w = this.world;
    for (const r of this.rows) {
      const before = r.t;
      r.t += dt;
      if (before < this.tele(0.8) && r.t >= this.tele(0.8)) {
        const x = r.dir > 0 ? TILE : w.grid.pw - TILE;
        for (let i = 0; i < 3; i++) w.spawnProjectile('thorn', x, r.y, r.dir * (260 + i * 30), 0, { r: 5, life: 2.4, delay: i * 0.08, wall: false });
        sfx('enemy_shoot', x, r.y, 0.7, 0.9);
      }
    }
    this.rows = this.rows.filter((r) => r.t < this.tele(0.8) + 0.2);
    for (const c of this.columns) {
      c.t += dt;
      if (c.t > this.tele(0.8) && c.t < this.tele(0.8) + 0.5) this.hurtRect({ x: c.x - 9, y: 0, w: 18, h: this.floorY });
    }
    this.columns = this.columns.filter((c) => c.t < this.tele(0.8) + 0.6);
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'lances': {
        const ph = this.step(dt, 0.3, 0.1, 1.1);
        if (ph === 2 && this.moveEnter) {
          const heights = [this.floorY - 8, this.floorY - 30, this.floorY - 56, this.floorY - 84];
          const safe = Math.floor(fxRng.next() * heights.length);
          const dir = fxRng.next() < 0.5 ? 1 : -1;
          heights.forEach((y, i) => {
            if (i !== safe && (this.phase > 0 || i % 2 === 0)) this.rows.push({ y, dir, t: 0 });
          });
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'halo': {
        const ph = this.step(dt, 0.7, 0.1, 0.6);
        if (ph === 2 && this.moveEnter) {
          const n = 14 + this.phase * 4;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * TAU + this.t;
            w.spawnProjectile('thorn', this.cx, this.cy, Math.cos(a) * 120, Math.sin(a) * 120, { r: 4, life: 2.6 });
          }
          sfx('enemy_shoot', this.cx, this.cy, 1, 0.8);
          w.fx.ring(this.cx, this.cy, 6, 40, 0.4, '#ff9aa8');
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'ascend': {
        const ph = this.step(dt, 0.6, 0.9, 0.25, 0.6);
        if (ph === 1) this.y += (TILE * 1.5 - this.y) * Math.min(1, dt * 4);
        if (ph === 2) {
          this.y = TILE * 1.5 + Math.sin(this.t * 6) * 2;
          this.x += (clamp(this.p.cx, TILE * 2, w.grid.pw - TILE * 2) - this.cx) * Math.min(1, dt * 5);
          this.telegraph = 0.6;
        }
        if (ph === 3) {
          this.y = Math.min(this.floorY - this.h, this.y + 900 * dt);
          this.hurtRect({ x: this.x, y: this.y, w: this.w, h: this.h });
          if (this.moveEnter) sfx('dash', this.cx, this.cy, 1, 0.5);
          if (this.y >= this.floorY - this.h - 1 && !this.vars.landed) {
            this.vars.landed = 1;
            w.camera.shake(0.6, 0.2);
            sfx('boss_slam', this.cx, this.cy);
            for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + s * 16, this.floorY - 4, s * 180, 0, { r: 7, life: 1.6, color: '#d07a8a' });
          }
        }
        if (ph === 5) {
          this.vars.landed = 0;
          this.endMove();
        }
        break;
      }
      case 'bloom': {
        const ph = this.step(dt, 0.9, 0.7, 0.4);
        if (ph === 1 && this.moveEnter) {
          const n = Math.floor((w.grid.pw - TILE * 2) / 48);
          const s1 = Math.floor(fxRng.next() * n);
          this.bloomSafe = [s1, (s1 + Math.floor(n / 2)) % n];
        }
        if (ph === 2) {
          const n = Math.floor((w.grid.pw - TILE * 2) / 48);
          for (let i = 0; i < n; i++) {
            if (this.bloomSafe.includes(i)) continue;
            this.hurtRect({ x: TILE + i * 48 + 4, y: this.floorY - 26, w: 40, h: 26 });
          }
          if (this.moveEnter) {
            sfx('break', this.cx, this.floorY, 1, 0.7);
            w.camera.shake(0.4, 0.3);
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'columns': {
        const ph = this.step(dt, 0.2, 0.1, 1.3);
        if (ph === 2 && this.moveEnter) {
          const n = 5;
          for (let i = 0; i < n; i++) this.columns.push({ x: clamp(this.p.cx + (i - 2) * 40, 30, w.grid.pw - 30), t: -Math.abs(i - 2) * 0.2 });
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.tickRows(dt);
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const by = this.y + this.h;
    ctx.save();
    ctx.translate(this.cx, by);
    ctx.scale(this.facing, 1);
    // Robe trailing thorny vines
    ctx.fillStyle = '#2a1418';
    ctx.beginPath();
    ctx.moveTo(-11, 0);
    ctx.quadraticCurveTo(-12, -20, -5, -30);
    ctx.lineTo(5, -30);
    ctx.quadraticCurveTo(12, -20, 11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6a2a3a';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-8 + i * 5, -28);
      for (let k = 0; k < 6; k++) ctx.lineTo(-8 + i * 5 + Math.sin(k + this.t + i) * 2, -28 + k * 6);
      ctx.stroke();
    }
    // Arms spread in prayer, pierced by thorns
    ctx.strokeStyle = '#d8c8c0';
    ctx.lineWidth = 1.4;
    const spread = this.move === 'halo' && this.movePhase === 1 ? this.telegraph : 0.3;
    ctx.beginPath();
    ctx.moveTo(-3, -26);
    ctx.lineTo(-12 - spread * 6, -30 - spread * 6);
    ctx.moveTo(3, -26);
    ctx.lineTo(12 + spread * 6, -30 - spread * 6);
    ctx.stroke();
    // Veiled face and crown of thorns that rises as a halo
    ctx.fillStyle = '#e8d8d0';
    ellipse(ctx, 0, -34, 4.5, 5);
    ctx.fill();
    ctx.fillStyle = 'rgba(40,10,20,0.6)';
    ctx.fillRect(-4.5, -35, 9, 2);
    eye(ctx, 1.5, -34.4, 0.9, this.telegraph > 0 ? '#ff6a6a' : '#ff9aa8', 1);
    ctx.strokeStyle = '#a04a5a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, -36, 9, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + this.t * 0.4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 9, -36 + Math.sin(a) * 9);
      ctx.lineTo(Math.cos(a) * 13, -36 + Math.sin(a) * 13);
      ctx.stroke();
    }
    ctx.restore();
    glow(ctx, this.cx, this.y + 4, 24, '#ff9aa8', 0.4);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    for (const r of this.rows) if (r.t < this.tele(0.8)) this.warnRect(ctx, TILE, r.y - 5, w.grid.pw - TILE * 2, 10, (r.t / this.tele(0.8)) * 0.6);
    if (this.move === 'bloom') {
      const n = Math.floor((w.grid.pw - TILE * 2) / 48);
      for (let i = 0; i < n; i++) {
        if (this.bloomSafe.includes(i)) continue;
        const x = TILE + i * 48 + 4;
        if (this.movePhase === 1) this.warnRect(ctx, x, this.floorY - 4, 40, 4, this.telegraph);
        else if (this.movePhase === 2) {
          ctx.fillStyle = '#5a2030';
          for (let k = 0; k < 6; k++) {
            ctx.beginPath();
            ctx.moveTo(x + k * 7, this.floorY);
            ctx.lineTo(x + k * 7 + 3, this.floorY - 22 - (k % 2) * 6);
            ctx.lineTo(x + k * 7 + 6, this.floorY);
            ctx.fill();
          }
        }
      }
    }
    for (const c of this.columns) {
      if (c.t > 0 && c.t < this.tele(0.8)) this.warnRect(ctx, c.x - 9, 0, 18, 6, c.t / this.tele(0.8));
      else if (c.t >= this.tele(0.8)) {
        ctx.fillStyle = '#4a1824';
        ctx.fillRect(c.x - 6, 0, 12, this.floorY);
        ctx.fillStyle = '#8a3a4a';
        for (let y = 0; y < this.floorY; y += 10) {
          ctx.beginPath();
          ctx.moveTo(c.x - 6, y);
          ctx.lineTo(c.x - 10, y + 4);
          ctx.lineTo(c.x - 6, y + 6);
          ctx.moveTo(c.x + 6, y + 5);
          ctx.lineTo(c.x + 10, y + 9);
          ctx.lineTo(c.x + 6, y + 10);
          ctx.fill();
        }
      }
    }
  }

  protected bloodColor(): string {
    return '#ff9aa8';
  }
}

void dist;
void PK;
export type { Rect };
