import type { GameWorld } from '../world/GameWorld';
import type { InputState } from '../core/input';
import type { RoomDef } from '../world/Room';
import { REGION_BY_ID, region } from '../world/regions';
import { makeCanvas, withAlpha } from '../rendering/draw';
import { UI, text } from './text';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { TILE } from '../world/tiles';
import { sfx } from '../core/events';
import { Nav, confirmPressed } from './overlay';
import { TAU } from '../core/math';
import { LINKS } from '../rooms/layout';

const MARKER_COLORS = ['#ffd860', '#ff7a7a', '#9fe8ff', '#c8ff9a'];

/** Interactive world map with discovery rules and player markers. */
export class MapView {
  zoom = 1;
  panX = 0;
  panY = 0;
  private nav = new Nav();
  private canvas: HTMLCanvasElement | null = null;
  private key = '';
  private extentW = 0;
  private extentH = 0;
  markerKind = 0;

  constructor(private w: GameWorld) {
    let mw = 0;
    let mh = 0;
    for (const r of w.map.list) {
      mw = Math.max(mw, r.pos[0] + r.rows[0].length);
      mh = Math.max(mh, r.pos[1] + r.rows.length);
    }
    this.extentW = mw;
    this.extentH = mh;
    this.centerOnPlayer();
  }

  centerOnPlayer(): void {
    const r = this.w.room;
    this.panX = r.pos[0] + this.w.player.cx / TILE;
    this.panY = r.pos[1] + this.w.player.cy / TILE;
  }

  /** Which rooms the map shows, and how. 2 = visited, 1 = sketched (map page / thread). */
  visibility(): Map<string, number> {
    const p = this.w.progress;
    const vis = new Map<string, number>();
    for (const r of this.w.map.list) {
      if (p.visited[r.id]) vis.set(r.id, 2);
      else if (p.mapPages[r.region] && !r.secret) vis.set(r.id, 1);
    }
    if (this.w.stats.has.has('wanderers_thread')) {
      for (const l of LINKS) {
        const a = vis.get(l.a);
        const b = vis.get(l.b);
        const ra = this.w.map.get(l.a);
        const rb = this.w.map.get(l.b);
        if (a === 2 && !b && rb && !rb.secret) vis.set(l.b, 1);
        if (b === 2 && !a && ra && !ra.secret) vis.set(l.a, 1);
      }
    }
    return vis;
  }

  private build(vis: Map<string, number>): HTMLCanvasElement {
    const sig = [...vis.entries()].map(([k, v]) => k + v).join(',');
    if (this.canvas && sig === this.key) return this.canvas;
    this.key = sig;
    const c = makeCanvas(this.extentW, this.extentH);
    const ctx = c.getContext('2d')!;
    for (const r of this.w.map.list) {
      const v = vis.get(r.id);
      if (!v) continue;
      this.paintRoom(ctx, r, v);
    }
    this.canvas = c;
    return c;
  }

  private paintRoom(ctx: CanvasRenderingContext2D, r: RoomDef, v: number): void {
    const reg = REGION_BY_ID.get(r.region);
    const color = reg?.mapColor ?? '#888';
    const [ox, oy] = r.pos;
    const w = r.rows[0].length;
    const h = r.rows.length;
    // Room interior fill
    ctx.fillStyle = withAlpha(color, v === 2 ? 0.22 : 0.08);
    ctx.fillRect(ox, oy, w, h);
    // Walls: draw only solid cells that touch open space (a clean outline)
    ctx.fillStyle = withAlpha(color, v === 2 ? 0.95 : 0.45);
    for (let y = 0; y < h; y++) {
      const row = r.rows[y];
      for (let x = 0; x < w; x++) {
        const c = row[x];
        if (c !== '#' && c !== 'X') continue;
        let edge = false;
        for (let dy = -1; dy <= 1 && !edge; dy++) for (let dx = -1; dx <= 1; dx++) {
          const n = r.rows[y + dy]?.[x + dx];
          if (n !== undefined && n !== '#' && n !== 'X' && n !== 'H') {
            edge = true;
            break;
          }
        }
        if (edge) ctx.fillRect(ox + x, oy + y, 1, 1);
      }
    }
    // Water
    ctx.fillStyle = withAlpha('#5ab8d8', v === 2 ? 0.5 : 0.25);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (r.rows[y][x] === '~') ctx.fillRect(ox + x, oy + y, 1, 1);
  }

  update(dt: number, input: InputState): void {
    const speed = (60 / this.zoom) * dt * 3;
    if (input.down('left')) this.panX -= speed;
    if (input.down('right')) this.panX += speed;
    if (input.down('up')) this.panY -= speed;
    if (input.down('down')) this.panY += speed;
    this.panX = Math.max(0, Math.min(this.extentW, this.panX));
    this.panY = Math.max(0, Math.min(this.extentH, this.panY));
    if (input.pressed('jump') || input.pressed('confirm')) {
      this.zoom = this.zoom === 1 ? 2 : this.zoom === 2 ? 0.75 : 1;
      sfx('menu_move');
    }
    if (input.pressed('dash')) this.centerOnPlayer();
    if (this.w.progress.keys.includes('quill')) {
      if (input.pressed('art')) {
        this.markerKind = (this.markerKind + 1) % MARKER_COLORS.length;
        sfx('menu_move');
      }
      if (input.pressed('interact') || input.pressed('attack')) this.toggleMarker();
    }
    void this.nav;
    void confirmPressed;
  }

  private toggleMarker(): void {
    const p = this.w.progress;
    const room = this.w.map.roomAt(Math.floor(this.panX), Math.floor(this.panY));
    const near = p.markers.findIndex((m) => {
      const r = this.w.map.get(m.room);
      if (!r) return false;
      return Math.hypot(r.pos[0] + m.x - this.panX, r.pos[1] + m.y - this.panY) < 6 / this.zoom;
    });
    if (near >= 0) {
      p.markers.splice(near, 1);
      sfx('menu_back');
    } else if (room) {
      p.markers.push({ room: room.id, x: this.panX - room.pos[0], y: this.panY - room.pos[1], kind: this.markerKind });
      sfx('menu_select');
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
    const vis = this.visibility();
    const c = this.build(vis);
    const s = (Math.min(w / this.extentW, h / this.extentH) * 1.35) * this.zoom;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = 'rgba(14,12,20,0.95)';
    ctx.fillRect(x, y, w, h);
    // Faint parchment grid
    ctx.strokeStyle = 'rgba(232,212,160,0.05)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < this.extentW; gx += 30) {
      const sx = x + w / 2 + (gx - this.panX) * s;
      ctx.beginPath();
      ctx.moveTo(sx, y);
      ctx.lineTo(sx, y + h);
      ctx.stroke();
    }
    for (let gy = 0; gy < this.extentH; gy += 17) {
      const sy = y + h / 2 + (gy - this.panY) * s;
      ctx.beginPath();
      ctx.moveTo(x, sy);
      ctx.lineTo(x + w, sy);
      ctx.stroke();
    }
    const ox = x + w / 2 - this.panX * s;
    const oy = y + h / 2 - this.panY * s;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, ox, oy, this.extentW * s, this.extentH * s);
    ctx.imageSmoothingEnabled = true;
    const p = this.w.progress;
    // Region labels at visited region centroids
    const regionPts = new Map<string, { x: number; y: number; n: number }>();
    for (const r of this.w.map.list) {
      if (vis.get(r.id) !== 2) continue;
      const e = regionPts.get(r.region) ?? { x: 0, y: 0, n: 0 };
      e.x += r.pos[0] + r.rows[0].length / 2;
      e.y += r.pos[1] + r.rows.length / 2;
      e.n++;
      regionPts.set(r.region, e);
    }
    for (const [rid, e] of regionPts) text(ctx, region(rid).name, ox + (e.x / e.n) * s, oy + (e.y / e.n) * s, 6 + this.zoom, withAlpha(region(rid).mapColor, 0.9), 'center', 'bold');
    // Icons
    const icon = (gx: number, gy: number, kind: string) => {
      const sx = ox + gx * s;
      const sy = oy + gy * s;
      ctx.save();
      ctx.translate(sx, sy);
      switch (kind) {
        case 'shrine':
          ctx.fillStyle = '#ffe8b0';
          ctx.beginPath();
          ctx.moveTo(0, -3.5);
          ctx.lineTo(2.5, 0);
          ctx.lineTo(0, 3.5);
          ctx.lineTo(-2.5, 0);
          ctx.fill();
          break;
        case 'gate':
          ctx.strokeStyle = '#c8b8ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, TAU);
          ctx.stroke();
          break;
        case 'boss':
        case 'bossdone':
          ctx.fillStyle = kind === 'boss' ? '#ff6a5a' : '#6a6478';
          ctx.font = 'bold 7px serif';
          ctx.textAlign = 'center';
          ctx.fillText('✠', 0, 2.5);
          ctx.textAlign = 'left';
          break;
        case 'shop':
          ctx.fillStyle = '#9fffc0';
          ctx.fillRect(-2, -2, 4, 4);
          break;
        case 'treasure':
          ctx.fillStyle = '#ffb0b0';
          ctx.beginPath();
          ctx.arc(0, 0, 1.5, 0, TAU);
          ctx.fill();
          break;
      }
      ctx.restore();
    };
    const shrineLens = p.keys.includes('shrine_lens');
    const compass = p.keys.includes('hunters_lens') || this.w.stats.has.has('wanderers_thread');
    for (const r of this.w.map.list) {
      const v = vis.get(r.id);
      if (!v) continue;
      for (const [, sp] of Object.entries(r.marks ?? {})) void sp;
      r.rows.forEach((row, ty) => {
        for (let tx = 0; tx < row.length; tx++) {
          const ch = row[tx];
          const gx = r.pos[0] + tx + 0.5;
          const gy = r.pos[1] + ty + 0.5;
          if (ch === 'S' && (v === 2 || shrineLens) && (p.shrines[r.id] || shrineLens || v === 2)) icon(gx, gy, 'shrine');
          else if (ch === 'V' && v === 2) icon(gx, gy, 'gate');
          else {
            const sp = r.marks?.[ch];
            if (!sp || v !== 2) continue;
            if (sp.k === 'boss') icon(gx, gy, p.bosses[sp.t] ? 'bossdone' : 'boss');
            else if (sp.k === 'npc' && ['marrow', 'ysolde', 'oriel', 'kettle', 'tamsin', 'ossian'].includes(sp.t)) icon(gx, gy, 'shop');
            else if (sp.k === 'pickup' && compass && !p.pickups[sp.id]) icon(gx, gy, 'treasure');
          }
        }
      });
    }
    // Markers
    for (const m of p.markers) {
      const r = this.w.map.get(m.room);
      if (!r) continue;
      ctx.fillStyle = MARKER_COLORS[m.kind % MARKER_COLORS.length];
      const sx = ox + (r.pos[0] + m.x) * s;
      const sy = oy + (r.pos[1] + m.y) * s;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx - 2.5, sy - 5);
      ctx.lineTo(sx + 2.5, sy - 5);
      ctx.fill();
    }
    // Remnant
    if (p.remnant) {
      const r = this.w.map.get(p.remnant.room);
      if (r) {
        ctx.fillStyle = '#9fb8ff';
        ctx.beginPath();
        ctx.arc(ox + (r.pos[0] + p.remnant.x / TILE) * s, oy + (r.pos[1] + p.remnant.y / TILE) * s, 2, 0, TAU);
        ctx.fill();
      }
    }
    // Player
    const blink = 0.5 + 0.5 * Math.sin(time * 6);
    const px = ox + (this.w.room.pos[0] + this.w.player.cx / TILE) * s;
    const py = oy + (this.w.room.pos[1] + this.w.player.cy / TILE) * s;
    ctx.fillStyle = `rgba(127,224,208,${0.5 + blink * 0.5})`;
    ctx.beginPath();
    ctx.arc(px, py, 2.5, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.6;
    ctx.stroke();
    // Crosshair
    ctx.strokeStyle = 'rgba(232,212,160,0.4)';
    ctx.beginPath();
    ctx.moveTo(x + w / 2 - 4, y + h / 2);
    ctx.lineTo(x + w / 2 + 4, y + h / 2);
    ctx.moveTo(x + w / 2, y + h / 2 - 4);
    ctx.lineTo(x + w / 2, y + h / 2 + 4);
    ctx.stroke();
    ctx.restore();
    const quill = p.keys.includes('quill');
    text(ctx, `Move: pan · Jump: zoom · Dash: centre${quill ? ' · Strike: place/remove marker · Art: marker colour' : ''}`, x + w / 2, y + h + 9, 5.5, UI.dim, 'center');
    if (quill) {
      ctx.fillStyle = MARKER_COLORS[this.markerKind];
      ctx.fillRect(x + w - 8, y + 4, 4, 4);
    }
  }
}

export { VIEW_H, VIEW_W };
