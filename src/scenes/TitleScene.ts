import type { Game, Scene } from '../core/Game';
import { events, sfx } from '../core/events';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { UI, text, paragraph, panel, divider, font } from '../ui/text';
import { filigree, flourish } from '../ui/ornament';
import { Nav, confirmPressed, cancelPressed } from '../ui/overlay';
import { SettingsView } from '../ui/SettingsView';
import { SLOT_COUNT, type SlotSummary } from '../save/SaveSystem';
import { newProgress, completion, type Progress } from '../progression/Progress';
import { region } from '../world/regions';
import { formatTime, clamp } from '../core/math';
import { Rng } from '../core/rng';
import { glow, makeCanvas } from '../rendering/draw';
import { aerenFigure } from '../story/cinematics';
import { paintedBackdrop, preloadPaintedArt } from '../rendering/PaintedArt';
import { preloadSprites } from '../rendering/SpriteArt';
import { TOTALS_FOR_SAVES } from './totals';
import type { Difficulty } from '../accessibility/settings';
import { GameScene } from './GameScene';
import { OpeningScene } from './OpeningScene';

type Mode = 'menu' | 'slots' | 'confirmOverwrite' | 'confirmErase' | 'difficulty' | 'settings' | 'message';

interface MenuItem {
  label: string;
  run: () => void;
}

const DIFFS: { id: Difficulty; name: string; desc: string }[] = [
  { id: 'pilgrim', name: 'Pilgrim', desc: 'Gentler enemies, longer warnings and more forgiving recovery. For those here for the story and the world.' },
  { id: 'wanderer', name: 'Wanderer', desc: 'The intended journey. Fair, readable and demanding.' },
  { id: 'veilborn', name: 'Veilborn', desc: 'Enemies press harder and punish mistakes. Warnings stay readable — nothing is unfair, only less forgiving.' },
];

const motes: { x: number; y: number; z: number; p: number }[] = [];
{
  const r = new Rng(77);
  for (let i = 0; i < 90; i++) motes.push({ x: r.next() * VIEW_W, y: r.next() * VIEW_H, z: 0.3 + r.next() * 0.7, p: r.next() * 10 });
}

/**
 * Title screen: black → ambience → particles → the world → Aeren → the logo,
 * then the main menu and save slot management.
 */
export class TitleScene implements Scene {
  readonly id = 'title';
  private t = 0;
  private mode: Mode = 'menu';
  private idx = 0;
  private slotIdx = 0;
  private diffIdx = 1;
  private nav = new Nav();
  private slots: SlotSummary[] = [];
  private slotPurpose: 'new' | 'load' = 'load';
  private settingsView: SettingsView;
  private message = '';
  private messageThen: (() => void) | null = null;
  private messageReturn: Mode = 'menu';
  private leaving = 0;
  private soft: HTMLCanvasElement | null = null;
  private leaveTo: (() => void) | null = null;

  constructor(private game: Game, skipIntro = false) {
    this.settingsView = new SettingsView(game.settings, game.input, () => game.applySettings());
    if (skipIntro) this.t = 7;
    this.refresh();
  }

  enter(): void {
    preloadPaintedArt();
    preloadSprites();
    events.emit('musicTheme', { theme: 'title' });
    events.emit('music', { state: 'exploration' });
  }

  private refresh(): void {
    this.slots = [];
    for (let i = 0; i < SLOT_COUNT; i++) this.slots.push(this.game.saves.summary(i, (p) => completion(p, TOTALS_FOR_SAVES)));
  }

  private latestSlot(): number {
    let best = -1;
    let at = -1;
    for (const s of this.slots) {
      if (!s.empty && !s.corrupt && (s.savedAt ?? 0) > at) {
        at = s.savedAt ?? 0;
        best = s.slot;
      }
    }
    return best;
  }

  private items(): MenuItem[] {
    const items: MenuItem[] = [];
    const latest = this.latestSlot();
    if (latest >= 0) items.push({ label: 'Continue', run: () => this.load(latest) });
    items.push({ label: 'New Game', run: () => this.openSlots('new') });
    if (this.slots.some((s) => !s.empty)) items.push({ label: 'Load Game', run: () => this.openSlots('load') });
    items.push({ label: 'Settings', run: () => (this.mode = 'settings') });
    return items;
  }

  private openSlots(purpose: 'new' | 'load'): void {
    this.refresh();
    this.slotPurpose = purpose;
    this.mode = 'slots';
    const firstEmpty = this.slots.findIndex((s) => s.empty);
    this.slotIdx = purpose === 'new' && firstEmpty >= 0 ? firstEmpty : Math.max(0, this.latestSlot());
  }

  private show(msg: string, then?: () => void): void {
    this.message = msg;
    this.messageThen = then ?? null;
    this.messageReturn = this.mode === 'message' ? 'menu' : this.mode;
    this.mode = 'message';
  }

  private load(slot: number): void {
    const r = this.game.saves.load(slot);
    if (!r.ok) {
      const why = r.reason === 'future' ? 'This save was written by a newer version of Veilfall and cannot be opened here. It has not been changed.' : r.reason === 'corrupt' ? 'This save is damaged and no intact backup exists. It has not been erased — you may still export or keep it.' : 'This slot is empty.';
      this.show(why);
      return;
    }
    const go = () => this.begin(r.progress, slot, 'shrine');
    if (r.fromBackup) this.show('The latest save in this slot was damaged. Your previous save was restored from its backup. The damaged copy has been kept.', go);
    else if (r.migratedFrom) this.show(`This save came from an older version (v${r.migratedFrom}) and was updated. Nothing was lost.`, go);
    else go();
  }

  private startNew(slot: number): void {
    const p = newProgress();
    this.game.settings.difficulty = DIFFS[this.diffIdx].id;
    this.game.applySettings();
    this.game.saves.write(slot, p);
    this.leave(() => this.game.setScene(new OpeningScene(this.game, p, slot)));
  }

  private begin(p: Progress, slot: number, entry: 'start' | 'shrine'): void {
    this.leave(() => this.game.setScene(new GameScene(this.game, p, slot, entry)));
  }

  private leave(fn: () => void): void {
    sfx('menu_select');
    this.leaving = 0.001;
    this.leaveTo = fn;
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.leaving > 0) {
      this.leaving += dt;
      if (this.leaving > 0.9 && this.leaveTo) {
        const f = this.leaveTo;
        this.leaveTo = null;
        f();
      }
      return;
    }
    // Any button skips the intro sequence.
    if (this.t < 6.5) {
      if (confirmPressed(input) || cancelPressed(input)) this.t = 6.5;
      return;
    }
    switch (this.mode) {
      case 'menu': {
        const items = this.items();
        this.idx = Math.min(this.idx, items.length - 1);
        this.idx = this.nav.list(input, dt, this.idx, items.length);
        if (confirmPressed(input)) {
          sfx('menu_select');
          items[this.idx].run();
        }
        break;
      }
      case 'slots': {
        this.slotIdx = this.nav.list(input, dt, this.slotIdx, SLOT_COUNT);
        const s = this.slots[this.slotIdx];
        if (cancelPressed(input)) {
          sfx('menu_back');
          this.mode = 'menu';
        } else if (input.pressed('mend') && !s.empty) {
          sfx('menu_move');
          this.mode = 'confirmErase';
          this.idx = 1;
        } else if (confirmPressed(input)) {
          if (this.slotPurpose === 'load') {
            if (s.empty) sfx('menu_back');
            else this.load(s.slot);
          } else if (s.empty) {
            sfx('menu_select');
            this.mode = 'difficulty';
            this.diffIdx = DIFFS.findIndex((d) => d.id === this.game.settings.difficulty);
            if (this.diffIdx < 0) this.diffIdx = 1;
          } else {
            sfx('menu_move');
            this.mode = 'confirmOverwrite';
            this.idx = 1;
          }
        }
        break;
      }
      case 'confirmOverwrite':
      case 'confirmErase': {
        this.idx = this.nav.list(input, dt, this.idx, 2);
        if (cancelPressed(input)) {
          sfx('menu_back');
          this.mode = 'slots';
        } else if (confirmPressed(input)) {
          if (this.idx === 0) {
            sfx('menu_select');
            if (this.mode === 'confirmErase') {
              this.game.saves.erase(this.slotIdx);
              this.refresh();
              this.mode = 'slots';
              if (!this.slots.some((x) => !x.empty)) this.slotPurpose = 'new';
            } else {
              this.mode = 'difficulty';
            }
          } else {
            sfx('menu_back');
            this.mode = 'slots';
          }
        }
        break;
      }
      case 'difficulty': {
        this.diffIdx = this.nav.list(input, dt, this.diffIdx, DIFFS.length);
        if (cancelPressed(input)) {
          sfx('menu_back');
          this.mode = 'slots';
        } else if (confirmPressed(input)) this.startNew(this.slotIdx);
        break;
      }
      case 'settings':
        this.settingsView.update(dt, input);
        if (this.settingsView.done) {
          this.settingsView.done = false;
          this.mode = 'menu';
        }
        break;
      case 'message':
        if (confirmPressed(input) || cancelPressed(input)) {
          sfx('menu_select');
          const then = this.messageThen;
          this.messageThen = null;
          this.mode = this.messageReturn;
          if (then) then();
        }
        break;
    }
  }

  // ------------------------------------------------------------------ drawing

  private drawWorld(ctx: CanvasRenderingContext2D, time: number): void {
    const t = this.t;
    // 1. Black, 2. ambience (audio), 3. particles, 4. world, 5. Aeren, 6. logo
    const worldA = clamp((t - 2.2) / 1.6, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    sky.addColorStop(0, '#06070f');
    sky.addColorStop(0.55, '#141a2e');
    sky.addColorStop(1, '#2a2438');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = worldA;
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // A pale veiled moon that never quite shows
    glow(ctx, VIEW_W * 0.68, 70, 70, 'rgba(160,190,230,0.22)');
    ctx.fillStyle = 'rgba(200,215,240,0.12)';
    ctx.beginPath();
    ctx.arc(VIEW_W * 0.68, 70, 22, 0, Math.PI * 2);
    ctx.fill();
    // Far spires
    const drawRange = (seed: number, base: number, hmax: number, color: string, drift: number) => {
      const r = new Rng(seed);
      ctx.fillStyle = color;
      let x = -20 - ((time * drift) % 40);
      while (x < VIEW_W + 40) {
        const w = 10 + r.next() * 22;
        const h = 20 + r.next() * hmax;
        ctx.fillRect(x, base - h, w, h + 200);
        if (r.chance(0.6)) {
          ctx.beginPath();
          ctx.moveTo(x - 1, base - h);
          ctx.lineTo(x + w / 2, base - h - 10 - r.next() * 24);
          ctx.lineTo(x + w + 1, base - h);
          ctx.fill();
        }
        x += w + 4 + r.next() * 14;
      }
    };
    drawRange(3, 190, 70, '#1a1f33', 0.6);
    drawRange(5, 214, 50, '#12152a', 1.2);
    // The painted Threshold, slowly drifting, replaces the sketched skyline once loaded.
    const art = paintedBackdrop('th');
    if (art) {
      const iw = VIEW_W * 1.12;
      const ih = (iw * art.height) / art.width;
      const dx = -(Math.sin(time * 0.05) * 0.5 + 0.5) * (iw - VIEW_W);
      ctx.drawImage(art, dx, (VIEW_H - ih) * 0.6, iw, ih);
      ctx.fillStyle = 'rgba(6,8,16,0.35)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // Mist band
    const mist = ctx.createLinearGradient(0, 170, 0, 240);
    mist.addColorStop(0, 'rgba(120,130,170,0)');
    mist.addColorStop(0.5, 'rgba(120,130,170,0.18)');
    mist.addColorStop(1, 'rgba(120,130,170,0)');
    ctx.fillStyle = mist;
    ctx.fillRect(0, 170, VIEW_W, 70);
    // Foreground cliff where Aeren stands
    ctx.fillStyle = '#07080f';
    ctx.beginPath();
    ctx.moveTo(VIEW_W * 0.18, VIEW_H);
    ctx.lineTo(VIEW_W * 0.2, 222);
    ctx.lineTo(VIEW_W * 0.27, 214);
    ctx.lineTo(VIEW_W * 0.42, 216);
    ctx.lineTo(VIEW_W * 0.47, 226);
    ctx.lineTo(VIEW_W * 0.5, VIEW_H);
    ctx.fill();
    ctx.globalAlpha = 1;
    // Aeren on the ledge, scarf in the wind
    const aA = clamp((t - 3.6) / 1.2, 0, 1);
    if (aA > 0) {
      ctx.globalAlpha = aA;
      const ax = VIEW_W * 0.34;
      const ay = 214;
      glow(ctx, ax, ay - 12, 26, 'rgba(120,220,210,0.18)');
      aerenFigure(ctx, ax, ay, 1.1, 0.6 + 0.4 * Math.sin(time * 1.3));
      // Scarf ribbon trailing in the wind
      ctx.strokeStyle = '#3fc6b8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ax - 1, ay - 15);
      for (let i = 1; i <= 8; i++) ctx.lineTo(ax - 1 - i * 3.2, ay - 15 + Math.sin(time * 4 - i * 0.7) * (0.5 + i * 0.35) + i * 0.4);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // Drifting motes of Aether
    const pA = clamp((t - 1.1) / 1.2, 0, 1) * (this.game.settings.reducedParticles ? 0.5 : 1);
    if (pA > 0) {
      for (let i = 0; i < motes.length; i += this.game.settings.reducedParticles ? 2 : 1) {
        const m = motes[i];
        const x = (m.x + time * 6 * m.z + Math.sin(time * 0.6 + m.p) * 6) % VIEW_W;
        const y = (m.y - time * 9 * m.z + VIEW_H * 10) % VIEW_H;
        const a = pA * (0.25 + 0.35 * Math.sin(time * 1.7 + m.p) ** 2) * m.z;
        ctx.fillStyle = `rgba(150,235,225,${a})`;
        ctx.fillRect(x, y, m.z * 1.6, m.z * 1.6);
      }
    }
  }

  private drawLogo(ctx: CanvasRenderingContext2D, time: number): void {
    const a = clamp((this.t - 4.8) / 1.4, 0, 1);
    if (a <= 0) return;
    const inMenu = this.mode === 'menu' || this.t < 6.5;
    const y = inMenu ? 78 : 36;
    const size = inMenu ? 46 : 22;
    ctx.globalAlpha = a;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.9);
    glow(ctx, VIEW_W / 2, y - size * 0.3, inMenu ? 170 : 90, `rgba(225,235,255,${0.1 + 0.04 * pulse})`);
    // Glowing engraved title
    ctx.save();
    ctx.shadowColor = 'rgba(220,235,255,0.9)';
    ctx.shadowBlur = inMenu ? 14 : 8;
    ctx.font = font(size, 'display');
    ctx.textAlign = 'center';
    ctx.fillStyle = '#f4f2fa';
    ctx.fillText('VEILFALL', VIEW_W / 2, y);
    ctx.shadowBlur = 0;
    ctx.restore();
    if (inMenu) {
      filigree(ctx, VIEW_W / 2, y - size - 8, 118, 9, 'rgba(240,244,255,0.95)', 'rgba(200,225,255,0.8)');
      filigree(ctx, VIEW_W / 2, y + 16, 132, 10, 'rgba(240,244,255,0.95)', 'rgba(200,225,255,0.8)', true);
    } else divider(ctx, VIEW_W / 2, y + 8, 120);
    ctx.globalAlpha = 1;
  }

  render(time: number): void {
    const r = this.game.renderer;
    r.clear('#000');
    r.screenSpace();
    const ctx = r.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, VIEW_W, VIEW_H);
    ctx.clip();
    // The scene behind the logo is painted at half resolution: a natural soft focus.
    if (!this.soft) this.soft = makeCanvas(VIEW_W / 2, VIEW_H / 2);
    const sc = this.soft.getContext('2d')!;
    sc.setTransform(0.5, 0, 0, 0.5, 0, 0);
    this.drawWorld(sc, time);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(this.soft, 0, 0, VIEW_W, VIEW_H);
    const vg = ctx.createRadialGradient(VIEW_W / 2, VIEW_H * 0.42, 40, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.62);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    this.drawSpecks(ctx, time);
    this.drawLogo(ctx, time);
    if (this.t >= 6.5) {
      const ma = clamp((this.t - 6.5) / 0.6, 0, 1);
      ctx.globalAlpha = ma;
      switch (this.mode) {
        case 'menu': this.drawMenu(ctx, time); break;
        case 'slots': this.drawSlots(ctx); break;
        case 'confirmOverwrite': this.drawSlots(ctx); this.drawConfirm(ctx, 'Begin a new journey here?', 'The existing save in this slot will be replaced. A copy is kept until the slot is written again.'); break;
        case 'confirmErase': this.drawSlots(ctx); this.drawConfirm(ctx, 'Erase this save?', 'The slot will be emptied. A recovery copy is kept until the slot is written again.'); break;
        case 'difficulty': this.drawDifficulty(ctx); break;
        case 'settings': this.settingsView.draw(ctx, 70, 20, VIEW_W - 140, VIEW_H - 40); break;
        case 'message': {
          panel(ctx, 90, 90, VIEW_W - 180, 90);
          paragraph(ctx, this.message, VIEW_W / 2, 112, 7.5, VIEW_W - 210, UI.ink, 1.4, 'center');
          text(ctx, 'Confirm to continue', VIEW_W / 2, 168, 6.5, UI.gold, 'center');
          break;
        }
      }
      ctx.globalAlpha = 1;
      text(ctx, 'An original work. All art, music and sound are generated procedurally.', VIEW_W / 2, VIEW_H - 6, 5, 'rgba(200,200,220,0.35)', 'center');
    }
    if (this.leaving > 0) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(this.leaving / 0.8, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }

  private drawMenu(ctx: CanvasRenderingContext2D, time: number): void {
    const items = this.items();
    items.forEach((it, i) => {
      const sel = i === this.idx;
      const y = 168 + i * 17;
      const label = it.label.toUpperCase();
      ctx.font = font(10, 'display');
      const w = ctx.measureText(label).width / 2;
      if (sel) {
        glow(ctx, VIEW_W / 2, y - 4, 46, 'rgba(220,235,255,0.10)');
        const bob = Math.sin(time * 2.5) * 1.2;
        flourish(ctx, VIEW_W / 2 - w - 12 - bob, y - 3.5, -1, 'rgba(240,244,255,0.95)');
        flourish(ctx, VIEW_W / 2 + w + 12 + bob, y - 3.5, 1, 'rgba(240,244,255,0.95)');
      }
      ctx.save();
      if (sel) {
        ctx.shadowColor = 'rgba(220,235,255,0.7)';
        ctx.shadowBlur = 6;
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = sel ? '#ffffff' : 'rgba(225,228,240,0.78)';
      ctx.fillText(label, VIEW_W / 2, y);
      ctx.restore();
    });
  }

  /** Dark drifting specks in the foreground, sharp against the soft scene. */
  private drawSpecks(ctx: CanvasRenderingContext2D, time: number): void {
    const a = clamp((this.t - 1) / 2, 0, 1);
    if (a <= 0) return;
    ctx.fillStyle = `rgba(4,4,8,${0.85 * a})`;
    for (let i = 0; i < motes.length; i += 3) {
      const m = motes[i];
      const x = (m.x * 1.7 + time * 5 * m.z + Math.sin(time * 0.4 + m.p) * 10) % VIEW_W;
      const y = (m.y * 1.3 + time * 3 * m.z) % VIEW_H;
      ctx.beginPath();
      ctx.arc(x, y, 0.8 + m.z * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawSlots(ctx: CanvasRenderingContext2D): void {
    const x = 70;
    const w = VIEW_W - 140;
    text(ctx, this.slotPurpose === 'new' ? 'Choose a slot for your journey' : 'Choose a journey', VIEW_W / 2, 64, 9, UI.gold, 'center', 'bold');
    this.slots.forEach((s, i) => {
      const y = 76 + i * 52;
      const sel = i === this.slotIdx;
      panel(ctx, x, y, w, 46, sel ? 1 : 0.7);
      if (sel) {
        ctx.strokeStyle = UI.gold;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1.5, y + 1.5, w - 3, 43);
      }
      text(ctx, `${i + 1}`, x + 16, y + 27, 16, sel ? UI.gold : UI.dim, 'center', 'bold');
      if (s.empty) {
        text(ctx, 'Empty', x + 34, y + 26, 8, UI.dim);
      } else if (s.corrupt) {
        text(ctx, 'Damaged save', x + 34, y + 20, 8, '#e08070', 'left', 'bold');
        text(ctx, s.hasBackup ? 'A backup exists and will be restored when loaded.' : 'No intact backup. The data has been kept, not erased.', x + 34, y + 33, 6.5, UI.dim);
      } else {
        const reg = region((s.room ?? 'th_01').split('_')[0]);
        text(ctx, reg.name + (s.ngPlus ? `  ·  VEILFALL+${s.ngPlus > 1 ? ' ' + s.ngPlus : ''}` : ''), x + 34, y + 18, 8.5, UI.ink, 'left', 'bold');
        text(ctx, `${formatTime(s.playTime ?? 0)}   ·   ${s.completion ?? 0}%   ·   ${s.bosses ?? 0} memories faced   ·   ${s.deaths ?? 0} falls`, x + 34, y + 31, 6.5, UI.dim);
        if (s.savedAt) text(ctx, new Date(s.savedAt).toLocaleString(), x + w - 10, y + 40, 5.5, UI.dim, 'right');
        ctx.fillStyle = reg.palette.accent;
        ctx.fillRect(x + w - 12, y + 8, 4, 4);
      }
    });
    text(ctx, `Confirm: ${this.slotPurpose === 'new' ? 'select' : 'load'}    ·    Mend: erase    ·    Back: return`, VIEW_W / 2, VIEW_H - 18, 6.5, UI.dim, 'center');
  }

  private drawConfirm(ctx: CanvasRenderingContext2D, title: string, body: string): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 100, 82, VIEW_W - 200, 110);
    text(ctx, title, VIEW_W / 2, 102, 10, UI.gold, 'center', 'bold');
    paragraph(ctx, body, VIEW_W / 2, 118, 7, VIEW_W - 230, UI.ink, 1.35, 'center');
    ['Yes', 'No'].forEach((l, i) => text(ctx, (i === this.idx ? '◆ ' : '') + l, VIEW_W / 2, 158 + i * 14, 8.5, i === this.idx ? UI.gold : UI.ink, 'center'));
  }

  private drawDifficulty(ctx: CanvasRenderingContext2D): void {
    text(ctx, 'How should the Veil receive you?', VIEW_W / 2, 64, 10, UI.gold, 'center', 'bold');
    DIFFS.forEach((d, i) => {
      const y = 78 + i * 50;
      const sel = i === this.diffIdx;
      panel(ctx, 90, y, VIEW_W - 180, 44, sel ? 1 : 0.6);
      text(ctx, (sel ? '◆ ' : '') + d.name, 104, y + 16, 9, sel ? UI.gold : UI.ink, 'left', 'bold');
      paragraph(ctx, d.desc, 104, y + 28, 6.5, VIEW_W - 210, UI.dim, 1.3);
    });
    text(ctx, 'Difficulty and every assist can be changed at any time in Settings.', VIEW_W / 2, VIEW_H - 18, 6.5, UI.dim, 'center');
  }
}
