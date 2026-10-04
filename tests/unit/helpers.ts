import { GameWorld, type WorldUI } from '../../src/world/GameWorld';
import { VirtualInput } from '../../src/core/input';
import { defaultSettings } from '../../src/accessibility/settings';
import { newProgress, type Progress } from '../../src/progression/Progress';
import type { RoomDef } from '../../src/world/Room';
import { events } from '../../src/core/events';

export interface UiLog {
  calls: { fn: string; args: unknown[] }[];
}

export function stubUI(log: UiLog = { calls: [] }): WorldUI {
  const rec = (fn: string) => (...args: unknown[]) => {
    log.calls.push({ fn, args });
  };
  return {
    toast: rec('toast'),
    hint: rec('hint'),
    flashAether: rec('flashAether'),
    dialogue: (script, onDone) => {
      log.calls.push({ fn: 'dialogue', args: [script] });
      onDone?.();
    },
    openShrine: rec('openShrine'),
    openTravel: rec('openTravel'),
    openShop: rec('openShop'),
    abilityGet: rec('abilityGet'),
    itemGet: (t, d, c, onDone) => {
      log.calls.push({ fn: 'itemGet', args: [t, d, c] });
      onDone?.();
    },
    lore: rec('lore'),
    cutscene: (id, onDone) => {
      log.calls.push({ fn: 'cutscene', args: [id] });
      onDone?.();
    },
    ending: rec('ending'),
    challengeMenu: rec('challengeMenu'),
  };
}

export function makeWorld(rooms: RoomDef[], progress: Progress = newProgress(), log?: UiLog) {
  events.clear();
  const input = new VirtualInput();
  const saves: Progress[] = [];
  const world = new GameWorld(rooms, progress, defaultSettings(), input, stubUI(log), (p) => saves.push(structuredClone(p)));
  return { world, input, saves };
}

export function step(world: GameWorld, input: VirtualInput, frames: number): void {
  for (let i = 0; i < frames; i++) {
    input.beginStep();
    world.update(1 / 60);
  }
}

/** A 30x12 test box with a floor and optional extra rows. */
export function box(id: string, rows: string[], pos: [number, number] = [0, 0]): RoomDef {
  return { id, region: 'th', pos, rows };
}

export const FLAT = [
  '##############################',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#............................#',
  '#..@.........................#',
  '##############################',
];
