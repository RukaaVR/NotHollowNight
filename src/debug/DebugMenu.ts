import { Overlay, Nav, confirmPressed, cancelPressed } from '../ui/overlay';
import type { InputState } from '../core/input';
import type { GameWorld } from '../world/GameWorld';
import { UI, text, panel } from '../ui/text';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { ABILITIES } from '../abilities/abilities';
import { RELICS } from '../relics/relics';
import { REGIONS } from '../world/regions';
import { ENEMY_DEFS, createEnemy } from '../enemies/registry';
import { BOSSES } from '../bosses/registry';
import { P } from '../player/constants';
import { TILE } from '../world/tiles';
import { sfx } from '../core/events';

export interface DebugFlags {
  hitboxes: boolean;
  collision: boolean;
  stats: boolean;
}

type Row = { label: string; value?: () => string; act: (dir: number) => void };

/** Developer tools: cheats, teleports, spawns and diagnostics. Enabled with ?debug=1 or F2. */
export class DebugMenu extends Overlay {
  private idx = 0;
  private nav = new Nav();
  private page: 'main' | 'teleport' | 'spawn' | 'boss' = 'main';
  private sub = 0;
  constructor(private w: GameWorld, private flags: DebugFlags) {
    super();
  }

  private rows(): Row[] {
    const w = this.w;
    const p = w.progress;
    const f = this.flags;
    const onoff = (b: boolean) => (b ? 'ON' : 'off');
    return [
      { label: 'God mode', value: () => onoff(w.godMode), act: () => (w.godMode = !w.godMode) },
      { label: 'Infinite Aether', value: () => onoff(w.infiniteAether), act: () => (w.infiniteAether = !w.infiniteAether) },
      { label: 'Unlock all abilities', act: () => { for (const a of ABILITIES) p.abilities[a.id] = true; w.refreshStats(); } },
      { label: 'Give all relics + 9 threads', act: () => { p.relics = RELICS.map((r) => r.id); p.threadSlots = 9; } },
      { label: 'Reveal entire map', act: () => { for (const r of REGIONS) p.mapPages[r.id] = true; for (const room of w.map.list) p.visited[room.id] = true; } },
      { label: '+1000 Veil Fragments', act: () => (p.fragments += 1000) },
      { label: 'Heal fully', act: () => { w.player.vigor = w.player.maxVigor; w.player.aether = w.stats.maxAether; } },
      { label: 'Damage multiplier', value: () => `×${w.debugDamageMult}`, act: (d) => (w.debugDamageMult = Math.max(0.25, Math.min(20, w.debugDamageMult * (d < 0 ? 0.5 : 2)))) },
      { label: 'Game speed', value: () => `×${w.debugSpeed.toFixed(2)}`, act: (d) => (w.debugSpeed = Math.max(0.25, Math.min(3, w.debugSpeed + (d < 0 ? -0.25 : 0.25)))) },
      { label: 'Gravity', value: () => `${P.GRAVITY}`, act: (d) => (P.GRAVITY = Math.max(400, Math.min(3000, P.GRAVITY + (d < 0 ? -150 : 150)))) },
      { label: 'Player run speed', value: () => `${P.RUN}`, act: (d) => (P.RUN = Math.max(60, Math.min(400, P.RUN + (d < 0 ? -20 : 20)))) },
      { label: 'Show hitboxes / hurtboxes', value: () => onoff(f.hitboxes), act: () => (f.hitboxes = !f.hitboxes) },
      { label: 'Show collision', value: () => onoff(f.collision), act: () => (f.collision = !f.collision) },
      { label: 'Show diagnostics', value: () => onoff(f.stats), act: () => (f.stats = !f.stats) },
      { label: 'Teleport to room…', act: () => { this.page = 'teleport'; this.sub = 0; } },
      { label: 'Spawn enemy…', act: () => { this.page = 'spawn'; this.sub = 0; } },
      { label: 'Go to boss…', act: () => { this.page = 'boss'; this.sub = 0; } },
      { label: 'Kill everything in room', act: () => { for (const e of w.entities) { const en = e as { die?: () => void; team: string }; if (en.team === 'enemy' && en.die) en.die(); } } },
      { label: 'Close', act: () => this.close() },
    ];
  }

  update(dt: number, input: InputState): void {
    this.t += dt;
    if (this.page !== 'main') {
      const list = this.page === 'teleport' ? this.w.map.list.map((r) => r.id) : this.page === 'spawn' ? ENEMY_DEFS.map((e) => e.id) : BOSSES.map((b) => b.id);
      this.sub = this.nav.list(input, dt, this.sub, list.length);
      if (cancelPressed(input)) {
        this.page = 'main';
        return;
      }
      if (confirmPressed(input)) {
        const id = list[this.sub];
        sfx('menu_select');
        if (this.page === 'teleport' || this.page === 'boss') {
          const room = this.page === 'boss' ? BOSSES.find((b) => b.id === id)!.room : id;
          const g = this.w.map.grid(room);
          const s = g.playerStart ?? this.safeSpot(room);
          this.w.warp(room, s.x, s.y);
          this.close();
        } else {
          const p = this.w.player;
          const e = createEnemy(this.w, id, p.cx + p.facing * 60, p.y + p.h, input.down('up'));
          if (e) this.w.add(e);
        }
      }
      return;
    }
    const rows = this.rows();
    this.idx = this.nav.list(input, dt, this.idx, rows.length);
    const h = this.nav.horiz(input, dt);
    if (h !== 0) rows[this.idx].act(h);
    else if (confirmPressed(input)) {
      sfx('menu_select');
      rows[this.idx].act(1);
    }
    if (cancelPressed(input)) this.close();
  }

  private safeSpot(roomId: string): { x: number; y: number } {
    const g = this.w.map.grid(roomId);
    for (let y = g.h - 2; y > 1; y--) {
      for (let x = 2; x < g.w - 2; x++) {
        if (!g.isSolidAt(x, y) && !g.isSolidAt(x, y - 1) && g.isSolidAt(x, y + 1)) return { x: x * TILE + 8, y: (y + 1) * TILE };
      }
    }
    return { x: g.pw / 2, y: g.ph / 2 };
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = 60;
    const y = 16;
    const w = VIEW_W - 120;
    const h = VIEW_H - 32;
    panel(ctx, x, y, w, h);
    text(ctx, this.page === 'main' ? 'Developer Tools' : this.page === 'teleport' ? 'Teleport' : this.page === 'spawn' ? 'Spawn Enemy (hold Up: elite)' : 'Go to Boss', x + w / 2, y + 16, 9, '#ff9a6a', 'center', 'bold');
    if (this.page === 'main') {
      this.rows().forEach((r, i) => {
        const sel = i === this.idx;
        text(ctx, (sel ? '◆ ' : '  ') + r.label, x + 12, y + 30 + i * 11, 6.8, sel ? UI.gold : UI.ink);
        if (r.value) text(ctx, r.value(), x + w - 12, y + 30 + i * 11, 6.8, sel ? UI.gold : UI.dim, 'right');
      });
    } else {
      const list = this.page === 'teleport' ? this.w.map.list.map((r) => `${r.id}${r.title ? ' — ' + r.title : ''}`) : this.page === 'spawn' ? ENEMY_DEFS.map((e) => `${e.name} (${e.region})`) : BOSSES.map((b) => b.name);
      const rows = 18;
      const start = Math.max(0, Math.min(this.sub - 9, list.length - rows));
      list.slice(start, start + rows).forEach((l, k) => {
        const sel = start + k === this.sub;
        text(ctx, (sel ? '◆ ' : '  ') + l, x + 12, y + 30 + k * 11, 6.8, sel ? UI.gold : UI.ink);
      });
    }
  }
}
