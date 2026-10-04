import type { RoomDef, DarkLevel } from '../world/Room';
import type { Spawn, PickupType } from '../world/spawns';

/** Every room is a whole number of screen units. */
export const UW = 30;
export const UH = 17;

export interface LayoutEntry {
  id: string;
  region: string;
  ux: number;
  uy: number;
  uw: number;
  uh: number;
}

export type DoorKind = 'G' | 'H' | 'V';

export interface LinkDef {
  a: string;
  b: string;
  kind: DoorKind;
  /** Global unit row (side doors) or global unit column (vertical doors). */
  at: number;
  /** Fill the doorway on this room's side with a hidden breakable wall. */
  hiddenIn?: string;
  /** Place a gate on this room's side of the doorway. */
  gateIn?: string;
  gate?: { id: string; opensOn?: string; boss?: boolean };
  /** For vertical links: add a climbable ladder of platforms under the hole in the lower room. */
  climb?: boolean;
}

export interface Door {
  side: 'L' | 'R' | 'T' | 'B';
  kind: DoorKind;
  /** Local band index (side doors) or local column-band index (vertical doors). */
  band: number;
  link: LinkDef;
}

export interface RoomOpts {
  dark?: DarkLevel;
  title?: string;
  secret?: boolean;
  music?: string;
  enterFlag?: string;
}

const MARK_POOL = '0123456789bdeghijklmnopqrstuxyzADIJKMNOQRUWYZ!?$&*+%;:/|"`\'';

/**
 * Room builder: starts as solid rock with an open interior, carves doors from
 * the link table, and offers drawing primitives plus pasted ASCII fragments.
 */
export class RoomBuilder {
  readonly w: number;
  readonly h: number;
  readonly grid: string[][];
  readonly marks: Record<string, Spawn> = {};
  private markIdx = 0;
  readonly doors: Door[];
  opts: RoomOpts = {};

  constructor(readonly entry: LayoutEntry, doors: Door[]) {
    this.w = entry.uw * UW;
    this.h = entry.uh * UH;
    this.grid = [];
    for (let y = 0; y < this.h; y++) this.grid.push(new Array(this.w).fill('#'));
    this.doors = doors;
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  put(x: number, y: number, ch: string): this {
    if (this.inside(x, y)) this.grid[y][x] = ch;
    return this;
  }

  get(x: number, y: number): string {
    return this.inside(x, y) ? this.grid[y][x] : '#';
  }

  rect(x: number, y: number, w: number, h: number, ch: string): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.put(xx, yy, ch);
    return this;
  }

  clear(x: number, y: number, w: number, h: number): this {
    return this.rect(x, y, w, h, '.');
  }

  /** Open the whole interior leaving a 1-tile border. */
  hollow(): this {
    return this.clear(1, 1, this.w - 2, this.h - 2);
  }

  /** Solid ground from row y to the bottom between x0..x1 inclusive. */
  ground(x0: number, x1: number, y: number, ch = '#'): this {
    for (let x = x0; x <= x1; x++) for (let yy = y; yy < this.h; yy++) this.put(x, yy, ch);
    return this;
  }

  /** One-way platform. */
  plat(x: number, y: number, w: number): this {
    for (let i = 0; i < w; i++) if (this.get(x + i, y) === '.') this.put(x + i, y, '=');
    return this;
  }

  /** Solid ledge block. */
  ledge(x: number, y: number, w: number, h = 1, ch = '#'): this {
    return this.rect(x, y, w, h, ch);
  }

  /** Paste an ASCII fragment; spaces are transparent. */
  art(x: number, y: number, rows: string[]): this {
    rows.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        const ch = row[dx];
        if (ch !== ' ') this.put(x + dx, y + dy, ch);
      }
    });
    return this;
  }

  /** Place an entity spawn. Returns the builder. */
  spawn(x: number, y: number, s: Spawn): this {
    const ch = MARK_POOL[this.markIdx++];
    if (!ch) throw new Error(`Room ${this.entry.id}: too many marks`);
    this.marks[ch] = s;
    this.put(x, y, ch);
    return this;
  }

  enemy(x: number, y: number, t: string, elite = false, flag?: string): this {
    return this.spawn(x, y, { k: 'enemy', t, elite, flag });
  }

  pickup(x: number, y: number, t: PickupType, id: string, value?: string): this {
    return this.spawn(x, y, { k: 'pickup', t, id, value });
  }

  npc(x: number, y: number, t: string): this {
    return this.spawn(x, y, { k: 'npc', t });
  }

  prop(x: number, y: number, t: string, text?: string, flip?: boolean): this {
    return this.spawn(x, y, { k: 'prop', t, text, flip });
  }

  lore(x: number, y: number, id: string, style?: 'tablet' | 'mural' | 'inscription' | 'echo'): this {
    return this.spawn(x, y, { k: 'lore', id, style });
  }

  water(x: number, y: number, w: number, h: number, ch = '~'): this {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (this.get(xx, yy) === '.' || this.get(xx, yy) === '=') this.put(xx, yy, ch);
    return this;
  }

  /** Carve all doors. Called automatically before and after the design function. */
  carveDoors(final: boolean): void {
    for (const d of this.doors) {
      if (d.kind === 'V') {
        const x0 = d.band * UW + 13;
        const isTop = d.side === 'T';
        const y = isTop ? 0 : this.h - 1;
        const y2 = isTop ? 1 : this.h - 2;
        for (let x = x0; x < x0 + 4; x++) {
          this.put(x, y, '.');
          if (!final) this.put(x, y2, '.');
          else if (this.get(x, y2) === '#') this.put(x, y2, '.');
        }
        if (!final && !isTop) {
          // Landing ledges beside a bottom hole so arrivals from below can climb out.
          for (const lx of [x0 - 4, x0 + 4]) for (let i = 0; i < 4; i++) if (this.get(lx + i, this.h - 4) === '.') this.put(lx + i, this.h - 4, '=');
        }
        if (!final && isTop && d.link.climb) {
          let left = true;
          for (let yy = 4; yy < this.h - 2; yy += 3) {
            const px = left ? x0 - 3 : x0 + 3;
            for (let i = 0; i < 4; i++) if (this.get(px + i, yy) === '.') this.put(px + i, yy, '=');
            left = !left;
          }
        }
        if (final && d.link.gateIn === this.entry.id && d.link.gate) {
          this.spawn(x0, isTop ? 1 : this.h - 2, { k: 'gate', id: d.link.gate.id, w: 4, h: 1, opensOn: d.link.gate.opensOn, boss: d.link.gate.boss });
        }
      } else {
        const base = d.band * UH;
        const rows = d.kind === 'G' ? [12, 13, 14, 15] : [4, 5, 6, 7];
        const floorRow = d.kind === 'G' ? 16 : 8;
        const x = d.side === 'L' ? 0 : this.w - 1;
        const inward = d.side === 'L' ? 1 : -1;
        const hidden = d.link.hiddenIn === this.entry.id;
        for (const r of rows) {
          for (let i = 0; i < 3; i++) {
            const xx = x + inward * i;
            if (hidden && i < 2) this.put(xx, base + r, 'H');
            else if (!final || this.get(xx, base + r) === '#') this.put(xx, base + r, '.');
          }
        }
        if (!final) for (let i = 0; i < 4; i++) this.put(x + inward * i, base + floorRow, '#');
        if (final && d.link.gateIn === this.entry.id && d.link.gate) {
          this.spawn(x + inward * 1, base + rows[0], { k: 'gate', id: d.link.gate.id, w: 1, h: 4, opensOn: d.link.gate.opensOn, boss: d.link.gate.boss });
        }
      }
    }
  }

  toDef(): RoomDef {
    return {
      id: this.entry.id,
      region: this.entry.region,
      pos: [this.entry.ux * UW, this.entry.uy * UH],
      rows: this.grid.map((r) => r.join('')),
      marks: this.marks,
      dark: this.opts.dark,
      title: this.opts.title,
      secret: this.opts.secret,
      music: this.opts.music,
      enterFlag: this.opts.enterFlag,
    };
  }
}

export type RoomDesign = (b: RoomBuilder) => void;

/** Resolve which doors each room has from the link table. */
export function doorsFor(entry: LayoutEntry, layout: Map<string, LayoutEntry>, links: LinkDef[]): Door[] {
  const out: Door[] = [];
  for (const l of links) {
    if (l.a !== entry.id && l.b !== entry.id) continue;
    const other = layout.get(l.a === entry.id ? l.b : l.a);
    if (!other) throw new Error(`Link references unknown room ${l.a}/${l.b}`);
    if (l.kind === 'V') {
      const iAmTop = entry.uy + entry.uh === other.uy;
      const iAmBottom = other.uy + other.uh === entry.uy;
      if (!iAmTop && !iAmBottom) throw new Error(`Vertical link ${l.a}-${l.b} rooms not stacked`);
      if (l.at < entry.ux || l.at >= entry.ux + entry.uw) throw new Error(`Vertical link ${l.a}-${l.b} column ${l.at} outside ${entry.id}`);
      out.push({ side: iAmTop ? 'B' : 'T', kind: 'V', band: l.at - entry.ux, link: l });
    } else {
      const iAmLeft = entry.ux + entry.uw === other.ux;
      const iAmRight = other.ux + other.uw === entry.ux;
      if (!iAmLeft && !iAmRight) throw new Error(`Side link ${l.a}-${l.b} rooms not adjacent`);
      if (l.at < entry.uy || l.at >= entry.uy + entry.uh) throw new Error(`Side link ${l.a}-${l.b} row ${l.at} outside ${entry.id}`);
      out.push({ side: iAmLeft ? 'R' : 'L', kind: l.kind, band: l.at - entry.uy, link: l });
    }
  }
  return out;
}

export function buildRooms(layout: LayoutEntry[], links: LinkDef[], designs: Record<string, { design: RoomDesign; opts?: RoomOpts }>): RoomDef[] {
  const byId = new Map(layout.map((e) => [e.id, e]));
  return layout.map((e) => {
    const d = designs[e.id];
    if (!d) throw new Error(`No design for room ${e.id}`);
    const b = new RoomBuilder(e, doorsFor(e, byId, links));
    b.opts = d.opts ?? {};
    b.hollow();
    b.carveDoors(false);
    d.design(b);
    b.carveDoors(true);
    return b.toDef();
  });
}
