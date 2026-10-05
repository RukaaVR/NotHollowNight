import { Rng } from '../core/rng';
import { hashString, TAU } from '../core/math';
import type { RegionDef } from '../world/regions';
import { makeCanvas, mix, shade, withAlpha } from './draw';

/** Logical size of each painted parallax layer. */
export const LAYER_W = 960;
export const LAYER_H = 540;

export interface ParallaxLayer {
  canvas: HTMLCanvasElement;
  factor: number;
  /** Gentle horizontal drift (px/s) for living backgrounds. */
  drift: number;
}

export interface RegionBackdrop {
  sky: HTMLCanvasElement;
  layers: ParallaxLayer[];
  scale: number;
}

const cache = new Map<string, RegionBackdrop>();

/** Build (or fetch) the painted backdrop for a region at a pixel scale. */
export function backdrop(region: RegionDef, scale: number, layerCount: number): RegionBackdrop {
  const s = Math.max(0.5, Math.min(2.5, Math.round(scale * 4) / 4));
  const key = `${region.id}:${s}:${layerCount}`;
  let b = cache.get(key);
  if (b) return b;
  for (const k of [...cache.keys()]) if (k.startsWith(region.id + ':')) cache.delete(k);
  if (cache.size > 6) cache.delete(cache.keys().next().value!);
  const sky = paintSky(region, s);
  const defs: { factor: number; color: string; depth: number; drift: number; blur: number }[] = [
    { factor: 0.18, color: region.palette.far, depth: 0, drift: 2, blur: 2.2 },
    { factor: 0.4, color: region.palette.mid, depth: 1, drift: 0, blur: 1.1 },
    { factor: 0.65, color: shade(region.palette.mid, -0.25), depth: 2, drift: 0, blur: 0.4 },
    { factor: 0.82, color: region.palette.near, depth: 3, drift: 0, blur: 0 },
  ];
  const chosen = layerCount >= 4 ? defs : layerCount === 3 ? [defs[0], defs[1], defs[3]] : [defs[1], defs[3]];
  const layers = chosen.map((d) => {
    // Far layers can be lower resolution: they are soft anyway.
    const ls = d.depth === 0 ? s * 0.6 : s;
    const c = makeCanvas(LAYER_W * ls, LAYER_H * ls);
    const ctx = c.getContext('2d')!;
    ctx.scale(ls, ls);
    paintLayer(ctx, region, d.depth, d.color);
    if (d.blur > 0 && 'filter' in ctx) {
      const tmp = makeCanvas(c.width, c.height);
      const t = tmp.getContext('2d')!;
      t.filter = `blur(${d.blur * ls}px)`;
      t.drawImage(c, 0, 0);
      return { canvas: tmp, factor: d.factor, drift: d.drift };
    }
    return { canvas: c, factor: d.factor, drift: d.drift };
  });
  b = { sky, layers, scale: s };
  cache.set(key, b);
  return b;
}

/**
 * The luminous painted sky: a deep top fading to a bright haze, a soft glow
 * where the light pools, and slanted shafts falling through the dark.
 */
function paintSky(region: RegionDef, s: number): HTMLCanvasElement {
  const pal = region.palette;
  const W = 240;
  const H = 136;
  const c = makeCanvas(Math.ceil(W * s), Math.ceil(H * s));
  const g = c.getContext('2d')!;
  g.scale(s, s);
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, pal.sky0);
  grad.addColorStop(0.55, mix(pal.sky0, pal.sky1, 0.75));
  grad.addColorStop(1, pal.sky1);
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);
  const rng = new Rng(hashString(region.id) + 31);
  // Pool of light
  const gx = W * (0.35 + rng.next() * 0.3);
  const gy = H * (0.3 + rng.next() * 0.2);
  const glow = g.createRadialGradient(gx, gy, 0, gx, gy, W * 0.55);
  glow.addColorStop(0, withAlpha(mix(pal.sky1, pal.accent, 0.55), 0.75));
  glow.addColorStop(0.35, withAlpha(mix(pal.sky1, pal.accent, 0.25), 0.35));
  glow.addColorStop(1, withAlpha(pal.sky1, 0));
  g.fillStyle = glow;
  g.fillRect(0, 0, W, H);
  // Light shafts
  if (region.id !== 'ab') {
    g.globalCompositeOperation = 'lighter';
    const n = 3 + Math.floor(rng.next() * 3);
    for (let i = 0; i < n; i++) {
      const x = gx + (rng.next() - 0.5) * W * 0.7;
      const w = 8 + rng.next() * 22;
      const slant = 30 + rng.next() * 30;
      const sg = g.createLinearGradient(0, 0, 0, H);
      const a = 0.05 + rng.next() * 0.07;
      sg.addColorStop(0, withAlpha(pal.accent, a));
      sg.addColorStop(0.7, withAlpha(pal.accent, a * 0.4));
      sg.addColorStop(1, withAlpha(pal.accent, 0));
      g.fillStyle = sg;
      g.beginPath();
      g.moveTo(x, -4);
      g.lineTo(x + w, -4);
      g.lineTo(x + w * 2.2 + slant, H);
      g.lineTo(x + slant, H);
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = 'source-over';
  }
  // Fine grain dithers the gradients so they never band.
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng.next() - 0.5) * 5;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
  return c;
}

function paintLayer(ctx: CanvasRenderingContext2D, region: RegionDef, depth: number, color: string): void {
  const rng = new Rng(hashString(region.id) + depth * 977);
  const pal = region.palette;
  const W = LAYER_W;
  const H = LAYER_H;
  // Atmospheric perspective: distant shapes dissolve into the bright haze.
  const fog = mix(color, pal.sky1, [0.5, 0.3, 0.12, 0][depth] ?? 0);
  ctx.fillStyle = fog;
  ctx.strokeStyle = fog;
  const underground = region.bg !== 'observatory' && region.bg !== 'ruins';
  // Cave ceilings and floors give every underground region its enclosure.
  if (underground) ceiling(ctx, rng, W, depth, fog, 40 + depth * 20);
  floorMounds(ctx, rng, W, H, fog, 50 + depth * 26);
  const glowColor = pal.accent;
  switch (region.bg) {
    case 'ruins': ruins(ctx, rng, W, H, fog, depth); break;
    case 'village': village(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'forest': forest(ctx, rng, W, H, fog, depth); break;
    case 'fungal': fungal(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'city': city(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'crystal': crystal(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'foundry': foundry(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'library': library(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'chapel': chapel(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'sea': sea(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'observatory': observatory(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'garden': garden(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'engine': engine(ctx, rng, W, H, fog, depth, glowColor); break;
    case 'abyss': abyss(ctx, rng, W, H, fog, depth, glowColor); break;
  }
  // Atmospheric haze on distant layers
  if (depth < 2) {
    const g = ctx.createLinearGradient(0, H * 0.3, 0, H);
    g.addColorStop(0, withAlpha(pal.sky1, 0));
    g.addColorStop(1, withAlpha(mix(pal.sky1, pal.accent, 0.15), 0.5 - depth * 0.2));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------------------------------------------------------------- primitives

function ceiling(ctx: CanvasRenderingContext2D, rng: Rng, W: number, depth: number, color: string, base: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  let x = 0;
  while (x <= W) {
    const h = base * (0.5 + rng.next());
    const w = 20 + rng.next() * 40;
    ctx.lineTo(x, h * 0.6);
    ctx.lineTo(x + w * 0.5, h + (rng.chance(0.3) ? 30 + depth * 10 : 0));
    ctx.lineTo(x + w, h * 0.5);
    x += w;
  }
  ctx.lineTo(W, 0);
  ctx.closePath();
  ctx.fill();
}

function floorMounds(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, color: string, base: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, H);
  let x = 0;
  while (x <= W + 40) {
    const h = base * (0.6 + rng.next() * 0.8);
    ctx.quadraticCurveTo(x + 20, H - h, x + 40 + rng.next() * 30, H - h * 0.5);
    x += 40 + rng.next() * 30;
  }
  ctx.lineTo(W, H);
  ctx.closePath();
  ctx.fill();
}

function windowGlow(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string, a: number): void {
  ctx.fillStyle = withAlpha(color, a);
  ctx.fillRect(x, y, w, h);
  const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 2.5);
  g.addColorStop(0, withAlpha(color, a * 0.35));
  g.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - w * 2.5, y - h * 2.5, w * 6, h * 6);
}

// ---------------------------------------------------------------- themes

function ruins(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number): void {
  ctx.fillStyle = c;
  const n = 6 + depth * 2;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + rng.range(-20, 20);
    const w = 18 + rng.next() * 14 + depth * 4;
    const h = 80 + rng.next() * 160 - depth * 20;
    // Broken pillar
    ctx.fillRect(x, H - h, w, h);
    ctx.beginPath();
    ctx.moveTo(x - 4, H - h);
    ctx.lineTo(x + w + 4, H - h);
    ctx.lineTo(x + w * 0.7, H - h - 10 - rng.next() * 14);
    ctx.lineTo(x + w * 0.3, H - h - 4);
    ctx.fill();
    if (rng.chance(0.4)) {
      // Arch to the next pillar
      ctx.lineWidth = 8 + depth * 2;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.arc(x + w + 30, H - h + 10, 30, Math.PI, 0);
      ctx.stroke();
    }
  }
  // Distant snow-covered spire
  if (depth === 0) {
    ctx.beginPath();
    ctx.moveTo(W * 0.62, H);
    ctx.lineTo(W * 0.66, H - 320);
    ctx.lineTo(W * 0.7, H);
    ctx.fill();
  }
}

function village(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  ctx.fillStyle = c;
  let x = 0;
  while (x < W) {
    const w = 40 + rng.next() * 50;
    const h = 60 + rng.next() * 90 - depth * 10;
    const y = H - 40 - h;
    ctx.fillStyle = c;
    ctx.fillRect(x, y, w, h + 40);
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x + w / 2, y - 26 - rng.next() * 16);
    ctx.lineTo(x + w + 6, y);
    ctx.fill();
    // chimney with smoke wisp
    if (rng.chance(0.5)) ctx.fillRect(x + w * 0.7, y - 30, 6, 20);
    const lit = depth >= 1 ? 0.7 : 0.35;
    for (let wy = y + 12; wy < H - 50; wy += 22) for (let wx = x + 8; wx < x + w - 10; wx += 16) if (rng.chance(0.45)) windowGlow(ctx, wx, wy, 6, 8, '#ffcf8a', lit);
    x += w + 8 + rng.next() * 20;
  }
  // Strings of lanterns between houses
  if (depth >= 2) {
    ctx.strokeStyle = withAlpha('#000000', 0.5);
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const x0 = rng.next() * W;
      ctx.beginPath();
      ctx.moveTo(x0, 110);
      ctx.quadraticCurveTo(x0 + 60, 150, x0 + 120, 110);
      ctx.stroke();
      for (let k = 1; k < 6; k++) windowGlow(ctx, x0 + k * 20 - 2, 118 + Math.sin((k / 6) * Math.PI) * 18, 3, 4, glow, 0.8);
    }
  }
}

function forest(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number): void {
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  const n = 5 + depth * 2;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + rng.range(-30, 30);
    const w = 26 + rng.next() * 30 + depth * 10;
    // Enormous trunk, rooted into the ceiling as well as the floor
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.bezierCurveTo(x + w * 0.2, H * 0.6, x - w * 0.3, H * 0.3, x + w * 0.1, 0);
    ctx.lineTo(x + w * 0.9, 0);
    ctx.bezierCurveTo(x + w * 1.2, H * 0.3, x + w * 0.7, H * 0.6, x + w, H);
    ctx.fill();
    // Hanging roots
    ctx.lineWidth = 2 + depth;
    for (let k = 0; k < 4; k++) {
      const rx = x + w / 2 + rng.range(-60, 60);
      ctx.beginPath();
      ctx.moveTo(rx, 40);
      ctx.bezierCurveTo(rx + 10, 120, rx - 10, 160, rx + rng.range(-10, 10), 200 + rng.next() * 120);
      ctx.stroke();
    }
  }
}

function fungal(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  const n = 5 + depth * 2;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + rng.range(-30, 30);
    const h = 120 + rng.next() * 200 - depth * 30;
    const capW = 50 + rng.next() * 70 + depth * 10;
    ctx.fillStyle = c;
    ctx.fillRect(x - 6 - depth, H - h, 12 + depth * 2, h);
    ctx.beginPath();
    ctx.ellipse(x, H - h, capW / 2, capW / 4, 0, Math.PI, 0);
    ctx.fill();
    // Glowing spots under the cap
    for (let k = 0; k < 6; k++) windowGlow(ctx, x - capW / 2.5 + rng.next() * capW * 0.8, H - h - rng.next() * capW / 5, 2, 2, glow, depth >= 1 ? 0.7 : 0.35);
  }
}

function city(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  let x = 0;
  while (x < W) {
    const w = 30 + rng.next() * 50;
    const h = 120 + rng.next() * 220 - depth * 30;
    ctx.fillStyle = c;
    ctx.fillRect(x, H - h, w, h);
    // Spires and domes
    if (rng.chance(0.5)) {
      ctx.beginPath();
      ctx.moveTo(x, H - h);
      ctx.lineTo(x + w / 2, H - h - 40 - rng.next() * 40);
      ctx.lineTo(x + w, H - h);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(x + w / 2, H - h, w / 2, Math.PI, 0);
      ctx.fill();
    }
    for (let wy = H - h + 14; wy < H - 30; wy += 24) for (let wx = x + 6; wx < x + w - 8; wx += 14) if (rng.chance(0.18)) windowGlow(ctx, wx, wy, 4, 7, glow, 0.3 + depth * 0.1);
    x += w + rng.next() * 12;
  }
  // The great clocktower, frozen at a quarter past eleven
  if (depth === 1) {
    const cx = W * 0.45;
    ctx.fillStyle = c;
    ctx.fillRect(cx - 22, H - 420, 44, 420);
    ctx.beginPath();
    ctx.moveTo(cx - 28, H - 420);
    ctx.lineTo(cx, H - 480);
    ctx.lineTo(cx + 28, H - 420);
    ctx.fill();
    ctx.fillStyle = withAlpha(glow, 0.5);
    ctx.beginPath();
    ctx.arc(cx, H - 380, 16, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, H - 380);
    ctx.lineTo(cx - 6, H - 390);
    ctx.moveTo(cx, H - 380);
    ctx.lineTo(cx + 12, H - 380);
    ctx.stroke();
  }
  // Drowned water line
  ctx.fillStyle = withAlpha('#0a2030', 0.4);
  ctx.fillRect(0, H * 0.35, W, H);
}

function crystal(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  const n = 9 + depth * 3;
  for (let i = 0; i < n; i++) {
    const x = rng.next() * W;
    const h = 60 + rng.next() * 220 - depth * 20;
    const w = 14 + rng.next() * 26;
    const fromTop = rng.chance(0.35);
    ctx.fillStyle = mix(c, glow, 0.12 + depth * 0.04);
    ctx.beginPath();
    if (fromTop) {
      ctx.moveTo(x - w / 2, 0);
      ctx.lineTo(x, h);
      ctx.lineTo(x + w / 2, 0);
    } else {
      ctx.moveTo(x - w / 2, H);
      ctx.lineTo(x - w / 4, H - h * 0.8);
      ctx.lineTo(x, H - h);
      ctx.lineTo(x + w / 2, H);
    }
    ctx.fill();
    ctx.fillStyle = withAlpha(glow, 0.12 + depth * 0.05);
    ctx.beginPath();
    if (fromTop) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.lineTo(x + w / 2, 0);
    } else {
      ctx.moveTo(x, H);
      ctx.lineTo(x, H - h);
      ctx.lineTo(x + w / 2, H);
    }
    ctx.fill();
  }
}

function foundry(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  let x = 0;
  while (x < W) {
    const w = 40 + rng.next() * 60;
    const h = 100 + rng.next() * 160;
    ctx.fillStyle = c;
    ctx.fillRect(x, H - h, w, h);
    // Chimneys
    for (let k = 0; k < 2; k++) if (rng.chance(0.6)) ctx.fillRect(x + 6 + k * (w - 18), H - h - 60 - rng.next() * 80, 10, 80);
    // Furnace mouths glowing
    if (rng.chance(0.6)) windowGlow(ctx, x + w / 2 - 8, H - 40, 16, 14, '#ff8a40', 0.4 + depth * 0.15);
    x += w + 10 + rng.next() * 30;
  }
  // Pipes crossing the space
  ctx.strokeStyle = c;
  ctx.lineWidth = 6 + depth * 2;
  for (let i = 0; i < 3; i++) {
    const y = 80 + rng.next() * 200;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W * 0.3, y);
    ctx.lineTo(W * 0.35, y + 40);
    ctx.lineTo(W, y + 40);
    ctx.stroke();
  }
  const g = ctx.createLinearGradient(0, H * 0.6, 0, H);
  g.addColorStop(0, withAlpha(glow, 0));
  g.addColorStop(1, withAlpha('#ff6a20', 0.15));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function library(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  // Towering shelves receding into darkness, with arched windows of nothing.
  let x = 0;
  while (x < W) {
    const w = 50 + rng.next() * 40;
    ctx.fillStyle = c;
    ctx.fillRect(x, 60, w, H);
    ctx.fillStyle = shade(c, -0.2);
    for (let y = 80; y < H; y += 18 + depth * 2) ctx.fillRect(x + 2, y, w - 4, 2);
    // Book spines suggested by tiny highlights
    ctx.fillStyle = withAlpha(glow, 0.08 + depth * 0.04);
    for (let y = 82; y < H; y += 18 + depth * 2) for (let bx = x + 4; bx < x + w - 4; bx += 4) if (rng.chance(0.4)) ctx.fillRect(bx, y + 2, 2, 12);
    x += w + 20 + rng.next() * 30;
    if (rng.chance(0.5)) {
      ctx.fillStyle = withAlpha(glow, 0.06);
      ctx.beginPath();
      ctx.arc(x - 10, 160, 18, Math.PI, 0);
      ctx.fillRect(x - 28, 160, 36, 60);
      ctx.fill();
    }
  }
}

function chapel(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  const n = 4 + depth;
  for (let i = 0; i < n; i++) {
    const x = (i / n) * W + rng.range(-20, 20);
    const w = 40 + rng.next() * 40;
    const h = 200 + rng.next() * 200 - depth * 30;
    ctx.fillStyle = c;
    ctx.fillRect(x, H - h, w, h);
    ctx.beginPath();
    ctx.moveTo(x - 4, H - h);
    ctx.lineTo(x + w / 2, H - h - 90);
    ctx.lineTo(x + w + 4, H - h);
    ctx.fill();
    // Rose window
    if (depth >= 1) {
      ctx.fillStyle = withAlpha(glow, 0.25);
      ctx.beginPath();
      ctx.arc(x + w / 2, H - h + 40, 12, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = c;
      ctx.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU;
        ctx.beginPath();
        ctx.moveTo(x + w / 2, H - h + 40);
        ctx.lineTo(x + w / 2 + Math.cos(a) * 12, H - h + 40 + Math.sin(a) * 12);
        ctx.stroke();
      }
    }
  }
  // Thorn vines climbing everything
  ctx.strokeStyle = c;
  ctx.lineWidth = 2 + depth;
  for (let i = 0; i < 8; i++) {
    const x0 = rng.next() * W;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    for (let k = 1; k < 8; k++) ctx.lineTo(x0 + Math.sin(k * 1.3 + i) * 20, H - k * 40);
    ctx.stroke();
  }
}

function sea(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  // A flat black sea under a ceiling of stone; ruined arches stand in the water.
  const horizon = H * 0.62;
  ctx.fillStyle = c;
  for (let i = 0; i < 4 + depth; i++) {
    const x = rng.next() * W;
    const w = 60 + rng.next() * 80;
    const h = 80 + rng.next() * 140;
    ctx.lineWidth = 10 + depth * 3;
    ctx.strokeStyle = c;
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(x, horizon - h);
    ctx.arc(x + w / 2, horizon - h, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, horizon);
    ctx.stroke();
  }
  ctx.fillStyle = shade(c, -0.3);
  ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = withAlpha(glow, 0.12);
  ctx.lineWidth = 1;
  for (let y = horizon + 6; y < H; y += 10 + depth * 4) {
    ctx.beginPath();
    for (let x = 0; x < W; x += 40) {
      ctx.moveTo(x + rng.next() * 10, y);
      ctx.lineTo(x + 20 + rng.next() * 10, y);
    }
    ctx.stroke();
  }
}

function observatory(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  if (depth === 0) {
    // A remembered starfield
    for (let i = 0; i < 260; i++) {
      ctx.fillStyle = withAlpha('#ffffff', 0.2 + rng.next() * 0.7);
      const s = rng.next() < 0.1 ? 1.6 : 0.8;
      ctx.fillRect(rng.next() * W, rng.next() * H * 0.8, s, s);
    }
    ctx.strokeStyle = withAlpha(glow, 0.15);
    ctx.lineWidth = 0.6;
    for (let k = 0; k < 6; k++) {
      ctx.beginPath();
      let x = rng.next() * W;
      let y = rng.next() * H * 0.6;
      ctx.moveTo(x, y);
      for (let j = 0; j < 4; j++) {
        x += rng.range(-40, 40);
        y += rng.range(-30, 30);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    return;
  }
  ctx.fillStyle = c;
  let x = 0;
  while (x < W) {
    const w = 60 + rng.next() * 60;
    const h = 60 + rng.next() * 120;
    ctx.fillRect(x, H - h, w, h);
    ctx.beginPath();
    ctx.arc(x + w / 2, H - h, w / 2, Math.PI, 0);
    ctx.fill();
    // Telescope poking from the dome
    ctx.save();
    ctx.translate(x + w / 2, H - h - w / 4);
    ctx.rotate(-0.8 + rng.next() * 0.4);
    ctx.fillRect(0, -4, w * 0.6, 8);
    ctx.restore();
    if (depth >= 2) windowGlow(ctx, x + w / 2 - 3, H - h + 20, 6, 10, glow, 0.5);
    x += w + 30 + rng.next() * 40;
  }
}

function garden(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  ctx.fillStyle = c;
  ctx.strokeStyle = c;
  // Trellised arches heavy with blossoms
  for (let i = 0; i < 6 + depth; i++) {
    const x = rng.next() * W;
    const w = 50 + rng.next() * 50;
    const h = 90 + rng.next() * 100;
    ctx.lineWidth = 4 + depth;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x, H - h);
    ctx.arc(x + w / 2, H - h, w / 2, Math.PI, 0);
    ctx.lineTo(x + w, H);
    ctx.stroke();
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = withAlpha(rng.chance(0.5) ? '#ffd8f0' : glow, 0.15 + depth * 0.08);
      ctx.beginPath();
      const a = Math.PI + rng.next() * Math.PI;
      ctx.arc(x + w / 2 + Math.cos(a) * w / 2, H - h + Math.sin(a) * w / 2, 3 + rng.next() * 3, 0, TAU);
      ctx.fill();
    }
  }
  // Hedges
  ctx.fillStyle = c;
  for (let x = 0; x < W; x += 30) {
    ctx.beginPath();
    ctx.arc(x + 15, H - 50 - rng.next() * 20, 22, 0, TAU);
    ctx.fill();
  }
}

function engine(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  ctx.strokeStyle = c;
  ctx.fillStyle = c;
  for (let i = 0; i < 5 + depth * 2; i++) {
    const x = rng.next() * W;
    const y = rng.next() * H;
    const r = 30 + rng.next() * 80 - depth * 6;
    ctx.lineWidth = 6 + depth * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.stroke();
    const teeth = Math.floor(r / 6);
    for (let k = 0; k < teeth; k++) {
      const a = (k / teeth) * TAU;
      ctx.fillRect(x + Math.cos(a) * r - 4, y + Math.sin(a) * r - 4, 8, 8);
    }
    ctx.lineWidth = 3;
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * TAU;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      ctx.stroke();
    }
  }
  // Pistons
  for (let i = 0; i < 6; i++) {
    const x = rng.next() * W;
    ctx.fillRect(x, 0, 14, 120 + rng.next() * 200);
  }
  if (depth >= 1) for (let i = 0; i < 12; i++) windowGlow(ctx, rng.next() * W, rng.next() * H, 3, 3, glow, 0.35);
}

function abyss(ctx: CanvasRenderingContext2D, rng: Rng, W: number, H: number, c: string, depth: number, glow: string): void {
  // Floating rock, endless tendrils, and something watching.
  ctx.fillStyle = c;
  for (let i = 0; i < 8 + depth * 2; i++) {
    const x = rng.next() * W;
    const y = 80 + rng.next() * (H - 200);
    const w = 20 + rng.next() * 60;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x + w / 2, y);
    ctx.lineTo(x + w * 0.2, y + w * 0.8);
    ctx.lineTo(x - w * 0.2, y + w * 0.5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = c;
  ctx.lineCap = 'round';
  for (let i = 0; i < 10; i++) {
    ctx.lineWidth = 3 + rng.next() * 6 + depth * 2;
    const x0 = rng.next() * W;
    ctx.beginPath();
    ctx.moveTo(x0, H);
    ctx.bezierCurveTo(x0 + rng.range(-80, 80), H * 0.6, x0 + rng.range(-80, 80), H * 0.4, x0 + rng.range(-60, 60), H * 0.2);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  if (depth === 0) {
    for (let i = 0; i < 9; i++) {
      const x = rng.next() * W;
      const y = rng.next() * H * 0.7;
      ctx.fillStyle = withAlpha(glow, 0.35);
      ctx.beginPath();
      ctx.ellipse(x, y, 6, 2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = withAlpha('#ff8aff', 0.5);
      ctx.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
    }
  }
}

// ---------------------------------------------------------------- foreground

const fgCache = new Map<string, HTMLCanvasElement>();
export const FG_W = 960;

/**
 * Dark, softly blurred silhouettes that frame the bottom and top of the
 * screen and slide past faster than the world, for painterly depth.
 */
export function foreground(region: RegionDef, scale: number): HTMLCanvasElement {
  const s = Math.max(0.5, Math.min(2.5, Math.round(scale * 2) / 2));
  const key = `${region.id}:${s}`;
  const hit = fgCache.get(key);
  if (hit) return hit;
  if (fgCache.size > 4) fgCache.delete(fgCache.keys().next().value!);
  const W = FG_W;
  const H = 270;
  const c = makeCanvas(Math.ceil(W * s), Math.ceil(H * s));
  const g = c.getContext('2d')!;
  g.scale(s, s);
  const rng = new Rng(hashString(region.id) + 4242);
  const col = mix(region.palette.tileDark, '#000000', 0.5);
  g.fillStyle = col;
  g.strokeStyle = col;
  g.lineCap = 'round';
  const style = region.style;
  // Bottom: clusters of rocks, grass and posts separated by open gaps.
  let x = rng.next() * 80;
  while (x < W - 40) {
    const w = 40 + rng.next() * 90;
    const h = 8 + rng.next() * 10;
    g.beginPath();
    g.moveTo(x, H);
    g.quadraticCurveTo(x + w * 0.2, H - h, x + w * 0.5, H - h * 1.1);
    g.quadraticCurveTo(x + w * 0.85, H - h, x + w, H);
    g.fill();
    // Grass blades / fronds
    const blades = style === 'metal' || style === 'engine' || style === 'brick' ? 0 : 6 + Math.floor(rng.next() * 8);
    for (let i = 0; i < blades; i++) {
      const bx = x + w * 0.15 + rng.next() * w * 0.7;
      const bh = 8 + rng.next() * 18;
      const lean = (rng.next() - 0.5) * 10;
      g.lineWidth = 1.6 + rng.next();
      g.beginPath();
      g.moveTo(bx, H - h * 0.6);
      g.quadraticCurveTo(bx + lean * 0.3, H - h - bh * 0.6, bx + lean, H - h - bh);
      g.stroke();
    }
    // Ornamental post (city / village / ruins / chapel)
    if ((style === 'brick' || style === 'marble' || style === 'wood' || style === 'stone' || style === 'metal') && rng.chance(0.45)) {
      const px = x + w * 0.5;
      const ph = 34 + rng.next() * 30;
      g.fillRect(px - 2.5, H - ph, 5, ph);
      g.beginPath();
      g.arc(px, H - ph, 7, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 2;
      g.beginPath();
      g.arc(px, H - ph, 11, Math.PI * 0.15, Math.PI * 0.85, true);
      g.stroke();
    }
    x += w + 120 + rng.next() * 200;
  }
  // Top: hanging roots, chains or stalactites.
  x = rng.next() * 60;
  while (x < W - 20) {
    const n = 2 + Math.floor(rng.next() * 4);
    for (let i = 0; i < n; i++) {
      const hx = x + i * (6 + rng.next() * 10);
      const len = 14 + rng.next() * 30;
      g.lineWidth = 1.5 + rng.next() * 2.5;
      g.beginPath();
      g.moveTo(hx, -2);
      if (style === 'metal' || style === 'engine') {
        g.lineTo(hx, len);
        g.stroke();
        g.beginPath();
        g.arc(hx, len + 3, 3, 0, Math.PI * 2);
        g.stroke();
      } else if (style === 'crystal' || style === 'stone' || style === 'marble') {
        g.lineTo(hx - 4, -2);
        g.lineTo(hx, len * 0.8);
        g.lineTo(hx + 4, -2);
        g.fill();
      } else {
        g.bezierCurveTo(hx + 6, len * 0.4, hx - 6, len * 0.7, hx + (rng.next() - 0.5) * 8, len);
        g.stroke();
      }
    }
    g.beginPath();
    g.ellipse(x + 15, -6, 30 + rng.next() * 20, 10, 0, 0, Math.PI * 2);
    g.fill();
    x += 140 + rng.next() * 220;
  }
  // Soft focus, as if very close to the lens.
  let out = c;
  if ('filter' in g) {
    const t = makeCanvas(c.width, c.height);
    const tc = t.getContext('2d')!;
    tc.filter = `blur(${0.8 * s}px)`;
    tc.drawImage(c, 0, 0);
    out = t;
  }
  fgCache.set(key, out);
  return out;
}
