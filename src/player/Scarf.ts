/** Verlet rope used for Aeren's ribbon-scarf and other trailing cloth. */
export class ScarfChain {
  readonly px: Float32Array;
  readonly py: Float32Array;
  private ox: Float32Array;
  private oy: Float32Array;
  private t = 0;

  constructor(readonly n: number, readonly seg: number) {
    this.px = new Float32Array(n);
    this.py = new Float32Array(n);
    this.ox = new Float32Array(n);
    this.oy = new Float32Array(n);
  }

  reset(x: number, y: number): void {
    for (let i = 0; i < this.n; i++) {
      this.px[i] = this.ox[i] = x;
      this.py[i] = this.oy[i] = y + i * this.seg;
    }
  }

  update(dt: number, ax: number, ay: number, vx: number, vy: number, wind: number, underwater: boolean): void {
    this.t += dt;
    const n = this.n;
    const grav = underwater ? 40 : 260;
    const damping = underwater ? 0.88 : 0.95;
    this.px[0] = ax;
    this.py[0] = ay;
    this.ox[0] = ax;
    this.oy[0] = ay;
    const dt2 = dt * dt;
    for (let i = 1; i < n; i++) {
      const x = this.px[i];
      const y = this.py[i];
      const flutter = Math.sin(this.t * 9 + i * 0.9) * (6 + Math.abs(vx) * 0.04) * (i / n);
      const fx = wind * 180 - vx * 1.4 + flutter * 8;
      const fy = grav - vy * 0.3 + Math.cos(this.t * 7 + i) * 10;
      const nx = x + (x - this.ox[i]) * damping + fx * dt2;
      const ny = y + (y - this.oy[i]) * damping + fy * dt2;
      this.ox[i] = x;
      this.oy[i] = y;
      this.px[i] = nx;
      this.py[i] = ny;
    }
    for (let iter = 0; iter < 3; iter++) {
      for (let i = 1; i < n; i++) {
        const dx = this.px[i] - this.px[i - 1];
        const dy = this.py[i] - this.py[i - 1];
        const d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const diff = (d - this.seg) / d;
        if (i === 1) {
          this.px[i] -= dx * diff;
          this.py[i] -= dy * diff;
        } else {
          this.px[i] -= dx * diff * 0.5;
          this.py[i] -= dy * diff * 0.5;
          this.px[i - 1] += dx * diff * 0.5;
          this.py[i - 1] += dy * diff * 0.5;
        }
      }
      this.px[0] = ax;
      this.py[0] = ay;
    }
  }
}
