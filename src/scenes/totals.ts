import { ABILITIES } from '../abilities/abilities';
import { BOSSES } from '../bosses/registry';
import { RELICS } from '../relics/relics';
import { ECHOES, SHARDS } from '../story/lore';

/** Totals used for completion percentages (save slots, pause menu, endings). */
export const TOTALS_FOR_SAVES = {
  abilities: ABILITIES.length,
  bosses: BOSSES.length,
  hearts: 16,
  vessels: 9,
  relics: RELICS.length,
  echoes: Object.keys(ECHOES).length,
  shards: Object.keys(SHARDS).length,
};
