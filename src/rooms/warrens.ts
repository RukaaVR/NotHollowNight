import type { Designs } from './index';

/** GLOAMSPORE WARRENS and LUMEN CAVERNS. */
export const WARRENS: Designs = {
  gs_01: {
    opts: { title: 'Sporefall' },
    design: (b) => {
      // Two thorny pits flank the landing. Only a dash crosses either.
      b.art(4, 15, ['^^^^^^^^', '########']);
      b.art(18, 15, ['^^^^^^^^', '########']);
      // Low ceilings over the pits: the only way across is a level dash.
      b.ledge(1, 1, 9, 10);
      b.ledge(20, 1, 9, 10);
      b.ledge(12, 15, 6, 1);
      b.enemy(15, 14, 'puffcap');
      b.prop(2, 15, 'mushroom');
      b.prop(27, 15, 'mushroom');
      b.put(6, 11, 'c');
      b.put(23, 11, 'c');
      b.prop(13, 14, 'sign', 'LEFT: THE CAPS. RIGHT: THE CAPS. WHICHEVER YOU CHOOSE, BREATHE SHALLOW.');
    },
  },
  gs_02: {
    opts: { title: 'Cap Hollows' },
    design: (b) => {
      b.ledge(1, 14, 7, 2);
      b.ledge(8, 12, 4, 4);
      b.plat(20, 11, 6);
      b.ledge(22, 14, 6, 2);
      b.plat(30, 9, 6);
      b.ledge(34, 13, 8, 3);
      b.plat(44, 10, 6);
      b.ledge(48, 14, 11, 2);
      b.art(2, 1, ['  ####       ####         ####          ###      ####  ']);
      b.enemy(10, 11, 'capling');
      b.enemy(24, 13, 'capling');
      b.enemy(25, 13, 'capling');
      b.enemy(28, 2, 'dropper');
      b.enemy(38, 12, 'bloatcap');
      b.enemy(46, 2, 'dropper');
      b.enemy(54, 13, 'puffcap');
      b.prop(36, 12, 'mushroom');
      b.prop(5, 13, 'mushroom');
      b.pickup(33, 8, 'shard', 'p_ms_04', 'ms_04');
      b.put(18, 6, 'c');
      b.put(41, 5, 'c');
    },
  },
  gs_03: {
    opts: { title: 'The Quiet Caps' },
    design: (b) => {
      b.ledge(18, 13, 11, 3);
      b.plat(8, 11, 5);
      b.ledge(20, 8, 5, 1);
      b.pickup(22, 7, 'lostrelic', 'p_lr_2', 'lr_2');
      b.pickup(26, 12, 'heart', 'p_heart_gs1');
      b.enemy(14, 15, 'puffcap');
      b.enemy(24, 12, 'puffcap');
      b.prop(10, 15, 'bed', 'A bedroll, carefully made, sprouting mushrooms. Whoever slept here dreamed for a very long time.');
      b.put(15, 6, 'c');
    },
  },
  gs_west: {
    opts: { title: 'Threadfall Chimney' },
    design: (b) => {
      // A chimney of sheer walls beneath the courier's tomb. Climbing back requires a grip.
      b.ledge(1, 1, 12, 11);
      b.ledge(17, 1, 12, 11);
      b.ledge(1, 15, 3, 1);
      b.plat(6, 13, 4);
      b.enemy(20, 15, 'capling');
      b.enemy(23, 15, 'capling');
      b.pickup(3, 14, 'vessel', 'p_vessel_gs');
      b.put(14, 13, 'c');
    },
  },
  gs_camp: {
    opts: { title: 'Surveyor\'s Camp' },
    design: (b) => {
      b.put(20, 15, 'S');
      b.npc(6, 15, 'dorran');
      b.prop(9, 15, 'tent');
      b.prop(24, 15, 'cart');
      b.lore(4, 15, 'tab_gs_1');
      b.put(22, 8, 'L');
      b.put(6, 8, 'L');
    },
  },
  gs_04: {
    opts: { title: 'The Great Cap' },
    design: (b) => {
      // A cathedral of mushrooms. Their caps are platforms; their stalks are walls.
      b.art(10, 10, [
        '==========',
        '    ##    ',
        '    ##    ',
        '    ##    ',
        '    ##    ',
        '    ##    ',
      ]);
      b.ledge(7, 13, 3, 3);
      b.ledge(20, 13, 2, 3);
      b.art(34, 11, [
        '==========',
        '    ##    ',
        '    ##    ',
        '    ##    ',
        '    ##    ',
      ]);
      b.ledge(31, 13, 3, 3);
      b.ledge(44, 13, 3, 3);
      b.plat(24, 9, 5);
      b.plat(47, 11, 5);
      b.plat(4, 10, 4);
      b.lore(30, 15, 'tab_gs_2', 'mural');
      b.enemy(12, 15, 'bloatcap');
      b.enemy(26, 15, 'capling');
      b.enemy(27, 15, 'capling');
      b.enemy(44, 15, 'puffcap', true);
      b.enemy(52, 15, 'dropper');
      b.pickup(14, 9, 'blade', 'p_ore_1');
      b.pickup(38, 10, 'shard', 'p_ms_19', 'ms_19');
      b.prop(8, 15, 'mushroom');
      b.prop(55, 15, 'mushroom');
      b.put(20, 4, 'c');
      b.put(46, 5, 'c');
    },
  },
  gs_boss: {
    opts: { title: 'The Matron\'s Bed' },
    design: (b) => {
      b.plat(10, 11, 6);
      b.plat(44, 11, 6);
      b.spawn(36, 15, { k: 'boss', t: 'mycelia' });
      b.prop(4, 15, 'mushroom');
      b.prop(55, 15, 'mushroom');
      b.put(30, 4, 'c');
    },
  },
  gs_drop: {
    opts: { title: 'The Long Root' },
    design: (b) => {
      b.ledge(1, 1, 8, 15);
      b.ledge(21, 1, 8, 15);
      b.prop(10, 15, 'bones');
      b.put(11, 8, 'c');
    },
  },

  // -------------------------------------------------------------- Lumen Caverns
  lc_01: {
    opts: { title: 'Lumen Gate' },
    design: (b) => {
      b.ledge(1, 13, 8, 3);
      b.ledge(21, 13, 8, 3);
      b.put(5, 12, 'S');
      b.prop(25, 12, 'crystal_big');
      b.put(3, 6, 'c');
      b.put(26, 6, 'c');
      b.lore(7, 12, 'tab_lc_2');
    },
  },
  lc_grotto: {
    opts: { title: 'Singing Grotto' },
    design: (b) => {
      b.ledge(10, 14, 10, 2);
      b.npc(6, 15, 'ilka');
      b.npc(14, 13, 'flicker');
      b.npc(22, 15, 'hollis');
      b.prop(18, 13, 'crystal_big');
      b.put(4, 8, 'c');
      b.put(25, 8, 'c');
      b.pickup(15, 6, 'shard', 'p_ms_07', 'ms_07');
      b.plat(13, 9, 4);
    },
  },
  lc_02: {
    opts: { title: 'Prism Run' },
    design: (b) => {
      // A crystal gate on the path west answers only to a thrown Lance.
      b.ledge(1, 14, 10, 2);
      b.ledge(12, 1, 2, 11);
      b.spawn(12, 12, { k: 'gate', id: 'lc_switch', w: 2, h: 4 });
      b.spawn(5, 8, { k: 'switch', id: 'lc_switch' });
      b.plat(20, 11, 5);
      b.ledge(28, 13, 6, 3);
      b.plat(37, 10, 5);
      b.ledge(44, 13, 6, 3);
      b.ledge(52, 6, 7, 1);
      b.ledge(51, 2, 1, 4, 'H');
      b.pickup(57, 5, 'key', 'p_beads', 'prayer_beads');
      b.pickup(3, 13, 'relic', 'p_rel_storm', 'storm_lance');
      b.enemy(30, 12, 'prism_mite');
      b.enemy(40, 6, 'wisp');
      b.enemy(47, 12, 'prism_mite');
      b.enemy(22, 5, 'wisp');
      b.put(16, 5, 'c');
      b.put(34, 4, 'c');
      b.put(50, 4, 'c');
      b.plat(48, 9, 4);
    },
  },
  lc_03: {
    opts: { title: 'Glass Steps' },
    design: (b) => {
      b.ledge(24, 13, 5, 3);
      b.art(5, 15, ['^^^^^^^^^^^^^^^^^^^', '###################']);
      b.ledge(1, 13, 4, 3);
      b.art(7, 11, ['CC']);
      b.art(12, 10, ['CC']);
      b.art(17, 9, ['CC']);
      b.art(21, 7, ['CC']);
      b.art(15, 5, ['CCC']);
      b.ledge(6, 4, 4, 1);
      b.pickup(7, 3, 'key', 'p_wick_lc', 'wick_lc');
      b.enemy(26, 12, 'prism_mite');
      b.put(3, 6, 'c');
      b.put(26, 5, 'c');
      b.pickup(2, 12, 'shard', 'p_ms_22', 'ms_22');
    },
  },
  lc_dark1: {
    opts: { title: 'The Umbral Mouth', dark: 2 },
    design: (b) => {
      b.ledge(1, 13, 7, 3);
      b.ledge(20, 12, 9, 4);
      b.plat(9, 9, 4);
      b.put(4, 12, 'c');
      b.put(24, 11, 'c');
      b.lore(6, 12, 'tab_lc_1');
      b.enemy(14, 15, 'prism_mite');
      b.enemy(26, 11, 'wisp');
    },
  },
  lc_dark2: {
    opts: { title: 'Heartdark', dark: 2 },
    design: (b) => {
      // The deepest dark of the caverns. The miners' heart-lantern lies at the far end.
      b.ledge(1, 12, 6, 4);
      b.ledge(7, 14, 4, 2);
      b.ledge(18, 13, 8, 3);
      b.plat(28, 10, 4);
      b.ledge(33, 13, 9, 3);
      b.plat(44, 10, 5);
      b.ledge(50, 13, 9, 3);
      b.pickup(3, 11, 'ability', 'p_ab_lantern', 'lantern');
      b.prop(5, 11, 'skeleton', 'A miner, curled around nothing. Their lantern rolled away from their hand. It is still lit.');
      b.enemy(37, 12, 'geode');
      b.enemy(22, 12, 'prism_mite');
      b.enemy(53, 12, 'prism_mite');
      b.put(22, 6, 'c');
      b.put(54, 7, 'c');
      b.pickup(46, 9, 'relic', 'p_rel_mirror', 'mirror_veil');
    },
  },
  lc_boss: {
    opts: { title: 'The Prism Throat' },
    design: (b) => {
      b.plat(8, 11, 6);
      b.plat(24, 9, 5);
      b.plat(50, 11, 6);
      b.spawn(30, 15, { k: 'boss', t: 'prism' });
      b.put(4, 6, 'c');
      b.put(55, 6, 'c');
    },
  },
  lc_thorn: {
    opts: { title: 'Briar Seam' },
    design: (b) => {
      // A corridor choked with thorns. Shadow Step slips straight through them.
      b.ledge(1, 1, 28, 10);
      b.art(11, 11, ['TTT', 'TTT', 'TTT', 'TTT']);
      b.art(19, 11, ['TT', 'TT', 'TT', 'TT']);
      b.put(5, 12, 'c');
      b.pickup(16, 15, 'shard', 'p_ms_23', 'ms_23');
    },
  },
};
