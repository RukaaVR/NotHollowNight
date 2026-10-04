import { ellipse, fillCircle, glow } from '../rendering/draw';
import type { Npc } from './Npc';

/** Small painting helpers shared by NPC portraits and in-world sprites. */

export function robe(ctx: CanvasRenderingContext2D, n: Npc, w: number, h: number, color: string, trim?: string): void {
  const sway = Math.sin(n.t * 1.6) * 0.8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.quadraticCurveTo(-w / 2 - 1, -h * 0.6, -w * 0.28, -h);
  ctx.lineTo(w * 0.28, -h);
  ctx.quadraticCurveTo(w / 2 + 1, -h * 0.6, w / 2 + sway, 0);
  ctx.closePath();
  ctx.fill();
  if (trim) {
    ctx.fillStyle = trim;
    ctx.fillRect(-w / 2, -2, w + sway, 1.5);
  }
}

export function breath(n: Npc, amp = 0.5): number {
  return Math.sin(n.t * 2) * amp;
}

export function headCircle(ctx: CanvasRenderingContext2D, y: number, r: number, color: string): void {
  fillCircle(ctx, 0.5, y, r, color);
}

export function eyes(ctx: CanvasRenderingContext2D, n: Npc, x: number, y: number, color: string, gap = 2.2, r = 0.7): void {
  const blink = Math.sin(n.t * 0.9) > 0.97 ? 0.15 : 1;
  ctx.fillStyle = color;
  ellipse(ctx, x, y, r, r * blink);
  ctx.fill();
  ellipse(ctx, x + gap, y, r, r * blink);
  ctx.fill();
}

export function lantern(ctx: CanvasRenderingContext2D, x: number, y: number, color = '#ffcf8a', size = 1): void {
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - 2.5 * size, y, 5 * size, 1.2 * size);
  ctx.fillStyle = color;
  ctx.fillRect(x - 2 * size, y + 1.2 * size, 4 * size, 4.5 * size);
  ctx.fillStyle = '#2a2018';
  ctx.fillRect(x - 2.5 * size, y + 5.7 * size, 5 * size, 1.2 * size);
  glow(ctx, x, y + 3.5 * size, 12 * size, color, 0.8);
}

export function hood(ctx: CanvasRenderingContext2D, y: number, r: number, color: string, tip = 0): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-r, y + r * 0.6);
  ctx.quadraticCurveTo(-r * 1.1, y - r * 1.2, 0, y - r * 1.3);
  ctx.quadraticCurveTo(r * 1.1, y - r * 1.2, r, y + r * 0.6);
  if (tip) ctx.lineTo(-r - tip, y - r * 0.2);
  ctx.closePath();
  ctx.fill();
}

export function staff(ctx: CanvasRenderingContext2D, x: number, top: number, color = '#4a3a2a'): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, top);
  ctx.stroke();
}

export function hat(ctx: CanvasRenderingContext2D, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, y, w, 1.5);
  ctx.beginPath();
  ctx.moveTo(-w * 0.3, y);
  ctx.lineTo(-w * 0.15, y - h);
  ctx.lineTo(w * 0.2, y - h);
  ctx.lineTo(w * 0.3, y);
  ctx.fill();
}
