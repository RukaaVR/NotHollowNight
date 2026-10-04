import type { Designs } from './index';

/** THORN CHAPEL, VEILED GARDEN, ASHEN FOUNDRY, HOLLOW ENGINE, THE ABYSS and STARWELL OBSERVATORY. */
export const DEPTHS: Designs = {
  // ------------------------------------------------------------ Thorn Chapel
  tc_gate: {
    opts: { title: 'The Briar Arch' },
    design: (b) => {
      b.ledge(1, 1, 28, 6);
      b.art(8, 7, ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T']);
      b.art(9, 7, ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T']);
      b.art(10, 7, ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T']);
      b.ledge(18, 7, 4, 1, 'B');
      b.ledge(18, 1, 4, 6);
      b.clear(19, 3, 2, 4);
      b.pickup(19, 6, 'relic', 'p_rel_shadowcloak', 'shadow_cloak');
      b.enemy(22, 15, 'acolyte');
      b.pickup(25, 15, 'heart', 'p_heart_tc');
      b.put(4, 9, 'f');
      b.put(25, 9, 'f');
    },
  },
  tc_nave: {
    opts: { title: 'The Nave of Thorns' },
    design: (b) => {
      // The cracked floor of the nave. Only a crushing fall will break it.
      b.art(13, 14, ['FFFF', 'FFFF']);
      b.plat(4, 11, 6);
      b.plat(22, 10, 6);
      b.plat(36, 11, 6);
      b.plat(50, 10, 6);
      b.npc(26, 15, 'maudlin');
      b.lore(8, 15, 'tab_tc_1');
      b.lore(44, 15, 'tab_tc_2');
      b.prop(15, 13, 'altar', 'The floor beneath the altar is cracked, and something below is praying very loudly.');
      b.enemy(34, 15, 'acolyte');
      b.enemy(52, 15, 'wretch');
      b.enemy(6, 9, 'wretch');
      b.prop(20, 15, 'banner');
      b.prop(40, 15, 'banner');
      for (const x of [10, 30, 48]) b.put(x, 6, 'f');
      b.pickup(53, 9, 'shard', 'p_ms_10', 'ms_10');
    },
  },
  tc_shrine: {
    opts: { title: 'Pilgrims\' Rest' },
    design: (b) => {
      b.put(6, 15, 'S');
      b.npc(22, 15, 'hollis');
      b.prop(25, 15, 'urn');
      b.put(4, 8, 'f');
      b.put(26, 8, 'f');
    },
  },
  tc_spire: {
    opts: { title: 'The Thorned Spire' },
    design: (b) => {
      // A twisting bell-spire. Climbing it needs a grip on sheer stone.
      b.ledge(1, 1, 12, 20);
      b.ledge(17, 1, 12, 20);
      b.ledge(1, 21, 6, 1);
      b.plat(8, 24, 4);
      b.plat(18, 27, 4);
      b.plat(8, 30, 4);
      b.plat(13, 21, 4);
      b.enemy(20, 25, 'acolyte');
      b.put(3, 20, 'f');
      b.put(25, 26, 'f');
    },
  },
  tc_boss: {
    opts: { title: 'The Saint\'s Crypt' },
    design: (b) => {
      b.plat(6, 11, 6);
      b.plat(48, 11, 6);
      b.plat(20, 9, 5);
      b.plat(36, 9, 5);
      b.spawn(30, 15, { k: 'boss', t: 'thorn_saint' });
      b.put(4, 5, 'f');
      b.put(55, 5, 'f');
    },
  },

  // ------------------------------------------------------------ Veiled Garden
  vg_01: {
    opts: { title: 'The Garden Gate' },
    design: (b) => {
      b.art(6, 9, ['P', 'P', 'P', 'P', 'P', 'P', 'P']);
      b.art(7, 9, ['P', 'P', 'P', 'P', 'P', 'P', 'P']);
      b.ledge(6, 1, 2, 8);
      b.put(18, 15, 'S');
      b.lore(12, 15, 'tab_vg_1');
      b.prop(24, 15, 'flowers');
      b.prop(26, 15, 'flowers');
      b.put(14, 6, 'c');
    },
  },
  vg_02: {
    opts: { title: 'The Sunken Terraces' },
    design: (b) => {
      // A chasm of thorns too wide to leap. Spread your cloak and glide.
      b.ledge(1, 12, 14, 4);
      b.art(15, 15, ['TTTTTTTTTTTTTT']);
      b.ledge(15, 16, 14, 1);
      b.ledge(29, 12, 30, 4);
      b.clear(43, 12, 4, 4);
      b.ledge(4, 7, 6, 1);
      b.ledge(50, 6, 6, 1);
      b.pickup(52, 5, 'relic', 'p_rel_steady', 'steady_heart');
      b.pickup(6, 6, 'vessel', 'p_vessel_vg');
      b.enemy(10, 11, 'maiden');
      b.enemy(38, 11, 'topiary');
      b.enemy(55, 11, 'maiden');
      b.prop(3, 11, 'flowers');
      b.put(25, 5, 'c');
      b.pickup(25, 9, 'shard', 'p_ms_13', 'ms_13');
      b.plat(24, 10, 3);
    },
  },
  vg_03: {
    opts: { title: 'The Remembering Bed' },
    design: (b) => {
      b.ledge(1, 15, 12, 1);
      b.ledge(17, 15, 12, 1);
      b.npc(6, 14, 'fen');
      b.spawn(10, 14, { k: 'prop', t: 'bloom_bed' });
      b.lore(22, 14, 'tab_vg_2');
      b.prop(25, 14, 'flowers');
      b.put(4, 6, 'c');
      b.put(25, 6, 'c');
      b.enemy(20, 14, 'maiden');
    },
  },
  vg_hidden: {
    opts: { title: 'A Forgotten Corner', secret: true },
    design: (b) => {
      b.pickup(14, 15, 'key', 'p_bloom', 'pale_bloom');
      b.pickup(20, 15, 'lostrelic', 'p_lr_3', 'lr_3');
      b.pickup(8, 15, 'heart', 'p_heart_vg');
      b.prop(17, 15, 'flowers', 'A single pale flower grows here, alone, in a place no one visits. Someone, somewhere, is remembering.');
      b.put(14, 6, 'c');
    },
  },
  vg_boss: {
    opts: { title: 'The Queen\'s Bower' },
    design: (b) => {
      b.plat(8, 11, 6);
      b.plat(46, 11, 6);
      b.plat(24, 8, 4);
      b.plat(32, 8, 4);
      b.spawn(30, 15, { k: 'boss', t: 'crown' });
      b.prop(3, 15, 'flowers');
      b.prop(56, 15, 'flowers');
      b.pickup(20, 7, 'shard', 'p_ms_20', 'ms_20');
    },
  },

  // ------------------------------------------------------------ Ashen Foundry
  af_entry: {
    opts: { title: 'Foundry Road' },
    design: (b) => {
      b.spawn(8, 15, { k: 'lever', id: 'af_lw' });
      b.lore(14, 15, 'tab_af_1');
      b.prop(20, 15, 'furnace');
      b.enemy(24, 15, 'brute');
      b.put(10, 7, 'f');
      b.put(22, 7, 'f');
      b.plat(12, 11, 5);
    },
  },
  af_halls: {
    opts: { title: 'The Furnace Halls' },
    design: (b) => {
      b.ledge(1, 15, 11, 1);
      b.ledge(18, 15, 24, 1);
      b.ledge(48, 15, 11, 1);
      b.npc(5, 14, 'ottoline');
      b.prop(22, 14, 'furnace');
      b.prop(36, 14, 'furnace');
      b.plat(20, 10, 6);
      b.plat(34, 10, 6);
      b.ledge(52, 9, 7, 1);
      b.pickup(56, 8, 'key', 'p_cog_1', 'cog_1');
      b.enemy(28, 14, 'brute');
      b.enemy(30, 3, 'drone');
      b.enemy(52, 3, 'drone');
      b.spawn(57, 12, { k: 'enemy', t: 'spitter' });
      b.prop(9, 14, 'machine');
      b.put(16, 5, 'f');
      b.put(44, 5, 'f');
    },
  },
  af_lift: {
    opts: { title: 'The Foundry Lift' },
    design: (b) => {
      b.ledge(1, 1, 12, 49);
      b.ledge(17, 1, 12, 49);
      b.spawn(13, 4, { k: 'elevator', id: 'af_lift', dy: 43, w: 3 });
      b.prop(16, 3, 'pipes');
      b.put(15, 25, 'f');
    },
  },
  af_deep: {
    opts: { title: 'The Deep Seams' },
    design: (b) => {
      b.ledge(1, 13, 10, 3);
      b.ledge(20, 13, 9, 3);
      b.npc(5, 12, 'gristle');
      b.plat(11, 10, 3);
      b.plat(16, 7, 3);
      b.plat(12, 4, 3);
      b.prop(24, 12, 'cart');
      b.put(3, 6, 'f');
      b.enemy(22, 12, 'brute');
      b.pickup(8, 12, 'shard', 'p_ms_08', 'ms_08');
    },
  },
  af_climb: {
    opts: { title: 'The Crucible Shaft' },
    design: (b) => {
      // A towering shaft of crushers and catwalks, from the deep seams up to the halls.
      const plats: [number, number][] = [[18, 64], [9, 61], [16, 58], [6, 55], [14, 52], [21, 49], [12, 46], [4, 43], [12, 40], [20, 37], [12, 34], [4, 31], [11, 28], [19, 25], [11, 22], [4, 19], [12, 16], [20, 13], [13, 10], [8, 7], [15, 4]];
      for (const [x, y] of plats) b.plat(x, y, 5);
      b.spawn(22, 40, { k: 'crusher', w: 3, h: 2, dy: 6, period: 3.2 });
      b.spawn(5, 22, { k: 'crusher', w: 3, h: 2, dy: 6, period: 2.8, phase: 0.4 });
      b.spawn(18, 6, { k: 'crusher', w: 3, h: 2, dy: 5, period: 3, phase: 0.7 });
      b.pickup(24, 12, 'relic', 'p_rel_emberwake', 'ember_wake');
      b.pickup(5, 42, 'key', 'p_cog_3', 'cog_3');
      b.pickup(5, 30, 'heart', 'p_heart_af2');
      b.enemy(14, 33, 'drone');
      b.enemy(14, 15, 'drone');
      b.put(26, 30, 'f');
      b.put(3, 50, 'f');
      b.put(26, 8, 'f');
    },
  },
  af_forge: {
    opts: { title: 'The Ever-Burning Forge' },
    design: (b) => {
      b.ledge(1, 16, 20, 1);
      b.plat(22, 13, 6);
      b.ledge(4, 9, 6, 1);
      b.ledge(18, 6, 8, 1);
      b.pickup(22, 5, 'key', 'p_wick_af', 'wick_af');
      b.spawn(11, 1, { k: 'crusher', w: 3, h: 2, dy: 5, period: 2.6 });
      b.plat(16, 30, 4);
      b.plat(21, 27, 4);
      b.plat(16, 24, 4);
      b.plat(21, 21, 4);
      b.plat(22, 18, 4);
      b.ledge(1, 33, 28, 1);
      b.prop(6, 32, 'furnace');
      b.prop(24, 32, 'anvil');
      b.enemy(8, 15, 'brute');
      b.enemy(16, 32, 'brute', true);
      b.pickup(6, 8, 'heart', 'p_heart_af');
      b.lore(26, 32, 'tab_af_2');
      b.put(26, 20, 'f');
      b.put(3, 4, 'f');
    },
  },
  af_core: {
    opts: { title: 'The Molten Core' },
    design: (b) => {
      b.art(20, 15, ['aaaaaaaaaa']);
      b.ledge(20, 16, 10, 1);
      b.ledge(30, 13, 6, 3);
      b.art(36, 15, ['aaaaaaa']);
      b.ledge(36, 16, 7, 1);
      b.ledge(47, 13, 12, 3);
      b.plat(23, 11, 4);
      b.plat(38, 10, 4);
      b.ledge(52, 7, 6, 1);
      b.pickup(55, 6, 'relic', 'p_rel_ashen', 'ashen_core');
      b.pickup(33, 12, 'key', 'p_cog_2', 'cog_2');
      b.pickup(25, 10, 'blade', 'p_ore_4');
      b.enemy(50, 12, 'brute');
      b.enemy(30, 4, 'drone');
      b.spawn(8, 12, { k: 'enemy', t: 'spitter' });
      b.put(10, 5, 'f');
      b.put(44, 5, 'f');
    },
  },
  af_boss: {
    opts: { title: 'The Warden\'s Furnace' },
    design: (b) => {
      b.art(43, 14, ['FFFF', 'FFFF']);
      b.plat(8, 11, 6);
      b.plat(22, 9, 5);
      b.spawn(30, 15, { k: 'boss', t: 'ash_warden' });
      b.prop(4, 15, 'furnace');
      b.prop(55, 15, 'furnace');
    },
  },

  // ------------------------------------------------------------ Hollow Engine
  he_01: {
    opts: { title: 'Engine Threshold' },
    design: (b) => {
      b.ledge(1, 14, 8, 2);
      b.ledge(21, 14, 8, 2);
      b.put(5, 13, 'S');
      b.lore(24, 13, 'tab_he_1');
      b.prop(26, 13, 'machine');
      b.put(15, 4, 'f');
    },
  },
  he_02: {
    opts: { title: 'The Gear Galleries' },
    design: (b) => {
      b.ledge(1, 15, 11, 1);
      b.ledge(18, 15, 24, 1);
      b.ledge(48, 15, 11, 1);
      b.plat(22, 11, 5);
      b.plat(32, 11, 5);
      b.enemy(26, 14, 'gearwarden');
      b.enemy(50, 14, 'gearwarden');
      b.enemy(20, 14, 'arc_node');
      b.enemy(38, 14, 'arc_node');
      b.ledge(3, 8, 6, 1);
      b.pickup(5, 7, 'key', 'p_core_1', 'core_1');
      b.ledge(52, 6, 1, 4, 'H');
      b.ledge(53, 9, 6, 1);
      b.pickup(56, 8, 'lostrelic', 'p_lr_5', 'lr_5');
      b.plat(44, 9, 5);
      b.prop(30, 14, 'machine');
      b.put(14, 4, 'f');
      b.put(44, 4, 'f');
    },
  },
  he_pass: {
    opts: { title: 'Service Passage' },
    design: (b) => {
      b.ledge(1, 1, 10, 15);
      b.ledge(20, 1, 9, 15);
      b.put(15, 8, 'f');
    },
  },
  he_03: {
    opts: { title: 'The Piston Well' },
    design: (b) => {
      b.ledge(1, 33, 28, 1);
      b.npc(22, 32, 'unit9');
      b.plat(18, 29, 5);
      b.plat(8, 26, 5);
      b.plat(18, 23, 5);
      b.plat(8, 20, 5);
      b.spawn(4, 17, { k: 'crusher', w: 3, h: 2, dy: 6, period: 2.5 });
      b.pickup(25, 22, 'key', 'p_core_2', 'core_2');
      b.pickup(3, 32, 'heart', 'p_heart_he');
      b.enemy(10, 32, 'arc_node');
      b.enemy(20, 32, 'arc_node');
      b.enemy(14, 15, 'gearwarden');
      b.ledge(1, 16, 10, 1);
      b.ledge(20, 16, 9, 1);
      b.pickup(24, 15, 'shard', 'p_ms_21', 'ms_21');
      b.put(26, 27, 'f');
    },
  },
  he_04: {
    opts: { title: 'The Seal Door' },
    design: (b) => {
      b.ledge(1, 15, 11, 1);
      b.ledge(18, 15, 41, 1);
      b.spawn(10, 11, { k: 'trigger', id: 'seal_door', w: 10, h: 4, event: 'seal_door' });
      b.prop(15, 14, 'door_sealed', 'Three empty hollows in the door, shaped like seals: a tide, a star, a flower.');
      b.lore(26, 14, 'tab_he_2');
      b.pickup(52, 14, 'key', 'p_core_3', 'core_3');
      b.pickup(36, 9, 'relic', 'p_rel_twinmend', 'twin_mend');
      b.plat(34, 10, 5);
      b.enemy(30, 14, 'gearwarden', true);
      b.put(8, 5, 'f');
      b.put(50, 5, 'f');
    },
  },
  he_boss: {
    opts: { title: 'The Heart of the Engine' },
    design: (b) => {
      b.spawn(13, 1, { k: 'gate', id: 'he_boss_in', w: 4, h: 1, boss: true });
      b.plat(6, 11, 6);
      b.plat(48, 11, 6);
      b.spawn(30, 15, { k: 'boss', t: 'conductor' });
    },
  },
  he_fall: {
    opts: { title: 'The Last Descent', dark: 1 },
    design: (b) => {
      b.ledge(1, 1, 10, 40);
      b.ledge(20, 1, 9, 40);
      b.pickup(8, 47, 'vessel', 'p_vessel_he');
      b.ledge(4, 48, 6, 1);
      b.pickup(22, 45, 'shard', 'p_ms_14', 'ms_14');
      b.ledge(20, 46, 6, 1);
    },
  },

  // ------------------------------------------------------------ The Abyss
  ab_threshold: {
    opts: { title: 'The Edge of the Dream', dark: 1 },
    design: (b) => {
      b.ledge(1, 14, 10, 2);
      b.ledge(20, 14, 9, 2);
      b.put(24, 13, 'S');
      b.npc(6, 13, 'seraphel_echo');
      b.npc(9, 13, 'hush');
      b.lore(27, 13, 'tab_ab_1');
      b.put(15, 6, 'c');
    },
  },
  ab_01: {
    opts: { title: 'The Waking Dark', dark: 1 },
    design: (b) => {
      b.ledge(6, 13, 6, 3);
      b.ledge(22, 12, 5, 1);
      b.ledge(34, 13, 8, 3);
      b.plat(46, 10, 6);
      b.enemy(18, 15, 'maw');
      b.enemy(44, 15, 'maw');
      b.enemy(28, 15, 'dream_eater');
      b.pickup(24, 11, 'relic', 'p_rel_lifeleech', 'lifeleech_thorn');
      b.pickup(49, 9, 'heart', 'p_heart_ab');
      b.pickup(38, 12, 'shard', 'p_ms_15', 'ms_15');
      b.put(10, 5, 'c');
      b.put(40, 5, 'c');
    },
  },
  ab_02: {
    opts: { title: 'The Hall of Masks', dark: 1 },
    design: (b) => {
      b.prop(8, 15, 'masks_wall', 'Forty-one masks. The forty-second hook is empty, and the dust around it has been disturbed recently.');
      b.lore(20, 15, 'tab_ab_2');
      b.prop(15, 14, 'door_sealed');
      b.pickup(25, 15, 'shard', 'p_ms_16', 'ms_16');
      b.put(15, 5, 'c');
    },
  },
  ab_secret: {
    opts: { title: 'Where the First Wanderer Waits', secret: true, dark: 1 },
    design: (b) => {
      b.plat(6, 11, 6);
      b.plat(48, 11, 6);
      b.spawn(40, 15, { k: 'boss', t: 'first_wanderer' });
    },
  },
  ab_ante: {
    opts: { title: 'The Last Shrine', dark: 1 },
    design: (b) => {
      b.put(15, 15, 'S');
      b.prop(8, 15, 'statue_queen');
      b.prop(22, 15, 'flowers', 'Fresh flowers, here at the bottom of the world. The Mourner was here.');
      b.put(15, 6, 'c');
    },
  },
  ab_boss: {
    opts: { title: 'The Dreamer\'s Chamber', dark: 1 },
    design: (b) => {
      b.spawn(45, 15, { k: 'boss', t: 'gloam' });
      b.plat(12, 11, 6);
      b.plat(72, 11, 6);
    },
  },
  ab_heart: {
    opts: { title: 'The Heart of the Veil' },
    design: (b) => {
      b.spawn(15, 15, { k: 'ending', id: 'final' });
      b.put(6, 6, 'c');
      b.put(24, 6, 'c');
    },
  },

  // ------------------------------------------------------------ Starwell Observatory
  so_01: {
    opts: { title: 'Starwell Base' },
    design: (b) => {
      b.ledge(1, 15, 11, 1);
      b.ledge(18, 15, 11, 1);
      b.npc(6, 14, 'juno');
      b.put(15, 9, 'G');
      b.put(14, 3, 'G');
      b.lore(24, 14, 'tab_so_1');
      b.put(3, 6, 'c');
    },
  },
  so_02: {
    opts: { title: 'The Climbing Sky' },
    design: (b) => {
      b.ledge(1, 33, 11, 1);
      b.ledge(18, 33, 11, 1);
      b.put(15, 28, 'G');
      b.put(9, 22, 'G');
      b.put(16, 17, 'G');
      b.ledge(20, 16, 9, 1);
      b.put(10, 11, 'G');
      b.put(15, 5, 'G');
      b.ledge(2, 21, 5, 1);
      b.pickup(4, 20, 'relic', 'p_rel_feather', 'featherfall');
      b.ledge(20, 26, 5, 1);
      b.pickup(22, 25, 'heart', 'p_heart_so');
      b.enemy(22, 9, 'sentinel');
      b.enemy(6, 26, 'sentinel');
      b.put(26, 3, 'c');
      b.put(3, 12, 'c');
    },
  },
  so_obs: {
    opts: { title: 'The Observatory' },
    design: (b) => {
      b.put(6, 15, 'S');
      b.prop(16, 15, 'telescope', 'The great telescope still tracks something far above. The eyepiece is warm.');
      b.lore(11, 15, 'tab_so_2');
      b.enemy(22, 15, 'orrery_knight');
      b.ledge(20, 8, 8, 1);
      b.pickup(25, 7, 'lostrelic', 'p_lr_6', 'lr_6');
      b.pickup(22, 7, 'shard', 'p_ms_12', 'ms_12');
      b.plat(10, 11, 5);
      b.put(14, 4, 'c');
    },
  },
  so_boss: {
    opts: { title: 'The Starwell Crown' },
    design: (b) => {
      b.plat(26, 9, 8);
      b.plat(42, 11, 6);
      b.spawn(36, 15, { k: 'boss', t: 'astronomer' });
      for (const x of [6, 20, 40, 54]) b.put(x, 4, 'c');
    },
  },
};
