import { newProgress, PROGRESS_VERSION, type Progress } from '../progression/Progress';
import { hashString } from '../core/math';

export const SLOT_COUNT = 3;
const MAGIC = 'VEILFALL';

export interface KV {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

/** In-memory storage for tests or when localStorage is unavailable. */
export class MemoryKV implements KV {
  private m = new Map<string, string>();
  getItem(k: string): string | null {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string): void {
    this.m.set(k, v);
  }
  removeItem(k: string): void {
    this.m.delete(k);
  }
}

interface Envelope {
  magic: string;
  version: number;
  savedAt: number;
  checksum: number;
  data: unknown;
}

export type LoadResult =
  | { ok: true; progress: Progress; migratedFrom?: number; fromBackup?: boolean }
  | { ok: false; reason: 'empty' | 'corrupt' | 'future'; detail?: string };

export interface SlotSummary {
  slot: number;
  empty: boolean;
  corrupt?: boolean;
  room?: string;
  playTime?: number;
  savedAt?: number;
  completion?: number;
  deaths?: number;
  ngPlus?: number;
  bosses?: number;
  hasBackup?: boolean;
}

function key(slot: number): string {
  return `veilfall.save.${slot}`;
}

function checksum(json: string): number {
  return hashString(json);
}

/** Ordered migrations: each takes data at version N and returns version N+1. */
const MIGRATIONS: Record<number, (d: Record<string, unknown>) => Record<string, unknown>> = {
  // v1 stored currency as `geo`-style "shards" count and had no quest records.
  1: (d) => {
    const out = { ...d };
    if (typeof out.currency === 'number' && out.fragments === undefined) out.fragments = out.currency;
    delete out.currency;
    out.quests ??= {};
    out.version = 2;
    return out;
  },
  // v2 lacked challenge records and the remnant bank.
  2: (d) => {
    const out = { ...d };
    out.challenges ??= {};
    out.banked ??= 0;
    out.version = 3;
    return out;
  },
};

/** Fill any missing fields from a fresh progress so old saves remain playable. */
function fillDefaults(d: Record<string, unknown>): Progress {
  const base = newProgress() as unknown as Record<string, unknown>;
  const out: Record<string, unknown> = { ...base };
  for (const k of Object.keys(base)) {
    const v = d[k];
    if (v === undefined || v === null) continue;
    const bv = base[k];
    if (typeof bv === 'object' && bv !== null && !Array.isArray(bv)) {
      out[k] = typeof v === 'object' && !Array.isArray(v) ? { ...(bv as object), ...(v as object) } : bv;
    } else if (Array.isArray(bv)) {
      out[k] = Array.isArray(v) ? v : bv;
    } else if (typeof v === typeof bv) out[k] = v;
  }
  return out as unknown as Progress;
}

export function migrate(data: Record<string, unknown>): { progress: Progress; from: number } {
  let v = typeof data.version === 'number' ? data.version : 1;
  const from = v;
  let d = data;
  while (v < PROGRESS_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) break;
    d = m(d);
    v = typeof d.version === 'number' ? d.version : v + 1;
  }
  const progress = fillDefaults(d);
  progress.version = PROGRESS_VERSION;
  return { progress, from };
}

export class SaveSystem {
  constructor(private kv: KV) {}

  write(slot: number, progress: Progress): boolean {
    const json = JSON.stringify(progress);
    const env: Envelope = { magic: MAGIC, version: PROGRESS_VERSION, savedAt: Date.now(), checksum: checksum(json), data: progress };
    const text = JSON.stringify(env);
    try {
      // Keep the previous good save as a backup before overwriting.
      const prev = this.kv.getItem(key(slot));
      if (prev && this.validate(prev).ok) this.kv.setItem(key(slot) + '.bak', prev);
      this.kv.setItem(key(slot), text);
      return true;
    } catch {
      return false;
    }
  }

  private validate(text: string): LoadResult {
    let env: Envelope;
    try {
      env = JSON.parse(text) as Envelope;
    } catch (e) {
      return { ok: false, reason: 'corrupt', detail: 'unparseable' + String(e).slice(0, 0) };
    }
    if (!env || env.magic !== MAGIC || typeof env.data !== 'object' || env.data === null) return { ok: false, reason: 'corrupt', detail: 'bad envelope' };
    if (env.version > PROGRESS_VERSION) return { ok: false, reason: 'future', detail: `save version ${env.version}` };
    const json = JSON.stringify(env.data);
    if (checksum(json) !== env.checksum) return { ok: false, reason: 'corrupt', detail: 'checksum mismatch' };
    const { progress, from } = migrate(env.data as Record<string, unknown>);
    return { ok: true, progress, migratedFrom: from < PROGRESS_VERSION ? from : undefined };
  }

  load(slot: number): LoadResult {
    const text = this.kv.getItem(key(slot));
    if (!text) return { ok: false, reason: 'empty' };
    const r = this.validate(text);
    if (r.ok) return r;
    // Fall back to the backup, but never delete the damaged original.
    const bak = this.kv.getItem(key(slot) + '.bak');
    if (bak) {
      const b = this.validate(bak);
      if (b.ok) return { ...b, fromBackup: true };
    }
    return r;
  }

  /** Erase a slot. The erased data is kept under a recovery key until overwritten. */
  erase(slot: number): void {
    const cur = this.kv.getItem(key(slot));
    if (cur) this.kv.setItem(key(slot) + '.erased', cur);
    this.kv.removeItem(key(slot));
    this.kv.removeItem(key(slot) + '.bak');
  }

  hasBackup(slot: number): boolean {
    return !!this.kv.getItem(key(slot) + '.bak');
  }

  summary(slot: number, completionOf: (p: Progress) => number): SlotSummary {
    const text = this.kv.getItem(key(slot));
    if (!text) return { slot, empty: true };
    const r = this.load(slot);
    if (!r.ok) return { slot, empty: false, corrupt: true, hasBackup: this.hasBackup(slot) };
    const p = r.progress;
    return {
      slot, empty: false, room: p.room, playTime: p.playTime, savedAt: p.savedAt, completion: completionOf(p), deaths: p.stats.deaths,
      ngPlus: p.ngPlus, bosses: Object.keys(p.bosses).length, hasBackup: this.hasBackup(slot), corrupt: false,
    };
  }

  /** Export a slot as text (for players to back up manually). */
  exportSlot(slot: number): string | null {
    return this.kv.getItem(key(slot));
  }

  importSlot(slot: number, text: string): LoadResult {
    const r = this.validate(text);
    if (r.ok) this.kv.setItem(key(slot), text);
    return r;
  }
}
