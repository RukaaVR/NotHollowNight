import { Boss } from './Boss';
import { drawSprite } from '../rendering/SpriteArt';
import type { GameWorld } from '../world/GameWorld';
import type { Rect } from '../core/math';
import { TAU, clamp, dist, sign } from '../core/math';
import { sfx, events } from '../core/events';
import { fxRng } from '../core/rng';
import { glow, ellipse, fillCircle, eye } from '../rendering/draw';
import { T, TILE } from '../world/tiles';
import { createEnemy } from '../enemies/registry';
import { Mover } from '../world/objects/mechanisms';
import { setFlag } from '../progression/Progress';
import { PK } from '../vfx/Particles';

// =====================================================================
// THE GLOAM, NIGHTMARE OF ORUN — the final battle.
// =====================================================================
export class Gloam extends Boss {
  readonly id = 'gloam';
  bossName = 'THE GLOAM';
  bossTitle = 'Nightmare of Orun';
  tendrils: { x: number; t: number }[] = [];
  eyes: { x: number; y: number; t: number; ang: number }[] = [];
  homeY = 0;
  sinkT = 0;
  movesSinceSink = 0;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 56, 44);
    this.setup(620);
    this.phases = 4;
    this.thresholds = [0.75, 0.5, 0.25];
    this.staggerMax = 22;
    this.contact = 1;
    this.introRange = 320;
    this.homeY = TILE * 2.5;
    this.y = this.homeY;
  }

  protected chooseMove(): string {
    if (this.movesSinceSink >= 3) return 'sink';
    const opts: [string, number][] = [['tendrils', 3], ['eyes', 2], ['rain', 2]];
    if (this.phase >= 1) opts.push(['wave', 2], ['mimic', 1]);
    if (this.phase >= 2) opts.push(['echo_pistons', 2], ['echo_sweep', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate !== 'fight') {
      this.y += Math.sin(this.t) * 4 * dt;
      return;
    }
    this.y += (this.homeY + Math.sin(this.t * 0.9) * 8 - this.y) * Math.min(1, dt * 2);
    this.x += (clamp(this.p.cx, TILE * 4, this.world.grid.pw - TILE * 4) - this.cx) * Math.min(1, dt * 0.35);
    this.tick(dt);
  }

  private tick(dt: number): void {
    const w = this.world;
    for (const t of this.tendrils) {
      t.t += dt;
      const fire = this.tele(0.7);
      if (t.t > fire && t.t < fire + 0.6) this.hurtRect({ x: t.x - 8, y: this.floorY - 70, w: 16, h: 70 }, 1, { corrupt: 15 });
    }
    this.tendrils = this.tendrils.filter((t) => t.t < this.tele(0.7) + 0.7);
    for (const e of this.eyes) {
      e.t += dt;
      const fire = this.tele(0.9);
      if (e.t < fire * 0.7) e.ang = Math.atan2(this.p.cy - e.y, this.p.cx - e.x);
      if (e.t > fire && e.t < fire + 0.35) {
        const p = this.p;
        const px = p.cx - e.x;
        const py = p.cy - e.y;
        const along = px * Math.cos(e.ang) + py * Math.sin(e.ang);
        const perp = Math.abs(-px * Math.sin(e.ang) + py * Math.cos(e.ang));
        if (along > 0 && perp < 7) p.hurt(1, e.x, { corrupt: 10 });
        if (e.t - dt <= fire) sfx('boss_beam', e.x, e.y, 0.5, 0.8);
      }
    }
    this.eyes = this.eyes.filter((e) => e.t < this.tele(0.9) + 0.45);
    void w;
  }

  protected modifyHit(): number | 'block' {
    // Far above, only Arts bite deeply.
    return this.y < this.homeY + 30 ? 0.6 : 1.15;
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'tendrils': {
        const ph = this.step(dt, 0.3, 0.1, 1.1);
        if (ph === 2 && this.moveEnter) {
          const n = 4 + this.phase;
          for (let i = 0; i < n; i++) this.tendrils.push({ x: clamp(i === 0 ? this.p.cx : TILE * 3 + fxRng.next() * (w.grid.pw - TILE * 6), TILE * 2, w.grid.pw - TILE * 2), t: -i * 0.12 });
          sfx('boss_roar', this.cx, this.cy, 0.5, 0.6);
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'eyes': {
        const ph = this.step(dt, 0.2, 0.1, 1.4);
        if (ph === 2 && this.moveEnter) {
          const n = 3 + Math.min(2, this.phase);
          for (let i = 0; i < n; i++) {
            const side = i % 3;
            const x = side === 0 ? TILE * 1.5 : side === 1 ? w.grid.pw - TILE * 1.5 : TILE * 4 + fxRng.next() * (w.grid.pw - TILE * 8);
            const y = side === 2 ? TILE * 1.5 : TILE * 3 + fxRng.next() * (this.floorY - TILE * 5);
            this.eyes.push({ x, y, t: -i * 0.2, ang: 0 });
          }
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'rain': {
        const ph = this.step(dt, 0.5, 2.2, 0.4);
        if (ph === 2 && fxRng.next() < 0.22 + this.phase * 0.05) {
          w.spawnProjectile('gloam', TILE * 2 + fxRng.next() * (w.grid.pw - TILE * 4), TILE + 2, 0, 60, { r: 5, grav: 200, life: 3, corrupt: 20, delay: this.tele(0.35) });
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'wave': {
        const ph = this.step(dt, 0.7, 0.1, 0.7);
        if (ph === 2 && this.moveEnter) {
          for (const s of [-1, 1]) w.spawnProjectile('wave', clamp(this.cx, TILE * 3, w.grid.pw - TILE * 3) + s * 10, this.floorY - 4, s * 190, 0, { r: 9, life: 2.4, color: '#9a5ae0', corrupt: 15 });
          w.camera.shake(0.5, 0.2);
          sfx('boss_slam', this.cx, this.floorY, 1, 0.5);
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'mimic': {
        const ph = this.step(dt, 0.6, 0.1, 0.6);
        if (ph === 2 && this.moveEnter) {
          const e = createEnemy(w, 'dream_eater', clamp(this.p.cx + (fxRng.next() < 0.5 ? -90 : 90), 40, w.grid.pw - 40), this.floorY, false);
          if (e) {
            e.setState('chase');
            w.add(e);
            w.fx.burst(e.cx, e.cy, 20, '#8a6ad0', 100, 0.7, 3);
          }
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'echo_pistons': {
        // It dreams of the Engine.
        const ph = this.step(dt, 0.2, 0.1, 1.5);
        if (ph === 2 && this.moveEnter) {
          const n = 6;
          const span = (w.grid.pw - TILE * 4) / n;
          const skip = Math.floor(fxRng.next() * n);
          for (let i = 0; i < n; i++) if (i !== skip) this.tendrils.push({ x: TILE * 2 + span * (i + 0.5), t: -i * 0.12 });
          w.ui.hint('It dreams of the Engine...');
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'echo_sweep': {
        // It dreams of the Grove: a sweeping limb, high or low.
        const ph = this.step(dt, 0.9, 1.2, 0.4);
        if (ph === 1 && this.moveEnter) {
          this.vars.dir = this.p.cx < w.grid.pw / 2 ? -1 : 1;
          this.vars.high = fxRng.next() < 0.5 ? 1 : 0;
          this.vars.sx = this.vars.dir > 0 ? 0 : w.grid.pw;
        }
        if (ph === 2) {
          this.vars.sx += -this.vars.dir * (w.grid.pw / 1.0) * dt;
          const y = this.vars.high ? this.floorY - 46 : this.floorY - 14;
          this.hurtRect({ x: this.vars.sx - 20, y, w: 40, h: this.vars.high ? 26 : 14 }, 1, { corrupt: 10 });
        }
        if (ph === 4) {
          this.movesSinceSink++;
          this.endMove();
        }
        break;
      }
      case 'sink': {
        const ph = this.step(dt, 0.7, 2.6, 0.7);
        const target = ph >= 2 && ph <= 3 ? this.floorY - this.h - 6 : this.homeY;
        this.y += (target - this.y) * Math.min(1, dt * 4);
        if (ph === 2 && this.moveEnter) {
          w.camera.shake(0.5, 0.3);
          sfx('boss_slam', this.cx, this.cy, 0.8, 0.5);
        }
        if (ph === 4) {
          this.movesSinceSink = 0;
          this.endMove(0.6);
        }
        break;
      }
    }
    this.tick(dt);
  }

  protected onPhase(n: number): void {
    const w = this.world;
    if (n === 1) w.extraDarkness = 0.2;
    if (n === 2) w.ui.hint('The Gloam remembers everything you have fought.');
    if (n === 3) {
      // The dream comes apart: the floor dissolves into the void, leaving islands.
      const g = w.grid;
      const row = g.h - 1;
      const islands = [3, Math.floor(g.w / 2), g.w - 4];
      for (let x = 1; x < g.w - 1; x++) {
        if (islands.some((c) => Math.abs(x - c) <= 2)) continue;
        g.set(x, row, T.Empty);
        if (g.tile(x, row - 1) === T.Solid) g.set(x, row - 1, T.Empty);
      }
      const y = g.h - 4;
      w.add(new Mover(w, 6, y, 3, Math.floor(g.w / 2) - 12, 0, 4.5));
      w.add(new Mover(w, Math.floor(g.w / 2) + 3, y - 1, 3, Math.floor(g.w / 2) - 12, 0, 4.5, 0.5));
      w.extraDarkness = 0.35;
      w.camera.shake(1, 1.5);
      w.ui.hint('The dream comes apart beneath you.');
      sfx('break', this.cx, this.floorY, 1, 0.4);
    }
  }

  protected onDeathStart(): void {
    this.tendrils = [];
    this.eyes = [];
    this.world.extraDarkness = 0;
  }

  protected onDefeated(): void {
    setFlag(this.world.progress, 'gloam_defeated');
    this.world.ui.hint('Something vast stirs beneath the light. Approach it.');
  }

  protected contactRects(): Rect[] {
    return [{ x: this.x + 10, y: this.y + 8, w: this.w - 20, h: this.h - 12 }];
  }

  protected drawsCorpse(): boolean {
    return false;
  }

  protected paintPlacement() {
    return { x: this.cx, y: this.cy, centered: true, height: 78 };
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    const cx = this.cx;
    const cy = this.cy;
    // Writhing mass
    ctx.save();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * TAU + this.t * 0.3;
      const r = 26 + Math.sin(this.t * 2 + i) * 6;
      ctx.fillStyle = i % 2 ? 'rgba(20,8,30,0.9)' : 'rgba(40,16,60,0.85)';
      ellipse(ctx, cx + Math.cos(a) * 14, cy + Math.sin(a) * 10, r * 0.6, r * 0.45, a);
      ctx.fill();
    }
    // Tendrils hanging down
    ctx.strokeStyle = 'rgba(60,24,90,0.9)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const x0 = cx - 24 + i * 10;
      ctx.beginPath();
      ctx.moveTo(x0, cy + 10);
      ctx.quadraticCurveTo(x0 + Math.sin(this.t * 2 + i) * 10, cy + 40, x0 + Math.sin(this.t + i) * 16, cy + 60 + (i % 2) * 14);
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    glow(ctx, cx, cy, 70, '#8a4ad0', 0.4 + this.telegraph * 0.3);
    // Eyes scattered over the mass
    for (let i = 0; i < 7; i++) {
      const a = i * 2.3 + this.t * 0.2;
      const ex = cx + Math.cos(a) * 20;
      const ey = cy + Math.sin(a) * 12;
      const open = 0.5 + 0.5 * Math.sin(this.t * 1.7 + i * 1.3);
      ctx.fillStyle = '#05020a';
      ellipse(ctx, ex, ey, 3, 2 * open + 0.3);
      ctx.fill();
      if (open > 0.4) fillCircle(ctx, ex, ey, 1, '#ff8aff');
    }
    // The mask at its centre — a vast, cracked version of Aeren's own.
    ctx.fillStyle = '#e8e4f0';
    ellipse(ctx, cx, cy - 2, 11, 13);
    ctx.fill();
    ctx.strokeStyle = '#2a1a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 3, cy - 14);
    ctx.lineTo(cx + 1, cy - 4);
    ctx.lineTo(cx - 2, cy + 6);
    ctx.stroke();
    ctx.strokeStyle = this.telegraph > 0 ? '#ff6a8a' : '#c8a0ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(cx + 4, cy - 8);
    ctx.lineTo(cx + 4, cy + 2);
    ctx.stroke();
    glow(ctx, cx + 4, cy - 3, 14, '#c8a0ff', 0.8);
    ctx.restore();
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    const w = this.world;
    for (const t of this.tendrils) {
      const fire = this.tele(0.7);
      if (t.t > 0 && t.t < fire) this.warnRect(ctx, t.x - 8, this.floorY - 3, 16, 3, t.t / fire);
      else if (t.t >= fire) {
        const k = Math.min(1, (t.t - fire) / 0.08) * Math.max(0, 1 - (t.t - fire - 0.5) / 0.2);
        ctx.strokeStyle = '#3a1858';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(t.x, this.floorY);
        ctx.quadraticCurveTo(t.x + Math.sin(this.t * 6) * 6, this.floorY - 40 * k, t.x, this.floorY - 70 * k);
        ctx.stroke();
        ctx.lineCap = 'butt';
        glow(ctx, t.x, this.floorY - 70 * k, 10, '#9a5ae0', 0.6);
      }
    }
    for (const e of this.eyes) {
      if (e.t < 0) continue;
      const fire = this.tele(0.9);
      fillCircle(ctx, e.x, e.y, 5, '#1a0a24');
      eye(ctx, e.x, e.y, 2.5, '#ff8aff', 1);
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.ang);
      if (e.t < fire) {
        ctx.strokeStyle = 'rgba(255,110,140,0.6)';
        ctx.lineWidth = 0.7;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(500, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(200,120,255,0.5)';
        ctx.fillRect(0, -6, 500, 12);
        ctx.fillStyle = '#ffe0ff';
        ctx.fillRect(0, -2, 500, 4);
      }
      ctx.restore();
    }
    if (this.move === 'echo_sweep') {
      const y = this.vars.high ? this.floorY - 46 : this.floorY - 14;
      if (this.movePhase === 1) this.warnRect(ctx, this.vars.dir > 0 ? 0 : w.grid.pw - 30, y, 30, this.vars.high ? 26 : 14, this.telegraph);
      else if (this.movePhase === 2) {
        ctx.strokeStyle = '#3a1858';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.vars.dir > 0 ? 0 : w.grid.pw, y + 6);
        ctx.lineTo(this.vars.sx, y + 6);
        ctx.stroke();
        ctx.lineCap = 'butt';
      }
    }
  }

  protected bloodColor(): string {
    return '#c8a0ff';
  }
}

// =====================================================================
// THE FIRST WANDERER — a secret duel with the one who came before.
// =====================================================================
export class FirstWanderer extends Boss {
  readonly id = 'first_wanderer';
  bossName = 'THE FIRST WANDERER';
  bossTitle = 'Forty-First Before You';
  ghosts: { x: number; y: number; dir: number; t: number }[] = [];
  combo = 0;
  constructor(world: GameWorld, fx: number, fy: number) {
    super(world, fx, fy, 12, 24);
    this.setup(360);
    this.staggerMax = 14;
    this.contact = 0;
    this.rewards = [{ kind: 'relic', value: 'gloam_pact' }];
  }

  protected chooseMove(): string {
    this.facePlayer();
    const d = Math.abs(this.p.cx - this.cx);
    const opts: [string, number][] = [['dash', d > 60 ? 3 : 1], ['combo', d < 60 ? 3 : 1], ['step', 2], ['lance', d > 80 ? 2 : 1], ['plunge', 2]];
    if (this.phase >= 1) opts.push(['cleave', 2]);
    return this.pick(opts);
  }

  protected idle(dt: number): void {
    if (this.bstate === 'fight') {
      this.facePlayer();
      const d = this.p.cx - this.cx;
      this.vx = Math.abs(d) > 50 ? sign(d) * 90 : Math.abs(d) < 30 ? -sign(d) * 70 : this.vx * 0.8;
    }
    this.physics(dt);
    this.tickGhosts(dt);
  }

  private slashRect(reach = 30): Rect {
    return { x: this.facing > 0 ? this.cx : this.cx - reach, y: this.y - 2, w: reach, h: 26 };
  }

  private tickGhosts(dt: number): void {
    for (const g of this.ghosts) {
      g.t += dt;
      if (g.t > 0.45 && g.t < 0.6) this.hurtRect({ x: g.dir > 0 ? g.x : g.x - 30, y: g.y - 12, w: 30, h: 24 }, 1, { corrupt: 10 });
    }
    this.ghosts = this.ghosts.filter((g) => g.t < 0.7);
  }

  private leaveGhost(): void {
    if (this.phase >= 2) this.ghosts.push({ x: this.cx, y: this.cy, dir: this.facing, t: 0 });
  }

  protected runMove(name: string, dt: number): void {
    const w = this.world;
    switch (name) {
      case 'dash': {
        const ph = this.step(dt, 0.35, 0.22, 0.12, 0.35);
        if (ph === 2) {
          if (this.moveEnter) sfx('dash', this.cx, this.cy, 1, 0.8);
          this.vx = this.facing * 400;
          if (fxRng.next() < 0.8) w.fx.spawn(PK.Glow, this.cx, this.cy, -this.facing * 30, 0, 0.3, 2, '#b090ff', { additive: true });
        }
        if (ph === 3) {
          if (this.moveEnter) {
            sfx('swing', this.cx, this.cy, 1, 0.8);
            this.leaveGhost();
          }
          this.vx *= 0.7;
          this.hurtRect(this.slashRect());
        }
        if (ph === 4) this.vx *= 0.8;
        if (ph === 5) this.endMove(0.7);
        break;
      }
      case 'combo': {
        const ph = this.step(dt, 0.3, 0.1, 0.18);
        if (ph === 2) {
          if (this.moveEnter) {
            this.facePlayer();
            this.vx = this.facing * 140;
            sfx('swing', this.cx, this.cy, 1, 0.9 + this.combo * 0.1);
            this.leaveGhost();
          }
          this.hurtRect(this.slashRect());
        } else this.vx *= 0.8;
        if (ph === 4) {
          this.combo++;
          if (this.combo < 3) {
            this.moveT = this.tele(0.3) - 0.08;
            this.movePhase = 1;
          } else {
            this.combo = 0;
            this.endMove(0.9);
          }
        }
        break;
      }
      case 'step': {
        const ph = this.step(dt, 0.3, 0.12, 0.15, 0.4);
        if (ph === 2 && this.moveEnter) {
          w.fx.burst(this.cx, this.cy, 14, '#b090ff', 90, 0.4, 2.5);
          const nx = clamp(this.p.cx - this.p.facing * 30, TILE * 1.5, w.grid.pw - TILE * 1.5);
          this.x = nx - this.w / 2;
          this.y = this.floorY - this.h;
          w.fx.burst(this.cx, this.cy, 14, '#b090ff', 90, 0.4, 2.5);
          sfx('step_shadow', this.cx, this.cy, 1, 0.8);
          this.facePlayer();
        }
        if (ph === 3) {
          if (this.moveEnter) sfx('swing', this.cx, this.cy, 1, 0.8);
          this.hurtRect(this.slashRect());
        }
        if (ph === 5) this.endMove();
        break;
      }
      case 'lance': {
        const n = 1 + this.phase;
        const ph = this.step(dt, 0.45, 0.1 * n + 0.1, 0.4);
        this.vx *= 0.8;
        if (ph === 2) {
          const k = Math.floor((this.moveT - this.tele(0.45)) / 0.1);
          if (k < n && k !== this.vars.k) {
            this.vars.k = k;
            this.facePlayer();
            w.spawnProjectile('lance', this.cx, this.cy - 2, this.facing * 360, 0, { r: 4, life: 1.5, color: '#c8a0ff' });
            sfx('lance', this.cx, this.cy, 0.8, 0.7);
          }
        }
        if (ph === 4) {
          this.vars.k = -1;
          this.endMove();
        }
        break;
      }
      case 'plunge': {
        const ph = this.step(dt, 0.3, 0.5, 0.45, 0.4);
        if (ph === 2) {
          if (this.moveEnter) {
            this.vy = -560;
            this.vx = 0;
          }
          this.x += (this.p.cx - this.cx) * Math.min(1, dt * 4);
          if (this.vy > -50) this.vy = -50;
        }
        if (ph === 3) {
          this.vy = 800;
          if (this.onGround && !this.vars.landed) {
            this.vars.landed = 1;
            w.camera.shake(0.5, 0.2);
            sfx('drop_impact', this.cx, this.cy, 1, 0.8);
            this.hurtRect({ x: this.cx - 34, y: this.floorY - 22, w: 68, h: 22 });
            for (const s of [-1, 1]) w.spawnProjectile('wave', this.cx + s * 12, this.floorY - 4, s * 170, 0, { r: 6, life: 1.4, color: '#b090ff' });
          }
        }
        if (ph === 5) {
          this.vars.landed = 0;
          this.endMove();
        }
        break;
      }
      case 'cleave': {
        const ph = this.step(dt, 0.8, 0.14, 0.55);
        this.vx *= 0.8;
        if (ph === 2) {
          if (this.moveEnter) {
            sfx('swing_heavy', this.cx, this.cy, 1, 0.8);
            this.vx = this.facing * 160;
            w.camera.shake(0.3, 0.1);
            this.leaveGhost();
          }
          this.hurtRect({ x: this.facing > 0 ? this.cx - 6 : this.cx - 54, y: this.y - 14, w: 60, h: 40 }, 2);
        }
        if (ph === 4) this.endMove();
        break;
      }
    }
    this.physics(dt);
    this.tickGhosts(dt);
  }

  protected onDefeated(): void {
    setFlag(this.world.progress, 'first_wanderer');
    events.emit('toast', { text: 'The First Wanderer rests', sub: 'Its mask cracks. Something in you remembers its name.', kind: 'quest' });
  }

  protected drawBoss(ctx: CanvasRenderingContext2D): void {
    drawWanderer(ctx, this.cx, this.y + this.h, this.facing, this.t, this.move, this.movePhase, this.telegraph, 1);
  }

  drawEffects(ctx: CanvasRenderingContext2D): void {
    for (const g of this.ghosts) {
      ctx.globalAlpha = 0.5 * (1 - g.t / 0.7);
      drawWanderer(ctx, g.x, g.y + 12, g.dir, this.t, g.t > 0.45 ? 'combo' : '', 2, g.t < 0.45 ? g.t / 0.45 : 0, 0.6);
      ctx.globalAlpha = 1;
    }
    if (this.move === 'cleave' && this.movePhase === 1) this.warnRect(ctx, this.facing > 0 ? this.cx - 6 : this.cx - 54, this.y - 14, 60, 40, this.telegraph);
  }

  protected bloodColor(): string {
    return '#c8a0ff';
  }
}

/** Shared silhouette for the First Wanderer and its afterimages. */
function drawWanderer(ctx: CanvasRenderingContext2D, x: number, by: number, facing: number, t: number, move: string, phase: number, tele: number, alpha: number): void {
  // Afterimages use the painting too, leaning into the strike they echo.
  if (drawSprite(ctx, 'boss', 'first_wanderer', { x, y: by, height: 31, facing, alpha, rotate: phase === 2 ? 0.12 : -0.1 * tele, push: phase === 2 ? 3 : 0 })) return;
  ctx.save();
  ctx.translate(x, by);
  ctx.scale(facing, 1);
  ctx.globalAlpha *= alpha;
  // Tattered grey cloak
  ctx.fillStyle = '#3a3640';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-8, -12, -3, -18);
  ctx.lineTo(3, -18);
  ctx.quadraticCurveTo(7, -12, 6, 0);
  for (let i = 0; i < 4; i++) ctx.lineTo(6 - i * 4, -1 + Math.sin(t * 6 + i) * 1.5);
  ctx.fill();
  // Hood with a long torn tip
  ctx.beginPath();
  ctx.moveTo(-4, -18);
  ctx.quadraticCurveTo(0, -25, 4, -18);
  ctx.quadraticCurveTo(-5, -22, -13 + Math.sin(t * 3), -18);
  ctx.closePath();
  ctx.fill();
  // Cracked pale mask
  ctx.fillStyle = '#d8d4e0';
  ellipse(ctx, 1.5, -17, 3, 3.4);
  ctx.fill();
  ctx.strokeStyle = '#4a4050';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(1.5, -17);
  ctx.lineTo(0.5, -14);
  ctx.stroke();
  ctx.strokeStyle = tele > 0 ? '#ff6a8a' : '#c8a0ff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(2.8, -19);
  ctx.lineTo(2.8, -15);
  ctx.stroke();
  // Blade
  const swinging = (move === 'combo' || move === 'dash' || move === 'step' || move === 'cleave') && phase >= 2;
  const ang = swinging ? 0.4 : -0.9 - tele * 0.8;
  ctx.save();
  ctx.translate(3, -10);
  ctx.rotate(ang);
  ctx.fillStyle = '#c8b8f0';
  ctx.beginPath();
  ctx.moveTo(0, -1);
  ctx.lineTo(move === 'cleave' && swinging ? 22 : 15, 0);
  ctx.lineTo(0, 1.2);
  ctx.fill();
  ctx.restore();
  if (swinging) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(200,170,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(2, -10, move === 'cleave' ? 22 : 15, -1.2, 1.0);
    ctx.stroke();
  }
  ctx.restore();
  void dist;
}
