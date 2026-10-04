/** Everything that persists in a save slot. Plain JSON — no class instances. */
export interface Remnant {
  room: string;
  x: number;
  y: number;
  amount: number;
}

export interface QuestState {
  stage: number;
  done: boolean;
}

export interface NpcState {
  met: boolean;
  talks: number;
  /** Last dialogue node shown, for "already said" logic. */
  seen: string[];
}

export interface MapMarker {
  room: string;
  x: number;
  y: number;
  kind: number;
}

export interface ChallengeRecord {
  bestTime: number;
  noHit: boolean;
  clears: number;
}

export interface Progress {
  version: number;
  createdAt: number;
  savedAt: number;
  playTime: number;
  /** Room id of the shrine where the player last rested (respawn point). */
  shrine: string;
  /** Room where the save was written. */
  room: string;
  heartFragments: number;
  vesselFragments: number;
  vigorBonus: number;
  aetherBonus: number;
  bladeLevel: number;
  threadSlots: number;
  fragments: number;
  banked: number;
  remnant: Remnant | null;
  abilities: Record<string, boolean>;
  relics: string[];
  equipped: string[];
  flags: Record<string, number>;
  pickups: Record<string, boolean>;
  broken: Record<string, number[]>;
  visited: Record<string, boolean>;
  mapPages: Record<string, boolean>;
  markers: MapMarker[];
  bosses: Record<string, number>;
  quests: Record<string, QuestState>;
  npcs: Record<string, NpcState>;
  shards: string[];
  echoes: string[];
  lostRelics: string[];
  keys: string[];
  shrines: Record<string, boolean>;
  veilGates: Record<string, boolean>;
  bestiary: Record<string, number>;
  lore: Record<string, boolean>;
  endings: string[];
  ngPlus: number;
  challenges: Record<string, ChallengeRecord>;
  stats: { deaths: number; kills: number; damageTaken: number; secrets: number; healed: number };
}

export const PROGRESS_VERSION = 3;

export const START_ROOM = 'th_01';

export function newProgress(): Progress {
  const now = Date.now();
  return {
    version: PROGRESS_VERSION,
    createdAt: now,
    savedAt: now,
    playTime: 0,
    shrine: START_ROOM,
    room: START_ROOM,
    heartFragments: 0,
    vesselFragments: 0,
    vigorBonus: 0,
    aetherBonus: 0,
    bladeLevel: 0,
    threadSlots: 3,
    fragments: 0,
    banked: 0,
    remnant: null,
    abilities: {},
    relics: [],
    equipped: [],
    flags: {},
    pickups: {},
    broken: {},
    visited: {},
    mapPages: {},
    markers: [],
    bosses: {},
    quests: {},
    npcs: {},
    shards: [],
    echoes: [],
    lostRelics: [],
    keys: [],
    shrines: {},
    veilGates: {},
    bestiary: {},
    lore: {},
    endings: [],
    ngPlus: 0,
    challenges: {},
    stats: { deaths: 0, kills: 0, damageTaken: 0, secrets: 0, healed: 0 },
  };
}

export const BASE_VIGOR = 5;
export const BASE_AETHER = 99;

export function maxVigor(p: Progress): number {
  return BASE_VIGOR + p.vigorBonus;
}

export function maxAether(p: Progress): number {
  return BASE_AETHER + p.aetherBonus * 33;
}

export function hasFlag(p: Progress, f: string): boolean {
  return (p.flags[f] ?? 0) > 0;
}

export function setFlag(p: Progress, f: string, v = 1): void {
  p.flags[f] = v;
}

export function bossDefeated(p: Progress, id: string): boolean {
  return (p.bosses[id] ?? 0) > 0;
}

/** Percentage completion used on the save slot screen and ending requirements. */
export function completion(p: Progress, totals: { abilities: number; bosses: number; hearts: number; vessels: number; relics: number; echoes: number; shards: number }): number {
  let got = 0;
  let max = 0;
  const add = (v: number, m: number, weight: number) => {
    got += Math.min(v, m) * weight;
    max += m * weight;
  };
  add(Object.values(p.abilities).filter(Boolean).length, totals.abilities, 3);
  add(Object.keys(p.bosses).length, totals.bosses, 3);
  add(p.heartFragments, totals.hearts, 1);
  add(p.vesselFragments, totals.vessels, 1);
  add(p.relics.length, totals.relics, 1);
  add(p.echoes.length, totals.echoes, 1);
  add(p.shards.length, totals.shards, 0.5);
  return max > 0 ? Math.round((got / max) * 1000) / 10 : 0;
}
