import { hash2 } from '../core/math';
import { T, TILE } from '../world/tiles';
import type { RoomGrid } from '../world/Room';
import type { RegionDef, TileStyle } from '../world/regions';
import { mix, shade, withAlpha } from './draw';

/**
 * Paints room tiles in a hand-painted style. Solid masses get a dark core,
 * lit rims on exposed faces and region-specific surface details.
 */
export class TilePainter {
  private dist: Uint8Array = new Uint8Array(0);
  private distFor: RoomGrid | null = null;
  private distVersion = -1;

  /** Distance (in tiles, capped at 4) from each solid tile to open air. */
  private ensureDist(g: RoomGrid): void {
    if (this.distFor === g && this.distVersion === g.version) return;
    this.distFor = g;
    this.distVersion = g.version;
    const n = g.w * g.h;
    if (this.dist.length !== n) this.dist = new Uint8Array(n);
    const solid = (x: number, y: number) => {
      const t = g.tileClamped(x, y);
      return t === T.Solid || t === T.SolidAlt || t === T.Hidden;
    };
    for (let y = 0; y < g.h; y++) {
      for (let x = 0; x < g.w; x++) {
        if (!solid(x, y)) {
          this.dist[y * g.w + x] = 0;
          continue;
        }
        let d = 4;
        for (let r = 1; r <= 3 && d === 4; r++) {
          for (let oy = -r; oy <= r && d === 4; oy++) {
            for (let ox = -r; ox <= r; ox++) {
              if (Math.max(Math.abs(ox), Math.abs(oy)) !== r) continue;
              if (!solid(x + ox, y + oy)) {
                d = r;
                break;
              }
            }
          }
        }
        this.dist[y * g.w + x] = d;
      }
    }
  }

  /** Paint tiles in [tx0..tx1) × [ty0..ty1) into ctx (already transformed to room space). */
  paint(ctx: CanvasRenderingContext2D, g: RoomGrid, region: RegionDef, tx0: number, ty0: number, tx1: number, ty1: number): void {
    this.ensureDist(g);
    const pal = region.palette;
    const style = region.style;
    const seed = g.def.id.length * 31 + g.def.pos[0];
    // Backwall: dark rock behind open space near solid masses (gives caves depth).
    for (let y = ty0; y < ty1; y++) {
      for (let x = tx0; x < tx1; x++) {
        const t = g.tile(x, y);
        if (t === T.Solid || t === T.SolidAlt || t === T.Hidden) continue;
        let near = 9;
        for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (this.isSolidish(g, x + ox, y + oy)) near = Math.min(near, Math.max(Math.abs(ox), Math.abs(oy)));
        if (near <= 2) {
          ctx.fillStyle = withAlpha(pal.tileDark, near === 1 ? 0.55 : 0.28);
          ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
        }
      }
    }
    for (let y = ty0; y < ty1; y++) {
      for (let x = tx0; x < tx1; x++) {
        const t = g.tile(x, y);
        const px = x * TILE;
        const py = y * TILE;
        switch (t) {
          case T.Solid:
          case T.SolidAlt:
          case T.Hidden:
            this.solid(ctx, g, x, y, px, py, region, style, seed, t === T.SolidAlt);
            break;
          case T.Breakable:
            this.breakable(ctx, g, x, y, px, py, region);
            break;
          case T.Fragile:
            this.fragile(ctx, px, py, region, hash2(x, y, seed));
            break;
          case T.OneWay:
            this.oneway(ctx, g, x, y, px, py, region, style);
            break;
          case T.Spike:
            this.spike(ctx, g, x, y, px, py, region);
            break;
          case T.Thorn:
            this.thorn(ctx, px, py, hash2(x, y, seed), region);
            break;
          case T.Acid:
            ctx.fillStyle = 'rgba(80,190,60,0.55)';
            ctx.fillRect(px, py, TILE, TILE);
            break;
          default:
            break;
        }
      }
    }
    // Surface decoration pass: tops and undersides of solid masses.
    for (let y = ty0; y < ty1; y++) {
      for (let x = tx0; x < tx1; x++) {
        const t = g.tile(x, y);
        if (t !== T.Solid && t !== T.SolidAlt && t !== T.Hidden) continue;
        const r = hash2(x, y, seed + 7);
        if (!this.isSolidish(g, x, y - 1) && g.tile(x, y - 1) !== T.Spike) this.topDecor(ctx, x * TILE, y * TILE, style, pal, r);
        if (!this.isSolidish(g, x, y + 1) && y + 1 < g.h) this.bottomDecor(ctx, x * TILE, (y + 1) * TILE, style, pal, r);
      }
    }
  }

  private isSolidish(g: RoomGrid, x: number, y: number): boolean {
    const t = g.tileClamped(x, y);
    return t === T.Solid || t === T.SolidAlt || t === T.Hidden || t === T.Breakable || t === T.Fragile;
  }

  private solid(ctx: CanvasRenderingContext2D, g: RoomGrid, x: number, y: number, px: number, py: number, region: RegionDef, style: TileStyle, seed: number, alt: boolean): void {
    const pal = region.palette;
    const d = this.dist[y * g.w + x];
    const r = hash2(x, y, seed);
    const ink = mix(pal.tileDark, '#000000', 0.55);
    const core = mix(pal.tileDark, '#000000', 0.15);
    // Deep interiors are an almost-black silhouette, like the inked masses of a painting.
    ctx.fillStyle = d >= 3 ? core : mix(core, pal.tile, d === 2 ? 0.12 : 0.28);
    ctx.fillRect(px, py, TILE, TILE);
    if (d >= 3) {
      if (r > 0.82) blot(ctx, px, py, r, withAlpha(pal.tile, 0.08));
      return;
    }
    const air = (ox: number, oy: number) => !this.isSolidish(g, x + ox, y + oy);
    const top = air(0, -1);
    const bottom = air(0, 1);
    const left = air(-1, 0);
    const right = air(1, 0);
    const face = alt ? shade(pal.tile, -0.12) : pal.tile;
    // Surface masonry: outlined stones / blocks / planks along every exposed face.
    // Walkable tops carry the detailed stonework; walls and undersides stay dark
    // with only occasional stones, so masses read as bold silhouettes.
    const underTop = !top && y > 0 && !this.isSolidish(g, x, y - 2) && this.isSolidish(g, x, y - 1);
    if (top || (underTop && r > 0.35) || (d === 1 && r > 0.7)) this.masonry(ctx, px, py, style, face, ink, pal, r, top, top ? 1 : 2);
    // Ink outline along the boundary with open air
    ctx.fillStyle = ink;
    if (top) ctx.fillRect(px, py, TILE, 1.6);
    if (bottom) ctx.fillRect(px, py + TILE - 1.6, TILE, 1.6);
    if (left) ctx.fillRect(px, py, 1.6, TILE);
    if (right) ctx.fillRect(px + TILE - 1.6, py, 1.6, TILE);
    // Lit ledge: a bright rim just inside the top edge catches the light.
    if (top) {
      ctx.fillStyle = withAlpha(pal.tileHi, 0.85);
      ctx.fillRect(px + (left ? 2 : 0), py + 1.6, TILE - (left ? 2 : 0) - (right ? 2 : 0), 1.1);
      ctx.fillStyle = withAlpha(pal.tileHi, 0.18);
      ctx.fillRect(px, py + 2.7, TILE, 2.2);
    }
    if (left && !top) {
      ctx.fillStyle = withAlpha(pal.tileHi, 0.22);
      ctx.fillRect(px + 1.6, py, 1, TILE);
    }
    if (top && left) cornerCut(ctx, px, py, 0);
    if (top && right) cornerCut(ctx, px + TILE, py, 1);
    if (bottom && left) cornerCut(ctx, px, py + TILE, 2);
    if (bottom && right) cornerCut(ctx, px + TILE, py + TILE, 3);
  }

  /** One tile's worth of surface stones in the region's construction style. */
  private masonry(ctx: CanvasRenderingContext2D, px: number, py: number, style: TileStyle, face: string, ink: string, pal: RegionDef['palette'], r: number, top: boolean, d: number): void {
    const dim = d === 2 ? 0.35 : top ? 0 : 0.18;
    const fill = mix(face, pal.tileDark, dim);
    const hi = withAlpha(pal.tileHi, top ? 0.4 : 0.18);
    const stone = (x: number, y: number, w: number, h: number, rad: number) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, rad);
      ctx.fill();
      ctx.lineWidth = 0.9;
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.strokeStyle = hi;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(x + rad, y + 0.9);
      ctx.lineTo(x + w - rad, y + 0.9);
      ctx.stroke();
    };
    switch (style) {
      case 'brick':
      case 'marble': {
        const off = (Math.floor(py / TILE) % 2) * 6;
        stone(px - 6 + off, py + 1, 11, 6.5, 1);
        stone(px + 5 + off, py + 1, 11, 6.5, 1);
        stone(px - 1, py + 8.5, 9, 6.5, 1);
        stone(px + 8, py + 8.5, 9, 6.5, 1);
        if (style === 'marble' && r > 0.6) {
          ctx.strokeStyle = withAlpha(pal.tileHi, 0.2);
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(px + r * 16, py + 2);
          ctx.quadraticCurveTo(px + 8, py + 8, px + (1 - r) * 16, py + 14);
          ctx.stroke();
        }
        break;
      }
      case 'metal':
      case 'engine': {
        stone(px + 0.5, py + 0.5, 15, 15, 1.5);
        ctx.fillStyle = withAlpha(pal.tileHi, 0.45);
        for (const [rx, ry] of [[3, 3], [13, 3], [3, 13], [13, 13]]) {
          ctx.beginPath();
          ctx.arc(px + rx, py + ry, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
        if (style === 'engine' && r > 0.7) {
          ctx.strokeStyle = withAlpha(pal.accent, 0.3);
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(px + 8, py + 8, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'wood': {
        stone(px - 1, py + 0.5, 18, 7, 1.5);
        stone(px - 1, py + 8.5, 18, 7, 1.5);
        ctx.strokeStyle = withAlpha(ink, 0.6);
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(px + 2 + r * 6, py + 4);
        ctx.lineTo(px + 10 + r * 4, py + 4.4);
        ctx.stroke();
        break;
      }
      case 'book': {
        const cols = ['#6a3a26', '#2e4468', '#56562a', '#4a2a50', '#2e5a4a'];
        for (let i = 0; i < 4; i++) {
          const h = 13 - ((i + Math.floor(r * 5)) % 3);
          ctx.fillStyle = mix(cols[(i + Math.floor(r * 5)) % 5], pal.tileDark, dim + 0.15);
          ctx.fillRect(px + i * 4 + 0.4, py + 15 - h, 3.2, h);
          ctx.strokeStyle = ink;
          ctx.lineWidth = 0.7;
          ctx.strokeRect(px + i * 4 + 0.4, py + 15 - h, 3.2, h);
          ctx.fillStyle = withAlpha(pal.tileHi, 0.35);
          ctx.fillRect(px + i * 4 + 0.9, py + 17 - h, 2.2, 0.7);
        }
        break;
      }
      case 'crystal': {
        stone(px + 0.5, py + 1, 8, 7, 3);
        stone(px + 7.5, py + 2, 8, 6, 3);
        stone(px + 2, py + 8.5, 12, 6.5, 3);
        if (r > 0.7) {
          ctx.fillStyle = withAlpha(pal.accent, 0.5);
          ctx.beginPath();
          ctx.moveTo(px + 5, py + 14);
          ctx.lineTo(px + 8, py + 4);
          ctx.lineTo(px + 11, py + 14);
          ctx.fill();
        }
        break;
      }
      default: {
        // Rounded cobbles of varied size
        const a = 6 + r * 4;
        stone(px - 1, py + 0.8, a, 7, 3);
        stone(px + a - 0.5, py + 0.8, 17 - a, 7, 3);
        const b = 5 + ((r * 13) % 1) * 5;
        stone(px + 0.5, py + 8.3, b, 7, 3);
        stone(px + b + 1, py + 8.3, 15 - b, 7, 3);
      }
    }
  }

  private topDecor(ctx: CanvasRenderingContext2D, px: number, py: number, style: TileStyle, pal: RegionDef['palette'], r: number): void {
    switch (style) {
      case 'root':
      case 'garden': {
        ctx.fillStyle = style === 'garden' ? '#4a7a50' : '#4a5a34';
        for (let i = 0; i < 4; i++) {
          const gx = px + i * 4 + r * 3;
          const h = 2 + ((r * 10 + i) % 3);
          ctx.fillRect(gx, py - h, 1, h);
        }
        if (style === 'garden' && r > 0.7) {
          ctx.fillStyle = r > 0.85 ? '#ffd8f0' : '#fff4fa';
          ctx.fillRect(px + 7, py - 4, 2, 2);
        }
        break;
      }
      case 'fungal': {
        if (r > 0.65) {
          ctx.fillStyle = '#d8c8e0';
          ctx.fillRect(px + 7, py - 3, 1.5, 3);
          ctx.fillStyle = r > 0.85 ? '#ff9ae8' : '#b070d0';
          ctx.beginPath();
          ctx.ellipse(px + 7.8, py - 3, 3, 2, 0, Math.PI, 0);
          ctx.fill();
        }
        ctx.fillStyle = withAlpha('#c48fd6', 0.35);
        ctx.fillRect(px, py - 1, TILE, 1);
        break;
      }
      case 'crystal': {
        if (r > 0.7) {
          ctx.fillStyle = withAlpha(pal.accent, 0.8);
          ctx.beginPath();
          ctx.moveTo(px + 5, py);
          ctx.lineTo(px + 7, py - 5 - r * 3);
          ctx.lineTo(px + 9, py);
          ctx.fill();
        }
        break;
      }
      case 'stone':
        if (r > 0.6) {
          ctx.fillStyle = 'rgba(230,236,255,0.6)';
          ctx.fillRect(px, py - 1, TILE, 1.5);
        }
        break;
      case 'thorn': {
        ctx.strokeStyle = '#5a2030';
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + 8, py - 3 - r * 2, px + 16, py);
        ctx.stroke();
        break;
      }
      case 'coral': {
        if (r > 0.6) {
          ctx.strokeStyle = r > 0.8 ? '#ff9a8a' : '#e0c070';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px + 8, py);
          ctx.lineTo(px + 7, py - 4);
          ctx.lineTo(px + 5, py - 6);
          ctx.moveTo(px + 7, py - 4);
          ctx.lineTo(px + 10, py - 6);
          ctx.stroke();
        }
        break;
      }
      case 'void':
        if (r > 0.75) {
          ctx.fillStyle = withAlpha(pal.accent, 0.35);
          ctx.fillRect(px + r * 12, py - 1, 3, 1);
        }
        break;
      default:
        break;
    }
  }

  private bottomDecor(ctx: CanvasRenderingContext2D, px: number, py: number, style: TileStyle, pal: RegionDef['palette'], r: number): void {
    if (r < 0.55) return;
    ctx.fillStyle = shade(pal.tile, -0.2);
    switch (style) {
      case 'root':
      case 'garden':
        ctx.strokeStyle = style === 'garden' ? '#3a5a40' : '#3a3020';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 8, py);
        ctx.quadraticCurveTo(px + 4 + r * 8, py + 6, px + 8, py + 6 + r * 10);
        ctx.stroke();
        break;
      case 'crystal':
        ctx.fillStyle = withAlpha(pal.accent, 0.6);
        ctx.beginPath();
        ctx.moveTo(px + 5, py);
        ctx.lineTo(px + 7, py + 4 + r * 4);
        ctx.lineTo(px + 9, py);
        ctx.fill();
        break;
      case 'fungal':
        ctx.fillStyle = withAlpha('#e8a0ff', 0.5);
        ctx.fillRect(px + 7, py, 1, 3 + r * 4);
        break;
      case 'metal':
      case 'engine':
        ctx.strokeStyle = '#2a2628';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px + 8, py);
        ctx.lineTo(px + 8, py + 4 + r * 8);
        ctx.stroke();
        break;
      default:
        ctx.beginPath();
        ctx.moveTo(px + 4, py);
        ctx.lineTo(px + 7, py + 3 + r * 5);
        ctx.lineTo(px + 10, py);
        ctx.fill();
    }
  }

  private breakable(ctx: CanvasRenderingContext2D, g: RoomGrid, x: number, y: number, px: number, py: number, region: RegionDef): void {
    const pal = region.palette;
    const hp = g.hp[y * g.w + x];
    ctx.fillStyle = shade(pal.tile, 0.05);
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3, py + 2);
    ctx.lineTo(px + 8, py + 7);
    ctx.lineTo(px + 6, py + 14);
    ctx.moveTo(px + 8, py + 7);
    ctx.lineTo(px + 14, py + 5);
    if (hp < 3) {
      ctx.moveTo(px + 2, py + 10);
      ctx.lineTo(px + 8, py + 7);
    }
    if (hp < 2) {
      ctx.moveTo(px + 10, py + 15);
      ctx.lineTo(px + 8, py + 7);
    }
    ctx.stroke();
    ctx.fillStyle = withAlpha(pal.tileHi, 0.35);
    ctx.fillRect(px, py, TILE, 1);
  }

  private fragile(ctx: CanvasRenderingContext2D, px: number, py: number, region: RegionDef, r: number): void {
    const pal = region.palette;
    ctx.fillStyle = shade(pal.tile, -0.05);
    ctx.fillRect(px, py, TILE, TILE);
    ctx.strokeStyle = withAlpha(pal.accent, 0.5);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px, py + 4 + r * 6);
    ctx.lineTo(px + 6, py + 8);
    ctx.lineTo(px + 10, py + 3);
    ctx.lineTo(px + 16, py + 9 - r * 4);
    ctx.stroke();
    ctx.fillStyle = withAlpha(pal.tileHi, 0.5);
    ctx.fillRect(px, py, TILE, 1);
  }

  private oneway(ctx: CanvasRenderingContext2D, g: RoomGrid, x: number, y: number, px: number, py: number, region: RegionDef, style: TileStyle): void {
    const pal = region.palette;
    const wood = style === 'wood' || style === 'root' || style === 'garden' || style === 'book' || style === 'fungal';
    ctx.fillStyle = wood ? '#4a3626' : shade(pal.tile, 0.05);
    ctx.fillRect(px, py, TILE, 4);
    ctx.fillStyle = wood ? '#7a5a3a' : withAlpha(pal.tileHi, 0.6);
    ctx.fillRect(px, py, TILE, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(px, py + 4, TILE, 1);
    const left = g.tile(x - 1, y) !== T.OneWay;
    const right = g.tile(x + 1, y) !== T.OneWay;
    ctx.fillStyle = wood ? '#3a2a1c' : shade(pal.tileDark, 0.1);
    if (left) ctx.fillRect(px + 1, py + 4, 2, 4);
    if (right) ctx.fillRect(px + 13, py + 4, 2, 4);
    if (style === 'fungal') {
      ctx.fillStyle = withAlpha('#ff9ae8', 0.4);
      ctx.fillRect(px + 2, py + 1, 2, 1);
    }
  }

  private spike(ctx: CanvasRenderingContext2D, g: RoomGrid, x: number, y: number, px: number, py: number, region: RegionDef): void {
    const ch = g.def.rows[y]?.[x] ?? '^';
    const pal = region.palette;
    ctx.save();
    ctx.translate(px + 8, py + 8);
    const rot = ch === 'v' ? Math.PI : ch === '<' ? -Math.PI / 2 : ch === '>' ? Math.PI / 2 : 0;
    ctx.rotate(rot);
    ctx.fillStyle = shade(pal.tileDark, 0.15);
    ctx.fillRect(-8, 5, 16, 3);
    for (let i = 0; i < 3; i++) {
      const sx = -8 + i * 5.3;
      ctx.fillStyle = shade(pal.tileHi, -0.35);
      ctx.beginPath();
      ctx.moveTo(sx, 6);
      ctx.lineTo(sx + 2.6, -6);
      ctx.lineTo(sx + 5.3, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.moveTo(sx + 2.6, -6);
      ctx.lineTo(sx + 3.6, 4);
      ctx.lineTo(sx + 2.6, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  private thorn(ctx: CanvasRenderingContext2D, px: number, py: number, r: number, _region: RegionDef): void {
    ctx.strokeStyle = '#4a1824';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px, py + 4 + r * 8);
    ctx.bezierCurveTo(px + 5, py - 2, px + 11, py + 18, px + 16, py + 6 + r * 4);
    ctx.moveTo(px + 2, py + 16);
    ctx.bezierCurveTo(px + 6, py + 6, px + 12, py + 12, px + 14, py);
    ctx.stroke();
    ctx.fillStyle = '#a04a5a';
    for (let i = 0; i < 5; i++) {
      const tx = px + 2 + ((i * 7 + r * 16) % 13);
      const ty = py + 2 + ((i * 5 + r * 9) % 12);
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 2.5, ty - 2.5);
      ctx.lineTo(tx + 1, ty + 1);
      ctx.fill();
    }
  }
}

function blot(ctx: CanvasRenderingContext2D, px: number, py: number, r: number, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(px + 4 + r * 8, py + 4 + ((r * 7) % 1) * 8, 3 + r * 2, 2 + r, r * 3, 0, Math.PI * 2);
  ctx.fill();
}

function cornerCut(ctx: CanvasRenderingContext2D, x: number, y: number, corner: number): void {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  const s = 4;
  if (corner === 0) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
  } else if (corner === 1) {
    ctx.moveTo(x, y);
    ctx.lineTo(x - s, y);
    ctx.quadraticCurveTo(x, y, x, y + s);
  } else if (corner === 2) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
  } else {
    ctx.moveTo(x, y);
    ctx.lineTo(x - s, y);
    ctx.quadraticCurveTo(x, y, x, y - s);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
