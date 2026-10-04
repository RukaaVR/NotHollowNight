import type { GameWorld } from '../world/GameWorld';
import { Npc, type NpcDef } from './Npc';
import { VILLAGE_NPCS } from './village';
import { WILD_NPCS } from './wilds';

export const NPC_DEFS: NpcDef[] = [...VILLAGE_NPCS, ...WILD_NPCS];
export const NPC_BY_ID = new Map(NPC_DEFS.map((n) => [n.id, n]));

export function createNpc(world: GameWorld, id: string, fx: number, fy: number): Npc | null {
  const def = NPC_BY_ID.get(id);
  if (!def) {
    console.warn(`Unknown NPC ${id}`);
    return null;
  }
  if (def.present && !def.present(world.progress, world.room.id)) return null;
  return new Npc(world, def, fx, fy);
}
