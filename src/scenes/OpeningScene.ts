import type { Game, Scene } from '../core/Game';
import { events, sfx } from '../core/events';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { PanelPlayer, OPENING } from '../story/cinematics';
import type { Progress } from '../progression/Progress';
import { setFlag } from '../progression/Progress';
import { UI, text } from '../ui/text';
import { confirmPressed } from '../ui/overlay';
import { clamp } from '../core/math';
import { GameScene } from './GameScene';

/** The opening cinematic. Confirm advances a panel; holding Back skips it entirely. */
export class OpeningScene implements Scene {
  readonly id = 'opening';
  private player = new PanelPlayer(OPENING);
  private hold = 0;
  private out = 0;

  constructor(private game: Game, private progress: Progress, private slot: number) {}

  enter(): void {
    events.emit('musicTheme', { theme: 'ending_standard' });
    events.emit('music', { state: 'story' });
  }

  update(dt: number): void {
    const input = this.game.input;
    if (this.out > 0) {
      this.out += dt;
      if (this.out > 1.2) this.begin();
      return;
    }
    this.hold = input.down('cancel') || input.down('pause') ? this.hold + dt : Math.max(0, this.hold - dt * 2);
    this.player.update(dt, confirmPressed(input));
    if (this.hold > 1.2) {
      sfx('menu_select');
      this.out = 0.001;
    }
    if (this.player.done) this.out = 0.001;
  }

  private begin(): void {
    setFlag(this.progress, 'opening_seen');
    this.game.setScene(new GameScene(this.game, this.progress, this.slot, 'start'));
    this.out = -1;
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
    this.player.draw(ctx, time);
    if (this.hold > 0) {
      const k = clamp(this.hold / 1.2, 0, 1);
      ctx.strokeStyle = UI.gold;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(VIEW_W - 16, 12, 5, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      ctx.stroke();
      text(ctx, 'Skipping', VIEW_W - 26, 14, 6, UI.dim, 'right');
    } else text(ctx, 'Hold Back to skip', VIEW_W - 8, 14, 5.5, 'rgba(200,200,220,0.4)', 'right');
    if (this.out !== 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.out < 0 ? 1 : clamp(this.out, 0, 1)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }
}
