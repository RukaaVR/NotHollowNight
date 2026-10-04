import type { Designs } from './index';

/** THE DROWNED CITY, THE SUNKEN ARCHIVE and THE BLACK RESERVOIR. */
export const DROWNED: Designs = {
  dc_01: {
    opts: { title: 'Rooftops of the Drowned City' },
    design: (b) => {
      b.ledge(19, 12, 10, 4);
      b.ledge(6, 13, 5, 3);
      b.put(24, 11, 'S');
      b.prop(8, 12, 'clock', 'A clock in a rooftop tower. A quarter past eleven. You somehow know it has always been a quarter past eleven.');
      b.put(3, 5, 'L');
      b.put(26, 5, 'L');
      b.enemy(3, 15, 'hound');
    },
  },
  dc_square: {
    opts: { title: 'The Drowned Square' },
    design: (b) => {
      b.water(1, 14, 58, 2, 'w');
      b.ledge(20, 11, 4, 1);
      b.ledge(36, 11, 4, 1);
      b.ledge(26, 8, 8, 1);
      b.spawn(30, 2, { k: 'prop', t: 'quest_bell', text: 'bell_2' });
      b.prop(10, 15, 'fountain', 'A fountain, still running. The water flows upward.');
      b.prop(48, 15, 'statue');
      b.lore(15, 15, 'tab_dc_2');
      b.enemy(22, 15, 'sentry');
      b.enemy(42, 15, 'sentry');
      b.enemy(32, 6, 'imp');
      b.pickup(28, 7, 'shard', 'p_ms_06', 'ms_06');
      b.put(8, 5, 'L');
      b.put(52, 5, 'L');
    },
  },
  dc_streets: {
    opts: { title: 'Canal Street' },
    design: (b) => {
      // Black canals cut the street. Jump them now; swim them later.
      b.ledge(1, 13, 6, 3);
      b.ledge(7, 14, 15, 2);
      b.art(22, 14, ['~~~~~', '~~~~~']);
      b.ledge(27, 14, 10, 2);
      b.art(37, 14, ['~~~~~', '~~~~~']);
      b.ledge(42, 14, 17, 2);
      b.plat(23, 9, 3);
      b.plat(38, 9, 3);
      b.ledge(30, 6, 5, 1);
      b.pickup(32, 5, 'blade', 'p_ore_2');
      b.enemy(12, 13, 'hound');
      b.enemy(31, 13, 'sentry');
      b.enemy(24, 14, 'eel');
      b.enemy(50, 13, 'hound');
      b.prop(18, 13, 'cart');
      b.prop(46, 13, 'boat', 'A boat moored to a lamp post, waiting for a tide that will never come.');
      b.put(10, 5, 'L');
      b.put(48, 5, 'L');
    },
  },
  dc_hall: {
    opts: { title: 'The Banquet Hall' },
    design: (b) => {
      b.prop(8, 15, 'table_plates', 'Two hundred places set for the prince\'s banquet. The food is perfectly preserved. No one ever sat down.');
      b.prop(20, 15, 'table_plates', 'A child\'s chair at the head of the table, lower than the others, with a cushion embroidered with a lantern.');
      b.prop(14, 15, 'chair');
      b.lore(26, 15, 'tab_dc_3');
      b.npc(4, 15, 'ambrose');
      b.plat(10, 11, 10);
      b.put(8, 5, 'L');
      b.put(21, 5, 'L');
      b.enemy(16, 9, 'imp');
    },
  },
  dc_cathedral: {
    opts: { title: 'Cathedral of Hours' },
    design: (b) => {
      b.ledge(1, 12, 8, 4);
      b.plat(12, 11, 5);
      b.ledge(18, 8, 4, 1);
      b.ledge(4, 6, 5, 1);
      b.spawn(19, 2, { k: 'prop', t: 'quest_bell', text: 'bell_3' });
      b.pickup(5, 11, 'key', 'p_wick_dc', 'wick_dc');
      b.pickup(6, 5, 'relic', 'p_rel_echoheart', 'echo_heart');
      b.prop(24, 15, 'altar', 'An altar to the Hours. Each candle marks one. All of them are the same candle.');
      b.enemy(14, 15, 'sentry');
      b.enemy(10, 4, 'imp');
      b.put(15, 4, 'L');
    },
  },
  dc_tower: {
    opts: { title: 'The Clocktower' },
    design: (b) => {
      // A tall bell tower. Bell one hangs at the very top.
      b.ledge(1, 16, 8, 1);
      b.plat(12, 30, 5);
      b.ledge(20, 27, 6, 1);
      b.plat(8, 24, 6);
      b.plat(18, 21, 5);
      b.ledge(1, 33, 28, 1);
      b.plat(10, 13, 5);
      b.ledge(22, 11, 6, 1);
      b.plat(4, 8, 6);
      b.spawn(24, 4, { k: 'prop', t: 'quest_bell', text: 'bell_1' });
      b.ledge(20, 7, 8, 1);
      b.prop(14, 32, 'clock');
      b.enemy(18, 20, 'imp');
      b.enemy(8, 6, 'imp');
      b.enemy(22, 26, 'sentry');
      b.put(26, 18, 'L');
      b.put(3, 28, 'L');
      b.pickup(26, 6, 'heart', 'p_heart_dc');
    },
  },
  dc_attic: {
    opts: { title: 'Scout\'s Attic' },
    design: (b) => {
      b.ledge(1, 14, 10, 2);
      b.ledge(19, 14, 10, 2);
      b.npc(5, 13, 'castor');
      b.lore(24, 13, 'tab_dc_1');
      b.prop(8, 13, 'books');
      b.put(15, 4, 'L');
      b.pickup(26, 13, 'shard', 'p_ms_05', 'ms_05');
    },
  },
  dc_boss: {
    opts: { title: 'The Hour Square' },
    design: (b) => {
      b.plat(8, 11, 6);
      b.plat(46, 11, 6);
      b.plat(26, 8, 8);
      b.spawn(36, 15, { k: 'boss', t: 'bell_warden' });
      b.put(4, 5, 'L');
      b.put(55, 5, 'L');
    },
  },
  dc_belfry: {
    opts: { title: 'The Belfry', secret: true },
    design: (b) => {
      b.pickup(10, 15, 'echo', 'p_echo_3', 'echo_3');
      b.pickup(18, 15, 'relic', 'p_rel_toll', 'tolling_heart');
      b.prop(14, 15, 'ship_bell', 'The great Hour Bell, cracked down the middle. It rang one last time when you struck the others.');
      b.put(14, 6, 'L');
    },
  },
  dc_deep: {
    opts: { title: 'The Flooded Underway' },
    design: (b) => {
      b.ledge(1, 1, 12, 3);
      b.ledge(17, 1, 42, 3);
      b.water(1, 4, 58, 12);
      b.water(13, 1, 4, 3);
      b.ledge(20, 9, 6, 2);
      b.ledge(34, 6, 3, 6);
      b.enemy(24, 13, 'eel');
      b.enemy(50, 8, 'eel');
      b.pickup(22, 8, 'vessel', 'p_vessel_dc');
      b.put(8, 5, 'c');
    },
  },

  // ------------------------------------------------------------ Sunken Archive
  sa_01: {
    opts: { title: 'Archive Landing' },
    design: (b) => {
      b.water(18, 12, 11, 4);
      b.ledge(1, 15, 17, 1);
      b.put(8, 14, 'S');
      b.prop(4, 14, 'bookshelf');
      b.lore(12, 14, 'tab_sa_1');
      b.put(14, 6, 'L');
    },
  },
  sa_stacks: {
    opts: { title: 'The Endless Stacks' },
    design: (b) => {
      b.ledge(18, 16, 11, 1);
      b.plat(12, 13, 5);
      b.plat(4, 10, 6);
      b.ledge(20, 9, 4, 7);
      b.plat(4, 19, 6);
      b.plat(12, 19, 4);
      b.plat(18, 22, 6);
      b.plat(13, 26, 4);
      b.plat(6, 26, 5);
      b.plat(18, 29, 5);
      b.ledge(24, 26, 5, 1);
      b.prop(8, 15, 'bookshelf');
      b.prop(26, 15, 'bookshelf');
      b.enemy(6, 8, 'scribe');
      b.enemy(14, 20, 'page_swarm');
      b.enemy(20, 32, 'ink_wraith');
      b.put(15, 5, 'L');
      b.put(3, 24, 'L');
      b.pickup(22, 8, 'shard', 'p_ms_09', 'ms_09');
    },
  },
  sa_vault: {
    opts: { title: 'Restricted Section', secret: true },
    design: (b) => {
      b.pickup(16, 15, 'key', 'p_mask_2', 'mask_2');
      b.pickup(22, 15, 'shard', 'p_ms_24', 'ms_24');
      b.prop(8, 15, 'bookshelf');
      b.prop(12, 15, 'books', 'A sealed letter in a careful hand, addressed to the Queen. It was never sent.');
      b.put(14, 6, 'c');
    },
  },
  sa_reading: {
    opts: { title: 'The Reading Room' },
    design: (b) => {
      b.ledge(1, 15, 10, 1);
      b.plat(20, 11, 8);
      b.ledge(30, 13, 8, 3);
      b.plat(48, 10, 6);
      b.water(38, 14, 4, 2, 'w');
      b.npc(6, 14, 'leaflet');
      b.lore(24, 15, 'tab_sa_3');
      b.lore(33, 12, 'tab_sa_2');
      b.pickup(51, 9, 'relic', 'p_rel_hunters', 'hunters_mark');
      b.enemy(16, 15, 'ink_wraith');
      b.enemy(54, 15, 'ink_wraith');
      b.enemy(36, 4, 'page_swarm');
      b.prop(28, 15, 'bookshelf');
      b.put(10, 5, 'L');
      b.put(34, 5, 'L');
      b.put(54, 5, 'L');
    },
  },
  sa_boss: {
    opts: { title: 'The Unread Stacks' },
    design: (b) => {
      b.plat(8, 11, 6);
      b.plat(46, 11, 6);
      b.plat(26, 8, 6);
      b.spawn(20, 15, { k: 'boss', t: 'archivist' });
      b.prop(4, 15, 'bookshelf');
      b.prop(56, 15, 'bookshelf');
    },
  },

  // ------------------------------------------------------------ Black Reservoir
  br_01: {
    opts: { title: 'The Still Shore' },
    design: (b) => {
      b.water(12, 14, 6, 2);
      b.ledge(1, 15, 11, 1);
      b.ledge(18, 15, 11, 1);
      b.put(6, 14, 'S');
      b.npc(22, 14, 'calder');
      b.prop(25, 14, 'boat');
      b.lore(9, 14, 'tab_br_1');
      b.put(4, 6, 'L');
      b.put(26, 6, 'L');
    },
  },
  br_grotto: {
    opts: { title: 'A Dry Grotto', secret: true },
    design: (b) => {
      b.pickup(12, 15, 'echo', 'p_echo_2', 'echo_2');
      b.pickup(20, 15, 'heart', 'p_heart_br');
      b.put(16, 6, 'c');
      b.prop(6, 15, 'skeleton', 'Someone hid here when the dam broke, holding a recording crystal to their chest.');
    },
  },
  br_sea: {
    opts: { title: 'The Black Reservoir' },
    design: (b) => {
      b.water(1, 11, 58, 5);
      b.ledge(1, 11, 5, 1);
      b.ledge(54, 11, 5, 1);
      b.ledge(10, 9, 5, 1);
      b.ledge(20, 8, 4, 1);
      b.ledge(29, 9, 5, 1);
      b.ledge(39, 8, 4, 1);
      b.ledge(47, 9, 4, 1);
      b.pickup(30, 15, 'relic', 'p_rel_tide', 'tidecaller');
      b.enemy(12, 8, 'coralback');
      b.enemy(31, 8, 'coralback');
      b.enemy(20, 13, 'lurker');
      b.enemy(42, 13, 'lurker');
      b.enemy(36, 14, 'eel');
      b.put(22, 4, 'c');
      b.put(41, 4, 'c');
      b.pickup(48, 8, 'shard', 'p_ms_11', 'ms_11');
    },
  },
  br_wards: {
    opts: { title: 'The Warded Stair' },
    design: (b) => {
      b.ledge(1, 15, 9, 1);
      b.ledge(20, 15, 9, 1);
      b.art(10, 10, ['PPPPPPPPPP']);
      b.art(10, 11, ['P        P', 'P        P', 'P        P', 'P        P']);
      b.lore(4, 14, 'tab_br_2');
      b.put(15, 5, 'c');
    },
  },
  br_boss: {
    opts: { title: 'Ormund\'s Rest' },
    design: (b) => {
      b.water(1, 12, 58, 4);
      b.ledge(4, 9, 7, 1);
      b.ledge(20, 7, 6, 1);
      b.ledge(34, 7, 6, 1);
      b.ledge(49, 9, 7, 1);
      b.ledge(27, 10, 6, 1);
      b.spawn(30, 15, { k: 'boss', t: 'ormund' });
      b.put(8, 4, 'c');
      b.put(52, 4, 'c');
    },
  },
  br_deep: {
    opts: { title: 'The Reservoir Floor', dark: 1 },
    design: (b) => {
      b.water(1, 1, 58, 15);
      b.ledge(20, 6, 3, 10);
      b.ledge(36, 1, 3, 9);
      b.pickup(10, 14, 'lostrelic', 'p_lr_4', 'lr_4');
      b.pickup(30, 14, 'key', 'p_mask_3', 'mask_3');
      b.pickup(54, 4, 'blade', 'p_ore_3');
      b.enemy(28, 8, 'eel');
      b.enemy(48, 12, 'eel');
      b.enemy(12, 6, 'eel');
      b.put(30, 3, 'c');
      b.put(50, 13, 'c');
    },
  },
};
