import type { Designs } from './index';



/** THE THRESHOLD and LANTERNWAKE: the opening descent and the hub village. */
export const THRESHOLD: Designs = {
  th_01: {
    opts: { title: 'Snowfall Ruins', enterFlag: 'seen_ruins' },
    design: (b) => {
      // Ruined surface terrace, snow falling from a sky that isn't there.
      b.art(1, 1, [
        '##########         ##########',
        '#######               #######',
        '####                     ####',
        '##                         ##',
      ]);
      b.ledge(1, 13, 8, 3);
      b.ledge(21, 12, 8, 4);
      b.ledge(10, 15, 3, 1);
      b.ledge(17, 15, 3, 1);
      b.put(2, 12, '@');
      b.prop(5, 12, 'statue', 'A statue of a lamplighter, its lantern raised toward a sky made of rock.');
      b.lore(7, 12, 'tab_th_1');
      b.prop(24, 11, 'grave');
      b.prop(26, 11, 'tree_dead', undefined, true);
      b.lore(22, 11, 'tab_th_3');
      b.spawn(1, 1, { k: 'trigger', id: 'opening', w: 9, h: 15, event: 'opening' });
      b.plat(10, 10, 3);
      b.plat(17, 10, 3);
    },
  },
  th_02: {
    opts: { title: 'The Long Fall' },
    design: (b) => {
      // A deep shaft with crumbling ledges; light leaks from a crack.
      b.ledge(1, 8, 7, 1);
      b.ledge(20, 8, 9, 1);
      b.plat(8, 11, 4);
      b.ledge(1, 14, 7, 1);
      b.plat(16, 15, 4);
      b.ledge(22, 18, 7, 1);
      b.plat(9, 20, 5);
      b.ledge(1, 23, 9, 1);
      b.plat(17, 25, 4);
      b.ledge(12, 28, 6, 1);
      b.ledge(1, 30, 6, 4);
      b.put(3, 13, 'L');
      b.put(25, 17, 'L');
      b.enemy(4, 22, 'husk');
      b.enemy(24, 7, 'moth');
      b.enemy(14, 18, 'moth');
      b.enemy(15, 32, 'husk');
      b.prop(3, 7, 'skeleton', 'Someone sat here a long time ago and decided not to go any further.');
      b.pickup(5, 7, 'shard', 'p_ms_01', 'ms_01');
      b.prop(26, 29, 'cart');
    },
  },
  th_secret: {
    opts: { secret: true, title: 'A Room That Waited' },
    design: (b) => {
      b.ledge(1, 9, 28, 8);
      b.prop(8, 8, 'masks_wall', 'Forty masks hang here in neat rows. One hook is empty. The empty hook is at exactly your height.');
      b.pickup(18, 8, 'key', 'p_mask_1', 'mask_1');
      b.pickup(22, 8, 'heart', 'p_heart_th');
      b.put(14, 4, 'c');
      b.put(25, 5, 'c');
    },
  },
  th_03: {
    opts: { title: 'First Shrine' },
    design: (b) => {
      b.ledge(1, 14, 10, 2);
      b.ledge(19, 14, 10, 2);
      b.put(22, 13, 'S');
      b.npc(26, 13, 'hush');
      b.pickup(6, 13, 'echo', 'p_echo_1', 'echo_1');
      b.prop(9, 13, 'bones');
      b.lore(3, 13, 'tab_th_2');
      b.put(8, 6, 'L');
      b.put(21, 6, 'L');
    },
  },
  th_boss: {
    opts: { title: 'The First Door', music: 'boss_gatekeeper' },
    design: (b) => {
      b.spawn(15, 15, { k: 'boss', t: 'gatekeeper' });
      b.prop(3, 15, 'banner');
      b.prop(26, 15, 'banner');
      b.put(2, 9, 'f');
      b.put(27, 9, 'f');
    },
  },
  lw_gate: {
    opts: { title: 'Lanternwake Gate' },
    design: (b) => {
      b.ledge(1, 15, 28, 1);
      b.lore(6, 14, 'tab_lw_2');
      b.npc(19, 14, 'rhoswen');
      b.prop(10, 14, 'bench');
      b.put(4, 6, 'L');
      b.put(25, 6, 'L');
      b.put(14, 9, 'L');
      b.prop(23, 14, 'sign', 'EAST: THE FOUNDRY ROAD. CLOSED BY ORDER OF THE WARDENS.');
    },
  },
  lw_square: {
    opts: { title: 'Lanternwake' },
    design: (b) => {
      // The village square under the Great Lamp.
      b.ledge(1, 15, 58, 1);
      b.prop(29, 14, 'great_lamp');
      b.npc(25, 14, 'old_wick');
      b.lore(33, 14, 'tab_lw_3');
      b.put(8, 14, 'S');
      b.put(15, 14, 'V');
      b.npc(4, 14, 'tamsin');
      b.npc(20, 14, 'quenna');
      b.prop(18, 14, 'table_plates', 'The Ember Inn\'s outdoor table. Every place is set. Quenna sets it every night, in case.');
      b.npc(37, 14, 'marrow');
      b.prop(34, 14, 'tent');
      b.lore(57, 14, 'tab_lw_1');
      // The four explorers return here once found.
      b.npc(49, 14, 'pell');
      b.npc(51, 14, 'dorran');
      b.npc(53, 14, 'ilka');
      b.npc(55, 14, 'castor');
      b.npc(11, 14, 'hush');
      // Houses: raised walkways and lanterns.
      b.plat(2, 10, 6);
      b.plat(48, 10, 4);
      b.ledge(52, 9, 7, 1);
      b.pickup(56, 8, 'shard', 'p_ms_02', 'ms_02');
      for (const x of [5, 12, 22, 36, 45, 55]) b.put(x, 7, 'L');
      b.prop(3, 14, 'well');
    },
  },
  lw_yard: {
    opts: { title: 'Training Yard' },
    design: (b) => {
      b.ledge(1, 15, 28, 1);
      b.spawn(8, 14, { k: 'dummy' });
      b.npc(12, 14, 'corvane');
      b.lore(5, 14, 'tab_lw_4');
      b.npc(19, 14, 'kettle');
      b.prop(21, 14, 'anvil');
      b.prop(23, 14, 'furnace');
      b.npc(26, 14, 'oriel');
      b.plat(14, 10, 6);
      b.put(17, 6, 'L');
      b.put(3, 7, 'L');
    },
  },
  lw_east: {
    opts: { title: 'Gallery Row' },
    design: (b) => {
      b.ledge(1, 15, 28, 1);
      b.npc(6, 14, 'ossian');
      b.prop(3, 14, 'statue_queen', 'A statue of a queen cradling something in her arms. Whatever it was has been chiselled away.');
      b.npc(10, 14, 'ysolde');
      // The Starwell climb: anchors high in the dark, out of reach without the Grapple.
      b.put(14, 9, 'G');
      b.put(18, 4, 'G');
      b.ledge(10, 6, 3, 1);
      b.ledge(20, 7, 3, 1);
      b.prop(16, 14, 'telescope', 'A broken telescope pointing straight up the shaft. Someone scratched "STILL THERE" on the barrel.');
      b.put(24, 7, 'L');
      b.pickup(11, 5, 'vessel', 'p_vessel_lw');
    },
  },
  lw_lower: {
    opts: { title: 'Underlane' },
    design: (b) => {
      // Old cellars beneath the square. The way down to the Warrens is a plain hole.
      b.ledge(1, 11, 7, 6);
      b.ledge(22, 11, 7, 6);
      b.plat(4, 7, 4);
      b.plat(22, 7, 4);
      b.prop(4, 10, 'sign', 'DOWN: THE WARRENS. THE GAPS BELOW ARE WIDE. RUN IF YOU MUST. DASH IF YOU CAN.');
      b.prop(25, 10, 'urn');
      b.prop(26, 10, 'urn');
      b.put(6, 3, 'L');
      b.put(24, 3, 'L');
      b.enemy(16, 6, 'moth');
      b.pickup(24, 6, 'shard', 'p_ms_17', 'ms_17');
    },
  },
  eh_hall: {
    opts: { title: 'Hall of Echoes' },
    design: (b) => {
      b.ledge(1, 15, 58, 1);
      b.lore(6, 14, 'tab_eh_1');
      b.put(3, 14, 'S');
      const ids = ['gatekeeper', 'weeping_root', 'mycelia', 'prism', 'bell_warden', 'ash_warden', 'archivist', 'thorn_saint', 'ormund', 'astronomer', 'crown', 'conductor', 'gloam', 'first_wanderer'];
      const xs = [9, 15, 21, 27, 33, 39, 51];
      ids.forEach((id, i) => {
        const x = xs[i % 7];
        const y = i < 7 ? 14 : 9;
        if (i >= 7) b.ledge(x - 2, 10, 5, 1);
        b.spawn(x, y, { k: 'challenge', id });
      });
      for (const x of [8, 22, 36, 50]) b.put(x, 4, 'c');
    },
  },
};
