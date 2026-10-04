import type { Designs } from './index';

/** MOURNING GROVE: a royal forest dragged underground, still grieving. */
export const GROVE: Designs = {
  mg_01: {
    opts: { title: 'Rootgate' },
    design: (b) => {
      b.art(1, 1, [
        '####     ####       ###   ####',
        '##         #          #     ##',
        '#                            ',
      ]);
      b.ledge(8, 13, 5, 3);
      b.ledge(18, 12, 4, 4);
      b.plat(13, 10, 4);
      b.prop(4, 15, 'tree_dead');
      b.prop(25, 15, 'tree_dead', undefined, true);
      b.enemy(15, 15, 'rootling');
      b.enemy(24, 15, 'rootling');
      b.put(20, 6, 'c');
      b.pickup(14, 9, 'fragment', 'p_frag_mg1', '40');
    },
  },
  mg_02: {
    opts: { title: 'The Weeping Wood' },
    design: (b) => {
      // A long forest floor of knotted roots with a hollow in the middle.
      b.ledge(1, 14, 10, 2);
      b.ledge(20, 13, 6, 3);
      b.ledge(30, 14, 8, 2);
      b.ledge(44, 12, 6, 4);
      b.plat(24, 9, 5);
      b.plat(36, 9, 6);
      b.plat(50, 9, 5);
      b.ledge(52, 6, 7, 1);
      b.prop(6, 13, 'grave', 'A small grave. No name. Someone has scratched a lantern into the stone.');
      b.prop(8, 13, 'flowers', 'Fresh flowers. Still wet with dew, though there is no dew down here.');
      b.npc(4, 13, 'mourner');
      b.lore(33, 13, 'tab_mg_2');
      b.enemy(23, 12, 'husk');
      b.enemy(40, 15, 'thornback');
      b.enemy(47, 8, 'shade');
      b.enemy(56, 15, 'rootling');
      b.prop(28, 15, 'tree_dead');
      b.prop(42, 15, 'tree_dead', undefined, true);
      b.pickup(56, 5, 'heart', 'p_heart_mg1');
      b.put(10, 5, 'c');
      b.put(37, 5, 'c');
    },
  },
  mg_03: {
    opts: { title: 'Canopy Steps' },
    design: (b) => {
      b.art(1, 1, [
        '##############################',
        '#####        ####       ######',
      ]);
      b.ledge(4, 13, 4, 3);
      b.ledge(21, 13, 3, 3);
      b.ledge(16, 11, 3, 1);
      b.ledge(11, 11, 3, 1);
      b.ledge(19, 8, 3, 1);
      b.ledge(24, 6, 4, 1);
      b.ledge(12, 5, 4, 1);
      b.art(10, 15, ['^^^^^^^^^^']);
      b.ledge(10, 16, 10, 1);
      b.pickup(13, 4, 'key', 'p_wick_mg', 'wick_mg');
      b.enemy(18, 6, 'shade');
      b.enemy(24, 15, 'husk');
      b.lore(6, 12, 'tab_mg_1');
      b.put(25, 5, 'c');
    },
  },
  mg_04: {
    opts: { title: 'Thornpit' },
    design: (b) => {
      // A pit of thorns too wide to jump — only a Veil Dash crosses it.
      b.ledge(1, 13, 3, 3);
      b.art(4, 15, ['^^^^^^^^']);
      b.ledge(4, 16, 8, 1);
      b.ledge(12, 13, 1, 3);
      b.ledge(19, 13, 10, 3);
      b.prop(23, 12, 'sign', 'WEST: THE MOTHER TREE. THE THORNS ARE HER TEARS. DO NOT FALL IN.');
      b.lore(26, 12, 'tab_mg_3');
      b.enemy(21, 12, 'rootling');
      b.put(8, 6, 'c');
      b.put(22, 6, 'c');
    },
  },
  mg_boss: {
    opts: { title: 'The Mother Tree' },
    design: (b) => {
      b.plat(8, 11, 6);
      b.plat(46, 11, 6);
      b.plat(18, 8, 5);
      b.plat(37, 8, 5);
      b.spawn(30, 15, { k: 'boss', t: 'weeping_root' });
      b.prop(3, 15, 'flowers');
      b.prop(56, 15, 'flowers');
    },
  },
  mg_hollow: {
    opts: { title: 'Pell\'s Hollow' },
    design: (b) => {
      b.ledge(1, 14, 8, 2);
      b.ledge(21, 14, 8, 2);
      b.npc(5, 13, 'pell');
      b.prop(24, 13, 'cart', 'An expedition cart, overturned. The maps inside have been chewed by roots.');
      b.pickup(26, 13, 'shard', 'p_ms_03', 'ms_03');
      b.enemy(16, 15, 'rootling');
      b.put(6, 5, 'L');
    },
  },
  mg_shrine: {
    opts: { title: 'Grove Shrine' },
    design: (b) => {
      b.put(8, 15, 'S');
      b.npc(14, 15, 'hollis');
      b.npc(21, 15, 'ysolde');
      b.prop(25, 15, 'flowers');
      b.plat(10, 10, 10);
      b.pickup(14, 9, 'relic', 'p_rel_seers', 'seers_lens');
      b.put(15, 5, 'L');
      b.put(4, 8, 'c');
    },
  },
  mg_dash: {
    opts: { title: 'Courier\'s Rest' },
    design: (b) => {
      // The Veil Dash rests on a courier's tomb, guarded by a knight of bark.
      b.ledge(1, 14, 4, 2);
      b.pickup(3, 13, 'ability', 'p_ab_dash', 'dash');
      b.enemy(9, 15, 'bark_knight', true, 'mg_knight');
      b.prop(6, 15, 'grave', 'HERE LIES A COURIER OF ILVANE. SHE WAS NEVER LATE. SHE IS NOT LATE NOW.');
      b.ledge(20, 12, 9, 4);
      b.pickup(26, 11, 'fragment', 'p_frag_mg2', '80');
      b.put(15, 5, 'c');
      b.prop(23, 11, 'statue');
    },
  },
  mg_deep: {
    opts: { title: 'Rootdeep' },
    design: (b) => {
      b.ledge(1, 14, 4, 2);
      b.art(5, 15, ['^^^^^^']);
      b.ledge(5, 16, 6, 1);
      b.ledge(11, 12, 3, 4);
      b.ledge(19, 13, 6, 3);
      b.ledge(30, 10, 5, 1);
      b.art(25, 15, ['^^^^^^^^^^^^^']);
      b.ledge(25, 16, 13, 1);
      b.ledge(38, 13, 4, 3);
      b.plat(44, 10, 5);
      b.ledge(50, 13, 9, 3);
      b.pickup(32, 9, 'relic', 'p_rel_gravebloom', 'gravebloom');
      b.pickup(3, 13, 'lostrelic', 'p_lr_1', 'lr_1');
      b.enemy(21, 12, 'thornback');
      b.enemy(46, 8, 'shade');
      b.enemy(54, 12, 'husk');
      b.put(31, 5, 'c');
      b.put(12, 6, 'c');
    },
  },
  mg_wall: {
    opts: { title: 'The Sunken Stair' },
    design: (b) => {
      // A ruined stair descending toward the Drowned City, sealed by a crystal ward.
      b.plat(10, 4, 10);
      b.ledge(19, 16, 10, 1);
      b.plat(15, 13, 3);
      b.plat(9, 10, 4);
      b.plat(13, 7, 3);
      b.plat(4, 9, 4);
      b.plat(9, 28, 4);
      b.plat(14, 25, 4);
      b.plat(9, 22, 4);
      b.plat(14, 19, 4);
      b.ledge(1, 32, 11, 1);
      b.ledge(18, 32, 11, 1);
      b.spawn(24, 12, { k: 'switch', id: 'dc_seal' });
      b.prop(23, 15, 'sign', 'BELOW: THE DROWNED CITY. THE WARD ANSWERS ONLY TO A THROWN LIGHT.');
      b.put(3, 20, 'L');
      b.put(26, 25, 'L');
      b.enemy(22, 22, 'shade');
      b.pickup(5, 8, 'shard', 'p_ms_18', 'ms_18');
    },
  },
};
