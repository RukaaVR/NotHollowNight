import type { GameWorld } from '../world/GameWorld';
import type { Entity } from '../world/Entity';
import type { Boss } from './Boss';
import { Gatekeeper, WeepingRoot, Mycelia, PrismWyrm } from './early';
import { BellWarden, AshWarden, InkArchivist, ThornSaint } from './mid';
import { Ormund, Astronomer, GrievingCrown, Conductor } from './late';
import { Gloam, FirstWanderer } from './final';
import { Pickup } from '../world/objects/pickups';

type BossCtor = new (world: GameWorld, fx: number, fy: number) => Boss;

export interface BossInfo {
  id: string;
  name: string;
  title: string;
  region: string;
  ctor: BossCtor;
  room: string;
  lore: string;
}

export const BOSSES: BossInfo[] = [
  { id: 'gatekeeper', name: 'The Rusted Gatekeeper', title: 'Keeper of the First Door', region: 'th', ctor: Gatekeeper, room: 'th_boss', lore: 'It was posted at the first door with one order: let no one back up. It never asked who would want to.' },
  { id: 'weeping_root', name: 'The Weeping Root', title: 'Mother of the Mourning Grove', region: 'mg', ctor: WeepingRoot, room: 'mg_boss', lore: 'The oldest tree of the royal garden, dragged down root by root. It weeps for the sky it was taken from.' },
  { id: 'mycelia', name: 'Mycelia', title: 'Spore Matron of the Warrens', region: 'gs', ctor: Mycelia, room: 'gs_boss', lore: 'She fed the Engine on dreamcaps for three centuries, and grew fat on the dreams that leaked.' },
  { id: 'prism', name: 'The Prism Wyrm', title: 'Light That Swallowed the Miners', region: 'lc', ctor: PrismWyrm, room: 'lc_boss', lore: 'Crystal grows toward sound. The miners stopped singing. The crystal grew toward their hearts instead.' },
  { id: 'bell_warden', name: 'The Bell Warden', title: 'Who Keeps the Silent Hours', region: 'dc', ctor: BellWarden, room: 'dc_boss', lore: 'Keeper of the Hour Bells. When the bells fell silent it could not bear the quiet, and became the bell.' },
  { id: 'ash_warden', name: 'The Warden of Ash', title: 'Last Fire of the Foundry', region: 'af', ctor: AshWarden, room: 'af_boss', lore: 'Sworn to keep the furnaces lit until the Archon returned. The Archon did not return.' },
  { id: 'archivist', name: 'The Ink Archivist', title: 'Keeper of the Unread', region: 'sa', ctor: InkArchivist, room: 'sa_boss', lore: 'It read every book in the Archive, then dissolved into the ink so it could be read in turn.' },
  { id: 'thorn_saint', name: 'The Thorn Saint', title: 'She Who Took the Wounds', region: 'tc', ctor: ThornSaint, room: 'tc_boss', lore: 'She took every thorn of the faithful into herself. There were a great many faithful.' },
  { id: 'ormund', name: 'Ormund', title: 'The Still Tide', region: 'br', ctor: Ormund, room: 'br_boss', lore: 'The Reservoir\'s keeper, who held the water still so the Engine would stay cool. It held its breath for four hundred years.' },
  { id: 'astronomer', name: 'The Blind Astronomer', title: 'Who Remembered the Sun', region: 'so', ctor: Astronomer, room: 'so_boss', lore: 'She saw the sun return, and the Archon took her eyes so she could never tell anyone. She told the stars instead.' },
  { id: 'crown', name: 'The Grieving Crown', title: 'Seraphel, Who Remembers', region: 'vg', ctor: GrievingCrown, room: 'vg_boss', lore: 'Queen of Ilvane. She remembered her son so fiercely that the Veil gave him back to her — as you.' },
  { id: 'conductor', name: 'The Conductor', title: 'Archon Thessaly Vane', region: 'he', ctor: Conductor, room: 'he_boss', lore: 'Architect of the Veil and the Engine. He fused himself to the machine so the dream would never stop. It was the only promise he kept.' },
  { id: 'gloam', name: 'The Gloam', title: 'Nightmare of Orun', region: 'ab', ctor: Gloam, room: 'ab_boss', lore: 'Four centuries of a sleeping god\'s bad dreams, wearing the face of the child it was told to forget.' },
  { id: 'first_wanderer', name: 'The First Wanderer', title: 'Forty-First Before You', region: 'ab', ctor: FirstWanderer, room: 'ab_secret', lore: 'The Veil tried to remember the Queen\'s son forty-one times before you. This one almost succeeded.' },
];

export const BOSS_BY_ID = new Map(BOSSES.map((b) => [b.id, b]));

export function createBoss(world: GameWorld, id: string, fx: number, fy: number): Entity | null {
  const info = BOSS_BY_ID.get(id);
  if (!info) return null;
  const defeated = !!world.progress.bosses[id];
  if (defeated && world.challengeBoss !== id) {
    // Re-offer any reward that was never picked up.
    const probe = new info.ctor(world, fx, fy);
    probe.rewards.forEach((r, i) => {
      const pid = `boss_${id}_${i}`;
      if (!world.progress.pickups[pid]) world.add(new Pickup(world, fx - 8 + (i - (probe.rewards.length - 1) / 2) * 28, fy - 40, r.kind, pid, r.value));
    });
    return null;
  }
  return new info.ctor(world, fx, fy);
}
