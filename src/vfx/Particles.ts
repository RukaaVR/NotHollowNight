import { TAU } from '../core/math';
import { fxRng } from '../core/rng';

export const enum PK {
  Spark = 0,
  Dust = 1,
  Smoke = 2,
  Ember = 3,
  Glow = 4,
  Shard = 5,
  Ring = 6,
  Leaf = 7,
  Drop = 8,
  Bubble = 9,
  Streak = 10,
  Mote = 11,
}

const CAP = 2400;

/**
 * Pooled struct-of-arrays particle system. No per-frame allocation: dead
 * particles are swap-removed and the budget is enforced on spawn.
 */
export class Particles {
  budget = 900;
  count = 0;
  readonly x = new Float32Array(CAP);
  readonly y = new Float32Array(CAP);
  readonly vx = new Float32Array(CAP);
  readonly vy = new Float32Array(CAP);
  readonly life = new Float32Array(CAP);
  readonly max = new Float32Array(CAP);
  readonly size = new Float32Array(CAP);
  readonly size2 = new Float32Array(CAP);
  readonly rot = new Float32Array(CAP);
  readonly vr = new Float32Array(CAP);
  readonly grav = new Float32Array(CAP);
  readonly drag = new Float32Array(CAP);
  readonly kind = new Uint8Array(CAP);
  readonly add = new Uint8Array(CAP);
  readonly color: string[] = new Array(CAP).fill('#fff');
  /** Multiplier applied to spawn counts (reduced-particle accessibility). */
  density = 1;

  clear(): void {
    this.count = 0;
  }

  spawn(kind: PK, x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, opts?: { size2?: number; grav?: number; drag?: number; rot?: number; vr?: number; additive?: boolean }): void {
    if (this.count >= Math.min(CAP, this.budget)) return;
    const i = this.count++;
    this.kind[i] = kind;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.life[i] = life;
    this.max[i] = life;
    this.size[i] = size;
    this.size2[i] = opts?.size2 ?? size;
    this.grav[i] = opts?.grav ?? 0;
    this.drag[i] = opts?.drag ?? 0;
    this.rot[i] = opts?.rot ?? fxRng.next() * TAU;
    this.vr[i] = opts?.vr ?? 0;
    this.add[i] = opts?.additive ? 1 : 0;
    this.color[i] = color;
  }

  update(dt: number): void {
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.removeAt(i);
        continue;
      }
      const d = this.drag[i];
      if (d > 0) {
        const f = Math.exp(-d * dt);
        this.vx[i] *= f;
        this.vy[i] *= f;
      }
      this.vy[i] += this.grav[i] * dt;
      if (this.kind[i] === PK.Leaf) this.vx[i] += Math.sin(this.life[i] * 3 + i) * 30 * dt;
      if (this.kind[i] === PK.Bubble) this.vx[i] += Math.sin(this.life[i] * 6 + i) * 20 * dt;
      this.x[i] += this.vx[i] * dt;
      this.y[i] += this.vy[i] * dt;
      this.rot[i] += this.vr[i] * dt;
      i++;
    }
  }

  private removeAt(i: number): void {
    const j = --this.count;
    if (i === j) return;
    this.x[i] = this.x[j];
    this.y[i] = this.y[j];
    this.vx[i] = this.vx[j];
    this.vy[i] = this.vy[j];
    this.life[i] = this.life[j];
    this.max[i] = this.max[j];
    this.size[i] = this.size[j];
    this.size2[i] = this.size2[j];
    this.rot[i] = this.rot[j];
    this.vr[i] = this.vr[j];
    this.grav[i] = this.grav[j];
    this.drag[i] = this.drag[j];
    this.kind[i] = this.kind[j];
    this.add[i] = this.add[j];
    this.color[i] = this.color[j];
  }

  private n(base: number): number {
    return Math.max(1, Math.round(base * this.density));
  }

  // ---- Effect presets -------------------------------------------------

  sparks(x: number, y: number, dir: number, count: number, color = '#fff2c0', speed = 260): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = (dir === 0 ? fxRng.next() * TAU : (dir > 0 ? 0 : Math.PI) + (fxRng.next() - 0.5) * 1.6);
      const s = speed * (0.4 + fxRng.next() * 0.8);
      this.spawn(PK.Spark, x, y, Math.cos(a) * s, Math.sin(a) * s - 40, 0.18 + fxRng.next() * 0.2, 1 + fxRng.next(), color, { drag: 6, grav: 380, additive: true });
    }
  }

  dust(x: number, y: number, count: number, color = 'rgba(200,190,170,0.5)', spread = 40): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      this.spawn(PK.Dust, x + (fxRng.next() - 0.5) * 8, y, (fxRng.next() - 0.5) * spread * 2, -fxRng.next() * 30, 0.35 + fxRng.next() * 0.3, 2 + fxRng.next() * 2, color, { size2: 6 + fxRng.next() * 4, drag: 4 });
    }
  }

  burst(x: number, y: number, count: number, color: string, speed = 120, life = 0.6, size = 2.5): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = fxRng.next() * TAU;
      const s = speed * (0.3 + fxRng.next());
      this.spawn(PK.Glow, x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + fxRng.next() * 0.6), size * (0.6 + fxRng.next() * 0.8), color, { size2: 0.2, drag: 3, additive: true });
    }
  }

  shards(x: number, y: number, count: number, color: string, speed = 180): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (fxRng.next() - 0.5) * 2.6;
      const s = speed * (0.4 + fxRng.next() * 0.8);
      this.spawn(PK.Shard, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + fxRng.next() * 0.6, 2 + fxRng.next() * 3, color, { grav: 520, vr: (fxRng.next() - 0.5) * 20, drag: 1 });
    }
  }

  ring(x: number, y: number, r0: number, r1: number, life: number, color: string): void {
    this.spawn(PK.Ring, x, y, 0, 0, life, r0, color, { size2: r1, additive: true });
  }

  smoke(x: number, y: number, count: number, color = 'rgba(40,36,44,0.55)'): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      this.spawn(PK.Smoke, x + (fxRng.next() - 0.5) * 10, y + (fxRng.next() - 0.5) * 10, (fxRng.next() - 0.5) * 40, -20 - fxRng.next() * 30, 0.8 + fxRng.next() * 0.6, 4 + fxRng.next() * 3, color, { size2: 14 + fxRng.next() * 8, drag: 1.5 });
    }
  }

  embers(x: number, y: number, count: number, color = '#ffb060'): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      this.spawn(PK.Ember, x + (fxRng.next() - 0.5) * 12, y + (fxRng.next() - 0.5) * 6, (fxRng.next() - 0.5) * 50, -30 - fxRng.next() * 60, 0.6 + fxRng.next() * 0.9, 1 + fxRng.next(), color, { drag: 0.8, grav: -20, additive: true });
    }
  }

  splash(x: number, y: number, count: number, color = 'rgba(170,220,255,0.8)'): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (fxRng.next() - 0.5) * 1.8;
      const s = 80 + fxRng.next() * 140;
      this.spawn(PK.Drop, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.4 + fxRng.next() * 0.3, 1.2, color, { grav: 600 });
    }
  }

  bubbles(x: number, y: number, count: number): void {
    const n = this.n(count);
    for (let i = 0; i < n; i++) {
      this.spawn(PK.Bubble, x + (fxRng.next() - 0.5) * 10, y, 0, -30 - fxRng.next() * 40, 0.8 + fxRng.next() * 0.8, 1 + fxRng.next() * 2, 'rgba(190,240,255,0.7)');
    }
  }

  streak(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string): void {
    this.spawn(PK.Streak, x, y, vx, vy, life, size, color, { additive: true, drag: 5 });
  }
}
