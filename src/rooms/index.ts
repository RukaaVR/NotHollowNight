import type { RoomDef } from '../world/Room';
import { buildRooms, type RoomDesign, type RoomOpts } from './builder';
import { LAYOUT, LINKS } from './layout';
import { THRESHOLD } from './threshold';
import { GROVE } from './grove';

export type Designs = Record<string, { design: RoomDesign; opts?: RoomOpts }>;

export const DESIGNS: Designs = { ...THRESHOLD, ...GROVE };

let cache: RoomDef[] | null = null;

/** All rooms of the Veil, built once. */
export function allRooms(): RoomDef[] {
  if (!cache) cache = buildRooms(LAYOUT, LINKS, DESIGNS);
  return cache;
}

/** Build only rooms that have designs (used during development tooling). */
export function partialRooms(): RoomDef[] {
  const ids = new Set(Object.keys(DESIGNS));
  return buildRooms(LAYOUT.filter((e) => ids.has(e.id)), LINKS.filter((l) => ids.has(l.a) && ids.has(l.b)), DESIGNS);
}
