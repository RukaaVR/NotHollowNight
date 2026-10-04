import { CHAR_TO_TILE, ENTITY_CHARS, T, TILE, isSolidTile } from './tiles';
import type { Spawn } from './spawns';

export type DarkLevel = 0 | 1 | 2;

export interface RoomDef {
  id: string;
  region: string;
  /** Global tile position of the top-left corner on the world grid. */
  pos: [number, number];
  rows: string[];
  marks?: Record<string, Spawn>;
  /** 0 = lit, 1 = dim (visual only), 2 = umbral (darkness drains vigor without the Lumen Lantern). */
  dark?: DarkLevel;
  /** Shown as a sub-location banner on first entry. */
  title?: string;
  /** Hidden rooms are not revealed by map pages, only by visiting. */
  secret?: boolean;
  /** Override region music theme. */
  music?: string;
  /** Room-specific ambient story beat flag set on entry. */
  enterFlag?: string;
}

export interface EntityPlacement {
  ch: string;
  tx: number;
  ty: number;
  spawn: Spawn | null;
}

/** Mutable runtime instance of a room's tile grid. */
export class RoomGrid {
  readonly def: RoomDef;
  readonly w: number;
  readonly h: number;
  readonly pw: number;
  readonly ph: number;
  readonly tiles: Uint8Array;
  readonly base: Uint8Array;
  /** Hit points for breakable tiles. */
  readonly hp: Uint8Array;
  /** Crumble timers (seconds); >0 means collapsing/collapsed. */
  readonly crumble: Float32Array;
  readonly placements: EntityPlacement[] = [];
  readonly playerStart: { x: number; y: number } | null = null;
  /** Bumped whenever tiles change so cached render layers can rebuild. */
  version = 0;

  constructor(def: RoomDef) {
    this.def = def;
    this.h = def.rows.length;
    this.w = def.rows.reduce((m, r) => Math.max(m, r.length), 0);
    this.pw = this.w * TILE;
    this.ph = this.h * TILE;
    this.tiles = new Uint8Array(this.w * this.h);
    this.hp = new Uint8Array(this.w * this.h);
    this.crumble = new Float32Array(this.w * this.h);
    let start: { x: number; y: number } | null = null;
    for (let y = 0; y < this.h; y++) {
      const row = def.rows[y];
      for (let x = 0; x < this.w; x++) {
        const ch = row[x] ?? ' ';
        const t = CHAR_TO_TILE[ch];
        const i = y * this.w + x;
        if (t !== undefined) {
          this.tiles[i] = t;
          if (t === T.Breakable || t === T.Hidden) this.hp[i] = 3;
        } else if (ch !== ' ' && ch !== '.') {
          if (ch === '@') start = { x: x * TILE + TILE / 2, y: (y + 1) * TILE };
          const spawn = def.marks?.[ch] ?? null;
          if (ENTITY_CHARS.has(ch) || spawn) this.placements.push({ ch, tx: x, ty: y, spawn });
        }
      }
    }
    this.playerStart = start;
    this.base = this.tiles.slice();
  }

  inBounds(tx: number, ty: number): boolean {
    return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h;
  }

  /** Tile lookup with edge clamping so open edges stay open beyond the room. */
  tileClamped(tx: number, ty: number): T {
    const cx = tx < 0 ? 0 : tx >= this.w ? this.w - 1 : tx;
    const cy = ty < 0 ? 0 : ty >= this.h ? this.h - 1 : ty;
    return this.tiles[cy * this.w + cx] as T;
  }

  tile(tx: number, ty: number): T {
    if (!this.inBounds(tx, ty)) return T.Solid;
    return this.tiles[ty * this.w + tx] as T;
  }

  set(tx: number, ty: number, t: T): void {
    if (!this.inBounds(tx, ty)) return;
    this.tiles[ty * this.w + tx] = t;
    this.version++;
  }

  isSolidAt(tx: number, ty: number): boolean {
    return isSolidTile(this.tile(tx, ty));
  }

  /** True when a world-space point is inside a liquid tile of the given type. */
  liquidAt(px: number, py: number): T {
    const t = this.tileClamped(Math.floor(px / TILE), Math.floor(py / TILE));
    return t === T.Water || t === T.Shallow || t === T.Acid ? t : T.Empty;
  }

  /** Restores breakables removed in previous visits except those persisted as broken. */
  reset(broken: ReadonlySet<number>): void {
    this.tiles.set(this.base);
    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      if ((t === T.Breakable || t === T.Hidden || t === T.Fragile) && broken.has(i)) this.tiles[i] = T.Empty;
      this.hp[i] = t === T.Breakable || t === T.Hidden ? 3 : 0;
      this.crumble[i] = 0;
    }
    this.version++;
  }
}
