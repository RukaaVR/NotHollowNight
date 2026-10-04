import { TAU } from '../core/math';
import { fxRng } from '../core/rng';
import { sfx } from '../core/events';
import { PK } from '../vfx/Particles';
import { T, TILE } from '../world/tiles';
import { newHitId, playerStrike } from './combat';
import type { GameWorld } from '../world/GameWorld';
import type { Team } from '../world/Entity';

export type ProjKind =
  | 'orb' | 'spore' | 'needle' | 'fire' | 'ink' | 'crystal' | 'bubble' | 'star' | 'thorn' | 'wave'
  | 'gloam' | 'rock' | 'ember' | 'feather' | 'page' | 'lance' | 'toll' | 'bellring' | 'beam_seg' | 'petal' | 'cog' | 'tear';

export interface ProjOpts {
  r?: number;
  dmg?: number;
  life?: number;
  grav?: number;
  pierce?: boolean;
  homing?: number;
  bounces?: number;
  wall?: boolean;
  color?: string;
  corrupt?: number;
  poison?: number;
  team?: Team;
  explode?: number;
  delay?: number;
  accel?: number;
}

export class Projectile {
  active = false;
  kind: ProjKind = 'orb';
  team: Team = 'enemy';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  r = 4;
  dmg = 1;
  life = 3;
  t = 0;
  grav = 0;
  pierce = false;
  homing = 0;
  bounces = 0;
  wall = true;
  color = '#fff';
  corrupt = 0;
  poison = 0;
  explode = 0;
  delay = 0;
  accel = 0;
  rot = 0;
  hitId = 0;
  reflected = false;

  init(kind: ProjKind, x: number, y: number, vx: number, vy: number, o: ProjOpts): void {
    this.active = true;
    this.kind = kind;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.r = o.r ?? 4;
    this.dmg = o.dmg ?? 1;
    this.life = o.life ?? 4;
    this.t = 0;
    this.grav = o.grav ?? 0;
    this.pierce = o.pierce ?? false;
    this.homing = o.homing ?? 0;
    this.bounces = o.bounces ?? 0;
    this.wall = o.wall ?? true;
    this.color = o.color ?? DEFAULT_COLORS[kind];
    this.corrupt = o.corrupt ?? 0;
    this.poison = o.poison ?? 0;
    this.team = o.team ?? 'enemy';
    this.explode = o.explode ?? 0;
    this.delay = o.delay ?? 0;
    this.accel = o.accel ?? 0;
    this.rot = fxRng.next() * TAU;
    this.hitId = newHitId();
    this.reflected = false;
  }

  update(w: GameWorld, dt: number): void {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    this.t += dt;
    if (this.t >= this.life) {
      this.kill(w, false);
      return;
    }
    if (this.homing > 0 && this.team === 'enemy') {
      const p = w.player;
      const want = Math.atan2(p.cy - this.y, p.cx - this.x);
      const cur = Math.atan2(this.vy, this.vx);
      let d = want - cur;
      while (d > Math.PI) d -= TAU;
      while (d < -Math.PI) d += TAU;
      const sp = Math.hypot(this.vx, this.vy);
      const na = cur + Math.max(-this.homing * dt, Math.min(this.homing * dt, d));
      this.vx = Math.cos(na) * sp;
      this.vy = Math.sin(na) * sp;
    }
    if (this.accel) {
      const sp = Math.hypot(this.vx, this.vy) || 1;
      const ns = sp + this.accel * dt;
      this.vx *= ns / sp;
      this.vy *= ns / sp;
    }
    this.vy += this.grav * dt;
    const nx = this.x + this.vx * dt;
    const ny = this.y + this.vy * dt;
    this.rot += dt * (this.kind === 'crystal' || this.kind === 'cog' ? 12 : 3);
    if (this.kind === 'wave') {
      // Shockwaves crawl along the floor and stop at walls.
      const tx = Math.floor(nx / TILE);
      const ty = Math.floor((this.y + 2) / TILE);
      if (w.grid.isSolidAt(tx, ty) || !w.grid.isSolidAt(tx, ty + 1)) {
        this.kill(w, true);
        return;
      }
      this.x = nx;
      if (fxRng.next() < 0.6) w.fx.dust(this.x, this.y + 4, 1, 'rgba(220,180,140,0.6)', 30);
    } else if (this.wall && this.solidAt(w, nx, ny)) {
      if (this.bounces > 0) {
        this.bounces--;
        if (this.solidAt(w, nx, this.y)) this.vx = -this.vx * 0.8;
        if (this.solidAt(w, this.x, ny)) this.vy = -this.vy * 0.6;
      } else {
        this.kill(w, true);
        return;
      }
    } else {
      this.x = nx;
      this.y = ny;
    }
    this.trail(w);
    if (this.team === 'enemy' && this.dmg > 0) {
      const p = w.player;
      const rr = this.r * 0.8;
      if (this.x + rr > p.x && this.x - rr < p.x + p.w && this.y + rr > p.y && this.y - rr < p.y + p.h) {
        if (p.hurt(this.dmg, this.x, { corrupt: this.corrupt, poison: this.poison })) {
          if (!this.pierce) this.kill(w, true);
        }
      }
    } else if (this.team === 'player') {
      const res = playerStrike(w, { x: this.x - this.r, y: this.y - this.r, w: this.r * 2, h: this.r * 2 }, {
        base: this.dmg, dir: Math.sign(this.vx) || 1, dirY: 0, knock: 0.8, stagger: this.kind === 'lance' ? 2 : 1,
        source: this.kind === 'lance' ? 'lance' : this.kind === 'toll' ? 'toll' : this.reflected ? 'reflect' : 'ember',
        hitId: this.hitId, breaks: this.kind === 'lance', canCrit: this.kind === 'lance',
      });
      if (res.hits > 0) {
        w.hitstop(0.035);
        if (!this.pierce) this.kill(w, true);
      }
      if (this.kind === 'lance') w.hitSwitches(this.x, this.y, this.r);
    }
  }

  private solidAt(w: GameWorld, x: number, y: number): boolean {
    const t = w.grid.tile(Math.floor(x / TILE), Math.floor(y / TILE));
    return t === T.Solid || t === T.SolidAlt || t === T.Breakable || t === T.Hidden || t === T.Fragile || (t === T.Phase && this.team === 'enemy') || t === T.Crumble;
  }

  private trail(w: GameWorld): void {
    const fx = w.fx;
    switch (this.kind) {
      case 'fire':
      case 'ember':
        if (fxRng.next() < 0.7) fx.embers(this.x, this.y, 1, this.color);
        break;
      case 'gloam':
        if (fxRng.next() < 0.5) fx.spawn(PK.Glow, this.x, this.y, -this.vx * 0.1, -this.vy * 0.1, 0.4, this.r * 0.7, '#8a4ad0', { additive: true, size2: 0.1 });
        break;
      case 'lance':
        fx.spawn(PK.Streak, this.x, this.y, -this.vx * 0.15, 0, 0.18, 3, '#bfe8ff', { additive: true });
        break;
      case 'star':
        if (fxRng.next() < 0.5) fx.spawn(PK.Glow, this.x, this.y, 0, 0, 0.5, 1.6, '#e0e4ff', { additive: true, size2: 0.1 });
        break;
      case 'spore':
        if (fxRng.next() < 0.3) fx.spawn(PK.Mote, this.x, this.y, 0, 0, 0.6, 1.4, '#b6f07a');
        break;
      case 'bubble':
        break;
      default:
        break;
    }
  }

  kill(w: GameWorld, impact: boolean): void {
    this.active = false;
    if (!impact && this.kind !== 'wave') return;
    switch (this.kind) {
      case 'lance':
        w.fx.burst(this.x, this.y, 10, '#bfe8ff', 120, 0.4, 2);
        w.fx.sparks(this.x, this.y, 0, 6, '#e8f8ff', 160);
        break;
      case 'fire':
        w.fx.embers(this.x, this.y, 8, '#ffb060');
        w.fx.smoke(this.x, this.y, 2);
        break;
      case 'ink':
        w.fx.burst(this.x, this.y, 8, '#2a2030', 80, 0.5, 3);
        break;
      case 'bubble':
        w.fx.ring(this.x, this.y, 2, this.r * 2, 0.25, 'rgba(190,240,255,0.8)');
        break;
      case 'crystal':
        w.fx.shards(this.x, this.y, 5, '#b8f0ff', 120);
        break;
      default:
        w.fx.burst(this.x, this.y, 6, this.color, 80, 0.35, 2);
    }
    if (this.explode > 0) {
      w.explosion(this.x, this.y, this.explode, this.team, this.dmg);
    }
  }
}

const DEFAULT_COLORS: Record<ProjKind, string> = {
  orb: '#ffcf8a', spore: '#b6f07a', needle: '#e8e0d0', fire: '#ff9a4a', ink: '#30223a', crystal: '#b8f0ff',
  bubble: '#bfefff', star: '#e8ecff', thorn: '#c0506a', wave: '#ffcf9a', gloam: '#9a5ae0', rock: '#8a7a6a',
  ember: '#ffb060', feather: '#f0e8ff', page: '#efe4c4', lance: '#bfe8ff', toll: '#ffe7a0', bellring: '#cfe8ff',
  beam_seg: '#ffffff', petal: '#ffc8e8', cog: '#c0b090', tear: '#9fd8ff',
};

/** Draws all active projectiles. Each kind has its own silhouette. */
export function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile, time: number): void {
  if (p.delay > 0) {
    // Telegraph marker for delayed projectiles
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(time * 30);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 3, 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  const ang = Math.atan2(p.vy, p.vx);
  switch (p.kind) {
    case 'lance': {
      ctx.rotate(ang);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(140,210,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-4, 0, p.r * 3.4, p.r * 1.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#e8f8ff';
      ctx.beginPath();
      ctx.moveTo(p.r * 2.6, 0);
      ctx.lineTo(-p.r * 2.2, -p.r * 0.55);
      ctx.lineTo(-p.r * 3.2, 0);
      ctx.lineTo(-p.r * 2.2, p.r * 0.55);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'needle':
    case 'thorn': {
      ctx.rotate(ang);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.r * 2, 0);
      ctx.lineTo(-p.r * 1.5, -p.r * 0.5);
      ctx.lineTo(-p.r, 0);
      ctx.lineTo(-p.r * 1.5, p.r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crystal':
    case 'cog': {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      const n = p.kind === 'cog' ? 8 : 4;
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU;
        const rr = i % 2 === 0 ? p.r * 1.3 : p.r * (p.kind === 'cog' ? 0.95 : 0.5);
        if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'bubble': {
      ctx.strokeStyle = 'rgba(200,245,255,0.85)';
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(120,200,230,0.18)';
      ctx.beginPath();
      ctx.arc(0, 0, p.r + Math.sin(p.t * 8) * 0.6, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(-p.r * 0.35, -p.r * 0.35, p.r * 0.25, 0, TAU);
      ctx.fill();
      break;
    }
    case 'wave': {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.moveTo(-p.r, 6);
      ctx.quadraticCurveTo(0, -p.r * 2.2 - Math.sin(p.t * 30) * 2, p.r, 6);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'feather':
    case 'page':
    case 'petal': {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r * 1.6, p.r * 0.7, 0, 0, TAU);
      ctx.fill();
      if (p.kind === 'page') {
        ctx.strokeStyle = 'rgba(60,40,20,0.6)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(-p.r, -1);
        ctx.lineTo(p.r, -1);
        ctx.moveTo(-p.r, 1);
        ctx.lineTo(p.r * 0.6, 1);
        ctx.stroke();
      }
      break;
    }
    case 'toll':
    case 'bellring': {
      const rr = p.r + p.t * 120;
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - p.t / p.life);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, TAU);
      ctx.stroke();
      break;
    }
    case 'rock': {
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(-p.r, -p.r * 0.6);
      ctx.lineTo(p.r * 0.4, -p.r);
      ctx.lineTo(p.r, p.r * 0.2);
      ctx.lineTo(0, p.r);
      ctx.lineTo(-p.r * 0.9, p.r * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    default: {
      // Glowing orb family
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 2, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(0, 0, p.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(0, 0, p.r * 0.45, 0, TAU);
      ctx.fill();
      if (p.kind === 'ink') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#1a1220';
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
