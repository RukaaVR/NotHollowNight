import type { Enemy } from './Enemy';
import { eye, fillCircle } from '../rendering/draw';
import { semanticColors } from '../accessibility/settings';

/** Draw in enemy-local space: origin at feet centre, +x facing forward. */
export function pose(ctx: CanvasRenderingContext2D, e: Enemy, fn: () => void): void {
  ctx.save();
  ctx.translate(e.cx, e.bottom);
  ctx.scale(e.facing, 1);
  fn();
  ctx.restore();
}

export function legs(ctx: CanvasRenderingContext2D, n: number, spread: number, y: number, len: number, phase: number, color: string, width = 1): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const lx = -spread / 2 + (spread * i) / Math.max(1, n - 1);
    const sw = Math.sin(phase + i * 1.7) * 2;
    ctx.moveTo(lx, y);
    ctx.lineTo(lx + sw + (lx > 0 ? 2 : -2), y - len * 0.4);
    ctx.lineTo(lx + sw * 1.5 + (lx > 0 ? 3 : -3), y + len * 0.6);
  }
  ctx.stroke();
}

export function enemyEye(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, r: number, base: string): void {
  const c = e.telegraph > 0.05 ? semanticColors(e.world.settings).telegraph : base;
  eye(ctx, x, y, r, c, e.telegraph > 0 ? 1.4 : 0.8);
}

export function walkPhase(e: Enemy): number {
  return e.t * (4 + Math.abs(e.body.vx) * 0.08);
}

export function teleColor(e: Enemy): string {
  return semanticColors(e.world.settings).telegraph;
}

export function dangerZone(ctx: CanvasRenderingContext2D, e: Enemy, x: number, y: number, w: number, h: number, a: number): void {
  const c = semanticColors(e.world.settings);
  ctx.fillStyle = c.dangerGlow;
  ctx.globalAlpha = Math.min(1, a) * (e.world.settings.telegraphBoost ? 0.8 : 0.45);
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = c.danger;
  ctx.lineWidth = 0.75;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export { fillCircle };
