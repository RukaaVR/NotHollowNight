/** Small, fast, seedable PRNG (mulberry32). */
export class Rng {
  private s: number;

  constructor(seed = 1) {
    this.s = seed >>> 0 || 1;
  }

  seed(seed: number): void {
    this.s = seed >>> 0 || 1;
  }

  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(lo: number, hi: number): number {
    return lo + (hi - lo) * this.next();
  }

  int(lo: number, hiInclusive: number): number {
    return lo + Math.floor(this.next() * (hiInclusive - lo + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  sign(): number {
    return this.next() < 0.5 ? -1 : 1;
  }
}

/** Shared gameplay RNG. Tests may reseed it for determinism. */
export const rng = new Rng(0xbeef);
/** Cosmetic RNG (particles etc.) so visuals never perturb gameplay determinism. */
export const fxRng = new Rng(0xf00d);
