import type { Progress } from '../progression/Progress';
import { hasFlag } from '../progression/Progress';
import { RELIC_BY_ID } from '../relics/relics';
import { ITEMS, LOST_RELICS } from '../story/lore';
import { region } from '../world/regions';
import { bossCount } from '../quests/quests';

export type ShopKind = 'relic' | 'heart' | 'vessel' | 'item' | 'map' | 'thread' | 'blade' | 'sell' | 'deposit' | 'withdraw';

export interface ShopItem {
  id: string;
  kind: ShopKind;
  name: string;
  desc: string;
  price: number;
  color: string;
  value: string;
  /** Can be bought repeatedly (bank actions). */
  repeat?: boolean;
}

export interface ShopDef {
  id: string;
  title: string;
  keeper: string;
  greeting: string;
  items: (p: Progress) => ShopItem[];
}

function relicItem(id: string, price: number): ShopItem {
  const r = RELIC_BY_ID.get(id)!;
  return { id: `relic_${id}`, kind: 'relic', name: r.name, desc: `${r.desc} (${r.cost} thread${r.cost > 1 ? 's' : ''})`, price, color: r.color, value: id };
}

function sold(p: Progress, id: string): boolean {
  return !!p.pickups[`shop_${id}`];
}

export const SHOPS: ShopDef[] = [
  {
    id: 'marrow', title: 'Marrow\'s Curios', keeper: 'Marrow', greeting: 'Bones, baubles, bits of the old world. Fragments only. No sentiment.',
    items: (p) => {
      const out: ShopItem[] = [
        relicItem('aether_siphon', 180),
        relicItem('fragment_magnet', 140),
        relicItem('sundered_fang', 320),
        relicItem('stillwater_vial', 360),
        { id: 'heart_m1', kind: 'heart', name: 'Vigor Ember', desc: 'A coal from a heart that refused to stop. Four make you hardier.', price: 380, color: '#ff8a9a', value: '' },
        { id: 'vessel_m1', kind: 'vessel', name: 'Aether Phial Shard', desc: 'A sliver of a vessel. Three hold more Aether.', price: 420, color: '#7fd6ff', value: '' },
      ];
      if (bossCount(p) >= 3) {
        out.push(relicItem('bloodless_edge', 520), relicItem('spite_spines', 260));
        out.push({ id: 'heart_m2', kind: 'heart', name: 'Vigor Ember', desc: 'Another coal. Still warm. Don\'t ask from whom.', price: 700, color: '#ff8a9a', value: '' });
      }
      if (bossCount(p) >= 6) {
        out.push(relicItem('charged_soul', 640), relicItem('ironroot_boots', 300));
        out.push({ id: 'vessel_m2', kind: 'vessel', name: 'Aether Phial Shard', desc: 'Cracked, but it holds.', price: 900, color: '#7fd6ff', value: '' });
      }
      if (p.ngPlus > 0) out.push(relicItem('veil_resonance', 800));
      return out.filter((i) => !sold(p, i.id) && !(i.kind === 'relic' && p.relics.includes(i.value)));
    },
  },
  {
    id: 'ysolde', title: 'Ysolde\'s Maps', keeper: 'Ysolde', greeting: 'Hmm-hm-hmmm. Maps! Mostly accurate. Mostly.',
    items: (p) => {
      const regions = ['th', 'lw', 'mg', 'gs', 'dc', 'lc', 'af', 'sa', 'tc', 'br', 'so', 'vg', 'he', 'ab'];
      const out: ShopItem[] = [];
      const visitedRegions = new Set(Object.keys(p.visited).map((r) => r.split('_')[0]));
      for (const r of regions) {
        if (p.mapPages[r] || !visitedRegions.has(r)) continue;
        const rd = region(r);
        out.push({ id: `map_${r}`, kind: 'map', name: `Map: ${rd.name}`, desc: 'Reveals the rooms of this region on your map. Secrets excluded.', price: 60 + regions.indexOf(r) * 15, color: rd.mapColor, value: r });
      }
      for (const k of ['quill', 'shrine_lens', 'hunters_lens'] as const) {
        if (p.keys.includes(k)) continue;
        out.push({ id: `item_${k}`, kind: 'item', name: ITEMS[k].name, desc: ITEMS[k].desc, price: k === 'quill' ? 80 : k === 'shrine_lens' ? 150 : 400, color: ITEMS[k].color, value: k });
      }
      return out;
    },
  },
  {
    id: 'oriel', title: 'Oriel\'s Loom', keeper: 'Oriel', greeting: 'Every relic pulls on a thread of you. I can spin you more thread.',
    items: (p) => {
      if (p.threadSlots >= 9) return [];
      const prices = [0, 0, 0, 300, 600, 950, 1350, 1800, 2400];
      return [{ id: `thread_${p.threadSlots + 1}`, kind: 'thread', name: 'Woven Thread', desc: `Bear one more thread of relics (${p.threadSlots} → ${p.threadSlots + 1}).`, price: prices[p.threadSlots], color: '#f0d890', value: '' }];
    },
  },
  {
    id: 'kettle', title: 'Kettle\'s Forge', keeper: 'Kettle', greeting: 'That blade of yours is older than this whole village. Bring me Veilsteel and I\'ll remind it how to bite.',
    items: (p) => {
      if (p.bladeLevel >= 4) return [];
      const ore = p.flags.ore ?? 0;
      const need = p.bladeLevel + 1;
      const prices = [250, 500, 900, 1400];
      return [{
        id: `blade_${need}`, kind: 'blade', name: `Temper the Veilblade (${need}/4)`,
        desc: `Requires ${need} Veilsteel Ore (you have ${ore}). Blade damage rises.`, price: prices[p.bladeLevel], color: '#e8f0ff', value: String(need),
      }];
    },
  },
  {
    id: 'vault', title: 'The Lantern Vault', keeper: 'Tamsin', greeting: 'Fragments you leave with me stay with me. The dark can\'t take what it can\'t reach.',
    items: (p) => [
      { id: 'deposit', kind: 'deposit', name: 'Deposit 100', desc: `Carried: ${p.fragments}. Stored: ${p.banked}. Stored fragments are never lost on death.`, price: 0, color: '#cfd8ff', value: '100', repeat: true },
      { id: 'deposit_all', kind: 'deposit', name: 'Deposit All', desc: `Carried: ${p.fragments}. Stored: ${p.banked}.`, price: 0, color: '#cfd8ff', value: 'all', repeat: true },
      { id: 'withdraw', kind: 'withdraw', name: 'Withdraw 100', desc: `Stored: ${p.banked}.`, price: 0, color: '#ffe8b0', value: '100', repeat: true },
      { id: 'withdraw_all', kind: 'withdraw', name: 'Withdraw All', desc: `Stored: ${p.banked}.`, price: 0, color: '#ffe8b0', value: 'all', repeat: true },
    ],
  },
  {
    id: 'curator', title: 'Ossian\'s Gallery', keeper: 'Ossian', greeting: 'Ah. You have the look of someone carrying history in their pockets.',
    items: (p) => p.lostRelics.filter((id) => !hasFlag(p, `sold_${id}`)).map((id) => {
      const r = LOST_RELICS[id];
      return { id: `sell_${id}`, kind: 'sell', name: `Sell: ${r.name}`, desc: r.desc, price: -r.value, color: r.color, value: id, repeat: true };
    }),
  },
];

export const SHOP_BY_ID = new Map(SHOPS.map((s) => [s.id, s]));
