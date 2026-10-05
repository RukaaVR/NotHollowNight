import { Overlay, Nav, confirmPressed, cancelPressed } from './overlay';
import type { InputState, Input } from '../core/input';
import type { GameWorld } from '../world/GameWorld';
import { UI, text, paragraph, panel, divider, font } from './text';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { MapView } from './MapView';
import { SettingsView } from './SettingsView';
import { RELICS, RELIC_BY_ID } from '../relics/relics';
import { ABILITIES } from '../abilities/abilities';
import { relicIcon, abilityIcon } from './icons';
import { canEquip, threadsUsed } from '../progression/stats';
import { ITEMS, LOST_RELICS, SHARDS, ECHOES, TABLETS } from '../story/lore';
import { QUESTS } from '../quests/quests';
import { ENEMY_DEFS } from '../enemies/registry';
import { Enemy } from '../enemies/Enemy';
import { BOSSES } from '../bosses/registry';
import { sfx } from '../core/events';
import { completion } from '../progression/Progress';
import { formatTime } from '../core/math';
import { glow } from '../rendering/draw';
import type { Settings } from '../accessibility/settings';

export type MenuMode = 'pause' | 'shrine' | 'map';

export interface MenuHooks {
  settings: Settings;
  input: Input | null;
  onSettingsChanged: () => void;
  quitToTitle: () => void;
  photoMode: () => void;
  debugMenu: (() => void) | null;
  totals: { abilities: number; bosses: number; hearts: number; vessels: number; relics: number; echoes: number; shards: number };
}

export class PauseMenu extends Overlay {
  private tab = 0;
  private tabs: string[];
  private nav = new Nav();
  private map: MapView;
  private settingsView: SettingsView;
  private relicIdx = 0;
  private abilityIdx = 0;
  private invIdx = 0;
  private journalTab = 0;
  private journalIdx = 0;
  private sysIdx = 0;
  private codexEnemy: Enemy | null = null;
  private codexFor = '';
  private message = '';
  private messageT = 0;

  constructor(private w: GameWorld, readonly mode: MenuMode, private hooks: MenuHooks) {
    super();
    this.opaque = true;
    this.tabs = mode === 'shrine' ? ['Relics', 'Map', 'Abilities', 'Journal', 'Rise'] : ['Map', 'Relics', 'Inventory', 'Abilities', 'Journal', 'Settings', 'System'];
    this.map = new MapView(w);
    this.settingsView = new SettingsView(hooks.settings, hooks.input, hooks.onSettingsChanged);
    if (mode === 'map') this.tab = 0;
    sfx('menu_open');
  }

  private get tabName(): string {
    return this.tabs[this.tab];
  }

  update(dt: number, input: InputState): void {
    this.t += dt;
    this.messageT = Math.max(0, this.messageT - dt);
    const name = this.tabName;
    // In settings, the sub-view owns cancel until it finishes.
    if (name === 'Settings' && !this.settingsView.done) {
      if (input.pressed('tabL') || input.pressed('tabR')) this.switchTab(input.pressed('tabL') ? -1 : 1);
      else {
        this.settingsView.update(dt, input);
        if (this.settingsView.done) {
          this.settingsView.done = false;
          this.close();
        }
      }
      return;
    }
    if (input.pressed('tabL')) return this.switchTab(-1);
    if (input.pressed('tabR')) return this.switchTab(1);
    if (cancelPressed(input) || (this.mode !== 'shrine' && input.pressed('map') && name === 'Map')) {
      sfx('menu_back');
      this.close();
      return;
    }
    switch (name) {
      case 'Map': this.map.update(dt, input); break;
      case 'Relics': this.updateRelics(dt, input); break;
      case 'Inventory': this.invIdx = this.nav.list(input, dt, this.invIdx, Math.max(1, this.w.progress.keys.length)); break;
      case 'Abilities': this.abilityIdx = this.nav.grid(input, dt, this.abilityIdx, ABILITIES.length, 5); break;
      case 'Journal': this.updateJournal(dt, input); break;
      case 'System': this.updateSystem(dt, input); break;
      case 'Rise':
        if (confirmPressed(input)) {
          sfx('menu_select');
          this.close();
        }
        break;
    }
  }

  private switchTab(d: number): void {
    this.tab = (this.tab + d + this.tabs.length) % this.tabs.length;
    sfx('menu_move');
  }

  private say(m: string): void {
    this.message = m;
    this.messageT = 2.5;
  }

  private updateRelics(dt: number, input: InputState): void {
    this.relicIdx = this.nav.grid(input, dt, this.relicIdx, RELICS.length, 9);
    if (!confirmPressed(input)) return;
    const r = RELICS[this.relicIdx];
    const p = this.w.progress;
    if (!p.relics.includes(r.id)) return void sfx('deny');
    if (this.mode !== 'shrine') {
      sfx('deny');
      this.say('Relics can only be changed while resting at a Veil Shrine.');
      return;
    }
    if (p.equipped.includes(r.id)) {
      p.equipped = p.equipped.filter((id) => id !== r.id);
      sfx('menu_back');
    } else if (canEquip(p, r.id)) {
      p.equipped.push(r.id);
      sfx('menu_select');
    } else {
      sfx('deny');
      this.say('Not enough threads. Unequip something first, or have Oriel weave more.');
      return;
    }
    this.w.refreshStats();
  }

  private journalLists(): { key: string; label: string; known: boolean }[][] {
    const p = this.w.progress;
    const quests = QUESTS.filter((q) => p.quests[q.id]).map((q) => ({ key: q.id, label: (p.quests[q.id].done ? '✓ ' : '') + q.name, known: true }));
    const codex = ENEMY_DEFS.map((e) => ({ key: e.id, label: p.bestiary[e.id] !== undefined ? e.name : '???', known: p.bestiary[e.id] !== undefined }));
    const lore = [
      ...Object.keys(ECHOES).map((id) => ({ key: 'echo:' + id, label: p.echoes.includes(id) ? ECHOES[id].title : '— missing echo —', known: p.echoes.includes(id) })),
      ...Object.keys(SHARDS).map((id) => ({ key: 'shard:' + id, label: p.shards.includes(id) ? SHARDS[id].title : '— missing shard —', known: p.shards.includes(id) })),
      ...Object.keys(TABLETS).filter((id) => p.lore[id]).map((id) => ({ key: 'tab:' + id, label: TABLETS[id].title, known: true })),
    ];
    const bosses = BOSSES.map((b) => ({ key: b.id, label: p.bosses[b.id] ? b.name : '???', known: !!p.bosses[b.id] }));
    return [quests, codex, lore, bosses, [{ key: 'stats', label: 'Journey', known: true }]];
  }

  private updateJournal(dt: number, input: InputState): void {
    const h = this.nav.horiz(input, dt);
    if (h) {
      this.journalTab = (this.journalTab + h + 5) % 5;
      this.journalIdx = 0;
      sfx('menu_move');
    }
    const list = this.journalLists()[this.journalTab];
    this.journalIdx = this.nav.list(input, dt, this.journalIdx, Math.max(1, list.length));
  }

  private systemOptions(): { label: string; run: () => void }[] {
    const opts = [
      { label: 'Resume', run: () => this.close() },
      { label: 'Photo Mode', run: () => { this.close(); this.hooks.photoMode(); } },
      { label: 'Save & Return to Title', run: () => { this.close(); this.w.save(); this.hooks.quitToTitle(); } },
    ];
    if (this.hooks.debugMenu) opts.splice(2, 0, { label: 'Developer Tools', run: () => { this.close(); this.hooks.debugMenu!(); } });
    return opts;
  }

  private updateSystem(dt: number, input: InputState): void {
    const opts = this.systemOptions();
    this.sysIdx = this.nav.list(input, dt, this.sysIdx, opts.length);
    if (confirmPressed(input)) {
      sfx('menu_select');
      opts[this.sysIdx].run();
    }
  }

  // ------------------------------------------------------------------ draw

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    const a = Math.min(1, this.t * 5);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(4,3,8,0.78)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Tab strip
    const tw = VIEW_W / this.tabs.length;
    this.tabs.forEach((t, i) => {
      const sel = i === this.tab;
      text(ctx, t.toUpperCase(), tw * i + tw / 2, 16, sel ? 8 : 6.5, sel ? UI.gold : UI.dim, 'center', 'display');
    });
    divider(ctx, VIEW_W / 2, 22, VIEW_W - 40, a);
    text(ctx, 'Q / R: change tab', VIEW_W - 8, VIEW_H - 5, 5.5, UI.faint, 'right');
    const x = 16;
    const y = 30;
    const w = VIEW_W - 32;
    const h = VIEW_H - 44;
    switch (this.tabName) {
      case 'Map': this.map.draw(ctx, x, y, w, h - 8, time); break;
      case 'Relics': this.drawRelics(ctx, x, y, w, h, time); break;
      case 'Inventory': this.drawInventory(ctx, x, y, w, h); break;
      case 'Abilities': this.drawAbilities(ctx, x, y, w, h, time); break;
      case 'Journal': this.drawJournal(ctx, x, y, w, h, time); break;
      case 'Settings': this.settingsView.draw(ctx, x + 40, y, w - 80, h); break;
      case 'System': this.drawSystem(ctx, x, y, w, h); break;
      case 'Rise':
        text(ctx, 'Rise and continue your journey.', VIEW_W / 2, VIEW_H / 2, 9, UI.ink, 'center', 'normal', true);
        text(ctx, 'Confirm to rise', VIEW_W / 2, VIEW_H / 2 + 16, 7, UI.dim, 'center');
        break;
    }
    if (this.messageT > 0) text(ctx, this.message, VIEW_W / 2, VIEW_H - 14, 7, UI.accent, 'center', 'normal', true);
    ctx.globalAlpha = 1;
  }

  private drawRelics(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
    const p = this.w.progress;
    const cols = 9;
    const cell = 22;
    const gx = x + 8;
    const gy = y + 26;
    // Threads
    text(ctx, 'Threads', x + 8, y + 12, 7, UI.dim);
    const used = threadsUsed(p);
    for (let i = 0; i < p.threadSlots; i++) {
      ctx.fillStyle = i < used ? UI.gold : 'rgba(236,240,255,0.18)';
      ctx.beginPath();
      ctx.arc(x + 50 + i * 9, y + 9.5, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (this.mode !== 'shrine') text(ctx, 'Rest at a shrine to change relics', x + w * 0.62, y + 12, 6, UI.dim, 'left', 'normal', true);
    RELICS.forEach((r, i) => {
      const cx = gx + (i % cols) * cell + cell / 2;
      const cy = gy + Math.floor(i / cols) * cell + cell / 2;
      const owned = p.relics.includes(r.id);
      const eq = p.equipped.includes(r.id);
      if (i === this.relicIdx) {
        ctx.strokeStyle = UI.gold;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - cell / 2 + 1, cy - cell / 2 + 1, cell - 2, cell - 2);
      }
      if (owned) relicIcon(ctx, cx, cy, 8, r.glyph, r.color, false);
      else {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.fill();
        text(ctx, '?', cx, cy + 3, 7, UI.faint, 'center');
      }
      if (eq) {
        glow(ctx, cx, cy, 14, UI.gold, 0.25 + 0.1 * Math.sin(time * 3));
        ctx.fillStyle = UI.gold;
        ctx.fillRect(cx - 3, cy + 9, 6, 1.5);
      }
    });
    // Details
    const r = RELICS[this.relicIdx];
    const dx = gx + cols * cell + 14;
    const dw = x + w - dx - 6;
    panel(ctx, dx - 6, y + 20, dw + 10, h - 30, 0.9);
    if (p.relics.includes(r.id)) {
      relicIcon(ctx, dx + dw / 2, y + 44, 14, r.glyph, r.color);
      text(ctx, r.name, dx + dw / 2, y + 72, 9, UI.gold, 'center', 'bold');
      text(ctx, `${r.cost} thread${r.cost > 1 ? 's' : ''} · ${r.build}`, dx + dw / 2, y + 82, 6.5, UI.dim, 'center');
      let yy = y + 96;
      yy += paragraph(ctx, r.desc, dx + 4, yy, 7, dw - 8, UI.ink, 1.35);
      paragraph(ctx, r.lore, dx + 4, yy + 6, 6.5, dw - 8, UI.dim, 1.35);
      if (p.equipped.includes(r.id)) text(ctx, 'Equipped', dx + dw / 2, y + h - 18, 7, UI.gold, 'center');
    } else text(ctx, 'Undiscovered relic', dx + dw / 2, y + 60, 8, UI.faint, 'center', 'normal', true);
    text(ctx, `${p.relics.length} / ${RELICS.length} found`, x + 8, y + h - 4, 6.5, UI.dim);
  }

  private drawInventory(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const p = this.w.progress;
    const col = (label: string, val: string, yy: number) => {
      text(ctx, label, x + 10, yy, 7, UI.dim);
      text(ctx, val, x + 150, yy, 7, UI.ink, 'right');
    };
    let yy = y + 14;
    text(ctx, 'Collection', x + 10, yy, 8, UI.gold, 'left', 'bold');
    yy += 14;
    col('Veil Fragments', String(p.fragments), yy); yy += 11;
    col('In the Lantern Vault', String(p.banked), yy); yy += 11;
    col('Vigor Embers', `${p.heartFragments % 4} / 4  (+${p.vigorBonus})`, yy); yy += 11;
    col('Aether Phial Shards', `${p.vesselFragments % 3} / 3  (+${p.aetherBonus})`, yy); yy += 11;
    col('Veilblade', `Tempered ${p.bladeLevel} / 4`, yy); yy += 11;
    col('Veilsteel Ore', String(p.flags.ore ?? 0), yy); yy += 11;
    col('Memory Shards', `${p.shards.length} / ${Object.keys(SHARDS).length}`, yy); yy += 11;
    col('Echoes of Ilvane', `${p.echoes.length} / ${Object.keys(ECHOES).length}`, yy); yy += 11;
    col('Lost Relics', `${p.lostRelics.length} / ${Object.keys(LOST_RELICS).length}`, yy); yy += 11;
    col('Completion', `${completion(p, this.hooks.totals)}%`, yy);
    // Key items
    const kx = x + 170;
    text(ctx, 'Key Items', kx, y + 14, 8, UI.gold, 'left', 'bold');
    if (!p.keys.length) text(ctx, 'Nothing yet.', kx, y + 30, 7, UI.faint, 'left', 'normal', true);
    p.keys.forEach((k, i) => {
      const it = ITEMS[k];
      if (!it) return;
      const sel = i === this.invIdx;
      ctx.fillStyle = it.color;
      ctx.beginPath();
      ctx.arc(kx + 4, y + 25 + i * 11, 2, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, it.name, kx + 10, y + 28 + i * 11, 7, sel ? UI.gold : UI.ink);
    });
    const sel = ITEMS[p.keys[this.invIdx]];
    if (sel) paragraph(ctx, sel.desc, kx, y + h - 34, 6.5, w - (kx - x) - 10, UI.dim, 1.35);
  }

  private drawAbilities(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
    const p = this.w.progress;
    ABILITIES.forEach((a, i) => {
      const cx = x + 40 + (i % 5) * 46;
      const cy = y + 34 + Math.floor(i / 5) * 46;
      const owned = !!p.abilities[a.id];
      abilityIcon(ctx, cx, cy, 13, a.id, a.color, !owned);
      if (i === this.abilityIdx) {
        ctx.strokeStyle = UI.gold;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(cx - 19, cy - 19, 38, 38);
      }
      if (owned) glow(ctx, cx, cy, 20, a.color, 0.1 + 0.05 * Math.sin(time * 2 + i));
    });
    const a = ABILITIES[this.abilityIdx];
    const owned = !!p.abilities[a.id];
    const dx = x + 260;
    const dw = w - (dx - x) - 4;
    panel(ctx, dx - 6, y + 8, dw + 10, h - 16, 0.9);
    if (owned) {
      text(ctx, a.name, dx + dw / 2, y + 28, 10, a.color, 'center', 'bold');
      let yy = y + 44;
      yy += paragraph(ctx, a.short, dx + 4, yy, 7, dw - 8, UI.ink);
      yy += paragraph(ctx, a.howTo, dx + 4, yy + 5, 7, dw - 8, UI.accent);
      paragraph(ctx, a.lore, dx + 4, yy + 12, 6.5, dw - 8, UI.dim);
    } else text(ctx, 'Not yet found', dx + dw / 2, y + 40, 8, UI.faint, 'center', 'normal', true);
  }

  private drawJournal(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, time: number): void {
    const names = ['Quests', 'Codex', 'Lore', 'Bosses', 'Journey'];
    names.forEach((n, i) => text(ctx, n, x + 30 + i * 70, y + 10, 7.5, i === this.journalTab ? UI.gold : UI.dim, 'center', i === this.journalTab ? 'bold' : 'normal'));
    text(ctx, '◂ ▸', x + w - 10, y + 10, 6.5, UI.faint, 'right');
    const list = this.journalLists()[this.journalTab];
    const p = this.w.progress;
    const lx = x + 6;
    const ly = y + 26;
    const rows = 15;
    const start = Math.max(0, Math.min(this.journalIdx - 7, list.length - rows));
    list.slice(start, start + rows).forEach((it, k) => {
      const i = start + k;
      const sel = i === this.journalIdx;
      text(ctx, it.label, lx + 6, ly + k * 11, 6.8, sel ? UI.gold : it.known ? UI.ink : UI.faint);
    });
    if (!list.length) text(ctx, this.journalTab === 0 ? 'No quests yet. Listen to the people of the Veil.' : 'Nothing recorded yet.', lx + 6, ly, 7, UI.faint, 'left', 'normal', true);
    const dx = x + 170;
    const dw = w - 176;
    panel(ctx, dx - 6, y + 18, dw + 10, h - 22, 0.9);
    const it = list[this.journalIdx];
    if (!it) return;
    let yy = y + 36;
    switch (this.journalTab) {
      case 0: {
        const q = QUESTS.find((qq) => qq.id === it.key)!;
        const st = p.quests[q.id];
        text(ctx, q.name, dx + 4, yy, 9, UI.gold, 'left', 'bold');
        text(ctx, `From ${q.giver}`, dx + 4, yy + 10, 6.5, UI.dim, 'left', 'normal', true);
        yy += 24;
        const lines = st.done ? [q.stages[q.stages.length - 1]] : q.stages.slice(0, Math.min(st.stage + 1, q.stages.length - 1));
        for (const l of lines) yy += paragraph(ctx, l, dx + 4, yy, 7, dw - 8, st.done ? UI.dim : UI.ink) + 4;
        break;
      }
      case 1: {
        const def = ENEMY_DEFS.find((e) => e.id === it.key)!;
        if (!it.known) {
          text(ctx, 'Not yet encountered.', dx + 4, yy, 7, UI.faint, 'left', 'normal', true);
          break;
        }
        if (this.codexFor !== def.id) {
          this.codexFor = def.id;
          this.codexEnemy = new Enemy(this.w, def, 0, 0, false);
          this.codexEnemy.hidden = false;
          this.codexEnemy.state = 'idle';
          this.codexEnemy.facing = 1;
          this.codexEnemy.ignoreGravity = true;
        }
        const e = this.codexEnemy!;
        e.t = time;
        e.body.x = dx + dw - 40 - e.w / 2;
        e.body.y = yy + 34 - e.h;
        e.x = e.body.x;
        e.y = e.body.y;
        ctx.save();
        ctx.beginPath();
        ctx.rect(dx + dw - 76, y + 22, 72, 60);
        ctx.clip();
        ctx.translate(e.cx, e.bottom);
        ctx.scale(1.6, 1.6);
        ctx.translate(-e.cx, -e.bottom);
        def.draw(ctx, e);
        ctx.restore();
        text(ctx, def.name, dx + 4, yy, 9, UI.gold, 'left', 'bold');
        text(ctx, `Defeated: ${p.bestiary[def.id] ?? 0}`, dx + 4, yy + 10, 6.5, UI.dim);
        text(ctx, def.category, dx + 4, yy + 19, 6.5, UI.dim, 'left', 'normal', true);
        yy += 56;
        yy += paragraph(ctx, def.role, dx + 4, yy, 7, dw - 8, UI.ink) + 4;
        if ((p.bestiary[def.id] ?? 0) >= 3) yy += paragraph(ctx, `Weakness: ${def.weakness}`, dx + 4, yy, 6.8, dw - 8, UI.accent) + 4;
        else yy += paragraph(ctx, 'Defeat more to learn its weakness.', dx + 4, yy, 6.5, dw - 8, UI.faint) + 4;
        paragraph(ctx, def.lore, dx + 4, yy, 6.5, dw - 8, UI.dim);
        break;
      }
      case 2: {
        const [kind, id] = it.key.split(':');
        const entry = kind === 'echo' ? ECHOES[id] : kind === 'shard' ? SHARDS[id] : TABLETS[id];
        if (!it.known) {
          text(ctx, 'Somewhere in the Veil, this memory waits.', dx + 4, yy, 7, UI.faint, 'left', 'normal', true);
          break;
        }
        text(ctx, entry.title, dx + 4, yy, 9, kind === 'echo' ? '#a8ffe8' : UI.gold, 'left', 'bold');
        paragraph(ctx, entry.text, dx + 4, yy + 16, 7, dw - 8, UI.ink, 1.4);
        break;
      }
      case 3: {
        const b = BOSSES.find((bb) => bb.id === it.key)!;
        if (!it.known) {
          text(ctx, 'A presence you have not yet faced.', dx + 4, yy, 7, UI.faint, 'left', 'normal', true);
          break;
        }
        text(ctx, b.name, dx + 4, yy, 9, UI.gold, 'left', 'bold');
        text(ctx, b.title, dx + 4, yy + 10, 6.5, UI.dim, 'left', 'normal', true);
        yy += 24;
        yy += paragraph(ctx, b.lore, dx + 4, yy, 7, dw - 8, UI.ink) + 6;
        const rec = p.challenges[b.id];
        if (rec) text(ctx, `Hall of Echoes — best ${rec.bestTime}s · ${rec.clears} clear${rec.clears > 1 ? 's' : ''}${rec.noHit ? ' · flawless' : ''}`, dx + 4, yy, 6.5, UI.accent);
        break;
      }
      case 4: {
        const s = p.stats;
        const rowsTxt: [string, string][] = [
          ['Time in the Veil', formatTime(p.playTime)],
          ['Completion', `${completion(p, this.hooks.totals)}%`],
          ['Great ones felled', `${Object.keys(p.bosses).length} / ${BOSSES.length}`],
          ['Foes defeated', String(s.kills)],
          ['Times the Veil remembered you', String(s.deaths)],
          ['Secrets found', String(s.secrets)],
          ['Rooms explored', `${Object.keys(p.visited).length} / ${this.w.map.list.length}`],
          ['Endings witnessed', p.endings.length ? p.endings.join(', ') : '—'],
          ['Journey', p.ngPlus > 0 ? `Veilfall+ ${p.ngPlus}` : 'First descent'],
        ];
        rowsTxt.forEach(([k, v], i) => {
          text(ctx, k, dx + 4, yy + i * 12, 7, UI.dim);
          text(ctx, v, dx + dw - 4, yy + i * 12, 7, UI.ink, 'right');
        });
        break;
      }
    }
    ctx.font = font(7);
  }

  private drawSystem(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    const opts = this.systemOptions();
    opts.forEach((o, i) => text(ctx, (i === this.sysIdx ? '◆ ' : '') + o.label, x + w / 2, y + 50 + i * 18, 9, i === this.sysIdx ? UI.gold : UI.ink, 'center'));
    void h;
  }
}

export { RELIC_BY_ID };
