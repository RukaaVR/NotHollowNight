import { RoomGrid, type RoomDef } from './Room';

/** Registry and spatial index for every room in the Veil. */
export class WorldMap {
  readonly rooms = new Map<string, RoomDef>();
  readonly list: RoomDef[];
  private grids = new Map<string, RoomGrid>();

  constructor(defs: RoomDef[]) {
    this.list = defs;
    for (const d of defs) {
      if (this.rooms.has(d.id)) throw new Error(`Duplicate room id ${d.id}`);
      this.rooms.set(d.id, d);
    }
  }

  get(id: string): RoomDef | undefined {
    return this.rooms.get(id);
  }

  grid(id: string): RoomGrid {
    let g = this.grids.get(id);
    if (!g) {
      const def = this.rooms.get(id);
      if (!def) throw new Error(`Unknown room ${id}`);
      g = new RoomGrid(def);
      this.grids.set(id, g);
    }
    return g;
  }

  width(d: RoomDef): number {
    return d.rows.reduce((m, r) => Math.max(m, r.length), 0);
  }

  /** Room containing the global tile coordinate, if any. */
  roomAt(gx: number, gy: number, exclude?: string): RoomDef | null {
    for (const d of this.list) {
      if (d.id === exclude) continue;
      const w = this.width(d);
      if (gx >= d.pos[0] && gx < d.pos[0] + w && gy >= d.pos[1] && gy < d.pos[1] + d.rows.length) return d;
    }
    return null;
  }

  roomsInRegion(region: string): RoomDef[] {
    return this.list.filter((r) => r.region === region);
  }
}
