import { Entity, type HitInfo, type HitResult } from '../Entity';
import type { GameWorld } from '../GameWorld';
import type { Solid } from '../physics';
import { TILE } from '../tiles';
import { TAU, clamp } from '../../core/math';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, fillCircle, shade } from '../../rendering/draw';
import { hasFlag, setFlag } from '../../progression/Progress';

function makeSolid(x: number, y: number, w: number, h: number, oneWay: boolean): Solid {
  return { x, y, w, h, dx: 0, dy: 0, oneWay, active: true };
}

/** A gate that blocks passage until a flag is set (or while a boss fight is active). */
export class Gate extends Entity {
  solid: Solid;
  open = 0; // 0 closed .. 1 open
  constructor(world: GameWorld, tx: number, ty: number, public id: string, h: number, w: number, public opensOn: string | undefined, public closesOn: string | undefined, public boss: boolean) {
    super(world);
    this.x = tx * TILE;
    this.y = ty * TILE;
    this.w = w * TILE;
    this.h = h * TILE;
    this.layer = 15;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, false);
    world.solids.push(this.solid);
    this.open = this.shouldBeOpen() ? 1 : 0;
    this.solid.active = this.open < 0.5;
  }

  shouldBeOpen(): boolean {
    const pr = this.world.progress;
    if (this.boss) {
      const b = this.world.activeBoss;
      return !(b && b.bossActive);
    }
    if (this.closesOn && hasFlag(pr, this.closesOn)) return false;
    if (this.opensOn) return hasFlag(pr, this.opensOn);
    return hasFlag(pr, `gate_${this.id}`);
  }

  update(dt: number): void {
    const want = this.shouldBeOpen() ? 1 : 0;
    const before = this.open;
    this.open = clamp(this.open + (want ? dt * 2.5 : -dt * 5), 0, 1);
    if (before !== this.open && (this.open === 0 || this.open === 1)) {
      sfx('gate', this.cx, this.cy);
      this.world.camera.shake(0.25, 0.12);
      this.world.fx.dust(this.cx, this.bottom, 6);
    }
    this.solid.active = this.open < 0.5;
    // Push the player out if a closing gate overlaps them.
    if (this.solid.active) {
      const p = this.world.player.body;
      if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) {
        p.x = p.x + p.w / 2 < this.cx ? this.x - p.w : this.x + this.w;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    const shownH = this.h * (1 - this.open);
    if (shownH <= 0.5) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(this.x - 2, this.y, this.w + 4, shownH);
    ctx.clip();
    const yOff = -this.h * this.open;
    ctx.translate(0, yOff);
    if (this.boss) {
      // Thorned seal of light
      ctx.fillStyle = 'rgba(20,10,20,0.85)';
      ctx.fillRect(this.x + 2, this.y, this.w - 4, this.h);
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = 1;
      for (let y = this.y; y < this.y + this.h; y += 8) {
        ctx.beginPath();
        ctx.moveTo(this.x + 2, y);
        ctx.lineTo(this.x + this.w - 2, y + 4);
        ctx.stroke();
      }
      glow(ctx, this.cx, this.cy, this.h * 0.6, pal.accent, 0.25);
    } else {
      const bars = Math.max(2, Math.round(this.w / 5));
      ctx.fillStyle = shade(pal.tileDark, 0.1);
      ctx.fillRect(this.x, this.y, this.w, 3);
      ctx.fillRect(this.x, this.y + this.h - 3, this.w, 3);
      for (let i = 0; i < bars; i++) {
        const bx = this.x + 1 + (i * (this.w - 3)) / (bars - 1);
        ctx.fillStyle = '#1a1820';
        ctx.fillRect(bx - 1.5, this.y, 3, this.h);
        ctx.fillStyle = shade(pal.tileHi, -0.3);
        ctx.fillRect(bx - 0.5, this.y, 1, this.h);
        // spikes at the bottom
        ctx.fillStyle = '#1a1820';
        ctx.beginPath();
        ctx.moveTo(bx - 2, this.y + this.h);
        ctx.lineTo(bx, this.y + this.h + 4);
        ctx.lineTo(bx + 2, this.y + this.h);
        ctx.fill();
      }
      ctx.fillStyle = shade(pal.tileHi, -0.2);
      ctx.fillRect(this.x, this.y + this.h * 0.45, this.w, 2);
    }
    ctx.restore();
  }
}

/** Strike to open a linked gate (often a one-way shortcut). */
export class Lever extends Entity {
  pulled: boolean;
  anim = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string) {
    super(world);
    this.x = tx * TILE + 3;
    this.y = ty * TILE;
    this.w = 10;
    this.h = 16;
    this.hittable = true;
    this.pulled = hasFlag(world.progress, `gate_${id}`);
    this.anim = this.pulled ? 1 : 0;
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.pulled) return { hit: true, bounce: false };
    this.pulled = true;
    setFlag(this.world.progress, `gate_${this.id}`);
    sfx('lever', this.cx, this.cy);
    this.world.fx.sparks(this.cx, this.cy, hit.dir, 10, '#ffe0a0');
    this.world.camera.shake(0.3, 0.12);
    this.world.ui.toast('Something opened in the distance.', undefined, 'info');
    return { hit: true, bounce: false };
  }

  update(dt: number): void {
    this.anim = clamp(this.anim + (this.pulled ? dt * 6 : 0), 0, 1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    ctx.fillStyle = shade(pal.tileDark, 0.15);
    ctx.fillRect(this.x - 1, this.y + 10, 12, 6);
    ctx.save();
    ctx.translate(this.cx, this.y + 12);
    ctx.rotate(-0.8 + this.anim * 1.6);
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(-1, -12, 2, 12);
    fillCircle(ctx, 0, -12, 2.5, this.pulled ? '#8a7a6a' : '#ffcf7a');
    ctx.restore();
    if (!this.pulled) glow(ctx, this.cx, this.y + 2, 10, '#ffcf7a', 0.4 + 0.2 * Math.sin(this.world.time * 4));
  }
}

/** A crystal eye that only a thrown Veil Lance can reach. */
export class LanceSwitch extends Entity {
  on: boolean;
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string) {
    super(world);
    this.x = tx * TILE + 2;
    this.y = ty * TILE + 2;
    this.w = 12;
    this.h = 12;
    this.on = hasFlag(world.progress, `gate_${id}`);
    this.light = { r: 40, color: this.on ? '#9fffc0' : '#ffb0b0', intensity: 0.7 };
  }

  lanceHit(): void {
    if (this.on) return;
    this.on = true;
    setFlag(this.world.progress, `gate_${this.id}`);
    this.light = { r: 40, color: '#9fffc0', intensity: 0.9 };
    sfx('lever', this.cx, this.cy, 1, 1.5);
    this.world.fx.burst(this.cx, this.cy, 16, '#9fffc0', 120, 0.6, 2);
    this.world.camera.shake(0.25, 0.1);
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const c = this.on ? '#9fffc0' : '#ff9a9a';
    glow(ctx, this.cx, this.cy, 16, c, 0.5);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.t * (this.on ? 0.5 : 2));
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.lineTo(Math.cos(a) * 6, Math.sin(a) * 6);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    fillCircle(ctx, this.cx, this.cy, 2.5, c);
  }
}

/** Oscillating one-way platform. */
export class Mover extends Entity {
  solid: Solid;
  ox: number;
  oy: number;
  t: number;
  early = true;
  constructor(world: GameWorld, tx: number, ty: number, wTiles: number, public dxT: number, public dyT: number, public period: number, phase = 0) {
    super(world);
    this.ox = tx * TILE;
    this.oy = ty * TILE;
    this.x = this.ox;
    this.y = this.oy;
    this.w = wTiles * TILE;
    this.h = 8;
    this.t = phase * period;
    this.layer = 18;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, true);
    world.solids.push(this.solid);
  }

  update(dt: number): void {
    this.t += dt;
    const k = (1 - Math.cos((this.t / this.period) * TAU)) / 2;
    const nx = this.ox + this.dxT * TILE * k;
    const ny = this.oy + this.dyT * TILE * k;
    this.solid.dx = nx - this.x;
    this.solid.dy = ny - this.y;
    this.x = nx;
    this.y = ny;
    this.solid.x = nx;
    this.solid.y = ny;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawPlatform(ctx, this.world, this.x, this.y, this.w, 1);
  }
}

function drawPlatform(ctx: CanvasRenderingContext2D, world: GameWorld, x: number, y: number, w: number, alpha: number): void {
  const pal = world.palette;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = pal.tileDark;
  ctx.fillRect(x, y + 2, w, 6);
  ctx.fillStyle = pal.tile;
  ctx.fillRect(x, y, w, 4);
  ctx.fillStyle = pal.tileHi;
  ctx.fillRect(x + 1, y, w - 2, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 6; i < w; i += 12) ctx.fillRect(x + i, y + 4, 1, 4);
  glow(ctx, x + w / 2, y + 6, w * 0.35, pal.accent, 0.12);
  ctx.globalAlpha = 1;
}

/** Platform that falls shortly after being stood on, then reforms. */
export class Faller extends Entity {
  solid: Solid;
  state: 'idle' | 'shake' | 'fall' | 'gone' = 'idle';
  t = 0;
  oy: number;
  vy = 0;
  early = true;
  constructor(world: GameWorld, tx: number, ty: number, wTiles: number) {
    super(world);
    this.x = tx * TILE;
    this.y = this.oy = ty * TILE;
    this.w = wTiles * TILE;
    this.h = 8;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, false);
    this.solid.onStand = () => {
      if (this.state === 'idle') {
        this.state = 'shake';
        this.t = 0;
        sfx('crumble', this.cx, this.cy, 0.6);
      }
    };
    world.solids.push(this.solid);
  }

  update(dt: number): void {
    this.t += dt;
    this.solid.dx = 0;
    this.solid.dy = 0;
    if (this.state === 'shake' && this.t > 0.45) {
      this.state = 'fall';
      this.t = 0;
      this.vy = 0;
    } else if (this.state === 'fall') {
      this.vy = Math.min(this.vy + 900 * dt, 500);
      const d = this.vy * dt;
      this.y += d;
      this.solid.dy = d;
      this.solid.y = this.y;
      if (this.t > 0.25) this.solid.active = false;
      if (this.t > 1.2) {
        this.state = 'gone';
        this.t = 0;
      }
    } else if (this.state === 'gone' && this.t > 2.5) {
      this.state = 'idle';
      this.y = this.oy;
      this.solid.y = this.y;
      this.solid.active = true;
      this.world.fx.dust(this.cx, this.y, 4);
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.state === 'gone') return;
    const shake = this.state === 'shake' ? (fxRng.next() - 0.5) * 2 : 0;
    drawPlatform(ctx, this.world, this.x + shake, this.y, this.w, this.state === 'fall' ? Math.max(0, 1 - this.t) : 1);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.moveTo(this.x + this.w * 0.3 + shake, this.y);
    ctx.lineTo(this.x + this.w * 0.4 + shake, this.y + 8);
    ctx.moveTo(this.x + this.w * 0.7 + shake, this.y);
    ctx.lineTo(this.x + this.w * 0.62 + shake, this.y + 8);
    ctx.stroke();
  }
}

/** Heavy block that slams down periodically. */
export class Crusher extends Entity {
  solid: Solid;
  oy: number;
  t: number;
  early = true;
  private lastK = 0;
  constructor(world: GameWorld, tx: number, ty: number, wT: number, hT: number, public dyT: number, public period: number, phase = 0) {
    super(world);
    this.x = tx * TILE;
    this.y = this.oy = ty * TILE;
    this.w = wT * TILE;
    this.h = hT * TILE;
    this.t = phase * period;
    this.layer = 16;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, false);
    world.solids.push(this.solid);
  }

  private k(t: number): number {
    // Slow rise, hold, fast slam, hold.
    const u = (t % this.period) / this.period;
    if (u < 0.45) return 1 - u / 0.45;
    if (u < 0.6) return 0;
    if (u < 0.68) return ((u - 0.6) / 0.08) ** 2;
    return 1;
  }

  update(dt: number): void {
    this.t += dt;
    const k = this.k(this.t);
    const ny = this.oy + this.dyT * TILE * k;
    this.solid.dy = ny - this.y;
    this.solid.dx = 0;
    this.y = ny;
    this.solid.y = ny;
    if (this.lastK < 1 && k >= 1) {
      sfx('boss_slam', this.cx, this.bottom, 0.5);
      this.world.fx.dust(this.cx, this.bottom, 8, 'rgba(200,180,160,0.6)', 70);
      const p = this.world.player;
      if (Math.abs(p.cx - this.cx) < 200 && Math.abs(p.cy - this.cy) < 140) this.world.camera.shake(0.2, 0.1);
    }
    this.lastK = k;
    // Crush check
    const p = this.world.player.body;
    if (p.x < this.x + this.w - 1 && p.x + p.w > this.x + 1 && p.y < this.y + this.h && p.y + p.h > this.y + 2) {
      this.world.player.hazard();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    // chain
    ctx.strokeStyle = '#3a3640';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.moveTo(this.cx, this.oy - 200);
    ctx.lineTo(this.cx, this.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = shade(pal.tileDark, 0.08);
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = shade(pal.tile, -0.1);
    ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, this.h - 6);
    ctx.fillStyle = '#1a1418';
    for (let i = 0; i < this.w; i += 6) {
      ctx.beginPath();
      ctx.moveTo(this.x + i, this.y + this.h);
      ctx.lineTo(this.x + i + 3, this.y + this.h + 5);
      ctx.lineTo(this.x + i + 6, this.y + this.h);
      ctx.fill();
    }
    ctx.fillStyle = pal.tileHi;
    ctx.globalAlpha = 0.4;
    ctx.fillRect(this.x + 2, this.y + 2, this.w - 4, 1);
    ctx.globalAlpha = 1;
  }
}

/** A lift between two stops; follows the player when called. */
export class Elevator extends Entity {
  solid: Solid;
  top: number;
  bottomStop: number;
  atTop: boolean;
  moving = 0;
  rideT = 0;
  arrived = false;
  early = true;
  constructor(world: GameWorld, tx: number, ty: number, public id: string, dyT: number, wT: number) {
    super(world);
    this.x = tx * TILE;
    this.top = ty * TILE;
    this.bottomStop = (ty + dyT) * TILE;
    this.atTop = !hasFlag(world.progress, `lift_${id}`);
    this.y = this.atTop ? this.top : this.bottomStop;
    this.w = wT * TILE;
    this.h = 10;
    this.layer = 18;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, false);
    world.solids.push(this.solid);
  }

  update(dt: number): void {
    const p = this.world.player;
    const riding = p.onGround && p.body.ground === this.solid;
    this.solid.dx = 0;
    this.solid.dy = 0;
    if (this.moving !== 0) {
      const target = this.moving < 0 ? this.top : this.bottomStop;
      const step = 150 * dt * Math.sign(target - this.y);
      let ny = this.y + step;
      if ((step > 0 && ny >= target) || (step < 0 && ny <= target)) {
        ny = target;
        this.moving = 0;
        this.atTop = target === this.top;
        if (this.atTop) delete this.world.progress.flags[`lift_${this.id}`];
        else setFlag(this.world.progress, `lift_${this.id}`);
        this.arrived = riding;
        sfx('gate', this.cx, this.y, 0.6);
        this.world.camera.shake(0.2, 0.1);
      }
      this.solid.dy = ny - this.y;
      this.y = ny;
      this.solid.y = ny;
      return;
    }
    if (riding) {
      this.rideT += dt;
      if (this.rideT > 0.45 && !this.arrived) {
        this.moving = this.atTop ? 1 : -1;
        sfx('door', this.cx, this.y);
      }
    } else {
      this.rideT = 0;
      this.arrived = false;
      // Call to the player's floor
      const nearX = p.cx > this.x - 60 && p.cx < this.x + this.w + 60;
      if (nearX && p.onGround) {
        const dTop = Math.abs(p.y + p.h - this.top);
        const dBot = Math.abs(p.y + p.h - this.bottomStop);
        if (this.atTop && dBot < 24 && dBot < dTop) this.moving = 1;
        else if (!this.atTop && dTop < 24 && dTop < dBot) this.moving = -1;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    ctx.strokeStyle = '#2a2830';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x + 3, this.top - 400);
    ctx.lineTo(this.x + 3, this.y);
    ctx.moveTo(this.x + this.w - 3, this.top - 400);
    ctx.lineTo(this.x + this.w - 3, this.y);
    ctx.stroke();
    ctx.fillStyle = '#2a2224';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.fillStyle = shade(pal.tileHi, -0.3);
    ctx.fillRect(this.x, this.y, this.w, 2);
    ctx.fillStyle = '#ffcf7a';
    fillCircle(ctx, this.cx, this.y + 6, 1.5, this.moving ? '#9fffc0' : '#ffcf7a');
    glow(ctx, this.cx, this.y + 6, 8, '#ffcf7a', 0.5);
  }
}

/** Gate that opens and shuts on a timer — a rhythm challenge. */
export class TimedGate extends Entity {
  solid: Solid;
  t: number;
  openAmt = 0;
  early = true;
  constructor(world: GameWorld, tx: number, ty: number, hT: number, public period: number, public openFor: number, phase = 0) {
    super(world);
    this.x = tx * TILE + 4;
    this.y = ty * TILE;
    this.w = 8;
    this.h = hT * TILE;
    this.t = phase * period;
    this.solid = makeSolid(this.x, this.y, this.w, this.h, false);
    world.solids.push(this.solid);
  }

  update(dt: number): void {
    this.t += dt;
    const u = this.t % this.period;
    const isOpen = u < this.openFor;
    const before = this.openAmt;
    this.openAmt = clamp(this.openAmt + (isOpen ? dt * 6 : -dt * 6), 0, 1);
    if (before > 0.5 && this.openAmt <= 0.5) sfx('gate', this.cx, this.cy, 0.35);
    this.solid.active = this.openAmt < 0.5;
    if (this.solid.active) {
      const p = this.world.player.body;
      if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) this.world.player.hazard();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    const shown = this.h * (1 - this.openAmt);
    ctx.fillStyle = '#1a1620';
    ctx.fillRect(this.x, this.y, this.w, shown);
    ctx.fillStyle = pal.accent;
    ctx.globalAlpha = 0.6;
    ctx.fillRect(this.x + 3, this.y, 2, shown);
    ctx.globalAlpha = 1;
    // Warning light when about to close
    const u = this.t % this.period;
    const warn = u > this.openFor - 0.5 && u < this.openFor;
    glow(ctx, this.cx, this.y - 4, 8, warn ? '#ff6a4a' : '#9fffc0', 0.7);
  }
}

/** Glowing point for the Aether Grapple. */
export class Anchor extends Entity {
  t = fxRng.next() * 5;
  constructor(world: GameWorld, tx: number, ty: number) {
    super(world);
    this.x = tx * TILE + 3;
    this.y = ty * TILE + 3;
    this.w = 10;
    this.h = 10;
    this.light = { r: 34, color: '#7ff0d0', intensity: 0.7 };
    world.anchors.push(this);
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const has = !!this.world.progress.abilities.grapple;
    const p = this.world.player;
    const near = has && Math.hypot(p.cx - this.cx, p.cy - this.cy) < 150;
    glow(ctx, this.cx, this.cy, near ? 22 : 14, '#7ff0d0', near ? 0.8 : 0.35);
    ctx.save();
    ctx.translate(this.cx, this.cy);
    ctx.rotate(this.t);
    ctx.strokeStyle = has ? '#bffff0' : '#5a8a80';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-4, -4, 8, 8);
    ctx.restore();
    fillCircle(ctx, this.cx, this.cy, 2, has ? '#ffffff' : '#6a9a90');
    if (p.state === 'grapple' && p.grappleTarget === this) {
      ctx.strokeStyle = '#bffff0';
      ctx.lineWidth = 1.2;
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      ctx.moveTo(p.cx, p.cy);
      const mx = (p.cx + this.cx) / 2 + Math.sin(this.world.time * 40) * 2;
      const my = (p.cy + this.cy) / 2;
      ctx.quadraticCurveTo(mx, my, this.cx, this.cy);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
