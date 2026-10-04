import type { Entity } from './Entity';
import type { GameWorld } from './GameWorld';
import type { EntityPlacement } from './Room';
import { TILE } from './tiles';
import { Pickup } from './objects/pickups';
import { Anchor, Crusher, Elevator, Faller, Gate, LanceSwitch, Lever, Mover, TimedGate } from './objects/mechanisms';
import { ChallengeAltar, Dummy, EndingAltar, LightSource, LoreTablet, Prop, Shrine, Trigger, VeilGate } from './objects/interactables';
import { createEnemy } from '../enemies/registry';
import { createBoss } from '../bosses/registry';
import { createNpc } from '../npc/registry';
import { QuestBell, BloomBed } from '../quests/objects';
import { hasFlag } from '../progression/Progress';

/** Builds the runtime entity for a room placement, or null if it should not appear. */
export function createEntity(world: GameWorld, pl: EntityPlacement): Entity | null {
  const { tx, ty } = pl;
  switch (pl.ch) {
    case 'G': return new Anchor(world, tx, ty);
    case 'S': if (!pl.spawn) return new Shrine(world, tx, ty); break;
    case 'L': if (!pl.spawn) return new LightSource(world, tx, ty, 'lantern'); break;
    case 'c': if (!pl.spawn) return new LightSource(world, tx, ty, 'crystal'); break;
    case 'f': if (!pl.spawn) return new LightSource(world, tx, ty, 'torch'); break;
    case 'V': if (!pl.spawn) return new VeilGate(world, tx, ty); break;
    case '@': return null;
  }
  const s = pl.spawn;
  if (!s) return null;
  const pr = world.progress;
  const fx = tx * TILE + TILE / 2;
  const fy = (ty + 1) * TILE;
  switch (s.k) {
    case 'enemy':
      if (s.flag && hasFlag(pr, s.flag)) return null;
      return createEnemy(world, s.t, fx, fy, !!s.elite, s.flag);
    case 'boss':
      return createBoss(world, s.t, fx, fy);
    case 'npc':
      return createNpc(world, s.t, fx, fy);
    case 'pickup':
      if (pr.pickups[s.id]) return null;
      return new Pickup(world, tx * TILE, ty * TILE, s.t, s.id, s.value ?? s.id);
    case 'lore':
      return new LoreTablet(world, tx, ty, s.id, s.style ?? 'tablet');
    case 'prop':
      if (s.t === 'quest_bell') return new QuestBell(world, tx, ty, s.text ?? 'bell');
      if (s.t === 'bloom_bed') return new BloomBed(world, tx, ty);
      return new Prop(world, tx, ty, s.t, s.text, !!s.flip);
    case 'lever':
      return new Lever(world, tx, ty, s.id);
    case 'switch':
      return new LanceSwitch(world, tx, ty, s.id);
    case 'gate':
      return new Gate(world, tx, ty, s.id, s.h ?? 3, s.w ?? 1, s.opensOn, s.closesOn, !!s.boss);
    case 'mover':
      return new Mover(world, tx, ty, s.w, s.dx, s.dy, s.period, s.phase);
    case 'faller':
      return new Faller(world, tx, ty, s.w);
    case 'crusher':
      return new Crusher(world, tx, ty, s.w, s.h, s.dy, s.period, s.phase);
    case 'elevator':
      return new Elevator(world, tx, ty, s.id, s.dy, s.w ?? 3);
    case 'timedgate':
      return new TimedGate(world, tx, ty, s.h, s.period, s.open, s.phase);
    case 'wind':
    case 'current':
      world.windZones.push({ x: tx * TILE, y: ty * TILE, w: s.w * TILE, h: s.h * TILE, fx: s.fx, fy: s.fy });
      return null;
    case 'trigger':
      if (hasFlag(pr, `ev_${s.id}`)) return null;
      return new Trigger(world, tx, ty, s.id, s.w, s.h, s.event);
    case 'dummy':
      return new Dummy(world, tx, ty);
    case 'challenge':
      return new ChallengeAltar(world, tx, ty, s.id);
    case 'ending':
      return new EndingAltar(world, tx, ty, s.id);
  }
  return null;
}
