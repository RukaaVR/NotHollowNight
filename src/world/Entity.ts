import type { GameWorld } from './GameWorld';
import type { Rect } from '../core/math';

export type Team = 'player' | 'enemy' | 'neutral';

export type HitSource = 'blade' | 'charged' | 'down' | 'lance' | 'spire' | 'drop' | 'fire' | 'pulse' | 'spines' | 'toll' | 'ember' | 'reflect' | 'hazard';

export interface HitInfo {
  damage: number;
  /** Knockback direction (-1/1) on the X axis. */
  dir: number;
  /** Upward/downward knockback hint (-1 up, 1 down, 0 neutral). */
  dirY: number;
  knock: number;
  stagger: number;
  source: HitSource;
  crit: boolean;
  /** Unique id per swing so one swing never hits the same target twice. */
  hitId: number;
  x: number;
  y: number;
  /** Seconds of burning to apply (Ashen Core). */
  burn?: number;
}

export interface HitResult {
  hit: boolean;
  killed?: boolean;
  /** Armor deflected the blow (spark, reduced damage). */
  armored?: boolean;
  /** Bounce the player upward (down-strike landed). */
  bounce?: boolean;
  /** Give Aether for this hit. */
  aether?: boolean;
}

export interface LightSpec {
  r: number;
  color: string;
  intensity: number;
  ox?: number;
  oy?: number;
  flicker?: number;
}

export abstract class Entity {
  x = 0;
  y = 0;
  w = 0;
  h = 0;
  dead = false;
  /** Draw order: lower first. Player is 50. */
  layer = 20;
  team: Team = 'neutral';
  light: LightSpec | null = null;
  /** Whether the player's blade can interact with this. */
  hittable = false;
  lastHitId = -1;
  /** Staggered targets take guaranteed critical strikes. */
  staggered = false;
  /** Interact radius in px for the "up/E" prompt; 0 = not interactable. */
  interactRange = 0;

  constructor(public world: GameWorld) {}

  get cx(): number {
    return this.x + this.w / 2;
  }
  get cy(): number {
    return this.y + this.h / 2;
  }
  get bottom(): number {
    return this.y + this.h;
  }

  hurtbox(): Rect {
    return this;
  }

  abstract update(dt: number): void;
  abstract draw(ctx: CanvasRenderingContext2D): void;

  /** Optional foreground/overlay draw after lighting (glows, UI-ish markers). */
  drawGlow?(ctx: CanvasRenderingContext2D): void;

  takeHit?(hit: HitInfo): HitResult;

  interactLabel?(): string;
  interact?(): void;

  /** Called when the room is unloaded. */
  dispose?(): void;
}
