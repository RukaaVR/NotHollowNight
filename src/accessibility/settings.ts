import { DEFAULT_KEYS, DEFAULT_PAD, type KeyBindings, type PadBindings } from '../core/input';

export type Quality = 'low' | 'medium' | 'high' | 'ultra';
export type Colorblind = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type Difficulty = 'pilgrim' | 'wanderer' | 'veilborn';

export interface Settings {
  version: number;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  dialogueVolume: number;
  /** 0..1 multiplier on all camera shake. */
  shake: number;
  quality: Quality;
  reducedParticles: boolean;
  reduceFlashes: boolean;
  highContrast: boolean;
  colorblind: Colorblind;
  textScale: number;
  hudScale: number;
  vibration: boolean;
  difficulty: Difficulty;
  /** Assist options — tuned independently of the difficulty preset. */
  assistDamage: number; // multiplier on damage the player takes (0.5..1)
  gameSpeed: number; // 0.7..1
  extraIframes: boolean;
  telegraphBoost: boolean;
  keepAetherOnDeath: boolean;
  safeHazards: boolean;
  showTimer: boolean;
  showFps: boolean;
  keys: KeyBindings;
  pad: PadBindings;
}

export const SETTINGS_VERSION = 1;

export function defaultSettings(): Settings {
  return {
    version: SETTINGS_VERSION,
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.8,
    ambienceVolume: 0.6,
    dialogueVolume: 0.7,
    shake: 1,
    quality: 'high',
    reducedParticles: false,
    reduceFlashes: false,
    highContrast: false,
    colorblind: 'none',
    textScale: 1,
    hudScale: 1,
    vibration: true,
    difficulty: 'wanderer',
    assistDamage: 1,
    gameSpeed: 1,
    extraIframes: false,
    telegraphBoost: false,
    keepAetherOnDeath: false,
    safeHazards: false,
    showTimer: false,
    showFps: false,
    keys: structuredClone(DEFAULT_KEYS),
    pad: structuredClone(DEFAULT_PAD),
  };
}

/** Merge a possibly-old or partial settings object onto defaults. */
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const out = d as unknown as Record<string, unknown>;
  for (const k of Object.keys(d)) {
    if (k === 'keys' || k === 'pad') continue;
    const v = r[k];
    if (v !== undefined && typeof v === typeof out[k]) out[k] = v;
  }
  for (const group of ['keys', 'pad'] as const) {
    const src = r[group];
    if (src && typeof src === 'object') {
      const dst = out[group] as Record<string, unknown[]>;
      for (const a of Object.keys(dst)) {
        const v = (src as Record<string, unknown>)[a];
        if (Array.isArray(v) && v.length > 0) dst[a] = v.slice(0, 4);
      }
    }
  }
  d.shake = clamp01(d.shake);
  d.textScale = Math.min(1.6, Math.max(0.8, d.textScale));
  d.hudScale = Math.min(1.5, Math.max(0.6, d.hudScale));
  d.assistDamage = Math.min(1, Math.max(0.25, d.assistDamage));
  d.gameSpeed = Math.min(1, Math.max(0.6, d.gameSpeed));
  if (!['low', 'medium', 'high', 'ultra'].includes(d.quality)) d.quality = 'high';
  if (!['pilgrim', 'wanderer', 'veilborn'].includes(d.difficulty)) d.difficulty = 'wanderer';
  if (!['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(d.colorblind)) d.colorblind = 'none';
  d.version = SETTINGS_VERSION;
  return d;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Quality preset parameters consumed by the renderer and VFX. */
export interface QualityParams {
  renderScale: number;
  particleBudget: number;
  lightRes: number;
  parallaxLayers: number;
  bloom: boolean;
  weatherDensity: number;
}

export function qualityParams(q: Quality, reducedParticles: boolean): QualityParams {
  const base: Record<Quality, QualityParams> = {
    low: { renderScale: 0.6, particleBudget: 220, lightRes: 0.2, parallaxLayers: 2, bloom: false, weatherDensity: 0.35 },
    medium: { renderScale: 0.8, particleBudget: 500, lightRes: 0.3, parallaxLayers: 3, bloom: false, weatherDensity: 0.6 },
    high: { renderScale: 1, particleBudget: 900, lightRes: 0.4, parallaxLayers: 4, bloom: true, weatherDensity: 1 },
    ultra: { renderScale: 1.25, particleBudget: 1600, lightRes: 0.5, parallaxLayers: 4, bloom: true, weatherDensity: 1.3 },
  };
  const p = { ...base[q] };
  if (reducedParticles) {
    p.particleBudget = Math.floor(p.particleBudget * 0.35);
    p.weatherDensity *= 0.4;
  }
  return p;
}

/** Semantic colours that respect the colour-blind and contrast settings. */
export interface SemanticColors {
  danger: string;
  dangerGlow: string;
  aether: string;
  health: string;
  elite: string;
  safe: string;
  telegraph: string;
}

export function semanticColors(s: Pick<Settings, 'colorblind' | 'highContrast'>): SemanticColors {
  let c: SemanticColors = {
    danger: '#e0473a', dangerGlow: 'rgba(255,90,60,0.55)', aether: '#7fd6ff', health: '#f4eadb',
    elite: '#ffb347', safe: '#8ee59b', telegraph: '#ff6a4a',
  };
  switch (s.colorblind) {
    case 'protanopia':
    case 'deuteranopia':
      c = { ...c, danger: '#f0a020', dangerGlow: 'rgba(255,180,40,0.6)', telegraph: '#ffc23a', safe: '#4aa3ff', elite: '#d36cff' };
      break;
    case 'tritanopia':
      c = { ...c, danger: '#ff3d6e', dangerGlow: 'rgba(255,60,110,0.55)', telegraph: '#ff4f7f', aether: '#5cf2e0', safe: '#66e0c0', elite: '#ff9a4d' };
      break;
  }
  if (s.highContrast) {
    c.health = '#ffffff';
    c.aether = '#9ff0ff';
  }
  return c;
}

const KEY = 'veilfall.settings';

export function loadSettings(storage: Storage | null): Settings {
  if (!storage) return defaultSettings();
  try {
    const raw = storage.getItem(KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : defaultSettings();
  } catch {
    return defaultSettings();
  }
}

export function saveSettings(storage: Storage | null, s: Settings): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled: settings remain in memory */
  }
}

/** Difficulty preset effects. Difficulty never just inflates enemy health. */
export interface DifficultyParams {
  enemyDamage: number;
  aggression: number; // multiplier on enemy attack cooldown (lower = more aggressive)
  telegraph: number; // multiplier on telegraph duration
  aetherGain: number;
  contactDamage: boolean;
}

export function difficultyParams(d: Difficulty): DifficultyParams {
  switch (d) {
    case 'pilgrim':
      return { enemyDamage: 1, aggression: 1.35, telegraph: 1.35, aetherGain: 1.4, contactDamage: false };
    case 'veilborn':
      return { enemyDamage: 2, aggression: 0.8, telegraph: 0.9, aetherGain: 0.9, contactDamage: true };
    default:
      return { enemyDamage: 1, aggression: 1, telegraph: 1, aetherGain: 1, contactDamage: true };
  }
}
