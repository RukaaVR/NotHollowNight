import { Entity, type HitInfo, type HitResult } from '../Entity';
import type { GameWorld } from '../GameWorld';
import { TILE } from '../tiles';
import { TAU } from '../../core/math';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, fillCircle, shade, ellipse } from '../../rendering/draw';
import { PK } from '../../vfx/Particles';
import { loreFor } from '../../story/lore';
import { hasFlag, setFlag } from '../../progression/Progress';
import { FloatText } from './effects';

/** VEIL SHRINE — rest, save, heal, manage relics. */
export class Shrine extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number) {
    super(world);
    this.w = 28;
    this.h = 30;
    this.x = tx * TILE + 8 - 14;
    this.y = (ty + 1) * TILE - 30;
    this.layer = 12;
    this.interactRange = 26;
    this.light = { r: 120, color: '#ffe8b0', intensity: 1, oy: -8, flicker: 0.05 };
  }

  interactLabel(): string {
    return 'Rest';
  }

  interact(): void {
    const p = this.world.player;
    p.placeAt(this.cx, this.bottom);
    this.world.restAtShrine();
  }

  update(dt: number): void {
    this.t += dt;
    if (fxRng.next() < 0.25) {
      const a = fxRng.next() * TAU;
      this.world.fx.spawn(PK.Glow, this.cx + Math.cos(a) * 10, this.y + 4 + Math.sin(a) * 4, 0, -14 - fxRng.next() * 10, 1.4, 1.2, '#ffe8b0', { additive: true, size2: 0.1 });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const by = this.bottom;
    const pal = this.world.palette;
    const resting = this.world.player.state === 'rest';
    // Plinth
    ctx.fillStyle = shade(pal.tileDark, 0.05);
    ctx.beginPath();
    ctx.moveTo(x - 14, by);
    ctx.lineTo(x - 11, by - 6);
    ctx.lineTo(x + 11, by - 6);
    ctx.lineTo(x + 14, by);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = shade(pal.tile, 0.1);
    ctx.fillRect(x - 10, by - 8, 20, 3);
    // Two curved arms holding a floating veil
    ctx.strokeStyle = shade(pal.tileHi, -0.2);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, by - 8);
    ctx.quadraticCurveTo(x - 14, by - 22, x - 5, by - 28);
    ctx.moveTo(x + 8, by - 8);
    ctx.quadraticCurveTo(x + 14, by - 22, x + 5, by - 28);
    ctx.stroke();
    // Floating ribbon of light
    const glowAmt = resting ? 1 : 0.7 + 0.15 * Math.sin(this.t * 2);
    glow(ctx, x, by - 18, 34, '#ffe8b0', glowAmt * 0.8);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,236,190,0.9)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const yy = by - 26 + u * 16;
      const xx = x + Math.sin(u * 6 + this.t * 2) * 4 * (1 - u * 0.4);
      if (i === 0) ctx.moveTo(xx, yy);
      else ctx.lineTo(xx, yy);
    }
    ctx.stroke();
    ctx.restore();
    fillCircle(ctx, x, by - 18 + Math.sin(this.t * 1.5) * 1.5, 2.5, '#fff8e8');
  }
}

/** VEIL GATE — fast travel between attuned gates. */
export class VeilGate extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number) {
    super(world);
    this.w = 32;
    this.h = 44;
    this.x = tx * TILE + 8 - 16;
    this.y = (ty + 1) * TILE - 44;
    this.layer = 11;
    this.interactRange = 26;
    this.light = { r: 90, color: '#b9a3ff', intensity: 0.8 };
  }

  get attuned(): boolean {
    return !!this.world.progress.veilGates[this.world.room.id];
  }

  interactLabel(): string {
    return this.attuned ? 'Travel' : 'Attune';
  }

  interact(): void {
    const w = this.world;
    if (!this.attuned) {
      w.progress.veilGates[w.room.id] = true;
      sfx('teleport', this.cx, this.cy);
      w.fx.burst(this.cx, this.cy, 30, '#c8b8ff', 140, 1, 2.5);
      w.fx.ring(this.cx, this.cy, 6, 50, 0.6, '#c8b8ff');
      w.ui.toast('Veil Gate attuned', 'Travel between attuned gates from any of them.', 'info');
      w.save();
      return;
    }
    w.ui.openTravel();
  }

  update(dt: number): void {
    this.t += dt;
    if (this.attuned && fxRng.next() < 0.3) {
      const a = fxRng.next() * TAU;
      this.world.fx.spawn(PK.Glow, this.cx + Math.cos(a) * 11, this.y + 18 + Math.sin(a) * 15, -Math.cos(a) * 8, -Math.sin(a) * 8, 1, 1.2, '#c8b8ff', { additive: true, size2: 0.1 });
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    const x = this.cx;
    const top = this.y;
    const by = this.bottom;
    ctx.fillStyle = shade(pal.tileDark, 0.08);
    ctx.beginPath();
    ctx.moveTo(x - 16, by);
    ctx.lineTo(x - 14, top + 14);
    ctx.quadraticCurveTo(x, top - 4, x + 14, top + 14);
    ctx.lineTo(x + 16, by);
    ctx.lineTo(x + 11, by);
    ctx.lineTo(x + 10, top + 16);
    ctx.quadraticCurveTo(x, top + 4, x - 10, top + 16);
    ctx.lineTo(x - 11, by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = shade(pal.tileHi, -0.25);
    ctx.lineWidth = 1;
    ctx.stroke();
    const on = this.attuned;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x - 10, by);
    ctx.lineTo(x - 10, top + 16);
    ctx.quadraticCurveTo(x, top + 4, x + 10, top + 16);
    ctx.lineTo(x + 10, by);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = on ? 'rgba(120,90,200,0.55)' : 'rgba(40,30,60,0.6)';
    ctx.fillRect(x - 11, top, 22, 44);
    if (on) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = `rgba(200,180,255,${0.25 + i * 0.1})`;
        ctx.beginPath();
        ctx.ellipse(x, top + 24, 4 + i * 3 + Math.sin(this.t * 2 + i) * 1.2, 6 + i * 4, 0, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.restore();
    if (on) glow(ctx, x, top + 24, 26, '#b9a3ff', 0.5);
  }
}

/** Inscriptions, murals and tablets. */
export class LoreTablet extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string, public style: 'tablet' | 'mural' | 'inscription' | 'echo') {
    super(world);
    this.w = style === 'mural' ? 40 : 16;
    this.h = style === 'mural' ? 28 : 20;
    this.x = tx * TILE + 8 - this.w / 2;
    this.y = (ty + 1) * TILE - this.h;
    this.layer = 10;
    this.interactRange = 24;
  }

  interactLabel(): string {
    return 'Read';
  }

  interact(): void {
    const e = loreFor('tablet', this.id);
    this.world.progress.lore[this.id] = true;
    sfx('menu_open');
    this.world.ui.lore(e.title, e.text);
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const pal = this.world.palette;
    const read = this.world.progress.lore[this.id];
    if (this.style === 'mural') {
      ctx.fillStyle = shade(pal.tileDark, 0.12);
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.strokeStyle = shade(pal.tileHi, -0.3);
      ctx.strokeRect(this.x + 1.5, this.y + 1.5, this.w - 3, this.h - 3);
      // Stylised faded figures
      ctx.fillStyle = withA(pal.accent, 0.35);
      for (let i = 0; i < 4; i++) {
        const fx = this.x + 7 + i * 9;
        ctx.beginPath();
        ctx.arc(fx, this.y + 9, 2, 0, TAU);
        ctx.fill();
        ctx.fillRect(fx - 1.5, this.y + 11, 3, 8);
      }
      ctx.beginPath();
      ctx.arc(this.cx, this.y + 6, 10, Math.PI, 0);
      ctx.strokeStyle = withA(pal.accent, 0.4);
      ctx.stroke();
    } else {
      ctx.fillStyle = shade(pal.tileDark, 0.15);
      ctx.beginPath();
      ctx.moveTo(this.x, this.bottom);
      ctx.lineTo(this.x + 1, this.y + 4);
      ctx.quadraticCurveTo(this.cx, this.y - 2, this.x + this.w - 1, this.y + 4);
      ctx.lineTo(this.x + this.w, this.bottom);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = shade(pal.tileHi, -0.35);
      ctx.stroke();
      ctx.fillStyle = withA(pal.accent, read ? 0.3 : 0.7);
      for (let i = 0; i < 4; i++) ctx.fillRect(this.x + 4, this.y + 6 + i * 3, this.w - 8 - (i % 2) * 3, 1);
    }
    if (!read) glow(ctx, this.cx, this.cy, 14, pal.accent, 0.25 + 0.15 * Math.sin(this.t * 3));
  }
}

function withA(c: string, a: number): string {
  if (c.startsWith('#')) {
    const n = parseInt(c.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  return c;
}

/** Static light sources: hanging lanterns, crystals, torches. */
export class LightSource extends Entity {
  t = fxRng.next() * 10;
  constructor(world: GameWorld, tx: number, ty: number, public kind: 'lantern' | 'crystal' | 'torch') {
    super(world);
    this.x = tx * TILE + 4;
    this.y = ty * TILE + 2;
    this.w = 8;
    this.h = 12;
    this.layer = 8;
    const pal = world.regionDef.palette;
    if (kind === 'lantern') this.light = { r: 95, color: '#ffcf8a', intensity: 0.95, flicker: 0.08 };
    else if (kind === 'crystal') this.light = { r: 80, color: pal.accent, intensity: 0.85, flicker: 0.02 };
    else this.light = { r: 105, color: '#ffa860', intensity: 1, flicker: 0.18 };
  }

  update(dt: number): void {
    this.t += dt;
    if (this.kind === 'torch' && fxRng.next() < 0.4) this.world.fx.embers(this.cx, this.y + 2, 1, '#ffb060');
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const y = this.y;
    if (this.kind === 'lantern') {
      ctx.strokeStyle = '#2a2420';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 1);
      ctx.stroke();
      const sway = Math.sin(this.t * 1.3) * 0.08;
      ctx.save();
      ctx.translate(x, y + 1);
      ctx.rotate(sway);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(-3.5, 0, 7, 1.5);
      ctx.fillStyle = 'rgba(255,200,120,0.85)';
      ctx.fillRect(-2.5, 1.5, 5, 6);
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(-3.5, 7.5, 7, 1.5);
      ctx.restore();
      glow(ctx, x, y + 5, 16, '#ffcf8a', 0.9);
    } else if (this.kind === 'crystal') {
      const c = this.world.palette.accent;
      ctx.fillStyle = c;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 4, y + 9);
      ctx.lineTo(x, y + 14);
      ctx.lineTo(x - 4, y + 9);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 6);
      ctx.lineTo(x - 2, y + 11);
      ctx.lineTo(x - 6, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      glow(ctx, x, y + 8, 18, c, 0.6 + 0.2 * Math.sin(this.t * 2));
    } else {
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(x - 1.5, y + 4, 3, 9);
      ctx.fillRect(x - 3, y + 3, 6, 2);
      const f = 1 + Math.sin(this.t * 20) * 0.15;
      ctx.fillStyle = '#ffb060';
      ctx.beginPath();
      ctx.moveTo(x - 2.5, y + 3);
      ctx.quadraticCurveTo(x, y - 6 * f, x + 2.5, y + 3);
      ctx.fill();
      ctx.fillStyle = '#fff0c0';
      ctx.beginPath();
      ctx.moveTo(x - 1, y + 3);
      ctx.quadraticCurveTo(x, y - 2 * f, x + 1, y + 3);
      ctx.fill();
      glow(ctx, x, y, 18, '#ffa860', 0.9);
    }
  }
}

/** Decorative and environmental-storytelling props. */
export class Prop extends Entity {
  t = fxRng.next() * 10;
  constructor(world: GameWorld, tx: number, ty: number, public kind: string, public text: string | undefined, public flip: boolean) {
    super(world);
    const size = PROP_SIZES[kind] ?? [16, 16];
    this.w = size[0];
    this.h = size[1];
    this.x = tx * TILE + 8 - this.w / 2;
    this.y = (ty + 1) * TILE - this.h;
    this.layer = 9;
    if (text) this.interactRange = 26;
    if (kind === 'flowers') this.light = { r: 30, color: '#ffe8f0', intensity: 0.3 };
    if (kind === 'mushroom') this.light = { r: 40, color: '#e8a0ff', intensity: 0.6 };
    if (kind === 'crystal_big') this.light = { r: 70, color: world.regionDef.palette.accent, intensity: 0.7 };
    if (kind === 'door_sealed') this.light = { r: 50, color: '#c8a0ff', intensity: 0.5 };
    if (kind === 'furnace') this.light = { r: 90, color: '#ff8a40', intensity: 0.9, flicker: 0.15 };
    if (kind === 'great_lamp') this.light = hasFlag(world.progress, 'great_lamp_lit') ? { r: 220, color: '#ffd890', intensity: 1, oy: -30 } : null;
  }

  interactLabel(): string {
    return 'Inspect';
  }

  interact(): void {
    if (!this.text) return;
    sfx('menu_open');
    this.world.ui.dialogue({ lines: [{ who: '', text: this.text }] });
  }

  update(dt: number): void {
    this.t += dt;
    if (this.kind === 'door_sealed') {
      const p = this.world.player;
      const d = Math.hypot(p.cx - this.cx, p.cy - this.cy);
      if (d < 90 && fxRng.next() < 0.3) this.world.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * this.w, this.y + fxRng.next() * this.h, 0, -6, 0.8, 1, '#c8a0ff', { additive: true });
    }
    if (this.kind === 'furnace' && fxRng.next() < 0.3) this.world.fx.embers(this.cx, this.y + 10, 1);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    drawProp(ctx, this.world, this.kind, this.x, this.y, this.w, this.h, this.t, this.flip);
  }
}

export const PROP_SIZES: Record<string, [number, number]> = {
  table_plates: [40, 14], skeleton: [20, 8], clock: [18, 34], flowers: [14, 8], statue: [20, 40], statue_queen: [24, 48],
  bell: [24, 24], cart: [30, 16], books: [16, 14], banner: [12, 30], grave: [12, 14], chair: [10, 14], bones: [16, 6],
  machine: [32, 28], mushroom: [12, 16], crystal_big: [18, 28], telescope: [28, 30], fountain: [36, 22], boat: [44, 14],
  chains: [8, 40], cage: [20, 26], altar: [26, 14], tree_dead: [30, 56], well: [24, 20], sign: [14, 18], door_sealed: [32, 48],
  bed: [28, 10], masks_wall: [44, 22], furnace: [30, 34], bookshelf: [24, 40], pipes: [16, 48], lift_skeletons: [30, 30],
  great_lamp: [26, 70], ship_bell: [16, 20], bench: [26, 10], urn: [10, 14], tent: [36, 26], anvil: [16, 10],
};

export function drawProp(ctx: CanvasRenderingContext2D, world: GameWorld, kind: string, x: number, y: number, w: number, h: number, t: number, flip: boolean): void {
  const pal = world.palette;
  const dark = shade(pal.tileDark, 0.1);
  const mid = shade(pal.tile, -0.05);
  const hi = shade(pal.tileHi, -0.2);
  const by = y + h;
  const cx = x + w / 2;
  ctx.save();
  if (flip) {
    ctx.translate(cx * 2, 0);
    ctx.scale(-1, 1);
  }
  switch (kind) {
    case 'table_plates': {
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x, y + 4, w, 3);
      ctx.fillRect(x + 3, y + 7, 2, 7);
      ctx.fillRect(x + w - 5, y + 7, 2, 7);
      for (let i = 0; i < 4; i++) {
        ellipse(ctx, x + 6 + i * 9, y + 3, 3.5, 1.2);
        ctx.fillStyle = '#d8d0c0';
        ctx.fill();
        ellipse(ctx, x + 6 + i * 9, y + 2.4, 1.8, 0.7);
        ctx.fillStyle = i % 2 ? '#8a5a3a' : '#9a8a4a';
        ctx.fill();
      }
      ctx.fillStyle = '#c8b890';
      ctx.fillRect(x + w / 2 - 1, y - 3, 2, 6);
      glow(ctx, x + w / 2, y - 3, 6, '#ffcf8a', 0.5);
      break;
    }
    case 'skeleton':
    case 'bones': {
      ctx.fillStyle = '#cfc6b4';
      fillCircle(ctx, x + 4, by - 4, 3, '#d8d0c0');
      ctx.fillStyle = '#1a1418';
      ctx.fillRect(x + 2.5, by - 5, 1, 1);
      ctx.fillRect(x + 4.5, by - 5, 1, 1);
      ctx.fillStyle = '#cfc6b4';
      for (let i = 0; i < 4; i++) ctx.fillRect(x + 8 + i * 2.5, by - 4, 1.2, 3);
      ctx.fillRect(x + 7, by - 3, w - 8, 1);
      break;
    }
    case 'clock': {
      ctx.fillStyle = dark;
      ctx.fillRect(x + 3, y + 10, w - 6, h - 10);
      fillCircle(ctx, cx, y + 9, 8, mid);
      fillCircle(ctx, cx, y + 9, 6.5, '#e8e0cc');
      ctx.strokeStyle = '#1a1418';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      // Frozen at a quarter past eleven
      ctx.moveTo(cx, y + 9);
      ctx.lineTo(cx + Math.cos(-Math.PI / 2 - Math.PI / 6) * 3.5, y + 9 + Math.sin(-Math.PI / 2 - Math.PI / 6) * 3.5);
      ctx.moveTo(cx, y + 9);
      ctx.lineTo(cx + 5, y + 9);
      ctx.stroke();
      ctx.fillStyle = hi;
      ctx.fillRect(cx - 1, y + 20, 2, 10);
      fillCircle(ctx, cx, y + 30, 2.5, hi);
      break;
    }
    case 'flowers': {
      for (let i = 0; i < 5; i++) {
        const fx = x + 2 + i * 2.5;
        ctx.strokeStyle = '#4a6a3a';
        ctx.beginPath();
        ctx.moveTo(fx, by);
        ctx.lineTo(fx + Math.sin(t + i) * 0.8, by - 5 - (i % 2) * 2);
        ctx.stroke();
        fillCircle(ctx, fx + Math.sin(t + i) * 0.8, by - 5 - (i % 2) * 2, 1.4, i % 2 ? '#ffe8f0' : '#f0d0ff');
      }
      break;
    }
    case 'statue':
    case 'statue_queen': {
      const q = kind === 'statue_queen';
      ctx.fillStyle = dark;
      ctx.fillRect(x, by - 6, w, 6);
      ctx.fillStyle = mid;
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.3, by - 6);
      ctx.lineTo(cx - w * 0.18, y + 14);
      ctx.lineTo(cx + w * 0.18, y + 14);
      ctx.lineTo(cx + w * 0.3, by - 6);
      ctx.closePath();
      ctx.fill();
      fillCircle(ctx, cx, y + 9, 5, mid);
      if (q) {
        ctx.fillStyle = hi;
        for (let i = -2; i <= 2; i++) {
          ctx.beginPath();
          ctx.moveTo(cx + i * 2.2 - 1, y + 4);
          ctx.lineTo(cx + i * 2.2, y - 1 - (i === 0 ? 2 : 0));
          ctx.lineTo(cx + i * 2.2 + 1, y + 4);
          ctx.fill();
        }
        // Hands cradling something that is not there
        ctx.strokeStyle = hi;
        ctx.beginPath();
        ctx.arc(cx, y + 22, 5, 0.2, Math.PI - 0.2);
        ctx.stroke();
      } else {
        // A raised lantern
        ctx.fillStyle = mid;
        ctx.fillRect(cx + 4, y + 6, 2, 10);
        fillCircle(ctx, cx + 5, y + 5, 2, hi);
      }
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.moveTo(cx - 3, y + 18);
      ctx.lineTo(cx + 1, y + 26);
      ctx.lineTo(cx - 2, y + 32);
      ctx.stroke();
      break;
    }
    case 'bell':
    case 'ship_bell': {
      ctx.fillStyle = '#6a5a3a';
      ctx.beginPath();
      ctx.moveTo(cx - w * 0.15, y + 2);
      ctx.quadraticCurveTo(cx - w * 0.4, y + h * 0.5, cx - w * 0.5, by - 2);
      ctx.lineTo(cx + w * 0.5, by - 2);
      ctx.quadraticCurveTo(cx + w * 0.4, y + h * 0.5, cx + w * 0.15, y + 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#9a8a5a';
      ctx.fillRect(cx - w * 0.5, by - 3, w, 2);
      fillCircle(ctx, cx, by - 1, 2, '#4a3a2a');
      break;
    }
    case 'cart': {
      ctx.fillStyle = '#4a3a2a';
      ctx.fillRect(x + 2, y + 2, w - 4, 8);
      fillCircle(ctx, x + 7, by - 3, 3, '#2a2420');
      fillCircle(ctx, x + w - 7, by - 3, 3, '#2a2420');
      ctx.fillStyle = '#7a6a5a';
      ctx.fillRect(x + 4, y, w - 8, 3);
      break;
    }
    case 'books':
    case 'bookshelf': {
      if (kind === 'bookshelf') {
        ctx.fillStyle = '#2a1e14';
        ctx.fillRect(x, y, w, h);
      }
      const rows = kind === 'bookshelf' ? 4 : 1;
      for (let r = 0; r < rows; r++) {
        const ry = kind === 'bookshelf' ? y + 2 + r * 10 : y + 2;
        for (let i = 0; i < w - 3; i += 3) {
          const bh = 6 + ((i * 7 + r * 3) % 4);
          ctx.fillStyle = ['#6a3a2a', '#3a4a6a', '#5a5a2a', '#4a2a4a'][(i + r) % 4];
          ctx.fillRect(x + 1.5 + i, ry + 9 - bh, 2.5, bh);
        }
      }
      break;
    }
    case 'banner': {
      ctx.fillStyle = '#3a3030';
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = '#5a2a3a';
      ctx.beginPath();
      ctx.moveTo(x + 1, y + 2);
      ctx.lineTo(x + w - 1, y + 2);
      ctx.lineTo(x + w - 1 + Math.sin(t) * 0.8, by - 4);
      ctx.lineTo(cx, by - 8);
      ctx.lineTo(x + 1 + Math.sin(t) * 0.8, by - 4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c8a870';
      fillCircle(ctx, cx, y + 10, 2.5, '#c8a870');
      break;
    }
    case 'grave':
    case 'sign':
    case 'urn': {
      ctx.fillStyle = mid;
      if (kind === 'urn') {
        ellipse(ctx, cx, by - 6, 4, 6);
        ctx.fill();
        ctx.fillRect(cx - 2, y, 4, 3);
      } else if (kind === 'sign') {
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(cx - 1, y + 6, 2, h - 6);
        ctx.fillRect(x, y + 2, w, 7);
        ctx.fillStyle = 'rgba(230,210,170,0.5)';
        ctx.fillRect(x + 2, y + 4, w - 4, 1);
        ctx.fillRect(x + 2, y + 6, w - 6, 1);
      } else {
        ctx.beginPath();
        ctx.moveTo(x, by);
        ctx.lineTo(x, y + 4);
        ctx.quadraticCurveTo(cx, y - 2, x + w, y + 4);
        ctx.lineTo(x + w, by);
        ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(cx - 0.5, y + 4, 1, 6);
        ctx.fillRect(cx - 2.5, y + 6, 5, 1);
      }
      break;
    }
    case 'chair': {
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x, y + 7, w, 2);
      ctx.fillRect(x, y, 2, h);
      ctx.fillRect(x + w - 2, y + 7, 2, 7);
      break;
    }
    case 'bench': {
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x, y + 3, w, 2);
      ctx.fillRect(x + 2, y + 5, 2, 5);
      ctx.fillRect(x + w - 4, y + 5, 2, 5);
      break;
    }
    case 'bed': {
      ctx.fillStyle = '#3a2a20';
      ctx.fillRect(x, y + 4, w, 4);
      ctx.fillStyle = '#c8c0b0';
      ctx.fillRect(x + 1, y + 2, w - 2, 3);
      ctx.fillStyle = '#8a7a9a';
      ctx.fillRect(x + 8, y + 2, w - 9, 3);
      break;
    }
    case 'machine':
    case 'pipes': {
      ctx.fillStyle = '#2a2628';
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#5a4a3a';
      for (let i = 0; i < w; i += 8) ctx.fillRect(x + i + 2, y, 3, h);
      if (kind === 'machine') {
        ctx.save();
        ctx.translate(cx, y + h / 2);
        ctx.rotate(t * 0.6);
        ctx.strokeStyle = '#8a7a5a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * TAU;
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        }
        ctx.stroke();
        ctx.restore();
        glow(ctx, x + w - 5, y + 5, 6, '#ffcf7a', 0.5 + 0.3 * Math.sin(t * 3));
      }
      break;
    }
    case 'mushroom': {
      ctx.fillStyle = '#d8c8e0';
      ctx.fillRect(cx - 1.5, y + 7, 3, h - 7);
      ctx.fillStyle = '#b070d0';
      ctx.beginPath();
      ctx.ellipse(cx, y + 7, 6, 5, 0, Math.PI, 0);
      ctx.fill();
      fillCircle(ctx, cx - 2, y + 4, 1, '#ffd0ff');
      fillCircle(ctx, cx + 2.5, y + 5, 0.8, '#ffd0ff');
      glow(ctx, cx, y + 5, 12, '#e8a0ff', 0.4);
      break;
    }
    case 'crystal_big': {
      const c = pal.accent;
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx + 6, y + 14);
      ctx.lineTo(cx + 4, by);
      ctx.lineTo(cx - 4, by);
      ctx.lineTo(cx - 6, y + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(c, -0.3);
      ctx.beginPath();
      ctx.moveTo(cx - 6, y + 12);
      ctx.lineTo(cx - 9, by);
      ctx.lineTo(cx - 4, by);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
      glow(ctx, cx, y + 14, 24, c, 0.5);
      break;
    }
    case 'telescope': {
      ctx.strokeStyle = '#3a3a50';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.lineTo(cx - 6, by - 10);
      ctx.moveTo(cx, by);
      ctx.lineTo(cx + 6, by - 10);
      ctx.moveTo(cx, by);
      ctx.lineTo(cx, by - 12);
      ctx.stroke();
      ctx.save();
      ctx.translate(cx, by - 13);
      ctx.rotate(-0.7);
      ctx.fillStyle = '#8a8ab0';
      ctx.fillRect(-4, -2.5, 22, 5);
      ctx.fillStyle = '#c8c8f0';
      ctx.fillRect(16, -3, 3, 6);
      ctx.restore();
      break;
    }
    case 'fountain':
    case 'well': {
      ctx.fillStyle = mid;
      ctx.fillRect(x, by - 8, w, 8);
      ctx.fillStyle = hi;
      ctx.fillRect(x, by - 9, w, 1.5);
      if (kind === 'fountain') {
        ctx.fillStyle = mid;
        ctx.fillRect(cx - 2, y + 4, 4, h - 12);
        ellipse(ctx, cx, y + 5, 7, 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#3a2a20';
        ctx.fillRect(x + 2, y, 2, h - 8);
        ctx.fillRect(x + w - 4, y, 2, h - 8);
        ctx.fillRect(x, y, w, 2);
      }
      ctx.fillStyle = 'rgba(120,180,220,0.4)';
      ctx.fillRect(x + 2, by - 7, w - 4, 2);
      break;
    }
    case 'boat': {
      ctx.fillStyle = '#3a2a20';
      ctx.beginPath();
      ctx.moveTo(x, y + 4);
      ctx.lineTo(x + w, y + 4);
      ctx.lineTo(x + w - 6, by);
      ctx.lineTo(x + 6, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#5a4a3a';
      ctx.fillRect(x, y + 3, w, 2);
      break;
    }
    case 'chains': {
      ctx.strokeStyle = '#3a3640';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < h; i += 4) {
        ctx.beginPath();
        ctx.ellipse(cx + Math.sin(t + i * 0.1) * 0.5, y + i + 2, 1.5, 2, 0, 0, TAU);
        ctx.stroke();
      }
      break;
    }
    case 'cage': {
      ctx.strokeStyle = '#4a4650';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, y);
      ctx.lineTo(cx, y + 4);
      ctx.stroke();
      for (let i = 0; i <= 4; i++) {
        ctx.beginPath();
        ctx.moveTo(x + i * (w / 4), y + 4);
        ctx.lineTo(x + i * (w / 4), by);
        ctx.stroke();
      }
      ctx.strokeRect(x, y + 4, w, h - 4);
      break;
    }
    case 'altar': {
      ctx.fillStyle = mid;
      ctx.fillRect(x + 2, y + 4, w - 4, h - 4);
      ctx.fillStyle = hi;
      ctx.fillRect(x, y + 2, w, 3);
      glow(ctx, cx, y, 10, pal.accent, 0.4);
      break;
    }
    case 'tree_dead': {
      ctx.strokeStyle = '#2a2420';
      ctx.lineCap = 'round';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx, by);
      ctx.quadraticCurveTo(cx - 3, y + 30, cx + 2, y + 16);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + 1, y + 24);
      ctx.quadraticCurveTo(cx + 10, y + 16, cx + 14, y + 6);
      ctx.moveTo(cx, y + 20);
      ctx.quadraticCurveTo(cx - 10, y + 12, cx - 12, y + 2);
      ctx.moveTo(cx + 2, y + 16);
      ctx.lineTo(cx + 3, y);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.strokeStyle = '#7fd6c8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx - 2, y + 32);
      ctx.lineTo(cx + 3, y + 33);
      ctx.stroke();
      break;
    }
    case 'door_sealed': {
      ctx.fillStyle = '#16121c';
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x, y + 12);
      ctx.quadraticCurveTo(cx, y - 6, x + w, y + 12);
      ctx.lineTo(x + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6a4a8a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      const hum = 0.4 + 0.3 * Math.sin(t * 2);
      ctx.strokeStyle = `rgba(200,160,255,${hum})`;
      ctx.beginPath();
      ctx.arc(cx, y + 24, 8, 0, TAU);
      ctx.moveTo(cx, y + 14);
      ctx.lineTo(cx, by);
      ctx.stroke();
      break;
    }
    case 'masks_wall': {
      for (let i = 0; i < 12; i++) {
        const mx = x + 3 + (i % 6) * 7.5;
        const my = y + 4 + Math.floor(i / 6) * 10;
        ellipse(ctx, mx, my, 2.6, 3.4);
        ctx.fillStyle = i === 11 ? 'rgba(0,0,0,0)' : '#d8d4e0';
        ctx.fill();
        if (i !== 11) {
          ctx.fillStyle = '#2a2430';
          ctx.fillRect(mx - 1.5, my - 1, 1, 1);
          ctx.fillRect(mx + 0.5, my - 1, 1, 1);
        } else {
          ctx.strokeStyle = '#d8d4e0';
          ctx.setLineDash([1, 1]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      break;
    }
    case 'furnace': {
      ctx.fillStyle = '#2a1e1a';
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(x + 3, y + 6);
      ctx.lineTo(x + w - 3, y + 6);
      ctx.lineTo(x + w, by);
      ctx.fill();
      ctx.fillRect(cx - 4, y, 8, 8);
      const f = 0.7 + 0.3 * Math.sin(t * 9);
      ctx.fillStyle = `rgba(255,${120 + 40 * f},60,0.95)`;
      ctx.beginPath();
      ctx.arc(cx, by - 9, 7, Math.PI, 0);
      ctx.lineTo(cx + 7, by - 3);
      ctx.lineTo(cx - 7, by - 3);
      ctx.fill();
      glow(ctx, cx, by - 9, 24, '#ff8a40', f);
      break;
    }
    case 'lift_skeletons': {
      ctx.strokeStyle = '#3a3640';
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = 'rgba(30,26,30,0.6)';
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      for (let i = 0; i < 3; i++) {
        fillCircle(ctx, x + 6 + i * 9, by - 5, 2.5, '#d0c8b8');
        ctx.fillStyle = '#d0c8b8';
        ctx.fillRect(x + 4 + i * 9, by - 3, 5, 1);
      }
      ctx.strokeStyle = '#4a4650';
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 1);
      ctx.lineTo(x + 12, y - 40);
      ctx.stroke();
      break;
    }
    case 'great_lamp': {
      const lit = hasFlag(world.progress, 'great_lamp_lit');
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(cx - 2, y + 26, 4, h - 26);
      ctx.fillRect(cx - 8, by - 4, 16, 4);
      ctx.beginPath();
      ctx.moveTo(cx - 11, y + 26);
      ctx.lineTo(cx - 8, y + 6);
      ctx.lineTo(cx, y);
      ctx.lineTo(cx + 8, y + 6);
      ctx.lineTo(cx + 11, y + 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = lit ? `rgba(255,220,140,${0.85 + 0.1 * Math.sin(t * 3)})` : 'rgba(60,50,40,0.9)';
      ctx.fillRect(cx - 7, y + 8, 14, 16);
      if (lit) glow(ctx, cx, y + 16, 60, '#ffd890', 0.9);
      break;
    }
    case 'tent': {
      ctx.fillStyle = '#5a4030';
      ctx.beginPath();
      ctx.moveTo(x, by);
      ctx.lineTo(cx, y);
      ctx.lineTo(x + w, by);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2a1a14';
      ctx.beginPath();
      ctx.moveTo(cx - 5, by);
      ctx.lineTo(cx, y + 10);
      ctx.lineTo(cx + 5, by);
      ctx.fill();
      break;
    }
    case 'anvil': {
      ctx.fillStyle = '#3a3a44';
      ctx.fillRect(x, y, w, 4);
      ctx.fillRect(cx - 3, y + 4, 6, 4);
      ctx.fillRect(x + 2, by - 2, w - 4, 2);
      break;
    }
    default: {
      ctx.fillStyle = mid;
      ctx.fillRect(x, y, w, h);
    }
  }
  ctx.restore();
}

/** Invisible trigger region that fires a story event once. */
export class Trigger extends Entity {
  constructor(world: GameWorld, tx: number, ty: number, public id: string, wT: number, hT: number, public event: string) {
    super(world);
    this.x = tx * TILE;
    this.y = ty * TILE;
    this.w = wT * TILE;
    this.h = hT * TILE;
  }
  update(): void {
    const p = this.world.player;
    const pr = this.world.progress;
    if (hasFlag(pr, `ev_${this.id}`)) {
      this.dead = true;
      return;
    }
    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y && p.state !== 'dead') {
      setFlag(pr, `ev_${this.id}`);
      this.dead = true;
      this.world.ui.cutscene(this.event);
    }
  }
  draw(): void {
    /* invisible */
  }
}

/** Training dummy: reports damage and DPS. */
export class Dummy extends Entity {
  t = 0;
  wobble = 0;
  total = 0;
  windowStart = 0;
  last = 0;
  constructor(world: GameWorld, tx: number, ty: number) {
    super(world);
    this.w = 14;
    this.h = 26;
    this.x = tx * TILE + 1;
    this.y = (ty + 1) * TILE - 26;
    this.hittable = true;
    this.team = 'enemy';
    this.interactRange = 24;
  }

  interactLabel(): string {
    return 'Inspect';
  }

  interact(): void {
    const s = this.world.stats;
    const lines = [
      `Blade: ${s.bladeDamage.toFixed(1)} damage · speed ×${s.attackSpeed.toFixed(2)} · reach ×${s.reach.toFixed(2)}`,
      `Critical: ${(s.critChance * 100).toFixed(0)}% for ×${s.critMult.toFixed(2)} · global damage ×${s.globalDamage.toFixed(2)}`,
      `Mend: ${s.mendTime.toFixed(2)}s for ${s.mendAmount} Vigor (${s.mendCost} Aether) · Aether gain ×${s.aetherGain.toFixed(2)}`,
      `Dash cooldown ${s.dashCooldown.toFixed(2)}s · Lance ×${s.lanceMult.toFixed(2)} · Charge ${s.chargeTime.toFixed(2)}s`,
      `Last 5 seconds: ${this.total.toFixed(0)} damage. Strike the dummy to measure; it resets itself when left alone.`,
    ];
    this.world.ui.dialogue({ lines: lines.map((text) => ({ who: 'Training Dummy', text })) });
  }

  takeHit(hit: HitInfo): HitResult {
    if (this.world.time - this.last > 5) {
      this.total = 0;
      this.windowStart = this.world.time;
    }
    this.last = this.world.time;
    this.total += hit.damage;
    this.wobble = hit.dir * 1;
    this.world.add(new FloatText(this.world, this.cx + (fxRng.next() - 0.5) * 8, this.y - 4, hit.damage.toFixed(1) + (hit.crit ? '!' : ''), hit.crit ? '#ffcf5a' : '#ffffff'));
    this.world.fx.sparks(hit.x, hit.y, hit.dir, hit.crit ? 12 : 6, hit.crit ? '#ffcf5a' : '#fff2c0');
    sfx(hit.crit ? 'crit' : 'hit', this.cx, this.cy, 0.7);
    return { hit: true, aether: true };
  }

  update(dt: number): void {
    this.t += dt;
    this.wobble *= Math.exp(-6 * dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.cx, this.bottom);
    ctx.rotate(Math.sin(this.t * 18) * this.wobble * 0.25);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(-1.5, -26, 3, 26);
    ctx.fillStyle = '#c8b48a';
    ellipse(ctx, 0, -16, 6, 8);
    ctx.fill();
    fillCircle(ctx, 0, -25, 4, '#c8b48a');
    ctx.strokeStyle = '#6a5a3a';
    ctx.beginPath();
    ctx.moveTo(-6, -16);
    ctx.lineTo(6, -16);
    ctx.stroke();
    ctx.fillStyle = '#7a2a2a';
    fillCircle(ctx, 0, -16, 2, '#9a3a3a');
    ctx.restore();
  }
}

/** Dais in the Hall of Echoes that begins a boss challenge. */
export class ChallengeAltar extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string) {
    super(world);
    this.w = 28;
    this.h = 12;
    this.x = tx * TILE + 8 - 14;
    this.y = (ty + 1) * TILE - 12;
    this.interactRange = 26;
    this.light = { r: 60, color: '#d0c0ff', intensity: 0.6 };
  }
  interactLabel(): string {
    return 'Remember';
  }
  interact(): void {
    this.world.ui.challengeMenu(this.id);
  }
  update(dt: number): void {
    this.t += dt;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2a2638';
    ctx.fillRect(this.x, this.y + 4, this.w, 8);
    ctx.fillStyle = '#c8b8f0';
    ctx.fillRect(this.x + 2, this.y + 3, this.w - 4, 1);
    glow(ctx, this.cx, this.y, 18, '#d0c0ff', 0.5 + 0.2 * Math.sin(this.t * 2));
  }
}

/** The final choice — appears in the Dreamer's chamber after the last battle. */
export class EndingAltar extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string) {
    super(world);
    this.w = 30;
    this.h = 40;
    this.x = tx * TILE + 8 - 15;
    this.y = (ty + 1) * TILE - 40;
    this.interactRange = 30;
    this.light = { r: 140, color: '#fff0d8', intensity: 1 };
  }
  interactLabel(): string {
    return 'Approach';
  }
  interact(): void {
    this.world.ui.ending(this.id);
  }
  update(dt: number): void {
    this.t += dt;
    this.dead = !this.world.progress.bosses.gloam;
    if (fxRng.next() < 0.4) this.world.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * 30, this.bottom, 0, -30, 1.5, 1.5, '#fff0d8', { additive: true, size2: 0.1 });
  }
  draw(ctx: CanvasRenderingContext2D): void {
    glow(ctx, this.cx, this.cy, 50, '#fff0d8', 0.7 + 0.2 * Math.sin(this.t));
    fillCircle(ctx, this.cx, this.cy - 4 + Math.sin(this.t * 1.5) * 3, 6, '#fffaf0');
  }
}
