import type { GameWorld } from '../world/GameWorld';
import type { Progress } from '../progression/Progress';
import { hasFlag, setFlag } from '../progression/Progress';
import { RELIC_BY_ID } from '../relics/relics';
import { sfx } from '../core/events';

export interface QuestDef {
  id: string;
  name: string;
  giver: string;
  /** Journal text per stage (index = stage). The last entry is the completed text. */
  stages: string[];
}

export const QUESTS: QuestDef[] = [
  { id: 'expedition', name: 'The Lost Expedition', giver: 'Captain Rhoswen', stages: [
    'Captain Rhoswen\'s expedition vanished into the Veil. Four explorers: Pell, Dorran, Ilka and Castor.',
    'Find the four lost explorers and send them home to Lanternwake.',
    'All four explorers are home. Rhoswen has stopped pacing the gate.',
  ] },
  { id: 'lamplighter', name: 'The Last Lamplighter', giver: 'Old Wick', stages: [
    'Old Wick tends a Great Lamp that went out the night the bells stopped.',
    'Bring Old Wick four wicks: Rootfire, Lumen, Cinder and Tide. They are scattered across the Veil.',
    'The Great Lamp of Lanternwake burns again. The village is not alone in the dark.',
  ] },
  { id: 'bells', name: 'The Silent Bells', giver: 'Ambrose the Bellringer', stages: [
    'A ghost in the Drowned City still waits to hear the Hour Bells.',
    'Strike the three silent bells hidden in the Drowned City.',
    'The bells ring again. The Drowned City remembers what time it is.',
  ] },
  { id: 'lift', name: 'The Foundry Lift', giver: 'Gearwright Ottoline', stages: [
    'Gearwright Ottoline wants to restart the great lift between the Foundry and Lanternwake.',
    'Bring Ottoline three ticking Cog Hearts from the depths of the Foundry.',
    'The Foundry Lift runs again, a straight line from fire to lantern-light.',
  ] },
  { id: 'pilgrim', name: 'A Pilgrim\'s Road', giver: 'Brother Hollis', stages: [
    'Brother Hollis is walking to the Thorn Chapel. He walks slowly.',
    'Brother Hollis rests in the Lumen Caverns. He has lost his prayer beads.',
    'Brother Hollis has reached the Thorn Chapel.',
    'Brother Hollis\'s pilgrimage is over.',
  ] },
  { id: 'bloom', name: 'Seeds of Remembrance', giver: 'Fen the Gardener', stages: [
    'Fen tends the Veiled Garden and searches for a Pale Bloom.',
    'Find a Pale Bloom — it grows only where someone is truly remembered — and bring it to Fen\'s empty bed.',
    'The Pale Bloom took root. The garden remembers one more thing.',
  ] },
  { id: 'unit9', name: 'Memories of Unit Nine', giver: 'Unit Nine', stages: [
    'A broken automaton in the Silent Engine has lost its memory cores.',
    'Recover Unit Nine\'s three Memory Cores from the Silent Engine.',
    'Unit Nine remembers. It wishes it did not.',
  ] },
  { id: 'leaflet', name: 'Leaflet\'s Collection', giver: 'Leaflet', stages: [
    'Leaflet, a living bookmark, collects Memory Shards for the Archive.',
    'Bring Memory Shards to Leaflet in the Sunken Archive.',
    'Leaflet\'s collection is complete. The Archive is a little less forgetful.',
  ] },
  { id: 'curator', name: 'The Curator\'s Gallery', giver: 'Ossian the Curator', stages: [
    'Ossian pays well for Lost Relics of Ilvane.',
    'Bring Lost Relics to Ossian\'s gallery in Lanternwake.',
    'Ossian\'s gallery holds all six relics. He has opened it to the village.',
  ] },
  { id: 'trials', name: 'Corvane\'s Trials', giver: 'Master Corvane', stages: [
    'Master Corvane offers trials of skill in the training yard.',
    'Complete Corvane\'s three trials as you grow stronger.',
    'You have bested every trial Corvane could devise.',
  ] },
  { id: 'mask', name: 'The Unworn Mask', giver: 'Hush', stages: [
    'A silent masked child watches you from the edges of Veil Shrines.',
    'Find the three shards of a porcelain mask.',
    'The Unworn Mask is whole. A door in the Abyss has opened.',
  ] },
];

export const QUEST_BY_ID = new Map(QUESTS.map((q) => [q.id, q]));

export function questStage(p: Progress, id: string): number {
  return p.quests[id]?.stage ?? 0;
}

export function questDone(p: Progress, id: string): boolean {
  return !!p.quests[id]?.done;
}

export function setQuest(w: GameWorld, id: string, stage: number, done = false): void {
  const q = QUEST_BY_ID.get(id);
  const prev = w.progress.quests[id];
  w.progress.quests[id] = { stage, done };
  if (!prev && q) {
    w.ui.toast('New quest', q.name, 'quest');
    sfx('quest');
  } else if (done && !prev?.done && q) {
    w.ui.toast('Quest complete', q.name, 'quest');
    sfx('quest');
  }
}

/** Give a reward directly (dialogue rewards). */
export function give(w: GameWorld, kind: 'relic' | 'frags' | 'heart' | 'vessel' | 'key' | 'thread', value: string | number): void {
  const p = w.progress;
  switch (kind) {
    case 'relic': {
      const id = String(value);
      if (!p.relics.includes(id)) p.relics.push(id);
      const r = RELIC_BY_ID.get(id);
      if (r) w.ui.toast(`Relic: ${r.name}`, r.desc, 'item');
      sfx('pickup_rare');
      break;
    }
    case 'frags':
      p.fragments += Number(value);
      w.ui.toast(`+${value} Veil Fragments`, undefined, 'item');
      sfx('pickup');
      break;
    case 'heart':
      p.heartFragments++;
      if (p.heartFragments % 4 === 0) {
        p.vigorBonus++;
        w.refreshStats();
        w.player.vigor = w.player.maxVigor;
        w.ui.toast('Vigor Ember', 'Your maximum Vigor has increased.', 'item');
      } else w.ui.toast('Vigor Ember', `${p.heartFragments % 4} of 4 gathered.`, 'item');
      sfx('pickup_rare');
      break;
    case 'vessel':
      p.vesselFragments++;
      if (p.vesselFragments % 3 === 0) {
        p.aetherBonus++;
        w.refreshStats();
        w.ui.toast('Aether Phial', 'You can hold more Aether.', 'item');
      } else w.ui.toast('Aether Phial Shard', `${p.vesselFragments % 3} of 3 gathered.`, 'item');
      sfx('pickup_rare');
      break;
    case 'key':
      if (!p.keys.includes(String(value))) p.keys.push(String(value));
      sfx('pickup_rare');
      break;
    case 'thread':
      p.threadSlots = Math.min(9, p.threadSlots + 1);
      w.ui.toast('Relic thread woven', `You can now bear ${p.threadSlots} threads of relics.`, 'item');
      sfx('pickup_rare');
      break;
  }
}

export function bossCount(p: Progress): number {
  return Object.keys(p.bosses).length;
}

export function explorersFound(p: Progress): number {
  return ['found_pell', 'found_dorran', 'found_ilka', 'found_castor'].filter((f) => hasFlag(p, f)).length;
}

export const WICKS = ['wick_mg', 'wick_lc', 'wick_af', 'wick_dc'];
export const COGS = ['cog_1', 'cog_2', 'cog_3'];
export const CORES = ['core_1', 'core_2', 'core_3'];

/** Remove key items from the inventory (turn-in). */
export function takeKeys(p: Progress, ids: string[]): number {
  let n = 0;
  for (const id of ids) {
    const i = p.keys.indexOf(id);
    if (i >= 0) {
      p.keys.splice(i, 1);
      n++;
    }
  }
  return n;
}

export function flag(p: Progress, f: string): boolean {
  return hasFlag(p, f);
}

export { setFlag };

/** True-ending requirements: every Echo, the Great Lamp lit, and the Queen spared. */
export function trueEndingReady(p: Progress): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (p.echoes.length < 7) missing.push(`Echoes of Ilvane (${p.echoes.length}/7)`);
  if (!hasFlag(p, 'great_lamp_lit')) missing.push('The Great Lamp of Lanternwake');
  if (!hasFlag(p, 'crown_spared')) missing.push('The Queen\'s release');
  return { ok: missing.length === 0, missing };
}

export function secretEndingReady(p: Progress): boolean {
  return hasFlag(p, 'first_wanderer') && p.keys.includes('unworn_mask');
}
