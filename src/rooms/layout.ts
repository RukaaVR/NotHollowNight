import type { LayoutEntry, LinkDef } from './builder';

/** The physical arrangement of the Veil, in screen units (30×17 tiles). */
const R = (id: string, ux: number, uy: number, uw = 1, uh = 1): LayoutEntry => ({ id, region: id.split('_')[0], ux, uy, uw, uh });

export const LAYOUT: LayoutEntry[] = [
  // Threshold
  R('th_01', 10, 0), R('th_02', 10, 1, 1, 2), R('th_secret', 9, 1), R('th_03', 11, 2), R('th_boss', 11, 3),
  // Lanternwake
  R('lw_gate', 11, 4), R('lw_square', 9, 4, 2, 1), R('lw_yard', 8, 4), R('lw_east', 12, 4), R('lw_lower', 10, 5),
  // Hall of Echoes
  R('eh_hall', 8, 3, 2, 1),
  // Starwell
  R('so_01', 12, 3), R('so_02', 12, 1, 1, 2), R('so_obs', 13, 1), R('so_boss', 12, 0, 2, 1),
  // Mourning Grove
  R('mg_01', 7, 4), R('mg_02', 5, 4, 2, 1), R('mg_03', 4, 4), R('mg_04', 3, 4), R('mg_boss', 1, 4, 2, 1),
  R('mg_hollow', 5, 5), R('mg_shrine', 6, 5), R('mg_dash', 7, 5), R('mg_deep', 3, 5, 2, 1), R('mg_wall', 2, 5, 1, 2),
  // Gloamspore Warrens
  R('gs_01', 10, 6), R('gs_02', 8, 6, 2, 1), R('gs_03', 11, 6), R('gs_west', 7, 6), R('gs_camp', 8, 7), R('gs_04', 9, 7, 2, 1),
  R('gs_boss', 11, 7, 2, 1), R('gs_drop', 11, 8),
  // Lumen Caverns
  R('lc_01', 11, 9), R('lc_grotto', 10, 9), R('lc_02', 8, 9, 2, 1), R('lc_03', 7, 9), R('lc_dark1', 11, 10), R('lc_dark2', 9, 10, 2, 1),
  R('lc_boss', 8, 11, 2, 1), R('lc_thorn', 10, 11),
  // Thorn Chapel
  R('tc_gate', 11, 11), R('tc_nave', 12, 11, 2, 1), R('tc_shrine', 14, 11), R('tc_spire', 14, 9, 1, 2), R('tc_boss', 12, 12, 2, 1),
  // Veiled Garden
  R('vg_01', 14, 12), R('vg_02', 15, 12, 2, 1), R('vg_03', 16, 13), R('vg_hidden', 15, 13), R('vg_boss', 15, 14, 2, 1),
  // Ashen Foundry
  R('af_entry', 13, 4), R('af_halls', 14, 4, 2, 1), R('af_lift', 14, 5, 1, 3), R('af_deep', 14, 8), R('af_climb', 15, 5, 1, 4),
  R('af_forge', 16, 4, 1, 2), R('af_core', 16, 6, 2, 1), R('af_boss', 16, 7, 2, 1),
  // Hollow Engine
  R('he_01', 17, 8), R('he_02', 18, 8, 2, 1), R('he_pass', 18, 9), R('he_03', 19, 9, 1, 2), R('he_04', 17, 10, 2, 1),
  R('he_boss', 17, 11, 2, 1), R('he_fall', 17, 12, 1, 3),
  // The Abyss
  R('ab_threshold', 17, 15), R('ab_01', 15, 15, 2, 1), R('ab_02', 14, 15), R('ab_secret', 14, 16, 2, 1), R('ab_ante', 13, 15),
  R('ab_boss', 10, 15, 3, 1), R('ab_heart', 9, 15),
  // Drowned City
  R('dc_01', 2, 7), R('dc_square', 0, 7, 2, 1), R('dc_streets', 2, 8, 2, 1), R('dc_hall', 1, 8), R('dc_cathedral', 0, 8),
  R('dc_tower', 4, 8, 1, 2), R('dc_attic', 4, 7), R('dc_boss', 2, 9, 2, 1), R('dc_belfry', 1, 9), R('dc_deep', 2, 10, 2, 1),
  // Sunken Archive
  R('sa_01', 1, 10), R('sa_stacks', 0, 10, 1, 2), R('sa_vault', 1, 11), R('sa_reading', 0, 12, 2, 1), R('sa_boss', 0, 13, 2, 1),
  // Black Reservoir
  R('br_01', 3, 11), R('br_grotto', 2, 11), R('br_sea', 4, 11, 2, 1), R('br_wards', 6, 11), R('br_boss', 5, 12, 2, 1), R('br_deep', 3, 12, 2, 1),
];

const G = (a: string, b: string, at: number, extra: Partial<LinkDef> = {}): LinkDef => ({ a, b, kind: 'G', at, ...extra });
const H = (a: string, b: string, at: number, extra: Partial<LinkDef> = {}): LinkDef => ({ a, b, kind: 'H', at, ...extra });
const V = (a: string, b: string, at: number, extra: Partial<LinkDef> = {}): LinkDef => ({ a, b, kind: 'V', at, ...extra });
const bossGate = (room: string, id: string) => ({ gateIn: room, gate: { id, boss: true } });
const flagGate = (room: string, id: string, opensOn: string) => ({ gateIn: room, gate: { id, opensOn } });

export const LINKS: LinkDef[] = [
  // Threshold
  V('th_01', 'th_02', 10, { climb: true }),
  H('th_02', 'th_secret', 1, { hiddenIn: 'th_02' }),
  G('th_02', 'th_03', 2),
  V('th_03', 'th_boss', 11, { climb: true }),
  V('th_boss', 'lw_gate', 11, { climb: true, ...flagGate('th_boss', 'th_floor', 'boss_gatekeeper') }),
  // Lanternwake
  G('lw_gate', 'lw_square', 4),
  G('lw_gate', 'lw_east', 4),
  G('lw_square', 'lw_yard', 4),
  V('lw_square', 'lw_lower', 10, { climb: true }),
  V('eh_hall', 'lw_square', 9, { climb: true, ...flagGate('lw_square', 'eh_door', 'gloam_defeated') }),
  V('so_01', 'lw_east', 12),
  G('lw_east', 'af_entry', 4, flagGate('af_entry', 'af_lw', 'gate_af_lw')),
  G('lw_yard', 'mg_01', 4),
  V('lw_lower', 'gs_01', 10, { climb: true }),
  // Mourning Grove
  G('mg_01', 'mg_02', 4),
  G('mg_02', 'mg_03', 4),
  G('mg_03', 'mg_04', 4),
  G('mg_04', 'mg_boss', 4, bossGate('mg_boss', 'mg_boss_in')),
  V('mg_02', 'mg_hollow', 5, { climb: true }),
  G('mg_hollow', 'mg_shrine', 5),
  G('mg_shrine', 'mg_dash', 5),
  V('mg_04', 'mg_deep', 3, { climb: true }),
  G('mg_deep', 'mg_hollow', 5),
  G('mg_wall', 'mg_deep', 5),
  V('mg_boss', 'mg_wall', 2, flagGate('mg_boss', 'mg_boss_out', 'boss_weeping_root')),
  V('mg_wall', 'dc_01', 2, { climb: true, ...flagGate('mg_wall', 'dc_seal', 'gate_dc_seal') }),
  V('mg_dash', 'gs_west', 7),
  // Gloamspore
  G('gs_west', 'gs_02', 6),
  G('gs_02', 'gs_01', 6),
  G('gs_01', 'gs_03', 6),
  V('gs_02', 'gs_camp', 8, { climb: true }),
  G('gs_camp', 'gs_04', 7),
  G('gs_04', 'gs_boss', 7, bossGate('gs_boss', 'gs_boss_in')),
  V('gs_boss', 'gs_drop', 11, { climb: true, ...flagGate('gs_boss', 'gs_boss_out', 'boss_mycelia') }),
  V('gs_drop', 'lc_01', 11, { climb: true }),
  // Lumen Caverns
  G('lc_grotto', 'lc_01', 9),
  G('lc_02', 'lc_grotto', 9),
  G('lc_03', 'lc_02', 9),
  V('lc_01', 'lc_dark1', 11, { climb: true }),
  G('lc_dark2', 'lc_dark1', 10),
  V('lc_dark2', 'lc_boss', 9, { climb: true, ...bossGate('lc_boss', 'lc_boss_in') }),
  G('lc_boss', 'lc_thorn', 11, flagGate('lc_boss', 'lc_boss_out', 'boss_prism')),
  G('lc_thorn', 'tc_gate', 11),
  // Thorn Chapel
  G('tc_gate', 'tc_nave', 11),
  G('tc_nave', 'tc_shrine', 11),
  V('tc_spire', 'tc_shrine', 14, { climb: true }),
  V('af_deep', 'tc_spire', 14),
  V('tc_nave', 'tc_boss', 12, { climb: true, ...bossGate('tc_boss', 'tc_boss_in') }),
  G('tc_boss', 'vg_01', 12, flagGate('tc_boss', 'tc_boss_out', 'boss_thorn_saint')),
  // Veiled Garden
  G('vg_01', 'vg_02', 12),
  V('vg_02', 'vg_03', 16, { climb: true }),
  G('vg_hidden', 'vg_03', 13, { hiddenIn: 'vg_03' }),
  V('vg_03', 'vg_boss', 16, { climb: true, ...bossGate('vg_boss', 'vg_boss_in') }),
  // Ashen Foundry
  G('af_entry', 'af_halls', 4),
  V('af_halls', 'af_lift', 14, flagGate('af_lift', 'lift_gate', 'foundry_lift')),
  V('af_lift', 'af_deep', 14),
  G('af_deep', 'af_climb', 8),
  V('af_halls', 'af_climb', 15),
  G('af_halls', 'af_forge', 4),
  V('af_forge', 'af_core', 16, { climb: true }),
  V('af_core', 'af_boss', 16, { climb: true, ...bossGate('af_boss', 'af_boss_in') }),
  V('af_boss', 'he_01', 17, { climb: true }),
  // Hollow Engine
  G('he_01', 'he_02', 8),
  V('he_02', 'he_03', 19, { climb: true }),
  V('he_02', 'he_pass', 18, { climb: true, ...flagGate('he_pass', 'he_shortcut', 'gate_he_shortcut') }),
  V('he_pass', 'he_04', 18, { climb: true }),
  G('he_04', 'he_03', 10),
  V('he_04', 'he_boss', 17, { climb: true, ...flagGate('he_04', 'seal_door', 'seals_3') }),
  V('he_boss', 'he_fall', 17, { climb: true, ...flagGate('he_boss', 'he_boss_out', 'boss_conductor') }),
  V('he_fall', 'ab_threshold', 17, { climb: true }),
  // Abyss
  G('ab_01', 'ab_threshold', 15),
  G('ab_02', 'ab_01', 15),
  G('ab_ante', 'ab_02', 15),
  V('ab_02', 'ab_secret', 14, { climb: true, ...flagGate('ab_02', 'mask_door', 'mask_whole') }),
  G('ab_boss', 'ab_ante', 15, bossGate('ab_boss', 'ab_boss_in')),
  G('ab_heart', 'ab_boss', 15, flagGate('ab_boss', 'ab_boss_out', 'boss_gloam')),
  // Starwell
  V('so_02', 'so_01', 12),
  G('so_02', 'so_obs', 1),
  V('so_boss', 'so_02', 12, bossGate('so_boss', 'so_boss_in')),
  // Drowned City
  G('dc_square', 'dc_01', 7),
  V('dc_01', 'dc_streets', 2, { climb: true }),
  G('dc_hall', 'dc_streets', 8),
  G('dc_cathedral', 'dc_hall', 8),
  G('dc_streets', 'dc_tower', 8),
  V('dc_attic', 'dc_tower', 4, { climb: true }),
  G('dc_boss', 'dc_tower', 9, bossGate('dc_boss', 'dc_boss_in')),
  G('dc_belfry', 'dc_boss', 9, flagGate('dc_boss', 'belfry', 'bells_rung')),
  V('dc_boss', 'dc_deep', 2, { climb: true, ...flagGate('dc_boss', 'dc_boss_out', 'boss_bell_warden') }),
  G('sa_01', 'dc_deep', 10),
  V('dc_deep', 'br_01', 3, { climb: true }),
  // Sunken Archive
  G('sa_stacks', 'sa_01', 10),
  G('sa_stacks', 'sa_vault', 11, { hiddenIn: 'sa_stacks' }),
  V('sa_stacks', 'sa_reading', 0, { climb: true }),
  V('sa_reading', 'sa_boss', 1, { climb: true, ...bossGate('sa_boss', 'sa_boss_in') }),
  // Black Reservoir
  G('br_grotto', 'br_01', 11, { hiddenIn: 'br_01' }),
  G('br_01', 'br_sea', 11),
  G('br_sea', 'br_wards', 11),
  V('br_wards', 'br_boss', 6, { climb: true, ...bossGate('br_boss', 'br_boss_in') }),
  V('br_01', 'br_deep', 3, { climb: true }),
];
