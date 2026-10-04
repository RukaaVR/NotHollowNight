import { describe, it, expect } from 'vitest';
import { allRooms } from '../../src/rooms/index';
import { LAYOUT, LINKS } from '../../src/rooms/layout';
import { doorReachability, type ReachAbilities } from '../../src/rooms/reach';
import { ENEMY_BY_ID, ENEMY_DEFS } from '../../src/enemies/registry';
import { BOSS_BY_ID, BOSSES } from '../../src/bosses/registry';
import { NPC_BY_ID, NPC_DEFS } from '../../src/npc/registry';
import { ABILITY_BY_ID, ABILITIES } from '../../src/abilities/abilities';
import { RELIC_BY_ID, RELICS } from '../../src/relics/relics';
import { ECHOES, ITEMS, LOST_RELICS, SHARDS, TABLETS } from '../../src/story/lore';
import { REGIONS } from '../../src/world/regions';
import { SHOPS } from '../../src/npc/shops';
import { newProgress } from '../../src/progression/Progress';
import { CHAR_TO_TILE } from '../../src/world/tiles';
import type { RoomDef } from '../../src/world/Room';

const rooms = allRooms();
const byId = new Map(rooms.map((r) => [r.id, r]));
const width = (r: RoomDef) => r.rows.reduce((m, row) => Math.max(m, row.length), 0);

function isOpen(c: string | undefined): boolean {
  if (c === undefined) return false;
  const t = CHAR_TO_TILE[c];
  // Solid tiles: '#', 'X', breakables. Hidden walls count as passages.
  return !(c === '#' || c === 'X' || c === 'B' || c === 'F' || c === 'C' || c === 'P') || t === undefined;
}

describe('world layout', () => {
  it('builds every room with uniform row widths', () => {
    expect(rooms.length).toBe(LAYOUT.length);
    for (const r of rooms) {
      const w = width(r);
      for (const row of r.rows) expect(row.length, r.id).toBe(w);
    }
  });

  it('has no overlapping rooms', () => {
    const cells = new Map<string, string>();
    for (const e of LAYOUT) {
      for (let x = e.ux; x < e.ux + e.uw; x++) {
        for (let y = e.uy; y < e.uy + e.uh; y++) {
          const k = `${x},${y}`;
          expect(cells.get(k), `${e.id} overlaps ${cells.get(k)}`).toBeUndefined();
          cells.set(k, e.id);
        }
      }
    }
  });

  it('every open edge cell leads into an open cell of a neighbouring room', () => {
    const problems: string[] = [];
    const roomAt = (gx: number, gy: number, not: string) =>
      rooms.find((r) => r.id !== not && gx >= r.pos[0] && gx < r.pos[0] + width(r) && gy >= r.pos[1] && gy < r.pos[1] + r.rows.length);
    for (const r of rooms) {
      const w = width(r);
      const h = r.rows.length;
      const check = (x: number, y: number, dx: number, dy: number) => {
        if (!isOpen(r.rows[y][x])) return;
        const gx = r.pos[0] + x + dx;
        const gy = r.pos[1] + y + dy;
        const n = roomAt(gx, gy, r.id);
        if (!n) {
          problems.push(`${r.id} (${x},${y}) opens into nothing`);
          return;
        }
        const c = n.rows[gy - n.pos[1]][gx - n.pos[0]];
        if (!isOpen(c)) problems.push(`${r.id} (${x},${y}) opens into solid ${n.id}`);
      };
      for (let y = 0; y < h; y++) {
        check(0, y, -1, 0);
        check(w - 1, y, 1, 0);
      }
      for (let x = 0; x < w; x++) {
        check(x, 0, 0, -1);
        check(x, h - 1, 0, 1);
      }
    }
    expect(problems).toEqual([]);
  });

  it('every room is connected to the starting room', () => {
    const adj = new Map<string, string[]>();
    for (const l of LINKS) {
      (adj.get(l.a) ?? adj.set(l.a, []).get(l.a)!).push(l.b);
      (adj.get(l.b) ?? adj.set(l.b, []).get(l.b)!).push(l.a);
    }
    const seen = new Set(['th_01']);
    const q = ['th_01'];
    while (q.length) for (const n of adj.get(q.shift()!) ?? []) if (!seen.has(n)) (seen.add(n), q.push(n));
    expect(LAYOUT.filter((e) => !seen.has(e.id)).map((e) => e.id)).toEqual([]);
  });

  it('contains 12+ regions with rooms, a shrine-start and boss arenas for every boss', () => {
    const regionsWithRooms = new Set(rooms.map((r) => r.region));
    expect(regionsWithRooms.size).toBeGreaterThanOrEqual(12);
    for (const r of REGIONS) if (r.id !== 'eh') expect(regionsWithRooms.has(r.id), r.id).toBe(true);
    for (const b of BOSSES) {
      const room = byId.get(b.room);
      expect(room, b.id).toBeDefined();
      expect(Object.values(room!.marks ?? {}).some((s) => s.k === 'boss' && s.t === b.id), b.id).toBe(true);
    }
    expect(rooms.find((r) => r.id === newProgress().room)?.rows.some((row) => row.includes('@'))).toBe(true);
  });
});

describe('content references', () => {
  it('every spawn references real content and pickup ids are unique', () => {
    const ids = new Set<string>();
    const errors: string[] = [];
    for (const r of rooms) {
      for (const s of Object.values(r.marks ?? {})) {
        switch (s.k) {
          case 'enemy': if (!ENEMY_BY_ID.has(s.t)) errors.push(`${r.id}: enemy ${s.t}`); break;
          case 'boss': if (!BOSS_BY_ID.has(s.t)) errors.push(`${r.id}: boss ${s.t}`); break;
          case 'npc': if (!NPC_BY_ID.has(s.t)) errors.push(`${r.id}: npc ${s.t}`); break;
          case 'lore': if (!TABLETS[s.id]) errors.push(`${r.id}: tablet ${s.id}`); break;
          case 'pickup': {
            if (ids.has(s.id)) errors.push(`duplicate pickup id ${s.id}`);
            ids.add(s.id);
            const v = s.value ?? s.id;
            if (s.t === 'ability' && !ABILITY_BY_ID.has(v)) errors.push(`${r.id}: ability ${v}`);
            if (s.t === 'relic' && !RELIC_BY_ID.has(v)) errors.push(`${r.id}: relic ${v}`);
            if (s.t === 'key' && !ITEMS[v]) errors.push(`${r.id}: key ${v}`);
            if (s.t === 'shard' && !SHARDS[v]) errors.push(`${r.id}: shard ${v}`);
            if (s.t === 'echo' && !ECHOES[v]) errors.push(`${r.id}: echo ${v}`);
            if (s.t === 'lostrelic' && !LOST_RELICS[v]) errors.push(`${r.id}: lost relic ${v}`);
            break;
          }
          default: break;
        }
      }
    }
    expect(errors).toEqual([]);
  });

  it('every ability, key quest item, echo, shard and lost relic can be found', () => {
    const found = new Map<string, Set<string>>();
    const add = (k: string, v: string) => (found.get(k) ?? found.set(k, new Set()).get(k)!).add(v);
    for (const r of rooms) for (const s of Object.values(r.marks ?? {})) if (s.k === 'pickup') add(s.t, s.value ?? s.id);
    for (const b of BOSSES) {
      const probe = new (b.ctor as unknown as new (...a: unknown[]) => { rewards: { kind: string; value: string }[] })({ progress: newProgress(), grid: { pw: 640, ph: 272 }, challengeBoss: null }, 100, 200);
      for (const rw of probe.rewards) add(rw.kind, rw.value);
    }
    // Rewards granted through dialogue and quests.
    add('echo', 'echo_4');
    add('echo', 'echo_7');
    for (const a of ABILITIES) expect(found.get('ability')?.has(a.id), a.id).toBe(true);
    for (const e of Object.keys(ECHOES)) expect(found.get('echo')?.has(e), e).toBe(true);
    for (const s of Object.keys(SHARDS)) expect(found.get('shard')?.has(s), s).toBe(true);
    for (const l of Object.keys(LOST_RELICS)) expect(found.get('lostrelic')?.has(l), l).toBe(true);
    for (const k of ['wick_mg', 'wick_lc', 'wick_af', 'wick_dc', 'cog_1', 'cog_2', 'cog_3', 'core_1', 'core_2', 'core_3', 'mask_1', 'mask_2', 'mask_3', 'pale_bloom', 'prayer_beads', 'seal_tide', 'seal_stars', 'seal_memory']) {
      expect(found.get('key')?.has(k), k).toBe(true);
    }
    expect(found.get('blade')?.size ?? 0).toBeGreaterThanOrEqual(1);
    const ores = rooms.flatMap((r) => Object.values(r.marks ?? {})).filter((s) => s.k === 'pickup' && s.t === 'blade').length;
    expect(ores).toBe(4);
  });

  it('every relic is obtainable from the world, a boss, a shop or a quest', () => {
    const sources = new Set<string>();
    for (const r of rooms) for (const s of Object.values(r.marks ?? {})) if (s.k === 'pickup' && s.t === 'relic') sources.add(s.value!);
    for (const b of BOSSES) {
      const probe = new (b.ctor as unknown as new (...a: unknown[]) => { rewards: { kind: string; value: string }[] })({ progress: newProgress(), grid: { pw: 640, ph: 272 }, challengeBoss: null }, 100, 200);
      for (const rw of probe.rewards) if (rw.kind === 'relic') sources.add(rw.value);
    }
    const rich = { ...newProgress(), bosses: Object.fromEntries(BOSSES.map((b) => [b.id, 1])), ngPlus: 1 };
    for (const s of SHOPS) for (const i of s.items(rich)) if (i.kind === 'relic') sources.add(i.value);
    // Quest and dialogue rewards (see src/npc and src/quests).
    for (const q of ['wanderers_thread', 'quickstep', 'long_reach', 'glass_crown', 'heavy_blow', 'pilgrims_ash', 'aether_font', 'lamplight_locket', 'charged_soul', 'veil_resonance']) sources.add(q);
    const missing = RELICS.filter((r) => !sources.has(r.id)).map((r) => r.id);
    expect(missing).toEqual([]);
  });

  it('meets content targets', () => {
    expect(ENEMY_DEFS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ENEMY_DEFS.map((e) => e.id)).size).toBe(ENEMY_DEFS.length);
    expect(BOSSES.length).toBeGreaterThanOrEqual(12);
    expect(NPC_DEFS.length).toBeGreaterThanOrEqual(25);
    expect(RELICS.length).toBeGreaterThanOrEqual(25);
    expect(ABILITIES.length).toBeGreaterThanOrEqual(7);
    // Every enemy type appears somewhere in the world (or is summoned by a boss).
    const placed = new Set(rooms.flatMap((r) => Object.values(r.marks ?? {})).filter((s) => s.k === 'enemy').map((s) => (s as { t: string }).t));
    const summoned = new Set(['capling', 'rootling', 'dream_eater']);
    expect(ENEMY_DEFS.filter((e) => !placed.has(e.id) && !summoned.has(e.id)).map((e) => e.id)).toEqual([]);
    // Every NPC is placed in at least one room.
    const npcs = new Set(rooms.flatMap((r) => Object.values(r.marks ?? {})).filter((s) => s.k === 'npc').map((s) => (s as { t: string }).t));
    expect(NPC_DEFS.filter((n) => !npcs.has(n.id)).map((n) => n.id)).toEqual([]);
  });
});

// ---------------------------------------------------------------- level design

const ALL: ReachAbilities = { dash: true, grip: true, dive: true, phase: true, glide: true, step: true, grapple: true, drop: true };

/** Abilities a player is expected to have when exploring each region. */
const REGION_ABILITIES: Record<string, ReachAbilities> = {
  th: {}, lw: {}, eh: ALL,
  mg: { dash: true },
  gs: { dash: true, grip: true },
  dc: { dash: true },
  lc: { dash: true, grip: true },
  tc: { dash: true, grip: true, step: true, drop: true },
  af: { dash: true, grip: true, step: true },
  sa: { dash: true, grip: true, dive: true },
  br: { dash: true, grip: true, dive: true, phase: true },
  vg: { dash: true, grip: true, step: true, drop: true, phase: true, glide: true },
  he: { dash: true, grip: true, step: true, drop: true },
  so: ALL,
  ab: ALL,
};

/** Doors that are deliberately behind a later ability (or a mechanism the model can't see). */
const EXPECTED_GATES: Record<string, string[]> = {
  lw_east: ['T'], // Aether Grapple anchors up to the Starwell
  dc_deep: ['*'], // flooded: needs Deep Dive
  dc_streets: [],
  lc_thorn: ['*'], // Shadow Step through thorns
  tc_gate: ['*'],
  af_lift: ['*'], // elevator
};

describe('level design reachability', () => {
  it('every room is traversable with the abilities expected in its region', () => {
    const failures: string[] = [];
    for (const r of rooms) {
      const gates = EXPECTED_GATES[r.id] ?? [];
      if (gates.includes('*')) continue;
      const ab = REGION_ABILITIES[r.region] ?? ALL;
      for (const res of doorReachability(r, ab)) {
        if (res.ok) continue;
        if (gates.some((g) => res.from.startsWith(g) || res.to.startsWith(g))) continue;
        failures.push(`${r.id}: ${res.from} -> ${res.to}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('every room is fully traversable with every ability', () => {
    const failures: string[] = [];
    for (const r of rooms) {
      if (r.id === 'af_lift') continue;
      for (const res of doorReachability(r, ALL)) if (!res.ok) failures.push(`${r.id}: ${res.from} -> ${res.to}`);
    }
    expect(failures).toEqual([]);
  });

  const blocked = (id: string, ab: ReachAbilities, from: string, to: string) => {
    const r = byId.get(id)!;
    const res = doorReachability(r, ab).find((x) => x.from.startsWith(from) && x.to.startsWith(to));
    return res ? !res.ok : true;
  };

  it('ability gates block progress until the ability is found', () => {
    expect(blocked('gs_01', {}, 'T', 'L')).toBe(true);
    expect(blocked('gs_01', {}, 'T', 'R')).toBe(true);
    expect(blocked('gs_01', { dash: true }, 'T', 'L')).toBe(false);
    expect(blocked('mg_04', {}, 'R', 'L')).toBe(true);
    expect(blocked('mg_04', { dash: true }, 'R', 'L')).toBe(false);
    expect(blocked('gs_west', { dash: true }, 'R', 'T')).toBe(true);
    expect(blocked('gs_west', { dash: true, grip: true }, 'R', 'T')).toBe(false);
    expect(blocked('lc_thorn', { dash: true, grip: true }, 'L', 'R')).toBe(true);
    expect(blocked('lc_thorn', { dash: true, grip: true, step: true }, 'L', 'R')).toBe(false);
    expect(blocked('vg_01', { dash: true, grip: true, step: true }, 'L', 'R')).toBe(true);
    expect(blocked('vg_01', { dash: true, grip: true, step: true, phase: true }, 'L', 'R')).toBe(false);
    expect(blocked('vg_02', { dash: true, grip: true, step: true, phase: true }, 'L', 'B')).toBe(true);
    expect(blocked('vg_02', { dash: true, grip: true, step: true, phase: true, glide: true }, 'L', 'B')).toBe(false);
    expect(blocked('br_wards', { dash: true, grip: true, dive: true }, 'L', 'B')).toBe(true);
    expect(blocked('br_wards', { dash: true, grip: true, dive: true, phase: true }, 'L', 'B')).toBe(false);
    expect(blocked('tc_spire', { dash: true, step: true }, 'B', 'T')).toBe(true);
    expect(blocked('tc_spire', { dash: true, step: true, grip: true }, 'B', 'T')).toBe(false);
    expect(blocked('lw_east', { dash: true, grip: true, glide: true }, 'L', 'T')).toBe(true);
    expect(blocked('lw_east', ALL, 'L', 'T')).toBe(false);
  });
});
