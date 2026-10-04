import { T, TILE } from './tiles';
import type { RoomGrid } from './Room';

/** A dynamic collider (moving platform, gate, crusher, elevator...). */
export interface Solid {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Movement applied during the current step, used to carry riders. */
  dx: number;
  dy: number;
  oneWay: boolean;
  active: boolean;
  /** Owner callback when stood on (falling platforms). */
  onStand?: () => void;
}

export interface Body {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  onGround: boolean;
  wallL: boolean;
  wallR: boolean;
  hitCeil: boolean;
  ground: Solid | null;
}

export interface MoveOpts {
  /** Player passes through phase wards. */
  phase: boolean;
  /** Ignore one-way platforms this step. */
  drop: boolean;
  /** Treat room edges as open where the edge tile is open (player only). */
  openEdges: boolean;
  /** Ignore one-way platforms entirely (flyers, projectiles). */
  ignoreOneWay?: boolean;
}

export function makeBody(x: number, y: number, w: number, h: number): Body {
  return { x, y, w, h, vx: 0, vy: 0, onGround: false, wallL: false, wallR: false, hitCeil: false, ground: null };
}

const EPS = 1e-4;

function solidTile(g: RoomGrid, tx: number, ty: number, o: MoveOpts): boolean {
  const t = o.openEdges ? g.tileClamped(tx, ty) : g.tile(tx, ty);
  switch (t) {
    case T.Solid:
    case T.SolidAlt:
    case T.Breakable:
    case T.Hidden:
    case T.Fragile:
      return true;
    case T.Crumble:
      return g.crumble[clampIdx(g, tx, ty)] < 0.55;
    case T.Phase:
      return !o.phase;
    default:
      return false;
  }
}

function clampIdx(g: RoomGrid, tx: number, ty: number): number {
  const cx = tx < 0 ? 0 : tx >= g.w ? g.w - 1 : tx;
  const cy = ty < 0 ? 0 : ty >= g.h ? g.h - 1 : ty;
  return cy * g.w + cx;
}

function oneWayTile(g: RoomGrid, tx: number, ty: number, o: MoveOpts): boolean {
  const t = o.openEdges ? g.tileClamped(tx, ty) : g.tile(tx, ty);
  return t === T.OneWay;
}

export function moveX(g: RoomGrid, solids: readonly Solid[], b: Body, dx: number, o: MoveOpts): boolean {
  if (dx === 0) return false;
  const top = Math.floor(b.y / TILE);
  const bot = Math.floor((b.y + b.h - EPS) / TILE);
  let blocked = false;
  let nx = b.x + dx;
  if (dx > 0) {
    const c0 = Math.floor((b.x + b.w - EPS) / TILE) + 1;
    const c1 = Math.floor((b.x + b.w + dx - EPS) / TILE);
    outer: for (let c = c0; c <= c1; c++) {
      for (let r = top; r <= bot; r++) {
        if (solidTile(g, c, r, o)) {
          nx = c * TILE - b.w;
          blocked = true;
          break outer;
        }
      }
    }
  } else {
    const c0 = Math.floor(b.x / TILE + EPS) - 1;
    const c1 = Math.floor((b.x + dx) / TILE);
    outer: for (let c = c0; c >= c1; c--) {
      for (let r = top; r <= bot; r++) {
        if (solidTile(g, c, r, o)) {
          nx = (c + 1) * TILE;
          blocked = true;
          break outer;
        }
      }
    }
  }
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!s.active || s.oneWay) continue;
    if (b.y + b.h <= s.y + EPS || b.y >= s.y + s.h - EPS) continue;
    if (dx > 0 && b.x + b.w <= s.x + EPS && nx + b.w > s.x) {
      nx = s.x - b.w;
      blocked = true;
    } else if (dx < 0 && b.x >= s.x + s.w - EPS && nx < s.x + s.w) {
      nx = s.x + s.w;
      blocked = true;
    }
  }
  b.x = nx;
  if (blocked) {
    if (dx > 0) b.wallR = true;
    else b.wallL = true;
  }
  return blocked;
}

export function moveY(g: RoomGrid, solids: readonly Solid[], b: Body, dy: number, o: MoveOpts): boolean {
  if (dy === 0) return false;
  const left = Math.floor(b.x / TILE);
  const right = Math.floor((b.x + b.w - EPS) / TILE);
  let blocked = false;
  let ny = b.y + dy;
  let groundSolid: Solid | null = null;
  if (dy > 0) {
    const prevBottom = b.y + b.h;
    const r0 = Math.floor((prevBottom - EPS) / TILE) + 1;
    const r1 = Math.floor((prevBottom + dy - EPS) / TILE);
    outer: for (let r = r0; r <= r1; r++) {
      for (let c = left; c <= right; c++) {
        if (solidTile(g, c, r, o) || (!o.drop && !o.ignoreOneWay && oneWayTile(g, c, r, o) && prevBottom <= r * TILE + EPS)) {
          ny = r * TILE - b.h;
          blocked = true;
          break outer;
        }
      }
    }
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (!s.active) continue;
      if (b.x + b.w <= s.x + EPS || b.x >= s.x + s.w - EPS) continue;
      if (s.oneWay && (o.drop || o.ignoreOneWay)) continue;
      if (prevBottom <= s.y + EPS + Math.max(0, s.dy) && ny + b.h > s.y) {
        ny = s.y - b.h;
        blocked = true;
        groundSolid = s;
      }
    }
  } else {
    const r0 = Math.floor(b.y / TILE + EPS) - 1;
    const r1 = Math.floor((b.y + dy) / TILE);
    outer: for (let r = r0; r >= r1; r--) {
      for (let c = left; c <= right; c++) {
        if (solidTile(g, c, r, o)) {
          ny = (r + 1) * TILE;
          blocked = true;
          break outer;
        }
      }
    }
    for (let i = 0; i < solids.length; i++) {
      const s = solids[i];
      if (!s.active || s.oneWay) continue;
      if (b.x + b.w <= s.x + EPS || b.x >= s.x + s.w - EPS) continue;
      if (b.y >= s.y + s.h - EPS && ny < s.y + s.h) {
        ny = s.y + s.h;
        blocked = true;
      }
    }
  }
  b.y = ny;
  if (blocked) {
    if (dy > 0) {
      b.onGround = true;
      b.ground = groundSolid;
    } else b.hitCeil = true;
  }
  return blocked;
}

/** Integrates velocity and resolves collisions; resets contact flags. */
export function stepBody(g: RoomGrid, solids: readonly Solid[], b: Body, dt: number, o: MoveOpts): void {
  b.onGround = false;
  b.wallL = false;
  b.wallR = false;
  b.hitCeil = false;
  b.ground = null;
  if (moveX(g, solids, b, b.vx * dt, o)) b.vx = 0;
  if (moveY(g, solids, b, b.vy * dt, o)) {
    if (b.vy > 0 || b.hitCeil) b.vy = 0;
  }
}

/** True if the rectangle intersects any solid tile or active solid. */
export function rectBlocked(g: RoomGrid, solids: readonly Solid[], x: number, y: number, w: number, h: number, o: MoveOpts): boolean {
  const l = Math.floor(x / TILE);
  const r = Math.floor((x + w - EPS) / TILE);
  const t = Math.floor(y / TILE);
  const bt = Math.floor((y + h - EPS) / TILE);
  for (let ty = t; ty <= bt; ty++) for (let tx = l; tx <= r; tx++) if (solidTile(g, tx, ty, o)) return true;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!s.active || s.oneWay) continue;
    if (x < s.x + s.w && x + w > s.x && y < s.y + s.h && y + h > s.y) return true;
  }
  return false;
}

/** Checks for wall contact without moving (used for wall grip / slide). */
export function touchingWall(g: RoomGrid, solids: readonly Solid[], b: Body, dir: number, o: MoveOpts): boolean {
  return rectBlocked(g, solids, dir > 0 ? b.x + b.w : b.x - 1, b.y + 2, 1, b.h - 6, o);
}

export function groundBelow(g: RoomGrid, solids: readonly Solid[], b: Body, o: MoveOpts): boolean {
  if (rectBlocked(g, solids, b.x, b.y + b.h, b.w, 1, o)) return true;
  const l = Math.floor(b.x / TILE);
  const r = Math.floor((b.x + b.w - EPS) / TILE);
  const row = Math.floor((b.y + b.h + 0.5) / TILE);
  if (Math.abs(row * TILE - (b.y + b.h)) < 0.6 && !o.drop) {
    for (let c = l; c <= r; c++) if (oneWayTile(g, c, row, o)) return true;
  }
  for (const s of solids) {
    if (!s.active || !s.oneWay) continue;
    if (b.x + b.w > s.x && b.x < s.x + s.w && Math.abs(b.y + b.h - s.y) < 0.6) return true;
  }
  return false;
}

/** Line-of-sight raycast across the tile grid (DDA). */
export function lineOfSight(g: RoomGrid, x0: number, y0: number, x1: number, y1: number): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return true;
  const steps = Math.ceil(len / (TILE / 2));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor((x0 + dx * t) / TILE);
    const ty = Math.floor((y0 + dy * t) / TILE);
    const tile = g.tile(tx, ty);
    if (tile === T.Solid || tile === T.SolidAlt || tile === T.Breakable || tile === T.Hidden || tile === T.Fragile) return false;
  }
  return true;
}
