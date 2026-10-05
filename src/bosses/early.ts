import { Boss } from './Boss';
import type { GameWorld } from '../world/GameWorld';
import type { Rect } from '../core/math';
import { TAU, clamp, sign } from '../core/math';
import { sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { glow, ellipse, blob, fillCircle, eye } from '../rendering/draw';
import { TILE } from '../world/tiles';
import { createEnemy } from '../enemies/registry';
import { PK } from '../vfx/Particles';
import type { HitInfo } from '../world/Entity';

// =====================================================================
// THE RUSTED GATEKEEPER — Threshold. A tutorial-friendly giant.
// =====================================================================
export class Gatekeeper extends Boss {
  readonly id = 'gatekeeper';
  bossName = 'THE RUSTED GATEKEEPER';
  bossTitle = 'Keeper of the First Door';
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 30, 44);
    this.setup(110);
    this.phases = 2;
    this.thresholds = [0.5];
    this.staggerMax = 12;
    this.rewards = [{ kind: 'relic', value: 'warding_lantern' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const d = Math.abs(this.p.cx - this.cx);
    if (this.phase === 0) return d < 70 ? this.pick([['sweep', 3], ['leap', 1]]) : this.pick([['leap', 2], ['thrust', 2]]);
    return d < 70 ? this.pick([['sweep', 3], ['lantern', 2], ['leap', 1]]) : this.pick([['leap', 2], ['thrust', 2], ['lantern', 2]]);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      this.facePlayer();
      const d = this.p.cx - this.cx;
      this.vx = Math.abs(d) > 60 ? sign(d) * 34 : 0;
    }
    this.physics(dt);
  }

  protected runMove(name: string, dt: number): void {
    switch (name) {
      case 'sweep': {
        const ph = this.step(dt, 0.8, 0.18, 0.6);
        this.vx = 0;
        if (ph === 2) {
          if (this.moveEnter) {
            sfx('swing_heavy', this.cx, this.cy, 1, 0.6);
            this.world.camera.shake(0.3, 0.1);
          }
          this.hurtRect(this.halberdRect());
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'thrust': {
        const ph = this.step(dt, 0.65, 0.35, 0.5);
        if (ph === 2) {
          this.vx = this.facing * 260;
          this.hurtRect({ x: this.facing > 0 ? this.x + this.w : this.x - 34, y: this.y + 18, w: 34, h: 10 });
        } else this.vx *= 0.85;
        if (ph === 4) this.endMove();
        break;
      }
      case 'leap': {
        const ph = this.step(dt, 0.55, 0.9, 0.5);
        if (ph === 2) {
          if (this.moveEnter) {
            const dx = this.p.cx - this.cx;
            this.vx = clamp(dx * 1.1, -260, 260);
            this.vy = -520;
            sfx('jump', this.cx, this.cy, 1, 0.5);
          }
          if (this.onGround && this.moveT > this.tele(0.55) + 0.15) {
            this.moveT = this.tele(0.55) + 0.9;
            this.land();
          }
        } else if (ph === 3) this.vx *= 0.8;
        if (ph === 4) this.endMove();
        break;
      }
      case 'lantern': {
        const ph = this.step(dt, 0.7, 0.2, 0.6);
        this.vx = 0;
        if (ph === 2 && this.moveEnter) {
          for (let i = 0; i < 3; i++) {
            const vx = this.facing * (60 + i * 50);
            this.world.spawnProjectile('fire', this.cx + this.facing * 10, this.y + 8, vx, -280 - i * 30, { r: 4.5, grav: 600, life: 3, explode: 20 });
          }
          sfx('enemy_shoot', this.cx, this.cy, 1, 0.6);
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.physics(dt);
  }

  private land(): void {
    const w = this.world;
    w.camera.shake(0.55, 0.2);
    sfx('boss_slam', this.cx, this.cy);
    w.fx.dust(this.cx, this.floorY, 14, 'rgba(200,190,180,0.6)', 120);
    if (this.phase >= 1) for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + s * 18, this.floorY - 4, s * 160, 0, { r: 6, life: 1.6 });
    this.hurtRect({ x: this.x - 8, y: this.y + this.h - 12, w: this.w + 16, h: 12 });
    this.vx = 0;
  }

  private halberdRect(): Rect {
    return { x: this.facing > 0 ? this.x + this.w - 6 : this.x - 64, y: this.y + 6, w: 70, h: 32 };
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const by = this.y + this.h;
    const f = this.facing;
    ctx.save();
    ctx.translate(x, by);
    ctx.scale(f, 1);
    const dying = this.bstate === 'dying' || this.bstate === 'dead';
    if (this.bstate === 'dead') ctx.rotate(-0.15);
    // Legs
    ctx.fillStyle = '#1e1c24';
    ctx.fillRect(-10, -14, 7, 14);
    ctx.fillRect(3, -14, 7, 14);
    // Great cloak/armour
    ctx.fillStyle = '#2e2c38';
    blob(ctx, [-15, -10, -16, -32, -6, -44, 8, -42, 15, -30, 14, -10]);
    ctx.fill();
    ctx.strokeStyle = '#5a5868';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Pauldrons
    ctx.fillStyle = '#4a4858';
    ellipse(ctx, -9, -34, 7, 4);
    ctx.fill();
    ellipse(ctx, 9, -34, 7, 4);
    ctx.fill();
    // Helm: tall, slotted, with a cracked face plate
    ctx.fillStyle = '#5a586a';
    ctx.beginPath();
    ctx.moveTo(-5, -38);
    ctx.lineTo(-5, -50);
    ctx.quadraticCurveTo(0, -56, 5, -50);
    ctx.lineTo(5, -38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#0a0a10';
    ctx.fillRect(-1, -50, 6, 2);
    if (!dying) eye(ctx, 3, -49, 1.2, this.telegraph > 0 ? '#ff7a50' : '#ffcf8a', 1);
    ctx.strokeStyle = '#2a2830';
    ctx.beginPath();
    ctx.moveTo(-2, -45);
    ctx.lineTo(1, -40);
    ctx.stroke();
    // Halberd
    let ang = -0.4;
    if (this.move === 'sweep') ang = this.movePhase === 1 ? -0.4 - this.telegraph * 1.6 : this.movePhase === 2 ? 1.2 : 1.0;
    if (this.move === 'thrust') ang = this.movePhase >= 2 ? 1.45 : 1.45 - 0.3 * this.telegraph;
    ctx.save();
    ctx.translate(8, -28);
    ctx.rotate(ang);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(-2, -2, 56, 3);
    ctx.fillStyle = '#c8c8d8';
    ctx.beginPath();
    ctx.moveTo(48, -1);
    ctx.lineTo(60, -9);
    ctx.lineTo(62, 2);
    ctx.lineTo(48, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // Lantern on the belt
    const lit = !dying;
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(-14, -20, 6, 8);
    if (lit) glow(ctx, -11, -16, 14, '#ffb070', 0.8);
    ctx.restore();
    if (this.move === 'sweep' && this.movePhase === 1) {
      const r = this.halberdRect();
      this.warnRect(ctx, r.x, r.y, r.w, r.h, this.telegraph);
    }
  }
}

// =====================================================================
// THE WEEPING ROOT — Mourning Grove. A tree that grieves with its whole body.
// =====================================================================
export class WeepingRoot extends Boss {
  readonly id = 'weeping_root';
  bossName = 'THE WEEPING ROOT';
  bossTitle = 'Mother of the Mourning Grove';
  faceY = 0;
  highY = 0;
  lowY = 0;
  attacksSinceLower = 0;
  spikes: { x: number; t: number; fired: boolean }[] = [];
  sweepX = 0;
  sweepDir = 1;
  sweepHigh = false;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 40, 34);
    this.setup(170);
    this.staggerMax = 16;
    this.highY = TILE * 2;
    this.lowY = world.grid.ph - TILE - 34 - 18;
    this.faceY = this.highY;
    this.y = this.faceY;
    this.contact = 0;
    this.introRange = 260;
    this.rewards = [{ kind: 'ability', value: 'lance' }];
  }

  protected chooseMove(): string {
    if (this.attacksSinceLower >= (this.phase >= 2 ? 3 : 2)) return 'lower';
    const opts: [string, number][] = [['roots', 3], ['tears', 2], ['sweep', 2]];
    if (this.phase >= 2) opts.push(['spawn', 1]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    this.faceY += (this.highY - this.faceY) * Math.min(1, dt * 3);
    this.y = this.faceY + Math.sin(this.t * 0.8) * 3;
  }

  protected modifyHit(hit: HitInfo): number | 'block' {
    // High up, only lances and spires reach it well.
    if (this.faceY < this.lowY - 30 && hit.source !== 'lance' && hit.source !== 'spire') return 0.5;
    return 1;
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    const p = this.p;
    switch (name) {
      case 'roots': {
        const count = this.phase === 0 ? 3 : 5;
        if (this.moveT === 0) this.spikes = [];
        this.moveT += dt;
        const interval = this.phase === 0 ? 0.55 : 0.4;
        const n = Math.floor(this.moveT / interval);
        while (this.spikes.length < Math.min(count, n + 1)) {
          this.spikes.push({ x: clamp(p.cx, TILE * 2, w.grid.pw - TILE * 2), t: 0, fired: false });
          sfx('crumble', p.cx, this.floorY, 0.5, 0.7);
        }
        for (const s of this.spikes) {
          s.t += dt;
          if (!s.fired && s.t > this.tele(0.6)) {
            s.fired = true;
            w.fx.shards(s.x, this.floorY, 8, '#6a5034', 220);
            w.camera.shake(0.2, 0.08);
            sfx('break', s.x, this.floorY, 0.6, 0.8);
          }
          if (s.fired && s.t < this.tele(0.6) + 0.35) this.hurtRect({ x: s.x - 9, y: this.floorY - 44, w: 18, h: 44 });
        }
        if (this.spikes.length >= count && this.spikes[count - 1].t > this.tele(0.6) + 0.5) {
          this.attacksSinceLower++;
          this.endMove();
        }
        this.idle(dt);
        break;
      }
      case 'tears': {
        const dur = this.phase === 0 ? 2.4 : 3.2;
        this.moveT += dt;
        if (fxRng.next() < (this.phase === 0 ? 0.12 : 0.2)) {
          const tx = TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4);
          w.spawnProjectile('tear', tx, TILE * 1.5, 0, 40, { r: 3.5, grav: 380, life: 3, delay: this.tele(0.4) });
        }
        this.telegraph = this.moveT < 0.4 ? this.moveT / 0.4 : 0;
        if (this.moveT > dur) {
          this.attacksSinceLower++;
          this.endMove();
        }
        this.idle(dt);
        break;
      }
      case 'sweep': {
        const ph = this.step(dt, 0.9, 1.3, 0.4);
        if (ph === 1 && this.moveEnter) {
          this.sweepDir = p.cx < w.grid.pw / 2 ? -1 : 1;
          this.sweepHigh = this.phase >= 1 && fxRng.next() < 0.45;
          this.sweepX = this.sweepDir > 0 ? 0 : w.grid.pw;
          sfx('boss_roar', this.cx, this.cy, 0.4, 1.4);
        }
        if (ph === 2) {
          this.sweepX += -this.sweepDir * (w.grid.pw / 1.1) * dt;
          const y = this.sweepHigh ? this.floorY - 46 : this.floorY - 14;
          this.hurtRect({ x: this.sweepX - 20, y, w: 40, h: this.sweepHigh ? 26 : 14 });
          if (fxRng.next() < 0.6) w.fx.spawn(PK.Leaf, this.sweepX, y, -this.sweepDir * 60, -30, 0.8, 2, '#4a5a3a', { grav: 200, vr: 6 });
        }
        if (ph === 4) {
          this.attacksSinceLower++;
          this.endMove();
        }
        this.idle(dt);
        break;
      }
      case 'spawn': {
        const ph = this.step(dt, 0.6, 0.1, 0.8);
        if (ph === 2 && this.moveEnter) {
          for (const s of [-1, 1]) {
            const e = createEnemy(w, 'rootling', clamp(p.cx + s * 70, 40, w.grid.pw - 40), this.floorY, false);
            if (e) {
              e.hidden = false;
              e.setState('chase');
              w.add(e);
            }
          }
        }
        if (ph === 4) {
          this.attacksSinceLower++;
          this.endMove();
        }
        this.idle(dt);
        break;
      }
      case 'lower': {
        const ph = this.step(dt, 0.6, this.phase >= 2 ? 2.2 : 2.8, 0.6);
        const target = ph >= 2 && ph <= 3 ? this.lowY : this.highY;
        this.faceY += (target - this.faceY) * Math.min(1, dt * 5);
        this.y = this.faceY;
        if (ph === 2 && this.moveEnter) {
          w.camera.shake(0.4, 0.2);
          sfx('boss_slam', this.cx, this.cy, 0.6, 0.6);
        }
        // Bite if the player stands directly beneath the lowered face
        if (ph === 2 && this.faceY > this.lowY - 6) this.contact = 1;
        else this.contact = 0;
        if (ph === 4) {
          this.attacksSinceLower = 0;
          this.contact = 0;
          this.endMove(0.6);
        }
        break;
      }
    }
  }

  protected contactRects(): Rect[] {
    return [{ x: this.x + 8, y: this.y + 14, w: this.w - 16, h: this.h - 14 }];
  }

  protected onPhase(n: number): void {
    if (n === 2) this.world.ui.hint('The Root weeps harder. Its branches sweep high and low.');
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const cx = this.cx;
    const fy = this.y;
    // Trunk and great roots rising out of the floor
    ctx.save();
    ctx.fillStyle = '#1c1812';
    ctx.beginPath();
    ctx.moveTo(cx - 60, this.floorY);
    ctx.quadraticCurveTo(cx - 30, fy + 50, cx - 22, fy);
    ctx.lineTo(cx + 22, fy);
    ctx.quadraticCurveTo(cx + 30, fy + 50, cx + 60, this.floorY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2e281e';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * 8, fy + 10);
      ctx.quadraticCurveTo(cx + i * 14, fy + 80, cx + i * 26, this.floorY);
      ctx.stroke();
    }
    // Canopy of dead branches toward the ceiling
    ctx.strokeStyle = '#241e16';
    ctx.lineWidth = 3;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i - 2.5) * 0.45;
      ctx.beginPath();
      ctx.moveTo(cx, fy + 4);
      ctx.quadraticCurveTo(cx + Math.cos(a) * 40, fy - 20, cx + Math.cos(a) * 110, 0);
      ctx.stroke();
    }
    // Face carved in bark
    ctx.fillStyle = '#3a3024';
    ellipse(ctx, cx, fy + 17, 20, 17);
    ctx.fill();
    ctx.strokeStyle = '#5a4a34';
    ctx.lineWidth = 1;
    ctx.stroke();
    const open = this.move === 'lower' && this.movePhase === 2 ? 1 : this.telegraph;
    // Eyes: hollow, weeping light
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#0c0a08';
      ellipse(ctx, cx + s * 8, fy + 13, 4, 3 + open);
      ctx.fill();
      glow(ctx, cx + s * 8, fy + 13, 10, '#d7e8a0', 0.6 + open * 0.4);
      fillCircle(ctx, cx + s * 8, fy + 13, 1.4, '#f0ffc0');
      // tear streaks
      ctx.strokeStyle = 'rgba(200,230,170,0.6)';
      ctx.beginPath();
      ctx.moveTo(cx + s * 8, fy + 16);
      ctx.quadraticCurveTo(cx + s * 9, fy + 24, cx + s * 7, fy + 32);
      ctx.stroke();
    }
    ctx.fillStyle = '#0c0a08';
    ellipse(ctx, cx, fy + 26, 6, 1.5 + open * 4);
    ctx.fill();
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    if (this.move === 'roots') {
      for (const s of this.spikes) {
        if (!s.fired) this.warnRect(ctx, s.x - 9, this.floorY - 3, 18, 3, s.t / this.tele(0.6));
        else if (s.t < this.tele(0.6) + 0.5) {
          const k = Math.min(1, (s.t - this.tele(0.6)) / 0.08);
          ctx.fillStyle = '#4a3a24';
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(s.x - 8 + i * 6, this.floorY);
            ctx.lineTo(s.x - 5 + i * 6, this.floorY - (36 + i * 4) * k);
            ctx.lineTo(s.x - 2 + i * 6, this.floorY);
            ctx.fill();
          }
        }
      }
    }
    if (this.move === 'sweep') {
      const y = this.sweepHigh ? this.floorY - 46 : this.floorY - 14;
      if (this.movePhase === 1) {
        const side = this.sweepDir > 0 ? 0 : w.grid.pw - 30;
        this.warnRect(ctx, side, y, 30, this.sweepHigh ? 26 : 14, this.telegraph);
      } else if (this.movePhase === 2) {
        ctx.strokeStyle = '#2a2218';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.sweepDir > 0 ? 0 : w.grid.pw, y + 6);
        ctx.lineTo(this.sweepX, y + 6);
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#4a3a28';
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }
}

// =====================================================================
// MYCELIA, SPORE MATRON — Gloamspore Warrens.
// =====================================================================
export class Mycelia extends Boss {
  readonly id = 'mycelia';
  bossName = 'MYCELIA';
  bossTitle = 'Spore Matron of the Warrens';
  fogSpots: { x: number; t: number }[] = [];
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 44, 40);
    this.setup(200);
    this.staggerMax = 16;
    this.rewards = [{ kind: 'ability', value: 'grip' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const opts: [string, number][] = [['burst', 2], ['slam', 3], ['summon', 1]];
    if (this.phase >= 1) opts.push(['canopy', 2]);
    if (this.phase >= 2) opts.push(['fog', 2], ['slam3', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      const d = this.p.cx - this.cx;
      this.vx = Math.abs(d) > 80 ? sign(d) * 24 : this.vx * 0.9;
      this.facePlayer();
    }
    this.physics(dt);
    this.tickFog(dt);
  }

  private tickFog(dt: number): void {
    for (const f of this.fogSpots) {
      f.t += dt;
      if (f.t > this.tele(0.8) && f.t < this.tele(0.8) + 1.4) {
        this.hurtRect({ x: f.x - 16, y: this.floorY - 30, w: 32, h: 30 }, 1, { poison: 3 });
        if (fxRng.next() < 0.5) this.world.fx.spawn(PK.Smoke, f.x + (fxRng.next() - 0.5) * 24, this.floorY - 6, 0, -30, 0.8, 6, 'rgba(180,240,120,0.3)', { size2: 16 });
      }
    }
    this.fogSpots = this.fogSpots.filter((f) => f.t < this.tele(0.8) + 1.5);
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'burst': {
        const ph = this.step(dt, 0.7, 0.1, 0.6);
        this.vx *= 0.9;
        if (ph === 2 && this.moveEnter) {
          const n = 10 + this.phase * 4;
          for (let i = 0; i < n; i++) {
            const a = -Math.PI + (i / (n - 1)) * Math.PI;
            w.spawnProjectile('spore', this.cx, this.y + 10, Math.cos(a) * 90, Math.sin(a) * 90, { r: 4.5, life: 2.8, poison: 3, accel: -18 });
          }
          sfx('enemy_shoot', this.cx, this.cy, 1, 0.6);
          w.fx.burst(this.cx, this.y + 10, 24, '#c8ff8a', 90, 0.8, 3);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'slam':
      case 'slam3': {
        const reps = name === 'slam3' ? 3 : 1;
        const ph = this.step(dt, 0.55, 0.85, 0.35);
        if (ph === 2 && this.moveEnter) {
          const dx = this.p.cx - this.cx;
          this.vx = clamp(dx * 1.15, -280, 280);
          this.vy = -560;
          sfx('jump', this.cx, this.cy, 1, 0.4);
        }
        if (ph === 2 && this.onGround && this.moveT > this.tele(0.55) + 0.15) {
          this.moveT = this.tele(0.55) + 0.85;
          w.camera.shake(0.6, 0.2);
          sfx('boss_slam', this.cx, this.cy);
          for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + s * 24, this.floorY - 4, s * 170, 0, { r: 7, life: 1.8, color: '#c8ff8a' });
          w.fx.dust(this.cx, this.floorY, 14, 'rgba(200,170,220,0.6)', 130);
          this.vx = 0;
        }
        if (ph === 4) {
          this.vars.reps = (this.vars.reps ?? 0) + 1;
          if (this.vars.reps < reps) {
            this.moveT = 0;
            this.movePhase = 0;
            this.facePlayer();
          } else {
            this.vars.reps = 0;
            this.endMove();
          }
        }
        this.physics(dt);
        return;
      }
      case 'summon': {
        const ph = this.step(dt, 0.6, 0.1, 0.7);
        this.vx *= 0.9;
        if (ph === 2 && this.moveEnter) {
          const count = 2 + this.phase;
          for (let i = 0; i < count; i++) {
            const e = createEnemy(w, 'capling', clamp(this.cx + (i - count / 2) * 20, 30, w.grid.pw - 30), this.floorY, false);
            if (e) {
              e.body.vy = -200;
              e.body.vx = (fxRng.next() - 0.5) * 200;
              e.setState('chase');
              w.add(e);
            }
          }
          sfx('enemy_alert', this.cx, this.cy, 1, 1.6);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'canopy': {
        const ph = this.step(dt, 0.6, 2.2, 0.5);
        this.vx *= 0.9;
        if (ph === 2) {
          this.vars.spin = (this.vars.spin ?? 0) + dt * 5;
          if (Math.floor(this.moveT * 12) !== Math.floor((this.moveT - dt) * 12)) {
            for (let k = 0; k < 2; k++) {
              const a = this.vars.spin + k * Math.PI;
              w.spawnProjectile('spore', this.cx + Math.cos(a) * 20, this.y + 8, Math.cos(a) * 80, Math.sin(a) * 50 - 30, { r: 3.5, life: 2.4, poison: 3, grav: 60 });
            }
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'fog': {
        const ph = this.step(dt, 0.3, 0.2, 0.4);
        this.vx *= 0.9;
        if (ph === 2 && this.moveEnter) {
          for (let i = 0; i < 3; i++) this.fogSpots.push({ x: clamp(this.p.cx + (i - 1) * 70 + (fxRng.next() - 0.5) * 20, 40, w.grid.pw - 40), t: 0 });
        }
        if (ph === 4) this.endMove(0.7);
        break;
      }
    }
    this.physics(dt);
    this.tickFog(dt);
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const cx = this.cx;
    const by = this.y + this.h;
    const swell = 1 + this.telegraph * 0.12 + Math.sin(this.t * 2) * 0.02;
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(this.facing, 1);
    // Root-skirt
    ctx.fillStyle = '#2a1e30';
    for (let i = 0; i < 7; i++) {
      const lx = -18 + i * 6;
      ctx.beginPath();
      ctx.moveTo(lx - 3, -12);
      ctx.quadraticCurveTo(lx + Math.sin(this.t * 3 + i) * 2, -4, lx + (i - 3) * 1.5, 0);
      ctx.lineTo(lx + 3, -12);
      ctx.fill();
    }
    // Stalk body
    ctx.fillStyle = '#d8c8d8';
    blob(ctx, [-10, -10, -12, -24, -6, -30, 6, -30, 12, -24, 10, -10]);
    ctx.fill();
    // Face in the stalk
    ctx.fillStyle = '#3a2a40';
    ellipse(ctx, 3, -20, 5, 6);
    ctx.fill();
    eye(ctx, 1.5, -21, 1.3, this.telegraph > 0 ? '#ff7a50' : '#ff9ae8', 1);
    eye(ctx, 5, -20, 1.0, this.telegraph > 0 ? '#ff7a50' : '#ff9ae8', 1);
    // Great cap crown
    ctx.save();
    ctx.translate(0, -30);
    ctx.scale(swell, swell);
    if (this.move === 'canopy' && this.movePhase === 2) ctx.rotate(Math.sin(this.vars.spin ?? 0) * 0.15);
    ctx.fillStyle = '#7a3a8a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 16, 0, Math.PI, 0);
    ctx.quadraticCurveTo(14, 4, 0, 3);
    ctx.quadraticCurveTo(-14, 4, -26, 0);
    ctx.fill();
    ctx.fillStyle = '#b060c8';
    ctx.beginPath();
    ctx.ellipse(0, -2, 22, 12, 0, Math.PI, 0);
    ctx.fill();
    for (let i = 0; i < 9; i++) fillCircle(ctx, -18 + i * 4.5, -6 - Math.sin((i / 8) * Math.PI) * 7, 1.4, '#ffd0ff');
    ctx.restore();
    glow(ctx, 0, -32, 40, '#e8a0ff', 0.35 + this.telegraph * 0.3);
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const f of this.fogSpots) if (f.t < this.tele(0.8)) this.warnRect(ctx, f.x - 16, this.floorY - 3, 32, 3, f.t / this.tele(0.8));
  }

  protected bloodColor(): string {
    return '#e8a0ff';
  }
}

// =====================================================================
// THE PRISM WYRM — Lumen Caverns. A serpent of living crystal.
// =====================================================================
export class PrismWyrm extends Boss {
  readonly id = 'prism';
  bossName = 'THE PRISM WYRM';
  bossTitle = 'Light That Swallowed the Miners';
  trail: { x: number; y: number }[] = [];
  visible = false;
  hx = 0;
  hy = 0;
  arcFrom = { x: 0, y: 0 };
  arcTo = { x: 0, y: 0 };
  arcH = 0;
  rain: { x: number; t: number }[] = [];
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 18, 18);
    this.setup(210);
    this.staggerMax = 14;
    this.contact = 1;
    this.introRange = 220;
    this.hx = fx;
    this.hy = fy + 30;
    this.rewards = [{ kind: 'ability', value: 'step' }];
  }

  protected onIntro(): void {
    // Rise from the floor for the introduction.
    this.visible = true;
    this.hx = this.world.grid.pw / 2;
    this.hy = this.floorY + 20;
  }

  protected intro(dt: number): void {
    this.hy += (this.floorY - 80 - this.hy) * Math.min(1, dt * 2);
    this.hx += Math.sin(this.t * 2) * 20 * dt;
    this.syncBody();
    this.pushTrail();
  }

  private syncBody(): void {
    this.x = this.hx - this.w / 2;
    this.y = this.hy - this.h / 2;
    this.hittable = this.visible;
    this.invuln = !this.visible;
  }

  private pushTrail(): void {
    this.trail.unshift({ x: this.hx, y: this.hy });
    if (this.trail.length > 60) this.trail.length = 60;
  }

  protected chooseMove(): string {
    const opts: [string, number][] = [['arc', 3], ['rain', 2], ['pillar', 2]];
    if (this.phase >= 1) opts.push(['double_arc', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate !== 'fight') return;
    // Submerged between attacks: slide the head back into the floor.
    if (this.visible) {
      this.hy += 260 * dt;
      if (this.hy > this.floorY + 30) this.visible = false;
    }
    this.syncBody();
    this.pushTrail();
  }

  private beginArc(): void {
    const w = this.world;
    const fromLeft = this.p.cx > w.grid.pw / 2;
    const y0 = this.floorY - 20 - fxRng.next() * 80;
    const y1 = this.floorY - 20 - fxRng.next() * 80;
    this.arcFrom = { x: fromLeft ? -20 : w.grid.pw + 20, y: y0 };
    this.arcTo = { x: fromLeft ? w.grid.pw + 20 : -20, y: y1 };
    this.arcH = 40 + fxRng.next() * 60;
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'arc':
      case 'double_arc': {
        const travel = this.phase >= 2 ? 1.0 : 1.35;
        const ph = this.step(dt, 0.9, travel, 0.2);
        if (ph === 1 && this.moveEnter) {
          this.beginArc();
          this.visible = false;
          sfx('boss_charge', this.arcFrom.x, this.arcFrom.y, 0.6);
        }
        if (ph === 2) {
          if (this.moveEnter) {
            this.visible = true;
            this.trail = [];
            sfx('boss_roar', this.cx, this.cy, 0.6, 1.3);
            w.fx.shards(clamp(this.arcFrom.x, 10, w.grid.pw - 10), this.arcFrom.y, 12, '#b8f0ff', 220);
          }
          const u = (this.moveT - this.tele(0.9)) / travel;
          this.hx = this.arcFrom.x + (this.arcTo.x - this.arcFrom.x) * u;
          this.hy = this.arcFrom.y + (this.arcTo.y - this.arcFrom.y) * u - Math.sin(u * Math.PI) * this.arcH;
          if (fxRng.next() < 0.5) w.fx.spawn(PK.Glow, this.hx, this.hy, 0, 0, 0.6, 2, '#b8f0ff', { additive: true, size2: 0.2 });
        }
        if (ph === 3) this.visible = false;
        if (ph === 4) {
          if (name === 'double_arc' && !this.vars.second) {
            this.vars.second = 1;
            this.moveT = 0;
            this.movePhase = 0;
          } else {
            this.vars.second = 0;
            this.endMove();
          }
        }
        break;
      }
      case 'rain': {
        if (this.moveT === 0) {
          this.rain = [];
          const n = 6 + this.phase * 3;
          for (let i = 0; i < n; i++) this.rain.push({ x: TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4), t: -i * 0.18 });
          sfx('boss_roar', w.grid.pw / 2, 0, 0.4, 1.6);
          w.camera.shake(0.3, 0.6);
        }
        this.moveT += dt;
        for (const r of this.rain) {
          const before = r.t;
          r.t += dt;
          if (before < this.tele(0.7) && r.t >= this.tele(0.7)) w.spawnProjectile('crystal', r.x, TILE + 4, 0, 120, { r: 5, grav: 700, life: 2 });
        }
        if (this.moveT > 0.18 * this.rain.length + this.tele(0.7) + 0.6) this.endMove();
        this.idle(dt);
        return;
      }
      case 'pillar': {
        const ph = this.step(dt, 0.8, 0.35, 1.5, 0.4);
        if (ph === 1 && this.moveEnter) {
          this.vars.px = clamp(this.p.cx, TILE * 2, w.grid.pw - TILE * 2);
          this.visible = false;
        }
        if (ph === 2) {
          if (this.moveEnter) {
            this.visible = true;
            this.hx = this.vars.px;
            this.hy = this.floorY + 10;
            this.trail = [];
            sfx('boss_slam', this.hx, this.floorY);
            w.camera.shake(0.5, 0.2);
            w.fx.shards(this.hx, this.floorY, 16, '#b8f0ff', 260);
          }
          this.hy += (this.floorY - 90 - this.hy) * Math.min(1, dt * 12);
          this.hurtRect({ x: this.hx - 12, y: this.hy, w: 24, h: this.floorY - this.hy });
        }
        if (ph === 3) {
          this.hy += Math.sin(this.t * 3) * 10 * dt;
          if (this.moveEnter) {
            const n = 5 + this.phase * 2;
            const a0 = Math.atan2(this.p.cy - this.hy, this.p.cx - this.hx);
            for (let i = 0; i < n; i++) {
              const a = a0 + (i - (n - 1) / 2) * 0.22;
              w.spawnProjectile('crystal', this.hx, this.hy, Math.cos(a) * 170, Math.sin(a) * 170, { r: 4, life: 2.4 });
            }
            sfx('enemy_shoot', this.hx, this.hy, 1, 1.4);
          }
        }
        if (ph === 4) this.hy += 300 * dt;
        if (ph === 5) {
          this.visible = false;
          this.endMove(0.8);
        }
        break;
      }
    }
    this.syncBody();
    this.pushTrail();
  }

  protected contactRects(): Rect[] {
    if (!this.visible) return [];
    const out: Rect[] = [{ x: this.hx - 8, y: this.hy - 8, w: 16, h: 16 }];
    for (let i = 4; i < this.trail.length; i += 5) {
      const s = this.trail[i];
      out.push({ x: s.x - 6, y: s.y - 6, w: 12, h: 12 });
    }
    return out;
  }

  protected onPhase(n: number): void {
    if (n === 2) {
      this.world.extraDarkness = 0.35;
      this.world.ui.hint('The cavern dims. Follow the Wyrm\'s light.');
    }
  }

  protected onDeathStart(): void {
    this.visible = true;
    this.world.extraDarkness = 0;
  }

  protected dying(dt: number): void {
    super.dying(dt);
    this.hy += Math.sin(this.t * 20) * 30 * dt;
    if (fxRng.next() < 0.5) this.world.fx.shards(this.hx, this.hy, 3, '#b8f0ff', 200);
  }

  protected drawsCorpse(): boolean {
    return false;
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    if (!this.visible && this.bstate !== 'dying') return;
    // Body segments (tail first)
    for (let i = this.trail.length - 1; i >= 2; i -= 3) {
      const s = this.trail[i];
      const r = 7 - (i / this.trail.length) * 4;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(i * 0.3 + this.t);
      ctx.fillStyle = i % 2 ? '#6ab8e0' : '#8ad8ff';
      ctx.beginPath();
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      glow(ctx, s.x, s.y, r * 2.5, '#9ad8ff', 0.25);
    }
    // Head
    const prev = this.trail[3] ?? { x: this.hx - 1, y: this.hy };
    const ang = Math.atan2(this.hy - prev.y, this.hx - prev.x);
    ctx.save();
    ctx.translate(this.hx, this.hy);
    ctx.rotate(ang);
    glow(ctx, 0, 0, 34, '#b8f0ff', 0.7);
    ctx.fillStyle = '#9ae0ff';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(2, -9);
    ctx.lineTo(-8, -6);
    ctx.lineTo(-8, 6);
    ctx.lineTo(2, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(2, -9);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
    // Crown spines
    ctx.fillStyle = '#d8f8ff';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-2 - i * 3, -7);
      ctx.lineTo(-6 - i * 3, -14);
      ctx.lineTo(-5 - i * 3, -6);
      ctx.fill();
    }
    eye(ctx, 5, -2, 1.6, this.telegraph > 0 ? '#ff7a50' : '#ffffff', 1);
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    if ((this.move === 'arc' || this.move === 'double_arc') && this.movePhase === 1) {
      const x = clamp(this.arcFrom.x, 0, w.grid.pw - 12);
      this.warnRect(ctx, x, this.arcFrom.y - 12, 12, 24, this.telegraph);
      glow(ctx, clamp(this.arcFrom.x, 4, w.grid.pw - 4), this.arcFrom.y, 30, '#b8f0ff', this.telegraph);
    }
    if (this.move === 'pillar' && this.movePhase === 1) this.warnRect(ctx, this.vars.px - 12, this.floorY - 4, 24, 4, this.telegraph);
    if (this.move === 'rain') {
      for (const r of this.rain) {
        if (r.t > 0 && r.t < this.tele(0.7)) {
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#b8f0ff';
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.moveTo(r.x, TILE);
          ctx.lineTo(r.x, this.floorY);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
          glow(ctx, r.x, TILE + 4, 10, '#ffffff', r.t / this.tele(0.7));
        }
      }
    }
  }

  protected bloodColor(): string {
    return '#b8f0ff';
  }
}

void TAU;
