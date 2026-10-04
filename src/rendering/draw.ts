import { TAU } from '../core/math';

/** Shared procedural drawing helpers and cached sprites. */

type Canvas = HTMLCanvasElement | OffscreenCanvas;
type Ctx2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

const glowCache = new Map<string, Canvas>();

/** A soft radial glow sprite (64px), cached per colour. */
export function glowSprite(color: string): Canvas {
  let c = glowCache.get(color);
  if (!c) {
    c = makeCanvas(64, 64);
    const g = (c as HTMLCanvasElement).getContext('2d')! as Ctx2D;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, color);
    grd.addColorStop(0.35, withAlpha(color, 0.45));
    grd.addColorStop(1, withAlpha(color, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    glowCache.set(color, c);
  }
  return c;
}

export function glow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha = 1): void {
  if (r <= 0 || alpha <= 0) return;
  const prevA = ctx.globalAlpha;
  const prevOp = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = prevA * alpha;
  ctx.drawImage(glowSprite(color) as CanvasImageSource, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = prevA;
  ctx.globalCompositeOperation = prevOp;
}

const parsed = new Map<string, [number, number, number, number]>();

export function parseColor(c: string): [number, number, number, number] {
  let v = parsed.get(c);
  if (v) return v;
  if (c.startsWith('#')) {
    const hex = c.slice(1);
    const full = hex.length === 3 ? hex.split('').map((h) => h + h).join('') : hex;
    v = [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16), 1];
  } else {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map((s) => parseFloat(s));
      v = [p[0], p[1], p[2], p[3] ?? 1];
    } else v = [255, 255, 255, 1];
  }
  parsed.set(c, v);
  return v;
}

export function withAlpha(c: string, a: number): string {
  const [r, g, b, a0] = parseColor(c);
  return `rgba(${r},${g},${b},${(a0 * a).toFixed(3)})`;
}

export function mix(a: string, b: string, t: number): string {
  const ca = parseColor(a);
  const cb = parseColor(b);
  const r = Math.round(ca[0] + (cb[0] - ca[0]) * t);
  const g = Math.round(ca[1] + (cb[1] - ca[1]) * t);
  const bl = Math.round(ca[2] + (cb[2] - ca[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

export function shade(c: string, amt: number): string {
  return amt >= 0 ? mix(c, '#ffffff', amt) : mix(c, '#000000', -amt);
}

export function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
}

export function fillCircle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string): void {
  ctx.fillStyle = color;
  circle(ctx, x, y, r);
  ctx.fill();
}

export function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU);
}

/** Draws a closed smooth blob through points (Catmull-Rom like via quadratic midpoints). */
export function blob(ctx: CanvasRenderingContext2D, pts: number[]): void {
  const n = pts.length / 2;
  ctx.beginPath();
  const mx = (pts[(n - 1) * 2] + pts[0]) / 2;
  const my = (pts[(n - 1) * 2 + 1] + pts[1]) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2];
    const y = pts[i * 2 + 1];
    const nx = pts[((i + 1) % n) * 2];
    const ny = pts[((i + 1) % n) * 2 + 1];
    ctx.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2);
  }
  ctx.closePath();
}

/** Painterly outlined shape: dark rim, base fill, light rim on top-left. */
export function paintShape(ctx: CanvasRenderingContext2D, path: () => void, base: string, rim = 'rgba(0,0,0,0.55)', hi?: string): void {
  path();
  ctx.fillStyle = base;
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = rim;
  ctx.stroke();
  if (hi) {
    ctx.save();
    path();
    ctx.clip();
    ctx.translate(-1.2, -1.2);
    path();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = hi;
    ctx.stroke();
    ctx.restore();
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** Eye glints used across creature designs. */
export function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, glowAmt = 1): void {
  if (glowAmt > 0) glow(ctx, x, y, r * 5, color, 0.6 * glowAmt);
  fillCircle(ctx, x, y, r, color);
  fillCircle(ctx, x - r * 0.3, y - r * 0.3, r * 0.4, '#ffffff');
}

/** Telegraph flash helper: returns 0..1 pulse for warning visuals. */
export function pulse(t: number, freq = 12): number {
  return 0.5 + 0.5 * Math.sin(t * freq);
}

/** Draw wrapped text; returns height used. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number, draw = true): number {
  const paras = text.split('\n');
  let yy = y;
  for (const para of paras) {
    const words = para.split(' ');
    let line = '';
    for (const w of words) {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxW && line) {
        if (draw) ctx.fillText(line, x, yy);
        yy += lineH;
        line = w;
      } else line = test;
    }
    if (draw) ctx.fillText(line, x, yy);
    yy += lineH;
  }
  return yy - y;
}
