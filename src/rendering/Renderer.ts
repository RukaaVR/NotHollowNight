import { VIEW_H, VIEW_W } from '../camera/Camera';
import { TAU, clamp } from '../core/math';
import type { GameWorld } from '../world/GameWorld';
import { T, TILE } from '../world/tiles';
import { qualityParams, semanticColors, type Settings } from '../accessibility/settings';
import { TilePainter } from './TilePainter';
import { backdrop, LAYER_H, LAYER_W } from './Backgrounds';
import { glow, glowSprite, makeCanvas, mix, withAlpha } from './draw';
import { PK, type Particles } from '../vfx/Particles';
import { drawProjectile } from '../combat/Projectile';
import { drawAeren } from '../player/drawAeren';
import type { Entity } from '../world/Entity';

const CHUNK = 16;
const CHUNK_PX = CHUNK * TILE;

interface Chunk {
  canvas: HTMLCanvasElement;
  version: number;
  scale: number;
  used: number;
}

export interface PostFx {
  flashColor: string;
  flashAlpha: number;
  photoFilter: number;
  photoVignette: number;
  photoExposure: number;
  photoDof: number;
  hideUI: boolean;
}

/**
 * Canvas2D renderer. The world is drawn in logical 480×270 space scaled to
 * the backing canvas; static geometry lives in cached chunks, and lighting is
 * composited from a low-resolution lightmap.
 */
export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  /** Device pixels per logical pixel. */
  scale = 1;
  offX = 0;
  offY = 0;
  private painter = new TilePainter();
  private chunks = new Map<string, Chunk>();
  private frame = 0;
  private lightCanvas: HTMLCanvasElement;
  private lightCtx: CanvasRenderingContext2D;
  private lightSprite: HTMLCanvasElement;
  private vignette: HTMLCanvasElement | null = null;
  private dynamicRoom = '';
  private dynamicTiles: number[] = [];
  /** Draw-call style counters for the debug overlay. */
  stats = { chunks: 0, entities: 0, particles: 0, lights: 0, chunkBuilds: 0 };
  settings: Settings;
  post: PostFx = { flashColor: '#fff', flashAlpha: 0, photoFilter: 0, photoVignette: 1, photoExposure: 1, photoDof: 0, hideUI: false };

  constructor(canvas: HTMLCanvasElement, settings: Settings) {
    this.canvas = canvas;
    this.settings = settings;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Canvas 2D not supported');
    this.ctx = ctx;
    this.lightCanvas = makeCanvas(VIEW_W, VIEW_H);
    this.lightCtx = this.lightCanvas.getContext('2d')!;
    this.lightSprite = makeCanvas(128, 128);
    const l = this.lightSprite.getContext('2d')!;
    const g = l.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    l.fillStyle = g;
    l.fillRect(0, 0, 128, 128);
  }

  /** Resize the backing store to the window. */
  resize(w: number, h: number, dpr: number): void {
    const q = qualityParams(this.settings.quality, this.settings.reducedParticles);
    const ratio = Math.min(dpr, 2) * q.renderScale;
    this.canvas.width = Math.max(320, Math.floor(w * ratio));
    this.canvas.height = Math.max(180, Math.floor(h * ratio));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.scale = Math.min(this.canvas.width / VIEW_W, this.canvas.height / VIEW_H);
    this.offX = Math.floor((this.canvas.width - VIEW_W * this.scale) / 2);
    this.offY = Math.floor((this.canvas.height - VIEW_H * this.scale) / 2);
    const lres = q.lightRes * this.scale;
    this.lightCanvas.width = Math.max(64, Math.floor(VIEW_W * lres));
    this.lightCanvas.height = Math.max(36, Math.floor(VIEW_H * lres));
    this.vignette = null;
    this.chunks.clear();
  }

  /** Set the transform to logical screen space (UI). */
  screenSpace(): void {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, this.offX, this.offY);
  }

  clear(color = '#000'): void {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = color;
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  // ------------------------------------------------------------------
  renderWorld(w: GameWorld, time: number): void {
    this.frame++;
    const c = this.ctx;
    const cam = w.camera;
    const q = qualityParams(this.settings.quality, this.settings.reducedParticles);
    const zoom = cam.zoom;
    const S = this.scale * zoom;
    const left = cam.left;
    const top = cam.top;
    this.stats.chunks = 0;
    this.stats.entities = 0;
    this.stats.lights = 0;

    this.clear('#000');
    // Clip to the letterboxed view
    c.save();
    c.beginPath();
    c.rect(this.offX, this.offY, VIEW_W * this.scale, VIEW_H * this.scale);
    c.clip();

    // ---- Backdrop (sky + parallax)
    const bd = backdrop(w.regionDef, this.scale, q.parallaxLayers);
    this.screenSpace();
    c.drawImage(bd.sky, 0, 0, VIEW_W, VIEW_H);
    const ph = w.grid.ph;
    for (const layer of bd.layers) {
      const f = layer.factor;
      const lw = LAYER_W;
      let sx = -((left * f + time * layer.drift) % lw);
      if (sx > 0) sx -= lw;
      const sy = -270 + (ph - 270) * f - top * f;
      for (let x = sx; x < VIEW_W; x += lw) c.drawImage(layer.canvas, x, sy, lw, LAYER_H);
    }
    if (this.settings.highContrast) {
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    // ---- World space
    c.setTransform(S, 0, 0, S, this.offX - left * S, this.offY - top * S);
    this.drawChunks(w, left, top, cam.viewW, cam.viewH);
    this.drawDynamicTiles(w, time, left, top, cam.viewW, cam.viewH);

    // Entities (sorted by layer); player at 50
    const ents = w.entities;
    const vx0 = left - 64;
    const vx1 = left + cam.viewW + 64;
    const vy0 = top - 64;
    const vy1 = top + cam.viewH + 64;
    const list: Entity[] = [];
    for (const e of ents) if (e.x + e.w > vx0 && e.x < vx1 && e.y + e.h > vy0 && e.y < vy1) list.push(e);
    list.sort((a, b) => a.layer - b.layer);
    let playerDrawn = false;
    for (const e of list) {
      if (!playerDrawn && e.layer > 50) {
        drawAeren(c, w.player, time);
        playerDrawn = true;
      }
      e.draw(c);
      this.stats.entities++;
    }
    if (!playerDrawn) drawAeren(c, w.player, time);
    for (const p of w.projectiles) if (p.active) drawProjectile(c, p, time);
    this.drawParticles(w.fx, false);

    // Liquids in front of entities
    this.drawLiquids(w, time, left, top, cam.viewW, cam.viewH);

    // ---- Lighting
    this.drawLighting(w, time, left, top, S);
    // Additive particles after lighting so they glow in the dark
    c.setTransform(S, 0, 0, S, this.offX - left * S, this.offY - top * S);
    this.drawParticles(w.fx, true);
    for (const e of list) e.drawGlow?.(c);

    // ---- Post
    this.screenSpace();
    this.drawPost(w, time);
    c.restore();
  }

  private chunkKey(w: GameWorld, cx: number, cy: number): string {
    return `${w.room.id}:${cx}:${cy}`;
  }

  private drawChunks(w: GameWorld, left: number, top: number, vw: number, vh: number): void {
    const c = this.ctx;
    const g = w.grid;
    const cs = clamp(this.scale * w.camera.zoom, 1, 3);
    const cx0 = Math.max(0, Math.floor(left / CHUNK_PX));
    const cy0 = Math.max(0, Math.floor(top / CHUNK_PX));
    const cx1 = Math.min(Math.ceil(g.w / CHUNK) - 1, Math.floor((left + vw) / CHUNK_PX));
    const cy1 = Math.min(Math.ceil(g.h / CHUNK) - 1, Math.floor((top + vh) / CHUNK_PX));
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const key = this.chunkKey(w, cx, cy);
        let ch = this.chunks.get(key);
        if (!ch || ch.version !== g.version || Math.abs(ch.scale - cs) > 0.01) {
          ch = this.buildChunk(w, cx, cy, cs, ch?.canvas);
          this.chunks.set(key, ch);
        }
        ch.used = this.frame;
        c.drawImage(ch.canvas, cx * CHUNK_PX, cy * CHUNK_PX, CHUNK_PX, CHUNK_PX);
        this.stats.chunks++;
      }
    }
    if (this.chunks.size > 48) {
      const old = [...this.chunks.entries()].sort((a, b) => a[1].used - b[1].used).slice(0, this.chunks.size - 40);
      for (const [k] of old) this.chunks.delete(k);
    }
  }

  private buildChunk(w: GameWorld, cx: number, cy: number, cs: number, reuse?: HTMLCanvasElement): Chunk {
    const size = Math.ceil(CHUNK_PX * cs);
    const canvas = reuse && reuse.width === size ? reuse : makeCanvas(size, size);
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, size, size);
    ctx.setTransform(cs, 0, 0, cs, -cx * CHUNK_PX * cs, -cy * CHUNK_PX * cs);
    const g = w.grid;
    const tx0 = cx * CHUNK;
    const ty0 = cy * CHUNK;
    this.painter.paint(ctx, g, w.regionDef, tx0, ty0, Math.min(g.w, tx0 + CHUNK), Math.min(g.h, ty0 + CHUNK));
    this.stats.chunkBuilds++;
    return { canvas, version: g.version, scale: cs, used: this.frame };
  }

  private collectDynamic(w: GameWorld): void {
    if (this.dynamicRoom === w.room.id + ':' + w.grid.version) return;
    this.dynamicRoom = w.room.id + ':' + w.grid.version;
    const g = w.grid;
    this.dynamicTiles = [];
    for (let i = 0; i < g.tiles.length; i++) {
      const t = g.tiles[i];
      if (t === T.Phase || t === T.Crumble || t === T.Hidden) this.dynamicTiles.push(i);
    }
  }

  private drawDynamicTiles(w: GameWorld, time: number, left: number, top: number, vw: number, vh: number): void {
    this.collectDynamic(w);
    const c = this.ctx;
    const g = w.grid;
    const pal = w.palette;
    const seer = w.stats.has.has('seers_lens');
    const p = w.player;
    for (const i of this.dynamicTiles) {
      const tx = i % g.w;
      const ty = Math.floor(i / g.w);
      const px = tx * TILE;
      const py = ty * TILE;
      if (px + TILE < left || px > left + vw || py + TILE < top || py > top + vh) continue;
      const t = g.tiles[i];
      if (t === T.Phase) {
        const a = 0.35 + 0.15 * Math.sin(time * 3 + tx * 0.7 + ty);
        const open = !!w.progress.abilities.phase;
        c.fillStyle = open ? `rgba(200,140,255,${a * 0.5})` : `rgba(170,100,255,${a + 0.2})`;
        c.fillRect(px, py, TILE, TILE);
        c.strokeStyle = `rgba(230,200,255,${a})`;
        c.lineWidth = 0.6;
        c.beginPath();
        c.moveTo(px + ((time * 10 + ty * 5) % 16), py);
        c.lineTo(px + ((time * 10 + ty * 5 + 8) % 16), py + 16);
        c.stroke();
      } else if (t === T.Crumble) {
        const k = g.crumble[i];
        if (k >= 0.55) continue;
        const shake = k > 0 ? (Math.random() - 0.5) * 2 : 0;
        c.fillStyle = mix(pal.tile, '#000000', 0.1);
        c.fillRect(px + shake, py, TILE, TILE);
        c.strokeStyle = 'rgba(0,0,0,0.5)';
        c.lineWidth = 0.75;
        c.strokeRect(px + 1 + shake, py + 1, 6, 6);
        c.strokeRect(px + 8 + shake, py + 2, 7, 5);
        c.strokeRect(px + 3 + shake, py + 8, 10, 7);
        c.fillStyle = withAlpha(pal.tileHi, 0.5);
        c.fillRect(px + shake, py, TILE, 1);
      } else if (t === T.Hidden && seer) {
        const d = Math.hypot(p.cx - (px + 8), p.cy - (py + 8));
        if (d < 120) {
          c.fillStyle = `rgba(230,247,166,${(0.25 + 0.15 * Math.sin(time * 4)) * (1 - d / 120)})`;
          c.fillRect(px, py, TILE, TILE);
        }
      }
    }
  }

  private drawLiquids(w: GameWorld, time: number, left: number, top: number, vw: number, vh: number): void {
    const c = this.ctx;
    const g = w.grid;
    const tx0 = Math.max(0, Math.floor(left / TILE));
    const ty0 = Math.max(0, Math.floor(top / TILE));
    const tx1 = Math.min(g.w - 1, Math.floor((left + vw) / TILE));
    const ty1 = Math.min(g.h - 1, Math.floor((top + vh) / TILE));
    const pal = w.palette;
    const deep = mix(pal.sky1, '#0a2a3a', 0.5);
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        const t = g.tiles[ty * g.w + tx];
        if (t !== T.Water && t !== T.Shallow && t !== T.Acid) continue;
        const px = tx * TILE;
        const py = ty * TILE;
        const above = g.tile(tx, ty - 1);
        const surface = above !== t && above !== T.Water && above !== T.Shallow && above !== T.Acid;
        if (t === T.Acid) {
          c.fillStyle = 'rgba(90,200,60,0.5)';
          c.fillRect(px, py, TILE, TILE);
          if (surface) {
            c.fillStyle = 'rgba(190,255,120,0.9)';
            const wv = Math.sin(time * 4 + tx) * 1.2;
            c.fillRect(px, py + 2 + wv, TILE, 1.5);
            if (Math.random() < 0.01) w.fx.spawn(PK.Bubble, px + Math.random() * 16, py + 4, 0, -20, 0.5, 1.2, 'rgba(190,255,120,0.8)');
          }
          continue;
        }
        const alpha = t === T.Shallow ? 0.35 : 0.62;
        c.fillStyle = withAlpha(deep, alpha);
        if (surface) {
          const wv = Math.sin(time * 2 + tx * 0.9) * 1.2 + Math.sin(time * 3.3 + tx * 0.4) * 0.6;
          c.fillRect(px, py + 3 + wv, TILE, TILE - 3 - wv);
          c.fillStyle = withAlpha(pal.accent, 0.55);
          c.fillRect(px, py + 3 + wv, TILE, 1);
          c.fillStyle = withAlpha('#ffffff', 0.12);
          c.fillRect(px + ((time * 12 + tx * 7) % 14), py + 4 + wv, 3, 0.8);
        } else c.fillRect(px, py, TILE, TILE);
      }
    }
    if (w.player.inWater) {
      // Underwater tint on the whole view
      c.fillStyle = 'rgba(20,70,90,0.18)';
      c.fillRect(left, top, vw, vh);
    }
  }

  private drawParticles(fx: Particles, additive: boolean): void {
    const c = this.ctx;
    const n = fx.count;
    if (additive) c.globalCompositeOperation = 'lighter';
    let drawn = 0;
    for (let i = 0; i < n; i++) {
      if ((fx.add[i] === 1) !== additive) continue;
      drawn++;
      const k = fx.life[i] / fx.max[i];
      const x = fx.x[i];
      const y = fx.y[i];
      const col = fx.color[i];
      const sz = fx.size2[i] + (fx.size[i] - fx.size2[i]) * k;
      switch (fx.kind[i] as PK) {
        case PK.Spark:
        case PK.Streak: {
          c.strokeStyle = col;
          c.globalAlpha = Math.min(1, k * 1.5);
          c.lineWidth = sz;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - fx.vx[i] * 0.035, y - fx.vy[i] * 0.035);
          c.stroke();
          break;
        }
        case PK.Dust:
        case PK.Smoke: {
          c.globalAlpha = k * (fx.kind[i] === PK.Smoke ? 0.8 : 0.9);
          c.fillStyle = col;
          c.beginPath();
          c.arc(x, y, sz, 0, TAU);
          c.fill();
          break;
        }
        case PK.Ember:
        case PK.Glow: {
          c.globalAlpha = Math.min(1, k * 1.4);
          if (sz > 1.8) c.drawImage(glowSprite(col) as CanvasImageSource, x - sz * 2, y - sz * 2, sz * 4, sz * 4);
          c.fillStyle = col;
          c.fillRect(x - sz * 0.4, y - sz * 0.4, sz * 0.8, sz * 0.8);
          break;
        }
        case PK.Mote: {
          c.globalAlpha = Math.min(1, k * 3, (1 - k) * 6 + 0.2);
          c.fillStyle = col;
          c.fillRect(x - sz / 2, y - sz / 2, sz, sz);
          break;
        }
        case PK.Shard: {
          c.globalAlpha = Math.min(1, k * 2);
          c.fillStyle = col;
          c.save();
          c.translate(x, y);
          c.rotate(fx.rot[i]);
          c.beginPath();
          c.moveTo(0, -sz);
          c.lineTo(sz * 0.6, sz * 0.5);
          c.lineTo(-sz * 0.6, sz * 0.5);
          c.closePath();
          c.fill();
          c.restore();
          break;
        }
        case PK.Ring: {
          const r = fx.size2[i] + (fx.size[i] - fx.size2[i]) * k;
          c.globalAlpha = k;
          c.strokeStyle = col;
          c.lineWidth = 1.5 * k + 0.3;
          c.beginPath();
          c.arc(x, y, r, 0, TAU);
          c.stroke();
          break;
        }
        case PK.Leaf: {
          c.globalAlpha = Math.min(1, k * 3);
          c.fillStyle = col;
          c.save();
          c.translate(x, y);
          c.rotate(fx.rot[i]);
          c.beginPath();
          c.ellipse(0, 0, sz, sz * 0.45, 0, 0, TAU);
          c.fill();
          c.restore();
          break;
        }
        case PK.Drop: {
          c.globalAlpha = Math.min(1, k * 2);
          c.strokeStyle = col;
          c.lineWidth = sz;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x - fx.vx[i] * 0.02, y - fx.vy[i] * 0.02);
          c.stroke();
          break;
        }
        case PK.Bubble: {
          c.globalAlpha = Math.min(1, k * 2);
          c.strokeStyle = col;
          c.lineWidth = 0.6;
          c.beginPath();
          c.arc(x, y, sz, 0, TAU);
          c.stroke();
          break;
        }
      }
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    if (additive) this.stats.particles = drawn + this.stats.particles;
    else this.stats.particles = drawn;
  }

  private drawLighting(w: GameWorld, time: number, left: number, top: number, S: number): void {
    const room = w.room;
    const pal = w.palette;
    let dark = pal.darkness * 0.64 + (room.dark === 1 ? 0.12 : room.dark === 2 ? 0.32 : 0) + w.extraDarkness;
    if (this.settings.highContrast) dark *= 0.75;
    // Arenas are lit during a fight so every attack stays readable.
    const boss = w.activeBoss;
    if (boss?.bossActive) dark *= 0.55;
    dark = clamp(dark, 0, 0.97);
    if (dark < 0.02) return;
    const lc = this.lightCtx;
    const LW = this.lightCanvas.width;
    const LH = this.lightCanvas.height;
    const L = LW / (VIEW_W / w.camera.zoom);
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.fillStyle = withAlpha(mix(pal.sky0, '#000000', 0.6), dark);
    lc.fillRect(0, 0, LW, LH);
    lc.globalCompositeOperation = 'destination-out';
    const punch = (x: number, y: number, r: number, intensity: number) => {
      const sx = (x - left) * L;
      const sy = (y - top) * L;
      const rr = r * L;
      if (sx + rr < 0 || sy + rr < 0 || sx - rr > LW || sy - rr > LH) return false;
      lc.globalAlpha = clamp(intensity, 0, 1);
      lc.drawImage(this.lightSprite, sx - rr, sy - rr, rr * 2, rr * 2);
      return true;
    };
    // Player light
    const p = w.player;
    const lantern = !!w.progress.abilities.lantern;
    let pr = (lantern ? 115 : room.dark === 2 ? 38 : 72) * w.stats.lightRadius;
    pr *= 1 + Math.sin(time * 3) * 0.02;
    punch(p.cx, p.cy, pr, 1);
    if (boss?.bossActive && !boss.dead) punch(boss.cx, boss.cy, Math.max(90, Math.max(boss.w, boss.h) * 1.8), 0.9);
    const glows: { x: number; y: number; r: number; c: string; i: number }[] = [];
    if (lantern) glows.push({ x: p.cx, y: p.cy, r: pr * 0.5, c: '#ffe9a8', i: 0.18 });
    for (const e of w.entities) {
      const l = e.light;
      if (!l) continue;
      const f = l.flicker ? 1 + Math.sin(time * 13 + e.x) * l.flicker * 0.5 + Math.sin(time * 7.3 + e.y) * l.flicker * 0.5 : 1;
      const x = e.cx + (l.ox ?? 0);
      const y = e.cy + (l.oy ?? 0);
      if (punch(x, y, l.r * f, l.intensity)) {
        glows.push({ x, y, r: l.r * 0.55 * f, c: l.color, i: l.intensity * 0.22 });
        this.stats.lights++;
      }
    }
    for (const pj of w.projectiles) {
      if (!pj.active || pj.delay > 0) continue;
      if (punch(pj.x, pj.y, pj.r * 6, 0.8)) glows.push({ x: pj.x, y: pj.y, r: pj.r * 4, c: pj.color, i: 0.25 });
    }
    lc.globalAlpha = 1;
    // Composite the lightmap over the scene
    const c = this.ctx;
    this.screenSpace();
    c.imageSmoothingEnabled = true;
    c.drawImage(this.lightCanvas, 0, 0, VIEW_W, VIEW_H);
    // Coloured bloom of each light
    c.setTransform(S, 0, 0, S, this.offX - left * S, this.offY - top * S);
    for (const g of glows) glow(c, g.x, g.y, g.r, g.c, g.i);
  }

  private drawPost(w: GameWorld, time: number): void {
    const c = this.ctx;
    const pal = w.palette;
    // Fog toward the bottom of the view
    if (!this.settings.highContrast) {
      const g = c.createLinearGradient(0, VIEW_H * 0.55, 0, VIEW_H);
      g.addColorStop(0, withAlpha(pal.fog, 0));
      g.addColorStop(1, pal.fog);
      c.fillStyle = g;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Colour grade
    c.globalCompositeOperation = 'soft-light';
    c.fillStyle = withAlpha(pal.ambient, 0.18);
    c.fillRect(0, 0, VIEW_W, VIEW_H);
    c.globalCompositeOperation = 'source-over';
    // Photo-mode filters
    const pf = this.post;
    if (pf.photoFilter === 1) {
      c.globalCompositeOperation = 'saturation';
      c.fillStyle = '#808080';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalCompositeOperation = 'source-over';
    } else if (pf.photoFilter === 2) {
      c.globalCompositeOperation = 'color';
      c.fillStyle = 'rgba(160,110,60,0.55)';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalCompositeOperation = 'source-over';
    } else if (pf.photoFilter === 3) {
      c.globalCompositeOperation = 'soft-light';
      c.fillStyle = 'rgba(60,120,220,0.5)';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalCompositeOperation = 'source-over';
    }
    if (pf.photoExposure !== 1) {
      c.globalCompositeOperation = pf.photoExposure > 1 ? 'screen' : 'multiply';
      c.fillStyle = pf.photoExposure > 1 ? `rgba(255,255,255,${(pf.photoExposure - 1) * 0.5})` : `rgba(0,0,0,${(1 - pf.photoExposure) * 0.8})`;
      if (pf.photoExposure < 1) c.globalCompositeOperation = 'source-over';
      c.fillRect(0, 0, VIEW_W, VIEW_H);
      c.globalCompositeOperation = 'source-over';
    }
    // Vignette
    if (!this.vignette) {
      this.vignette = makeCanvas(VIEW_W, VIEW_H);
      const v = this.vignette.getContext('2d')!;
      const g = v.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.6)');
      v.fillStyle = g;
      v.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    c.globalAlpha = pf.photoVignette;
    c.drawImage(this.vignette, 0, 0);
    c.globalAlpha = 1;
    const sem = semanticColors(this.settings);
    // Low vigor heartbeat
    const p = w.player;
    if (p.vigor <= 1 && p.state !== 'dead' && p.maxVigor > 1) {
      const beat = Math.pow(Math.max(0, Math.sin(time * 4)), 6);
      c.fillStyle = withAlpha(sem.danger, 0.08 + beat * (this.settings.reduceFlashes ? 0.05 : 0.14));
      c.fillRect(0, 0, VIEW_W, 6);
      c.fillRect(0, VIEW_H - 6, VIEW_W, 6);
      c.fillRect(0, 0, 6, VIEW_H);
      c.fillRect(VIEW_W - 6, 0, 6, VIEW_H);
    }
    // Umbral pressure
    const up = w.umbralPressure;
    if (up > 0.2) {
      c.fillStyle = `rgba(30,10,60,${(up - 0.2) * 0.5})`;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Flash
    if (pf.flashAlpha > 0) {
      c.fillStyle = withAlpha(pf.flashColor, pf.flashAlpha * (this.settings.reduceFlashes ? 0.3 : 1));
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Fade
    const fade = w.fadeAmount;
    if (fade > 0) {
      c.fillStyle = `rgba(0,0,0,${fade})`;
      c.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  /** Debug overlay of hitboxes, hurtboxes and collision. */
  drawDebug(w: GameWorld, opts: { hit: boolean; collide: boolean }): void {
    const c = this.ctx;
    const cam = w.camera;
    const S = this.scale * cam.zoom;
    c.setTransform(S, 0, 0, S, this.offX - cam.left * S, this.offY - cam.top * S);
    c.lineWidth = 1 / S;
    if (opts.collide) {
      const g = w.grid;
      c.strokeStyle = 'rgba(0,255,120,0.35)';
      const tx0 = Math.max(0, Math.floor(cam.left / TILE));
      const ty0 = Math.max(0, Math.floor(cam.top / TILE));
      for (let ty = ty0; ty < Math.min(g.h, ty0 + 20); ty++) for (let tx = tx0; tx < Math.min(g.w, tx0 + 32); tx++) if (g.isSolidAt(tx, ty)) c.strokeRect(tx * TILE, ty * TILE, TILE, TILE);
      c.strokeStyle = 'rgba(0,160,255,0.8)';
      for (const s of w.solids) if (s.active) c.strokeRect(s.x, s.y, s.w, s.h);
    }
    if (opts.hit) {
      c.strokeStyle = 'rgba(80,200,255,0.9)';
      const p = w.player;
      c.strokeRect(p.x, p.y, p.w, p.h);
      if (p.atkKind) {
        const r = p.attackRect();
        c.strokeStyle = 'rgba(255,240,80,0.9)';
        c.strokeRect(r.x, r.y, r.w, r.h);
      }
      c.strokeStyle = 'rgba(255,60,60,0.9)';
      for (const e of w.entities) if (e.hittable) {
        const h = e.hurtbox();
        c.strokeRect(h.x, h.y, h.w, h.h);
      }
      for (const pj of w.projectiles) if (pj.active) {
        c.beginPath();
        c.arc(pj.x, pj.y, pj.r, 0, TAU);
        c.stroke();
      }
    }
  }
}
