export type RelicBuild = 'aggressive' | 'defensive' | 'aether' | 'mobility' | 'critical' | 'utility';

export interface RelicDef {
  id: string;
  name: string;
  cost: number;
  build: RelicBuild;
  desc: string;
  lore: string;
  /** Primary glyph colour used by the procedural icon painter. */
  color: string;
  /** Icon shape index for the procedural painter. */
  glyph: number;
}

export const RELICS: RelicDef[] = [
  { id: 'bloodless_edge', name: 'Bloodless Edge', cost: 2, build: 'aggressive', color: '#e9e4f2', glyph: 0,
    desc: 'Strike 25% faster. Mending takes 35% longer.', lore: 'A blade that has never tasted blood forgets how to rest.' },
  { id: 'echo_heart', name: 'Echo Heart', cost: 2, build: 'defensive', color: '#ff8fa3', glyph: 1,
    desc: 'When struck, release a pulse that harms and repels nearby foes.', lore: 'It beats twice: once for you, once for whoever hurt you.' },
  { id: 'wanderers_thread', name: "Wanderer's Thread", cost: 1, build: 'utility', color: '#f0d890', glyph: 2,
    desc: 'The map reveals rooms adjacent to those you have explored, and marks unclaimed treasures nearby.', lore: 'Tie one end at the door. You will always find your way back.' },
  { id: 'ashen_core', name: 'Ashen Core', cost: 2, build: 'aggressive', color: '#ff7a3d', glyph: 3,
    desc: 'Strikes set foes alight, burning them over time. Fire damage +30%.', lore: 'Still warm. The Foundry never truly went out.' },
  { id: 'mirror_veil', name: 'Mirror Veil', cost: 3, build: 'defensive', color: '#c9f1ff', glyph: 4,
    desc: 'Dash just before a blow lands to reflect it, becoming briefly untouchable.', lore: 'The Veil shows the attacker their own face.' },
  { id: 'sundered_fang', name: 'Sundered Fang', cost: 2, build: 'aggressive', color: '#f5f5f5', glyph: 5,
    desc: 'Blade damage +20%.', lore: 'Snapped from a beast that never stopped biting.' },
  { id: 'warding_lantern', name: 'Warding Lantern', cost: 2, build: 'defensive', color: '#ffe08a', glyph: 6,
    desc: 'Gain a shield that absorbs one blow. Rekindles after 25 seconds.', lore: 'A light that stands between you and the dark, if only once.' },
  { id: 'aether_siphon', name: 'Aether Siphon', cost: 1, build: 'aether', color: '#7fd6ff', glyph: 7,
    desc: 'Gain 40% more Aether from strikes.', lore: 'Drink deep. The Veil has plenty to spare. For now.' },
  { id: 'stillwater_vial', name: 'Stillwater Vial', cost: 2, build: 'defensive', color: '#9fe7e0', glyph: 8,
    desc: 'Mend 40% faster.', lore: 'Water from a pool no wind has ever touched.' },
  { id: 'twin_mend', name: 'Twin Mend', cost: 3, build: 'defensive', color: '#ffd1dc', glyph: 9,
    desc: 'Mending restores 2 Vigor but costs 66 Aether.', lore: 'Two threads, pulled together, knot tighter.' },
  { id: 'quickstep', name: 'Quickstep Sandals', cost: 1, build: 'mobility', color: '#d2f5a6', glyph: 10,
    desc: 'Veil Dash recovers 40% faster.', lore: 'Worn thin by a courier who was always late.' },
  { id: 'long_reach', name: 'Long Reach', cost: 2, build: 'aggressive', color: '#d8c8ff', glyph: 11,
    desc: 'Blade reach +30%.', lore: 'The Veilblade remembers being longer.' },
  { id: 'storm_lance', name: 'Storm Lance', cost: 2, build: 'aether', color: '#a8e0ff', glyph: 12,
    desc: 'Veil Lance is larger, pierces all foes, and deals 30% more damage.', lore: 'Thunder has no point. This one does.' },
  { id: 'gravebloom', name: 'Gravebloom', cost: 2, build: 'critical', color: '#c45b7a', glyph: 13,
    desc: 'While at 1 Vigor, all damage is increased by 60%.', lore: 'Flowers grow best from what is almost dead.' },
  { id: 'hunters_mark', name: "Hunter's Mark", cost: 1, build: 'critical', color: '#ff5c5c', glyph: 14,
    desc: 'Critical strike chance +12%.', lore: 'A painted eye that sees where flesh is thin.' },
  { id: 'glass_crown', name: 'Glass Crown', cost: 2, build: 'critical', color: '#e8fbff', glyph: 15,
    desc: 'Critical strikes deal 2.5× damage. You take double damage.', lore: 'To wear it is to be seen, and to be breakable.' },
  { id: 'ember_wake', name: 'Ember Wake', cost: 1, build: 'mobility', color: '#ffb066', glyph: 16,
    desc: 'Dashing leaves a trail of embers that scorch foes.', lore: 'Run fast enough and the air catches fire.' },
  { id: 'fragment_magnet', name: 'Lodestone Charm', cost: 1, build: 'utility', color: '#b0b8ff', glyph: 17,
    desc: 'Veil Fragments are drawn to you from afar, and foes drop 15% more.', lore: 'Iron that longs for everything it once was.' },
  { id: 'lifeleech_thorn', name: 'Lifeleech Thorn', cost: 3, build: 'aggressive', color: '#9a1f3f', glyph: 18,
    desc: 'Every 12 strikes that land restore 1 Vigor.', lore: 'It feeds you. It is also feeding on you.' },
  { id: 'shadow_cloak', name: 'Umbral Hem', cost: 2, build: 'mobility', color: '#8f7cff', glyph: 19,
    desc: 'Shadow Step travels 50% farther and grants longer invulnerability.', lore: 'Stitched with thread spun from the inside of a shadow.' },
  { id: 'ironroot_boots', name: 'Ironroot Boots', cost: 1, build: 'utility', color: '#8b6f4e', glyph: 20,
    desc: 'Wind and water currents no longer push you. Knockback reduced.', lore: 'Roots do not ask the storm for permission.' },
  { id: 'tidecaller', name: 'Tidecaller', cost: 1, build: 'mobility', color: '#5ac8e8', glyph: 21,
    desc: 'Swim 50% faster. Strikes made while in water deal 50% more damage.', lore: 'The sea listens to those who drown willingly.' },
  { id: 'charged_soul', name: 'Gathering Coil', cost: 2, build: 'aggressive', color: '#ffe0f0', glyph: 22,
    desc: 'Charged strikes gather 50% faster and stagger harder.', lore: 'Wind it tight. Let go all at once.' },
  { id: 'spite_spines', name: 'Spite Spines', cost: 1, build: 'defensive', color: '#7fb069', glyph: 23,
    desc: 'Foes that strike you take damage in return.', lore: 'Grown by a thing that was tired of being eaten.' },
  { id: 'steady_heart', name: 'Steady Heart', cost: 2, build: 'defensive', color: '#ff6b6b', glyph: 24,
    desc: 'Maximum Vigor +1.', lore: 'Slow. Stubborn. Still beating.' },
  { id: 'aether_font', name: 'Aether Font', cost: 2, build: 'aether', color: '#86f0ff', glyph: 25,
    desc: 'Aether slowly wells up over time.', lore: 'A crack in the world, leaking dreams.' },
  { id: 'pilgrims_ash', name: "Pilgrim's Ash", cost: 1, build: 'utility', color: '#c8c0b0', glyph: 26,
    desc: 'Spikes, thorns and acid cannot wound you — they only cast you back.', lore: 'Ash from a thousand prayers. The ground respects it.' },
  { id: 'tolling_heart', name: 'Tolling Heart', cost: 2, build: 'aggressive', color: '#d4b26a', glyph: 27,
    desc: 'Every 5th strike in a row without being hit rings out a damaging toll.', lore: 'The bells of the Drowned City, wound small enough to carry.' },
  { id: 'seers_lens', name: "Seer's Lens", cost: 1, build: 'utility', color: '#e6f7a6', glyph: 28,
    desc: 'Hidden passages shimmer faintly when you are near.', lore: 'Look through it, and walls admit what they are hiding.' },
  { id: 'gloam_pact', name: 'Gloam Pact', cost: 3, build: 'critical', color: '#6a2a8a', glyph: 29,
    desc: 'All damage +60%. You can no longer Mend.', lore: 'The dark offers strength. It asks only for your ability to heal.' },
  { id: 'lamplight_locket', name: 'Lamplight Locket', cost: 1, build: 'utility', color: '#ffd66b', glyph: 30,
    desc: 'Your light reaches much farther into the dark.', lore: 'Inside: a lock of hair, and a small flame that refuses to die.' },
  { id: 'featherfall', name: 'Featherfall Charm', cost: 1, build: 'mobility', color: '#f2f2e8', glyph: 31,
    desc: 'Greater control in the air. Veil Glide drifts slower and farther.', lore: 'A feather from a bird that never existed above ground.' },
  { id: 'veil_resonance', name: 'Veil Resonance', cost: 2, build: 'aether', color: '#b9a3ff', glyph: 32,
    desc: 'Veil Arts cost 25% less Aether.', lore: 'The Veil hums back when you sing in its key.' },
  { id: 'heavy_blow', name: 'Wardens Gauntlet', cost: 2, build: 'aggressive', color: '#a0a0b8', glyph: 33,
    desc: 'Strikes knock foes back much farther and break armor faster.', lore: 'Forged for hands that held doors shut against the dark.' },
];

export const RELIC_BY_ID = new Map(RELICS.map((r) => [r.id, r]));
export const MAX_THREAD_SLOTS = 9;
