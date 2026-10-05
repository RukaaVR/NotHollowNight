import { Boss } from './Boss';
import { drawSprite } from '../rendering/SpriteArt';
import type { GameWorld } from '../world/GameWorld';
import type { Rect } from '../core/math';
import { TAU, clamp, dist } from '../core/math';
import { sfx, events } from '../core/events';
import { fxRng } from '../core/rng';
import { glow, ellipse, blob, fillCircle, eye } from '../rendering/draw';
import { T, TILE } from '../world/tiles';
import type { HitInfo } from '../world/Entity';
import { setFlag } from '../progression/Progress';
import { PK } from '../vfx/Particles';

// =====================================================================
// ORMUND, THE STILL TIDE — Black Reservoir.
// =====================================================================
export class Ormund extends Boss {
  readonly id = 'ormund';
  bossName = 'ORMUND';
  bossTitle = 'The Still Tide';
  waterY = 0;
  hx = 0;
  hy = 0;
  out = 0; // 0 submerged .. 1 fully out
  waveX = -100;
  waveDir = 1;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 30, 30);
    this.setup(300);
    this.staggerMax = 18;
    this.contact = 1;
    this.introRange = 260;
    this.waterY = this.findWater();
    this.hx = fx;
    this.hy = this.waterY + 40;
    this.rewards = [{ kind: 'ability', value: 'grapple' }, { kind: 'key', value: 'seal_tide' }];
  }

  private findWater(): number {
    const g = this.world.grid;
    const cx = Math.floor(g.w / 2);
    for (let y = 0; y < g.h; y++) if (g.tile(cx, y) === T.Water) return y * TILE;
    return g.ph - TILE * 3;
  }

  private sync(): void {
    this.x = this.hx - this.w / 2;
    this.y = this.hy - this.h / 2;
    this.invuln = this.out < 0.5;
    this.hittable = this.out >= 0.5;
  }

  protected onIntro(): void {
    this.hx = this.world.grid.pw / 2;
  }

  protected intro(dt: number): void {
    this.out = Math.min(1, this.out + dt);
    this.hy += (this.waterY - 50 - this.hy) * Math.min(1, dt * 2);
    this.sync();
  }

  protected chooseMove(): string {
    const opts: [string, number][] = [['bite', 3], ['wave', 2], ['bubbles', 2]];
    if (this.phase >= 1) opts.push(['spit', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate !== 'fight') return;
    this.out = Math.max(0, this.out - dt * 1.5);
    this.hy += (this.waterY + 40 - this.hy) * Math.min(1, dt * 3);
    this.sync();
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'bite': {
        const ph = this.step(dt, 0.85, 0.25, 1.1, 0.4);
        if (ph === 1) {
          if (this.moveEnter) this.vars.bx = clamp(this.p.cx, TILE * 2, w.grid.pw - TILE * 2);
          if (fxRng.next() < 0.5) w.fx.bubbles(this.vars.bx + (fxRng.next() - 0.5) * 20, this.waterY + 6, 1);
          this.hx = this.vars.bx;
        }
        if (ph === 2) {
          if (this.moveEnter) {
            w.fx.splash(this.hx, this.waterY, 24);
            sfx('splash', this.hx, this.waterY, 1, 0.5);
            sfx('boss_roar', this.hx, this.waterY, 0.6, 0.8);
            w.camera.shake(0.5, 0.2);
          }
          this.out = 1;
          this.hy += (this.waterY - 90 - this.hy) * Math.min(1, dt * 14);
          this.hurtRect({ x: this.hx - 16, y: this.hy - 10, w: 32, h: this.waterY - this.hy + 20 });
        }
        if (ph === 3) this.hy += Math.sin(this.t * 3) * 8 * dt;
        if (ph === 4) {
          this.hy += 200 * dt;
          this.out = Math.max(0, this.out - dt * 3);
        }
        if (ph === 5) this.endMove();
        break;
      }
      case 'wave': {
        const ph = this.step(dt, 0.9, 2.0, 0.4);
        if (ph === 1 && this.moveEnter) {
          this.waveDir = this.p.cx < w.grid.pw / 2 ? -1 : 1;
          this.hx = this.waveDir > 0 ? TILE * 3 : w.grid.pw - TILE * 3;
          this.out = 1;
        }
        if (ph === 1) this.hy += (this.waterY - 70 - this.hy) * Math.min(1, dt * 4);
        if (ph === 2) {
          if (this.moveEnter) {
            this.waveX = this.hx;
            w.camera.shake(0.6, 0.3);
            sfx('boss_slam', this.hx, this.waterY);
            w.fx.splash(this.hx, this.waterY, 30);
          }
          this.waveX += this.waveDir * 230 * dt;
          this.hy += (this.waterY + 20 - this.hy) * Math.min(1, dt * 3);
          this.out = Math.max(0, this.out - dt);
          const hgt = this.phase >= 2 ? 52 : 40;
          this.hurtRect({ x: this.waveX - 14, y: this.waterY - hgt, w: 28, h: hgt + 30 });
          if (fxRng.next() < 0.8) w.fx.splash(this.waveX, this.waterY - hgt * 0.5, 2);
        }
        if (ph === 4) {
          this.waveX = -100;
          this.endMove();
        }
        break;
      }
      case 'bubbles': {
        const ph = this.step(dt, 0.5, 2.0, 0.4);
        if (ph === 2 && fxRng.next() < 0.18 + this.phase * 0.06) {
          w.spawnProjectile('bubble', TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4), this.waterY + 4, (fxRng.next() - 0.5) * 20, -55 - fxRng.next() * 30, { r: 6, life: 4, wall: false });
        }
        if (ph === 4) this.endMove(0.6);
        break;
      }
      case 'spit': {
        const ph = this.step(dt, 0.7, 0.6, 0.6);
        if (ph === 1) {
          if (this.moveEnter) this.hx = this.p.cx < w.grid.pw / 2 ? w.grid.pw - TILE * 4 : TILE * 4;
          this.out = 1;
          this.hy += (this.waterY - 60 - this.hy) * Math.min(1, dt * 5);
        }
        if (ph === 2 && Math.floor(this.moveT * 5) !== Math.floor((this.moveT - dt) * 5)) {
          const dx = this.p.cx - this.hx;
          w.spawnProjectile('ink', this.hx, this.hy, dx * 0.9 + (fxRng.next() - 0.5) * 60, -260, { r: 5, grav: 500, life: 3, color: '#0e1a20' });
          sfx('enemy_shoot', this.hx, this.hy, 0.8, 0.5);
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.sync();
  }

  protected contactRects(): Rect[] {
    if (this.out < 0.5) return [];
    return [{ x: this.hx - 12, y: this.hy - 10, w: 24, h: 24 }];
  }

  protected onPhase(n: number): void {
    if (n === 2) {
      // The tide finally moves: the reservoir rises two rows.
      const g = this.world.grid;
      const wy = Math.floor(this.waterY / TILE);
      for (let y = wy - 2; y < wy; y++) for (let x = 1; x < g.w - 1; x++) if (g.tile(x, y) === T.Empty) g.set(x, y, T.Water);
      this.waterY -= TILE * 2;
      this.world.camera.shake(0.8, 1);
      this.world.ui.hint('The still water moves at last. It rises.');
    }
  }

  protected drawsCorpse(): boolean {
    return false;
  }

  protected paint(ctx: CanvasRenderingContext2D): boolean {
    if (this.out <= 0.02 && this.bstate !== 'dying') return true;
    // Clip to above the water surface so the body seems to emerge
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.world.grid.pw, this.waterY + 2);
    ctx.clip();
    const ok = drawSprite(ctx, 'boss', 'ormund', { facing: this.facing, ...this.paintMotion(), x: this.hx, y: this.waterY + 20, height: Math.max(76, this.waterY + 50 - this.hy) });
    ctx.restore();
    return ok;
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    if (this.out <= 0.02 && this.bstate !== 'dying') return;
    ctx.save();
    // Clip to above the water surface so the body seems to emerge
    ctx.beginPath();
    ctx.rect(0, 0, this.world.grid.pw, this.waterY + 2);
    ctx.clip();
    // Neck
    ctx.fillStyle = '#0e2026';
    ctx.beginPath();
    ctx.moveTo(this.hx - 12, this.waterY + 10);
    ctx.quadraticCurveTo(this.hx - 16, this.hy + 20, this.hx - 10, this.hy);
    ctx.lineTo(this.hx + 10, this.hy);
    ctx.quadraticCurveTo(this.hx + 16, this.hy + 20, this.hx + 12, this.waterY + 10);
    ctx.fill();
    // Head: ancient, barnacled, with a lantern-pale crest
    ctx.fillStyle = '#16303a';
    blob(ctx, [this.hx - 18, this.hy, this.hx - 12, this.hy - 16, this.hx + 4, this.hy - 20, this.hx + 18, this.hy - 8, this.hx + 16, this.hy + 8, this.hx - 10, this.hy + 10]);
    ctx.fill();
    for (let i = 0; i < 6; i++) fillCircle(ctx, this.hx - 10 + i * 4, this.hy - 14 + (i % 2) * 3, 1.2, '#4a7a80');
    ctx.strokeStyle = '#70e0d0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(this.hx - 6 + i * 4, this.hy - 18);
      ctx.lineTo(this.hx - 9 + i * 5, this.hy - 28 - (i % 2) * 4);
      ctx.stroke();
    }
    const open = this.move === 'bite' && this.movePhase === 2 ? 1 : this.telegraph * 0.5;
    ctx.fillStyle = '#04080a';
    ellipse(ctx, this.hx + 8, this.hy + 2, 8, 2 + open * 6);
    ctx.fill();
    eye(ctx, this.hx + 4, this.hy - 8, 2, this.telegraph > 0 ? '#ff7a50' : '#70e0d0', 1.4);
    eye(ctx, this.hx - 6, this.hy - 9, 1.5, this.telegraph > 0 ? '#ff7a50' : '#70e0d0', 1.4);
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    if (this.move === 'bite' && this.movePhase === 1) this.warnRect(ctx, this.vars.bx - 16, this.waterY - 4, 32, 4, this.telegraph);
    if (this.move === 'wave' && this.movePhase === 2) {
      const hgt = this.phase >= 2 ? 52 : 40;
      ctx.fillStyle = 'rgba(30,70,80,0.85)';
      ctx.beginPath();
      ctx.moveTo(this.waveX - 30 * this.waveDir, this.waterY);
      ctx.quadraticCurveTo(this.waveX, this.waterY - hgt * 1.3, this.waveX + 16 * this.waveDir, this.waterY);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,250,255,0.7)';
      ctx.stroke();
    }
    if (this.move === 'wave' && this.movePhase === 1) {
      const side = this.waveDir > 0 ? TILE : this.world.grid.pw - TILE * 6;
      this.warnRect(ctx, side, this.waterY - 50, TILE * 5, 50, this.telegraph * 0.6);
    }
  }

  protected bloodColor(): string {
    return '#70e0d0';
  }
}

// =====================================================================
// THE BLIND ASTRONOMER — Starwell Observatory.
// =====================================================================
export class Astronomer extends Boss {
  readonly id = 'astronomer';
  bossName = 'THE BLIND ASTRONOMER';
  bossTitle = 'Who Remembered the Sun';
  stars: { x: number; y: number }[] = [];
  lineIdx = 0;
  lineT = 0;
  meteors: { x: number; t: number; vx: number }[] = [];
  orbitR = 0;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 22, 36);
    this.setup(300);
    this.staggerMax = 16;
    this.contact = 1;
    this.rewards = [{ kind: 'key', value: 'seal_stars' }, { kind: 'echo', value: 'echo_5' }];
  }

  protected chooseMove(): string {
    const opts: [string, number][] = [['constellation', 3], ['meteors', 2], ['orbit', 2], ['blink', 1]];
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      const ty = this.floorY - 90 + Math.sin(this.t) * 10;
      this.y += (ty - this.y) * Math.min(1, dt * 2);
      this.x += (clamp(this.p.cx + (this.cx < this.p.cx ? -100 : 100), TILE * 3, this.world.grid.pw - TILE * 3) - this.cx) * Math.min(1, dt * 0.6);
      this.facePlayer();
    }
    this.tickMeteors(dt);
  }

  private tickMeteors(dt: number): void {
    const w = this.world;
    for (const m of this.meteors) {
      const before = m.t;
      m.t += dt;
      if (before < this.tele(0.7) && m.t >= this.tele(0.7)) w.spawnProjectile('star', m.x, TILE, m.vx, 260, { r: 5, life: 2.4, explode: 18 });
    }
    this.meteors = this.meteors.filter((m) => m.t < this.tele(0.7) + 0.1);
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'constellation': {
        if (this.moveT === 0) {
          const n = 4 + this.phase;
          this.stars = [];
          for (let i = 0; i < n; i++) {
            this.stars.push({ x: TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6), y: TILE * 3 + fxRng.next() * (this.floorY - TILE * 4) });
          }
          // Ensure one line crosses near the player
          this.stars[1] = { x: this.p.cx + (fxRng.next() - 0.5) * 30, y: this.p.cy };
          this.lineIdx = 0;
          this.lineT = 0;
          sfx('boss_charge', this.cx, this.cy, 0.6, 1.6);
        }
        this.moveT += dt;
        this.lineT += dt;
        const tele = this.tele(0.6);
        if (this.lineIdx < this.stars.length - 1) {
          if (this.lineT > tele) {
            const a = this.stars[this.lineIdx];
            const b = this.stars[this.lineIdx + 1];
            if (this.lineT - dt <= tele) sfx('boss_beam', (a.x + b.x) / 2, (a.y + b.y) / 2, 0.6, 1.5);
            const p = this.p;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len2 = dx * dx + dy * dy;
            const tt = clamp(((p.cx - a.x) * dx + (p.cy - a.y) * dy) / len2, 0, 1);
            if (dist(p.cx, p.cy, a.x + dx * tt, a.y + dy * tt) < 10) p.hurt(1, a.x + dx * tt);
          }
          if (this.lineT > tele + 0.35) {
            this.lineIdx++;
            this.lineT = this.phase >= 2 ? tele * 0.5 : 0;
          }
        } else this.endMove();
        this.idle(dt);
        return;
      }
      case 'meteors': {
        const ph = this.step(dt, 0.4, 0.1, 1.4);
        if (ph === 2 && this.moveEnter) {
          const n = 6 + this.phase * 2;
          const vx = fxRng.next() < 0.5 ? -80 : 80;
          for (let i = 0; i < n; i++) this.meteors.push({ x: TILE * 2 + (i / n) * (w.grid.pw - TILE * 4) - vx * 0.3, t: -i * 0.12, vx });
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'orbit': {
        const ph = this.step(dt, 0.5, 3.0, 0.4);
        if (ph === 2) {
          const u = (this.moveT - this.tele(0.5)) / 3;
          this.orbitR = 20 + Math.sin(u * Math.PI) * 130;
          const n = 6 + this.phase * 2;
          for (let i = 0; i < n; i++) {
            const a = this.t * 1.6 + (i / n) * TAU;
            const sx = this.cx + Math.cos(a) * this.orbitR;
            const sy = this.cy + Math.sin(a) * this.orbitR * 0.75;
            if (dist(sx, sy, this.p.cx, this.p.cy) < 9) this.p.hurt(1, sx);
          }
        } else this.orbitR = 0;
        if (ph === 4) this.endMove();
        break;
      }
      case 'blink': {
        const ph = this.step(dt, 0.3, 0.1, 0.3);
        if (ph === 2 && this.moveEnter) {
          w.fx.burst(this.cx, this.cy, 20, '#e0e4ff', 120, 0.6, 2);
          this.x = TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6);
          this.y = TILE * 3 + fxRng.next() * 60;
          w.fx.burst(this.cx, this.cy, 20, '#e0e4ff', 120, 0.6, 2);
          sfx('teleport', this.cx, this.cy, 0.8, 1.2);
        }
        if (ph === 4) this.endMove(0.5);
        break;
      }
    }
    this.tickMeteors(dt);
  }

  protected onPhase(n: number): void {
    if (n === 2) {
      this.world.extraDarkness = 0.45;
      this.world.ui.hint('The last stars go out. Only hers remain.');
    }
  }

  protected onDeathStart(): void {
    this.world.extraDarkness = 0;
  }

  protected onDefeated(): void {
    setFlag(this.world.progress, 'starwell_open');
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const by = this.y + this.h;
    ctx.save();
    ctx.translate(this.cx, by);
    ctx.scale(this.facing, 1);
    // Robe of night with constellations stitched in
    ctx.fillStyle = '#141a3a';
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.quadraticCurveTo(-12, -18, -5, -28);
    ctx.lineTo(5, -28);
    ctx.quadraticCurveTo(12, -18, 10, 0);
    for (let i = 0; i < 5; i++) ctx.lineTo(10 - i * 5, 3 + Math.sin(this.t * 3 + i) * 2);
    ctx.fill();
    for (let i = 0; i < 8; i++) fillCircle(ctx, -7 + ((i * 3.7) % 14), -4 - ((i * 7.3) % 22), 0.6, '#e0e4ff');
    // Head wrapped in a blindfold of gold cloth
    ctx.fillStyle = '#c8c0d8';
    ellipse(ctx, 0, -31, 4.5, 5);
    ctx.fill();
    ctx.fillStyle = '#d8b860';
    ctx.fillRect(-5, -33, 10, 2.5);
    ctx.beginPath();
    ctx.moveTo(-5, -32);
    ctx.lineTo(-9, -28 + Math.sin(this.t * 2));
    ctx.lineTo(-5, -31);
    ctx.fill();
    // Telescope staff
    ctx.strokeStyle = '#8a8ab0';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(6, -20);
    ctx.lineTo(12, -40);
    ctx.stroke();
    ctx.fillStyle = '#c8c8f0';
    ctx.fillRect(10, -44, 5, 4);
    ctx.restore();
    glow(ctx, this.cx + this.facing * 12, this.y - 4, 18, '#e0e4ff', 0.6 + this.telegraph * 0.4);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    if (this.move === 'constellation') {
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        glow(ctx, s.x, s.y, 12, '#e0e4ff', 0.8);
        fillCircle(ctx, s.x, s.y, 1.8, '#ffffff');
        if (i < this.stars.length - 1 && i >= this.lineIdx) {
          const b = this.stars[i + 1];
          const active = i === this.lineIdx && this.lineT > this.tele(0.6);
          ctx.save();
          if (active) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = 'rgba(220,225,255,0.9)';
            ctx.lineWidth = 5;
          } else {
            ctx.strokeStyle = i === this.lineIdx ? 'rgba(255,120,100,0.7)' : 'rgba(200,205,255,0.25)';
            ctx.lineWidth = 0.7;
            ctx.setLineDash([3, 3]);
          }
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
    if (this.move === 'orbit' && this.orbitR > 0) {
      const n = 6 + this.phase * 2;
      for (let i = 0; i < n; i++) {
        const a = this.t * 1.6 + (i / n) * TAU;
        const sx = this.cx + Math.cos(a) * this.orbitR;
        const sy = this.cy + Math.sin(a) * this.orbitR * 0.75;
        glow(ctx, sx, sy, 12, '#e0e4ff', 0.9);
        fillCircle(ctx, sx, sy, 3, '#ffffff');
      }
    }
    if (this.move === 'orbit' && this.movePhase === 1) this.warnCircle(ctx, this.cx, this.cy, 30, this.telegraph);
    for (const m of this.meteors) {
      if (m.t > 0 && m.t < this.tele(0.7)) {
        ctx.strokeStyle = 'rgba(255,140,110,0.5)';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(m.x, TILE);
        ctx.lineTo(m.x + m.vx * ((this.floorY - TILE) / 260), this.floorY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  protected bloodColor(): string {
    return '#e0e4ff';
  }
}

// =====================================================================
// THE GRIEVING CROWN — Veiled Garden. The Queen, who could not let go.
// =====================================================================
export class GrievingCrown extends Boss {
  readonly id = 'crown';
  bossName = 'THE GRIEVING CROWN';
  bossTitle = 'Seraphel, Who Remembers';
  rings: { r: number }[] = [];
  blooms: { x: number; y: number; t: number }[] = [];
  calmT = 0;
  angered = false;
  spared = false;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 26, 50);
    this.setup(330);
    this.thresholds = [0.6, 0.25];
    this.staggerMax = 18;
    this.rewards = [{ kind: 'key', value: 'seal_memory' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    if (this.phase === 2 && !this.angered && !this.vars.wept) return 'weep';
    const opts: [string, number][] = [['petals', 3], ['garden', 2], ['embrace', 2]];
    if (this.phase >= 1) opts.push(['lullaby', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      const ty = this.floorY - this.h - 10 + Math.sin(this.t * 1.2) * 5;
      this.y += (ty - this.y) * Math.min(1, dt * 2);
      this.x += (clamp(this.p.cx + (this.cx < this.p.cx ? -80 : 80), TILE * 3, this.world.grid.pw - TILE * 3) - this.cx) * Math.min(1, dt * 0.6);
      this.facePlayer();
    }
    this.tickHazards(dt);
  }

  private tickHazards(dt: number): void {
    const w = this.world;
    for (const r of this.rings) {
      r.r += 85 * dt;
      const d = dist(this.cx, this.cy, w.player.cx, w.player.cy);
      if (Math.abs(d - r.r) < 6) w.player.hurt(1, this.cx);
    }
    this.rings = this.rings.filter((r) => r.r < 420);
    for (const b of this.blooms) {
      const before = b.t;
      b.t += dt;
      if (before < this.tele(0.8) && b.t >= this.tele(0.8)) {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU - Math.PI / 2;
          w.spawnProjectile('petal', b.x, b.y, Math.cos(a) * 110, Math.sin(a) * 110, { r: 3.5, life: 1.8 });
        }
        sfx('break', b.x, b.y, 0.5, 1.5);
      }
    }
    this.blooms = this.blooms.filter((b) => b.t < this.tele(0.8) + 0.1);
  }

  protected modifyHit(_hit: HitInfo): number | 'block' {
    if (this.move === 'weep') {
      this.angered = true;
      this.calmT = 0;
      this.move = '';
      this.rest = 0.3;
      this.world.ui.hint('Her grief turns to fury.');
      sfx('boss_roar', this.cx, this.cy, 1, 1.2);
    }
    return 1;
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'petals': {
        const ph = this.step(dt, 0.5, 2.0, 0.4);
        if (ph === 2 && Math.floor(this.moveT * 10) !== Math.floor((this.moveT - dt) * 10)) {
          const arms = 3 + this.phase;
          for (let i = 0; i < arms; i++) {
            const a = this.moveT * 2.2 + (i / arms) * TAU;
            w.spawnProjectile('petal', this.cx, this.cy, Math.cos(a) * 95, Math.sin(a) * 95, { r: 3, life: 3 });
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'garden': {
        const ph = this.step(dt, 0.3, 0.1, 1.2);
        if (ph === 2 && this.moveEnter) {
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) {
            const x = i === 0 ? this.p.cx : TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6);
            this.blooms.push({ x, y: this.floorY - 6, t: -i * 0.15 });
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'embrace': {
        const ph = this.step(dt, 0.7, 0.55, 0.5);
        if (ph === 1 && this.moveEnter) {
          this.vars.tx = this.p.cx;
          this.vars.ty = this.p.cy;
        }
        if (ph === 2) {
          const dx = this.vars.tx - this.cx;
          const dy = this.vars.ty - this.cy;
          const d = Math.hypot(dx, dy) || 1;
          this.x += (dx / d) * 360 * dt;
          this.y += (dy / d) * 260 * dt;
          this.x = clamp(this.x, TILE, w.grid.pw - TILE - this.w);
          this.y = clamp(this.y, TILE, this.floorY - this.h);
          this.hurtRect({ x: this.x - 6, y: this.y, w: this.w + 12, h: this.h }, this.phase >= 2 ? 2 : 1);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'lullaby': {
        const ph = this.step(dt, 0.6, 1.6, 0.5);
        if (ph === 2 && Math.floor(this.moveT / 0.5) !== Math.floor((this.moveT - dt) / 0.5)) {
          this.rings.push({ r: 8 });
          sfx('bell', this.cx, this.cy, 0.4, 1.8);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'weep': {
        if (this.moveT === 0) {
          this.calmT = 0;
          this.world.ui.hint('She has stopped fighting. She is only weeping.');
          sfx('boss_phase', this.cx, this.cy, 0.5, 0.6);
        }
        this.moveT += dt;
        this.calmT += dt;
        this.y += (this.floorY - this.h - this.y) * Math.min(1, dt * 2);
        if (this.calmT > 6.5 && !this.angered) {
          this.spare();
          return;
        }
        if (this.moveT > 8) {
          this.vars.wept = 1;
          this.endMove();
        }
        return;
      }
    }
    this.tickHazards(dt);
  }

  private spare(): void {
    const w = this.world;
    this.spared = true;
    setFlag(w.progress, 'crown_spared');
    this.rewards.push({ kind: 'echo', value: 'echo_4' });
    events.emit('flash', { color: '#ffe8f4', time: 1, alpha: 0.5 });
    w.ui.hint('"...Aeren? You came back." She lets go.');
    this.die();
  }

  protected dying(dt: number): void {
    if (this.spared) {
      if (fxRng.next() < 0.8) this.world.fx.spawn(PK.Leaf, this.x + fxRng.next() * this.w, this.y + fxRng.next() * this.h, (fxRng.next() - 0.5) * 30, -40, 2, 2, '#ffd8f0');
      return;
    }
    super.dying(dt);
  }

  protected paintPlacement() {
    const fading = this.spared && this.bstate !== 'fight';
    return { x: this.cx, y: this.y + this.h, height: this.h * 1.3, alpha: fading ? Math.max(0, 1 - this.stateT / 3) : 1 };
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const by = this.y + this.h;
    const weeping = this.move === 'weep' || this.spared;
    ctx.save();
    if (this.spared && this.bstate !== 'fight') ctx.globalAlpha = Math.max(0, 1 - this.stateT / 3);
    ctx.translate(this.cx, by);
    ctx.scale(this.facing, 1);
    // Gown of blossoms
    ctx.fillStyle = '#2e2030';
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.quadraticCurveTo(-12, -26, -4, -36);
    ctx.lineTo(4, -36);
    ctx.quadraticCurveTo(12, -26, 14, 0);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 14; i++) fillCircle(ctx, -11 + ((i * 5.3) % 22), -2 - ((i * 7.7) % 30), 1.6, i % 2 ? '#f4c8e0' : '#fff0f6');
    // Long veil
    ctx.fillStyle = 'rgba(255,240,248,0.35)';
    ctx.beginPath();
    ctx.moveTo(-3, -48);
    ctx.quadraticCurveTo(-18, -30, -16 + Math.sin(this.t * 1.5) * 2, 0);
    ctx.lineTo(-6, 0);
    ctx.quadraticCurveTo(-8, -30, 2, -46);
    ctx.fill();
    // Head bowed when weeping
    const bow = weeping ? 4 : 0;
    ctx.fillStyle = '#f0e4ec';
    ellipse(ctx, 1, -42 + bow, 4.5, 5.2);
    ctx.fill();
    if (weeping) {
      ctx.strokeStyle = 'rgba(160,220,255,0.8)';
      ctx.beginPath();
      ctx.moveTo(3, -41 + bow);
      ctx.lineTo(3, -36 + bow + ((this.t * 8) % 4));
      ctx.stroke();
    } else eye(ctx, 2.5, -42, 1, this.telegraph > 0 ? '#ff6a8a' : '#ffd8f0', 1);
    // Crown with one broken point
    ctx.fillStyle = '#e8d090';
    for (let i = -2; i <= 2; i++) {
      if (i === 1) continue;
      ctx.beginPath();
      ctx.moveTo(1 + i * 2.3 - 1, -46 + bow);
      ctx.lineTo(1 + i * 2.3, -51 + bow - (i === 0 ? 2 : 0));
      ctx.lineTo(1 + i * 2.3 + 1, -46 + bow);
      ctx.fill();
    }
    // Arms: cradling nothing
    ctx.strokeStyle = '#f0e4ec';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    const open = this.move === 'embrace' ? 1 : 0;
    ctx.moveTo(-3, -32);
    ctx.quadraticCurveTo(-8 - open * 6, -24, -1, -22 - open * 4);
    ctx.moveTo(3, -32);
    ctx.quadraticCurveTo(9 + open * 6, -24, 2, -22 - open * 4);
    ctx.stroke();
    ctx.restore();
    glow(ctx, this.cx, this.y + 8, 30, '#ffd8f0', 0.4);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const r of this.rings) {
      ctx.strokeStyle = 'rgba(255,210,235,0.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, r.r, 0, TAU);
      ctx.stroke();
    }
    for (const b of this.blooms) {
      if (b.t > 0 && b.t < this.tele(0.8)) {
        const k = b.t / this.tele(0.8);
        this.warnCircle(ctx, b.x, b.y, 10 + k * 6, k);
        fillCircle(ctx, b.x, b.y, 2 + k * 4, '#f4c8e0');
      }
    }
  }

  protected bloodColor(): string {
    return '#ffd8f0';
  }
}

// =====================================================================
// THE CONDUCTOR — Silent Engine. The Archon, fused to his machine.
// =====================================================================
export class Conductor extends Boss {
  readonly id = 'conductor';
  bossName = 'THE CONDUCTOR';
  bossTitle = 'Archon Thessaly Vane';
  pistons: { x: number; t: number }[] = [];
  beam: { y: number; t: number } | null = null;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 48, 60);
    this.setup(380);
    this.staggerMax = 20;
    this.contact = 1;
    this.rewards = [{ kind: 'echo', value: 'echo_6' }];
  }

  protected chooseMove(): string {
    const opts: [string, number][] = [['cogs', 2], ['beams', 3], ['pistons', 3]];
    if (this.phase >= 2) opts.push(['overture', 2]);
    return this.pick(opts);
  }

  protected idle(_dt: number): void {
    this.tickPistons(_dt);
  }

  private tickPistons(dt: number): void {
    for (const p of this.pistons) {
      p.t += dt;
      const fire = this.tele(0.75);
      if (p.t > fire && p.t < fire + 0.35) this.hurtRect({ x: p.x - 14, y: TILE, w: 28, h: this.floorY - TILE });
      if (p.t - dt <= fire && p.t > fire) {
        this.world.camera.shake(0.3, 0.1);
        sfx('boss_slam', p.x, this.floorY, 0.5, 1.2);
        this.world.fx.dust(p.x, this.floorY, 6);
      }
    }
    this.pistons = this.pistons.filter((p) => p.t < this.tele(0.75) + 0.6);
    if (this.beam) {
      this.beam.t += dt;
      const fire = this.tele(0.7);
      if (this.beam.t > fire && this.beam.t < fire + 0.45) this.hurtRect({ x: TILE, y: this.beam.y - 5, w: this.world.grid.pw - TILE * 2, h: 10 });
      if (this.beam.t - dt <= fire && this.beam.t > fire) sfx('boss_beam', this.cx, this.beam.y);
      if (this.beam.t > fire + 0.5) this.beam = null;
    }
  }

  protected modifyHit(_hit: HitInfo): number {
    return this.phase >= 2 ? 1.3 : 1;
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'cogs': {
        const ph = this.step(dt, 0.6, 0.1, 0.7);
        if (ph === 2 && this.moveEnter) {
          const n = 3 + this.phase;
          for (let i = 0; i < n; i++) w.spawnProjectile('cog', this.cx, this.y + 14, (i - (n - 1) / 2) * 70, -220 - fxRng.next() * 60, { r: 6, grav: 500, bounces: 3, life: 4 });
          sfx('enemy_shoot', this.cx, this.cy, 1, 0.6);
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'beams': {
        if (this.moveT === 0) this.vars.n = 0;
        this.moveT += dt;
        if (!this.beam) {
          const n = this.vars.n++;
          if (n >= 2 + this.phase) {
            this.endMove();
            break;
          }
          this.beam = { y: n % 2 === 0 ? this.floorY - 9 : this.floorY - 40, t: 0 };
        }
        break;
      }
      case 'pistons': {
        const ph = this.step(dt, 0.2, 0.1, 1.6);
        if (ph === 2 && this.moveEnter) {
          const n = 5;
          const span = (w.grid.pw - TILE * 4) / n;
          const skip = Math.floor(fxRng.next() * n);
          for (let i = 0; i < n; i++) {
            if (i === skip) continue;
            this.pistons.push({ x: TILE * 2 + span * (i + 0.5), t: -i * (this.phase >= 1 ? 0.15 : 0.25) });
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
      case 'overture': {
        const ph = this.step(dt, 0.8, 2.4, 0.5);
        if (ph === 2) {
          if (Math.floor(this.moveT * 3) !== Math.floor((this.moveT - dt) * 3)) this.pistons.push({ x: clamp(this.p.cx, TILE * 2, w.grid.pw - TILE * 2), t: 0 });
          if (Math.floor(this.moveT * 6) !== Math.floor((this.moveT - dt) * 6)) {
            const a = this.t * 3;
            w.spawnProjectile('orb', this.cx, this.y + 20, Math.cos(a) * 120, Math.abs(Math.sin(a)) * 100 + 20, { r: 3.5, life: 2.5, color: '#ffe890' });
          }
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.tickPistons(dt);
  }

  protected onPhase(n: number): void {
    const w = this.world;
    if (n === 1) {
      // The floor becomes a conveyor dragging intruders toward the Engine.
      w.windZones.push({ x: TILE, y: this.floorY - 32, w: this.cx - TILE - 20, h: 32, fx: 40, fy: 0 });
      w.windZones.push({ x: this.cx + 20, y: this.floorY - 32, w: w.grid.pw - this.cx - 20 - TILE, h: 32, fx: -40, fy: 0 });
      w.ui.hint('The floor grinds toward the Engine.');
    }
    if (n === 2) w.ui.hint('The core is exposed!');
  }

  protected onDeathStart(): void {
    this.world.windZones.length = 0;
    this.pistons = [];
    this.beam = null;
  }

  protected onDefeated(): void {
    setFlag(this.world.progress, 'abyss_open');
  }

  protected contactRects(): Rect[] {
    return [{ x: this.x + 8, y: this.y + 10, w: this.w - 16, h: this.h - 10 }];
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const cx = this.cx;
    const by = this.y + this.h;
    // Great gear behind
    ctx.save();
    ctx.translate(cx, this.y + 24);
    ctx.rotate(this.t * 0.4 * (this.phase + 1));
    ctx.strokeStyle = '#4a4436';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 34, 0, TAU);
    ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      ctx.fillStyle = '#4a4436';
      ctx.fillRect(Math.cos(a) * 36 - 3, Math.sin(a) * 36 - 3, 6, 6);
    }
    ctx.restore();
    // Machine body
    ctx.fillStyle = '#2a2620';
    ctx.beginPath();
    ctx.moveTo(cx - 24, by);
    ctx.lineTo(cx - 18, this.y + 14);
    ctx.lineTo(cx + 18, this.y + 14);
    ctx.lineTo(cx + 24, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a7a5a';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Core
    const exposed = this.phase >= 2;
    glow(ctx, cx, this.y + 34, exposed ? 30 : 16, '#ffd890', exposed ? 0.9 : 0.5);
    fillCircle(ctx, cx, this.y + 34, exposed ? 7 : 4, exposed ? '#fff0c0' : '#c8a860');
    // The Archon's torso, grafted to the top
    ctx.fillStyle = '#3a3448';
    ctx.fillRect(cx - 6, this.y + 2, 12, 14);
    ctx.fillStyle = '#d8d0c0';
    ellipse(ctx, cx, this.y, 5, 6);
    ctx.fill();
    ctx.fillStyle = '#2a2430';
    ctx.fillRect(cx - 5, this.y - 1, 10, 1.6);
    eye(ctx, cx - 2, this.y - 0.5, 0.8, this.telegraph > 0 ? '#ff6a4a' : '#ffd890', 1);
    eye(ctx, cx + 2, this.y - 0.5, 0.8, this.telegraph > 0 ? '#ff6a4a' : '#ffd890', 1);
    // Baton arms conducting
    const beat = Math.sin(this.t * 4);
    ctx.strokeStyle = '#d8c8a0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - 6, this.y + 6);
    ctx.lineTo(cx - 18, this.y - 6 + beat * 6);
    ctx.lineTo(cx - 28, this.y - 14 + beat * 10);
    ctx.moveTo(cx + 6, this.y + 6);
    ctx.lineTo(cx + 18, this.y - 6 - beat * 6);
    ctx.lineTo(cx + 28, this.y - 14 - beat * 10);
    ctx.stroke();
    glow(ctx, cx + 28, this.y - 14 - beat * 10, 6, '#ffe890', 0.8);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    for (const p of this.pistons) {
      const fire = this.tele(0.75);
      if (p.t > 0 && p.t < fire) this.warnRect(ctx, p.x - 14, this.floorY - 4, 28, 4, p.t / fire);
      const k = p.t < fire ? Math.max(0, p.t / fire) * 0.15 : p.t < fire + 0.35 ? 1 : Math.max(0, 1 - (p.t - fire - 0.35) / 0.25);
      if (p.t > 0) {
        const bottom = TILE + (this.floorY - TILE) * k;
        ctx.fillStyle = '#2a2620';
        ctx.fillRect(p.x - 4, TILE, 8, bottom - TILE);
        ctx.fillStyle = '#5a5040';
        ctx.fillRect(p.x - 14, bottom - 10, 28, 10);
      }
    }
    if (this.beam) {
      const fire = this.tele(0.7);
      if (this.beam.t < fire) this.warnRect(ctx, TILE, this.beam.y - 5, w.grid.pw - TILE * 2, 10, this.beam.t / fire);
      else {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(255,230,150,0.5)';
        ctx.fillRect(TILE, this.beam.y - 6, w.grid.pw - TILE * 2, 12);
        ctx.fillStyle = '#fff8d0';
        ctx.fillRect(TILE, this.beam.y - 2, w.grid.pw - TILE * 2, 4);
        ctx.restore();
      }
    }
  }

  protected bloodColor(): string {
    return '#ffd890';
  }
}
