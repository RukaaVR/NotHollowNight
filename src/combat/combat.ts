import { overlaps, type Rect } from '../core/math';
import { rng } from '../core/rng';
import { sfx } from '../core/events';
import { T, TILE } from '../world/tiles';
import type { GameWorld } from '../world/GameWorld';
import type { HitInfo, HitSource } from '../world/Entity';

let hitCounter = 1;
export function newHitId(): number {
  return hitCounter++;
}

export interface StrikeResult {
  hits: number;
  killed: number;
  bounce: boolean;
  wall: boolean;
  spike: boolean;
  armored: boolean;
  aether: number;
  crit: boolean;
}

export interface StrikeSpec {
  base: number;
  dir: number;
  dirY: number;
  knock: number;
  stagger: number;
  source: HitSource;
  hitId: number;
  /** Whether this strike can damage breakable tiles. */
  breaks: boolean;
  /** Allow critical strikes. */
  canCrit: boolean;
  burn?: number;
}

const result: StrikeResult = { hits: 0, killed: 0, bounce: false, wall: false, spike: false, armored: false, aether: 0, crit: false };

/**
 * Resolves a player-owned hitbox against every hittable entity and the tile
 * grid. Returns a shared result object (do not retain it).
 */
export function playerStrike(world: GameWorld, r: Rect, s: StrikeSpec): StrikeResult {
  result.hits = 0;
  result.killed = 0;
  result.bounce = false;
  result.wall = false;
  result.spike = false;
  result.armored = false;
  result.aether = 0;
  result.crit = false;
  const ents = world.entities;
  for (let i = 0; i < ents.length; i++) {
    const e = ents[i];
    if (!e.hittable || e.dead || e.team === 'player' || e.lastHitId === s.hitId || !e.takeHit) continue;
    if (!overlaps(r, e.hurtbox())) continue;
    e.lastHitId = s.hitId;
    const crit = s.canCrit && (e.staggered || rng.next() < world.stats.critChance);
    const dmg = s.base * (crit ? world.stats.critMult : 1);
    const hit: HitInfo = {
      damage: dmg, dir: s.dir, dirY: s.dirY, knock: s.knock * world.stats.knockback, stagger: s.stagger,
      source: s.source, crit, hitId: s.hitId, x: e.cx, y: e.cy, burn: s.burn,
    };
    const res = e.takeHit(hit);
    if (!res.hit) continue;
    result.hits++;
    if (crit && e.team === 'enemy') result.crit = true;
    if (res.killed) result.killed++;
    if (res.bounce !== false && e.team === 'enemy') result.bounce = true;
    if (res.bounce) result.bounce = true;
    if (res.armored) result.armored = true;
    if (res.aether) result.aether++;
  }
  if (s.breaks) strikeTiles(world, r, s);
  return result;
}

function strikeTiles(world: GameWorld, r: Rect, s: StrikeSpec): void {
  const g = world.grid;
  const x0 = Math.floor(r.x / TILE);
  const x1 = Math.floor((r.x + r.w - 0.01) / TILE);
  const y0 = Math.floor(r.y / TILE);
  const y1 = Math.floor((r.y + r.h - 0.01) / TILE);
  let brokeAny = false;
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!g.inBounds(tx, ty)) continue;
      const t = g.tile(tx, ty);
      const i = ty * g.w + tx;
      if (t === T.Breakable || t === T.Hidden) {
        if (g.hp[i] > 0 && !brokeAny) {
          g.hp[i] = Math.max(0, g.hp[i] - (s.source === 'charged' || s.source === 'drop' ? 3 : 1));
          world.fx.shards(tx * TILE + 8, ty * TILE + 8, 5, world.palette.tileHi, 140);
          world.fx.dust(tx * TILE + 8, ty * TILE + 8, 3, 'rgba(160,150,140,0.5)');
          if (g.hp[i] === 0) {
            world.breakTile(tx, ty);
            if (t === T.Hidden) world.discoverSecret();
          } else sfx('hit_armor', tx * TILE, ty * TILE, 0.6);
          world.camera.shake(0.2, 0.08);
          brokeAny = true;
          result.wall = true;
        }
      } else if (t === T.Spike || t === T.Thorn) {
        if (s.dirY > 0) result.spike = true;
      } else if ((t === T.Solid || t === T.SolidAlt || t === T.Fragile) && s.dirY === 0 && s.source === 'blade') {
        // Only a clink when the blade tip is embedded in a wall.
        const tipX = s.dir > 0 ? r.x + r.w - 2 : r.x + 2;
        if (Math.floor(tipX / TILE) === tx) result.wall = true;
      }
    }
  }
}

/** Damage the player if the rectangle overlaps them. Returns true on hit. */
export function hurtPlayerRect(world: GameWorld, x: number, y: number, w: number, h: number, dmg: number, srcX: number, opts?: { corrupt?: number; poison?: number; source?: { takeHit?: unknown } }): boolean {
  const p = world.player;
  if (x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y) {
    return p.hurt(dmg, srcX, opts);
  }
  return false;
}
