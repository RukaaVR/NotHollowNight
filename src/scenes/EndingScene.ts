import type { Game, Scene } from '../core/Game';
import { events, sfx } from '../core/events';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { PanelPlayer, ENDINGS, drawCredits } from '../story/cinematics';
import { newProgress, completion, type Progress } from '../progression/Progress';
import { UI, text, panel, divider, paragraph } from '../ui/text';
import { Nav, confirmPressed, cancelPressed } from '../ui/overlay';
import { formatTime, clamp } from '../core/math';
import { TOTALS_FOR_SAVES } from './totals';
import { GameScene } from './GameScene';
import { TitleScene } from './TitleScene';

/**
 * Carry a finished journey into Veilfall+: relics, threads, the tempered
 * blade, the journal and records persist; the world and its abilities reset.
 */
export function makeNewGamePlus(p: Progress): Progress {
  const n = newProgress();
  n.ngPlus = p.ngPlus + 1;
  n.relics = [...p.relics];
  n.equipped = [...p.equipped];
  n.threadSlots = p.threadSlots;
  n.bladeLevel = p.bladeLevel;
  n.bestiary = { ...p.bestiary };
  n.lore = { ...p.lore };
  n.endings = [...p.endings];
  n.challenges = { ...p.challenges };
  n.stats = { ...p.stats };
  n.playTime = p.playTime;
  n.createdAt = p.createdAt;
  return n;
}

type Phase = 'panels' | 'credits' | 'summary';

/** Ending cinematic → credits → journey summary → Veilfall+ or title. */
export class EndingScene implements Scene {
  readonly id = 'ending';
  private phase: Phase = 'panels';
  private player: PanelPlayer;
  private t = 0;
  private idx = 0;
  private nav = new Nav();
  private out = 0;
  private outTo: (() => void) | null = null;
  private def: (typeof ENDINGS)[string];

  constructor(private game: Game, readonly endingId: string, private progress: Progress, private slot: number) {
    this.def = ENDINGS[endingId] ?? ENDINGS.standard;
    this.player = new PanelPlayer(this.def.panels);
  }

  enter(): void {
    events.emit('musicTheme', { theme: this.def.music });
    events.emit('music', { state: 'story' });
  }

  update(dt: number): void {
    this.t += dt;
    const input = this.game.input;
    if (this.out > 0) {
      this.out += dt;
      if (this.out > 1 && this.outTo) {
        const f = this.outTo;
        this.outTo = null;
        f();
      }
      return;
    }
    if (this.phase === 'panels') {
      this.player.update(dt, confirmPressed(input));
      if (this.player.done) {
        this.phase = 'credits';
        this.t = 0;
        events.emit('music', { state: 'victory' });
      }
    } else if (this.phase === 'credits') {
      const fast = input.down('confirm') || input.down('jump') || input.down('attack');
      if (fast) this.t += dt * 5;
      if (cancelPressed(input) && this.t > 2) this.t = 1e6;
    } else {
      this.idx = this.nav.list(input, dt, this.idx, 2);
      if (confirmPressed(input)) {
        sfx('menu_select');
        if (this.idx === 0) {
          const ng = makeNewGamePlus(this.progress);
          this.game.saves.write(this.slot, ng);
          this.leave(() => this.game.setScene(new GameScene(this.game, ng, this.slot, 'start')));
        } else {
          this.leave(() => this.game.setScene(new TitleScene(this.game, true)));
        }
      }
    }
  }

  private leave(fn: () => void): void {
    this.out = 0.001;
    this.outTo = fn;
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
    if (this.phase === 'panels') {
      this.player.draw(ctx, time);
      if (this.player.idx === 0 && this.player.t < 4) {
        const a = clamp(Math.min(this.player.t / 1, (4 - this.player.t) / 1), 0, 1);
        ctx.globalAlpha = a;
        text(ctx, this.def.title, VIEW_W / 2, 50, 16, UI.gold, 'center', 'bold');
        ctx.globalAlpha = 1;
      }
    } else if (this.phase === 'credits') {
      if (drawCredits(ctx, this.t)) {
        this.phase = 'summary';
        this.t = 0;
      }
    } else this.drawSummary(ctx);
    if (this.out > 0) {
      ctx.fillStyle = `rgba(0,0,0,${clamp(this.out, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }

  private drawSummary(ctx: CanvasRenderingContext2D): void {
    const p = this.progress;
    const a = clamp(this.t / 1, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#05060a';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 80, 24, VIEW_W - 160, VIEW_H - 48);
    text(ctx, 'Ending Reached', VIEW_W / 2, 46, 8, UI.dim, 'center');
    text(ctx, this.def.title, VIEW_W / 2, 64, 14, UI.gold, 'center', 'bold');
    divider(ctx, VIEW_W / 2, 74, 160);
    const rows: [string, string][] = [
      ['Time', formatTime(p.playTime)],
      ['Completion', `${completion(p, TOTALS_FOR_SAVES)}%`],
      ['Memories faced', `${Object.keys(p.bosses).length} / ${TOTALS_FOR_SAVES.bosses}`],
      ['Echoes recovered', `${p.echoes.length} / ${TOTALS_FOR_SAVES.echoes}`],
      ['Falls', `${p.stats.deaths}`],
      ['Endings seen', `${p.endings.length} / 3`],
    ];
    rows.forEach(([k, v], i) => {
      text(ctx, k, VIEW_W / 2 - 70, 92 + i * 12, 7.5, UI.dim);
      text(ctx, v, VIEW_W / 2 + 70, 92 + i * 12, 7.5, UI.ink, 'right');
    });
    paragraph(ctx, 'Veilfall+ keeps your relics, threads, tempered blade, journal and records. The Veil forgets the rest — and remembers you more fiercely.', VIEW_W / 2, 172, 6.5, VIEW_W - 200, UI.dim, 1.35, 'center');
    ['Begin Veilfall+', 'Return to Title'].forEach((l, i) => text(ctx, (i === this.idx ? '◆ ' : '') + l, VIEW_W / 2, 206 + i * 14, 9, i === this.idx ? UI.gold : UI.ink, 'center', i === this.idx ? 'bold' : 'normal'));
    ctx.globalAlpha = 1;
  }
}
