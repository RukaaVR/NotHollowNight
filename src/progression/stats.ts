import { RELIC_BY_ID } from '../relics/relics';
import { maxAether, maxVigor, type Progress } from './Progress';

/** Derived combat/movement stats, recomputed when equipment changes. */
export interface PlayerStats {
  maxVigor: number;
  maxAether: number;
  bladeDamage: number;
  attackSpeed: number;
  reach: number;
  critChance: number;
  critMult: number;
  damageTakenMult: number;
  mendTime: number;
  mendAmount: number;
  mendCost: number;
  canMend: boolean;
  aetherGain: number;
  artCost: number;
  lanceMult: number;
  lancePierce: boolean;
  dashCooldown: number;
  stepDistance: number;
  stepIframes: number;
  chargeTime: number;
  knockback: number;
  fireDamage: boolean;
  fragmentMult: number;
  magnet: boolean;
  swimSpeed: number;
  waterDamage: number;
  windImmune: boolean;
  lowVigorDamage: number;
  globalDamage: number;
  lightRadius: number;
  glideFall: number;
  airControl: number;
  has: Set<string>;
}

export function computeStats(p: Progress): PlayerStats {
  const has = new Set(p.equipped.filter((id) => RELIC_BY_ID.has(id)));
  const s: PlayerStats = {
    maxVigor: maxVigor(p) + (has.has('steady_heart') ? 1 : 0),
    maxAether: maxAether(p),
    bladeDamage: [5, 7, 9, 11, 13][Math.min(4, p.bladeLevel)],
    attackSpeed: 1,
    reach: 1,
    critChance: 0.05,
    critMult: 1.75,
    damageTakenMult: 1,
    mendTime: 0.95,
    mendAmount: 1,
    mendCost: 33,
    canMend: true,
    aetherGain: 1,
    artCost: 33,
    lanceMult: 1,
    lancePierce: false,
    dashCooldown: 0.5,
    stepDistance: 72,
    stepIframes: 0.32,
    chargeTime: 0.6,
    knockback: 1,
    fireDamage: false,
    fragmentMult: 1,
    magnet: false,
    swimSpeed: 1,
    waterDamage: 1,
    windImmune: false,
    lowVigorDamage: 1,
    globalDamage: 1,
    lightRadius: 1,
    glideFall: 60,
    airControl: 1,
    has,
  };
  if (has.has('bloodless_edge')) { s.attackSpeed *= 1.25; s.mendTime *= 1.35; }
  if (has.has('ashen_core')) s.fireDamage = true;
  if (has.has('sundered_fang')) s.bladeDamage *= 1.2;
  if (has.has('aether_siphon')) s.aetherGain *= 1.4;
  if (has.has('stillwater_vial')) s.mendTime *= 0.6;
  if (has.has('twin_mend')) { s.mendAmount = 2; s.mendCost = 66; }
  if (has.has('quickstep')) s.dashCooldown *= 0.6;
  if (has.has('long_reach')) s.reach *= 1.3;
  if (has.has('storm_lance')) { s.lanceMult *= 1.3; s.lancePierce = true; }
  if (has.has('gravebloom')) s.lowVigorDamage = 1.6;
  if (has.has('hunters_mark')) s.critChance += 0.12;
  if (has.has('glass_crown')) { s.critMult = 2.5; s.damageTakenMult *= 2; }
  if (has.has('fragment_magnet')) { s.magnet = true; s.fragmentMult *= 1.15; }
  if (has.has('shadow_cloak')) { s.stepDistance *= 1.5; s.stepIframes *= 1.6; }
  if (has.has('ironroot_boots')) { s.windImmune = true; s.knockback *= 1; }
  if (has.has('tidecaller')) { s.swimSpeed *= 1.5; s.waterDamage = 1.5; }
  if (has.has('charged_soul')) s.chargeTime *= 0.5;
  if (has.has('gloam_pact')) { s.globalDamage *= 1.6; s.canMend = false; }
  if (has.has('lamplight_locket')) s.lightRadius *= 1.6;
  if (has.has('featherfall')) { s.glideFall = 38; s.airControl = 1.35; }
  if (has.has('veil_resonance')) s.artCost = Math.round(s.artCost * 0.75);
  if (has.has('heavy_blow')) s.knockback *= 1.8;
  return s;
}

export function threadsUsed(p: Progress): number {
  let n = 0;
  for (const id of p.equipped) n += RELIC_BY_ID.get(id)?.cost ?? 0;
  return n;
}

export function canEquip(p: Progress, id: string): boolean {
  const r = RELIC_BY_ID.get(id);
  if (!r || !p.relics.includes(id) || p.equipped.includes(id)) return false;
  return threadsUsed(p) + r.cost <= p.threadSlots;
}
