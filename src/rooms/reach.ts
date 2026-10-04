import type { RoomDef } from '../world/Room';
import { UW } from './builder';

/**
 * Approximate traversal model used by automated level-design tests.
 * It is deliberately conservative about jump reach so that rooms which pass
 * are comfortably completable by a real player.
 */
export interface ReachAbilities {
  dash?: boolean;
  grip?: boolean;
  glide?: boolean;
  step?: boolean;
  dive?: boolean;
  grapple?: boolean;
  phase?: boolean;
  drop?: boolean;
}

const SOLID = new Set(['#', 'X', 'B', 'H', 'F', 'C']);

export interface ReachNode {
  x: number;
  y: number;
}

export class ReachMap {
  readonly w: number;
  readonly h: number;
  private rows: string[];
  constructor(readonly room: RoomDef, readonly ab: ReachAbilities) {
    this.rows = room.rows;
    this.h = room.rows.length;
    this.w = room.rows.reduce((m, r) => Math.max(m, r.length), 0);
  }

  ch(x: number, y: number): string {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return '#';
    return this.rows[y][x] ?? '.';
  }

  solid(x: number, y: number): boolean {
    const c = this.ch(x, y);
    if (c === 'P') return !this.ab.phase;
    if (c === 'F') return !this.ab.drop || true;
    return SOLID.has(c);
  }

  hazard(x: number, y: number): boolean {
    const c = this.ch(x, y);
    if (c === 'T') return true;
    return c === '^' || c === 'v' || c === '<' || c === '>' || c === 'a';
  }

  water(x: number, y: number): boolean {
    return this.ch(x, y) === '~';
  }

  air(x: number, y: number): boolean {
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) return true; // beyond room edge: open
    return !this.solid(x, y) && !this.hazard(x, y) && (!this.water(x, y) || !!this.ab.dive);
  }

  /** A cell the player can stand in (feet at bottom of the cell). */
  /** Shadow Step blinks ~4.5 tiles horizontally, ignoring thorns along the way. */
  private stepThrough(ax: number, ay: number, bx: number, by: number): boolean {
    if (!this.ab.step || ay !== by || Math.abs(bx - ax) > 5) return false;
    const d = Math.sign(bx - ax);
    for (let x = ax + d; x !== bx; x += d) {
      for (const y of [ay, ay - 1]) {
        const c = this.ch(x, y);
        if (c !== 'T' && !this.air(x, y)) return false;
      }
    }
    return true;
  }

  standable(x: number, y: number): boolean {
    if (!this.air(x, y) || !this.air(x, y - 1)) return false;
    if (this.water(x, y)) return !!this.ab.dive;
    const below = this.ch(x, y + 1);
    if (y + 1 >= this.h) return false;
    if (this.solid(x, y + 1) || below === '=') return true;
    // Breaking fragile floors with the Abyss Drop: treat as solid support
    if (below === 'F') return true;
    return false;
  }

  lineClear(x0: number, y0: number, x1: number, y1: number): boolean {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 + 1;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      if (!this.air(x, y) && !(this.ch(x, y) === '=')) return false;
    }
    return true;
  }

  private pathClear(x0: number, y0: number, x1: number, y1: number): boolean {
    // Check head and feet rows along straight or L-shaped routes.
    const ok = (ax: number, ay: number, bx: number, by: number) => this.lineClear(ax, ay, bx, by) && this.lineClear(ax, ay - 1, bx, by - 1);
    if (ok(x0, y0, x1, y1)) return true;
    const top = Math.min(y0, y1);
    if (ok(x0, y0, x0, top) && ok(x0, top, x1, top) && ok(x1, top, x1, y1)) return true;
    if (ok(x0, y0, x1, y0) && ok(x1, y0, x1, y1)) return true;
    return false;
  }

  /** Can the player get from standing at a to standing at b in one move? */
  canMove(ax: number, ay: number, bx: number, by: number): boolean {
    const up = ay - by; // positive = target higher
    const dx = Math.abs(bx - ax);
    const ab = this.ab;
    const inWater = this.water(ax, ay) && ab.dive;
    if (inWater) return Math.abs(up) <= 2 && dx <= 2 && this.pathClear(ax, ay, bx, by);
    let maxDx: number;
    if (up > 0) {
      const wallNear = ab.grip && (this.chimney(ax, ay, by) || this.chimney(bx, ay, by));
      if (up > 4 && !wallNear) return false;
      if (wallNear && up > 4) maxDx = 3;
      else maxDx = up >= 4 ? 2 : up === 3 ? 4 : 5;
    } else {
      const down = -up;
      maxDx = 5 + Math.floor(down / 2);
      if (ab.glide) maxDx = 5 + Math.floor(down * 2.5) + 6;
    }
    if (ab.dash) maxDx += 4;
    if (this.stepThrough(ax, ay, bx, by)) return true;
    if (dx > maxDx) return false;
    return this.pathClear(ax, ay, bx, by);
  }

  /** Two facing walls within wall-jump range around column x (single walls can't be scaled far). */
  chimney(x: number, y0: number, y1: number): boolean {
    for (let l = x - 1; l >= x - 5; l--) {
      if (!this.wallColumn(l, y0, y1)) continue;
      for (let r = x + 1; r <= l + 6; r++) if (this.wallColumn(r, y0, y1)) return true;
    }
    return false;
  }

  wallRun(x: number, y0: number, y1: number): boolean {
    return this.wallColumn(x, y0, y1);
  }

  /** True if there is a continuous wall on column x between rows y0..y1. */
  private wallColumn(x: number, y0: number, y1: number): boolean {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    let solid = 0;
    for (let y = a; y <= b; y++) if (this.solid(x, y)) solid++;
    return solid >= (b - a + 1) * 0.6;
  }

  nodes(): ReachNode[] {
    const out: ReachNode[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.standable(x, y)) out.push({ x, y });
    return out;
  }

  /** Flood-fill reachable standable cells from a set of starting cells. */
  flood(starts: ReachNode[], anchors: ReachNode[] = []): Set<number> {
    const all = this.nodes();
    const key = (n: ReachNode) => n.y * this.w + n.x;
    const seen = new Set<number>();
    const queue: ReachNode[] = [];
    const reachedAnchors = new Set<number>();
    const anchorQueue: number[] = [];
    for (const s of starts) {
      if (s.x < 0 || s.x >= this.w) continue;
      // A start may be an air cell: let it fall to the first standable cell.
      let y = s.y;
      while (y < this.h && !this.standable(s.x, y) && this.air(s.x, y)) y++;
      if (this.standable(s.x, y)) {
        const n = { x: s.x, y };
        if (!seen.has(key(n))) {
          seen.add(key(n));
          queue.push(n);
        }
      }
      if (this.standable(s.x, s.y) && !seen.has(key(s))) {
        seen.add(key(s));
        queue.push(s);
      } else if (!this.standable(s.x, s.y) && this.air(s.x, s.y)) {
        // Airborne start (dropping in from above): allow steering while falling.
        for (const m of all) {
          const k = key(m);
          if (seen.has(k) || m.y < s.y) continue;
          if (this.canMove(s.x, s.y, m.x, m.y)) {
            seen.add(k);
            queue.push(m);
          }
        }
      }
    }
    while (queue.length) {
      const n = queue.shift()!;
      for (const m of all) {
        const k = key(m);
        if (seen.has(k)) continue;
        if (Math.abs(m.x - n.x) > 18 || Math.abs(m.y - n.y) > 30) continue;
        if (this.canMove(n.x, n.y, m.x, m.y)) {
          seen.add(k);
          queue.push(m);
        }
      }
      if (this.ab.grapple) {
        for (let ai = 0; ai < anchors.length; ai++) {
          const a = anchors[ai];
          if (reachedAnchors.has(ai)) continue;
          if (Math.hypot(a.x - n.x, a.y - n.y) > 9.5) continue;
          if (!this.lineClear(n.x, n.y - 1, a.x, a.y)) continue;
          reachedAnchors.add(ai);
          anchorQueue.push(ai);
        }
        while (anchorQueue.length) {
          const ai = anchorQueue.shift()!;
          const a = anchors[ai];
          // Chain to further anchors while airborne.
          for (let bi = 0; bi < anchors.length; bi++) {
            if (reachedAnchors.has(bi)) continue;
            const o = anchors[bi];
            if (Math.hypot(o.x - a.x, o.y - a.y) <= 9.5 && this.lineClear(a.x, a.y, o.x, o.y)) {
              reachedAnchors.add(bi);
              anchorQueue.push(bi);
            }
          }
          // From an anchor we are flung upward ~3 tiles; anything reachable from there by falling counts.
          for (const m of all) {
            const k = key(m);
            if (seen.has(k)) continue;
            if (m.y >= a.y - 4 && Math.abs(m.x - a.x) <= 7 && m.y <= a.y + 12 && this.lineClear(a.x, a.y - 2, m.x, m.y - 1)) {
              seen.add(k);
              queue.push(m);
            }
          }
        }
      }
    }
    this.lastAnchors = reachedAnchors;
    return seen;
  }

  lastAnchors = new Set<number>();
}

export interface DoorPoint {
  name: string;
  /** Cells that count as being "at" the door when reached. */
  targets: ReachNode[];
  /** Cells from which a player entering through this door starts. */
  entries: ReachNode[];
}

/** Derive door points from the room edges (open cells on the border). */
export function doorPoints(room: RoomDef): DoorPoint[] {
  const h = room.rows.length;
  const w = room.rows.reduce((m, r) => Math.max(m, r.length), 0);
  const open = (x: number, y: number) => {
    const c = room.rows[y]?.[x] ?? '#';
    return !SOLID.has(c) || c === 'H';
  };
  const out: DoorPoint[] = [];
  for (const side of ['L', 'R'] as const) {
    const x = side === 'L' ? 0 : w - 1;
    let run: number[] = [];
    const flush = () => {
      if (!run.length) return;
      const bottom = run[run.length - 1];
      let inX = side === 'L' ? 1 : w - 2;
      while ((room.rows[bottom]?.[inX] ?? '#') === 'H') inX += side === 'L' ? 1 : -1;
      out.push({ name: `${side}@${bottom}`, targets: run.map((y) => ({ x: inX, y })), entries: [{ x: inX, y: bottom }] });
      run = [];
    };
    for (let y = 0; y < h; y++) {
      if (open(x, y)) run.push(y);
      else flush();
    }
    flush();
  }
  for (const side of ['T', 'B'] as const) {
    const y = side === 'T' ? 0 : h - 1;
    let run: number[] = [];
    const flush = () => {
      if (!run.length) return;
      if (side === 'T') {
        // Exiting upward requires standing within 4 rows below the hole.
        const targets: ReachNode[] = [];
        for (const x of run) for (let yy = 1; yy <= 5; yy++) targets.push({ x, y: yy });
        out.push({ name: `T@${run[0]}`, targets, entries: run.map((x) => ({ x, y: 1 })) });
      } else {
        const targets: ReachNode[] = run.map((x) => ({ x, y: h - 2 }));
        // Arriving from below: the upward boost lifts the player about four tiles.
        const entries: ReachNode[] = [];
        for (let x = run[0] - 5; x <= run[run.length - 1] + 5; x++) for (let yy = h - 7; yy <= h - 2; yy++) entries.push({ x, y: yy });
        out.push({ name: `B@${run[0]}`, targets, entries });
      }
      run = [];
    };
    for (let x = 0; x < w; x++) {
      if (open(x, y)) run.push(x);
      else flush();
    }
    flush();
  }
  return out;
}

/** Which doors are reachable from which, for a room and ability set. */
export function doorReachability(room: RoomDef, ab: ReachAbilities): { from: string; to: string; ok: boolean }[] {
  const rm = new ReachMap(room, ab);
  const anchors: ReachNode[] = [];
  room.rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (r[x] === 'G') anchors.push({ x, y });
  });
  const doors = doorPoints(room);
  const res: { from: string; to: string; ok: boolean }[] = [];
  for (const a of doors) {
    const reach = rm.flood(a.entries, anchors);
    // Falling out of a bottom hole: any reachable cell above the hole column with clear air below.
    for (const b of doors) {
      if (a === b) continue;
      let ok = false;
      if (b.name.startsWith('B')) {
        const xs = new Set(b.targets.map((t) => t.x));
        if (a.name.startsWith('T')) for (const e of a.entries) if (xs.has(e.x) && rm.lineClear(e.x, e.y, e.x, rm.h - 1)) ok = true;
        for (const k of reach) {
          const x = k % rm.w;
          const y = Math.floor(k / rm.w);
          if (Math.abs(x - [...xs][0] - 1.5) <= 4) {
            // Can we walk/fall into the hole from here?
            for (const hx of xs) if (rm.lineClear(x, y, hx, rm.h - 1)) ok = true;
          }
          if (ok) break;
        }
      } else if (b.name.startsWith('T')) {
        for (const t of b.targets) {
          for (const k of reach) {
            const x = k % rm.w;
            const y = Math.floor(k / rm.w);
            if (Math.abs(x - t.x) <= 3 && y - t.y <= 4 && y >= t.y && rm.lineClear(x, y - 1, t.x, 0)) {
              ok = true;
              break;
            }
          }
          if (!ok && ab.grip) {
            for (const k of reach) {
              const x = k % rm.w;
              const y = Math.floor(k / rm.w);
              if (Math.abs(x - t.x) <= 2 && rm.lineClear(x, y - 1, x, 1) && rm.chimney(x, 1, y)) {
                ok = true;
                break;
              }
            }
          }
          if (ok) break;
          if (ab.grapple) {
            anchors.forEach((an, i) => {
              if (rm.lastAnchors.has(i) && Math.abs(an.x - t.x) <= 4 && an.y <= 6) ok = true;
            });
          }
        }
      } else {
        for (const t of b.targets) {
          let y = t.y;
          while (y < rm.h - 1 && !rm.standable(t.x, y)) y++;
          if (reach.has(y * rm.w + t.x)) ok = true;
        }
      }
      res.push({ from: a.name, to: b.name, ok });
    }
  }
  return res;
}

export { UW };
