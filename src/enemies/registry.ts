import { Enemy, type EnemyDef } from './Enemy';
import type { GameWorld } from '../world/GameWorld';
import { EARLY } from './types/early';
import { MID } from './types/mid';
import { LATE } from './types/late';
import { DEEP } from './types/deep';

export const ENEMY_DEFS: EnemyDef[] = [...EARLY, ...MID, ...LATE, ...DEEP];
export const ENEMY_BY_ID = new Map(ENEMY_DEFS.map((d) => [d.id, d]));

export function createEnemy(world: GameWorld, id: string, fx: number, fy: number, elite: boolean, flag?: string): Enemy | null {
  const def = ENEMY_BY_ID.get(id);
  if (!def) {
    console.warn(`Unknown enemy ${id}`);
    return null;
  }
  return new Enemy(world, def, fx, fy, elite, flag);
}
