import { Overlay, cancelPressed } from './overlay';
import type { InputState } from '../core/input';
import type { GameWorld } from '../world/GameWorld';
import type { Renderer } from '../rendering/Renderer';
import { UI, text } from './text';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { sfx } from '../core/events';
import type { PState } from '../player/Player';

const FILTERS = ['None', 'Monochrome', 'Sepia', 'Moonlight'];
const POSES: { name: string; state: PState; atk?: 'side' | 'charged' | 'up' }[] = [
  { name: 'Stand', state: 'normal' },
  { name: 'Strike', state: 'normal', atk: 'side' },
  { name: 'Cleave', state: 'normal', atk: 'charged' },
  { name: 'Rest', state: 'rest' },
  { name: 'Mend', state: 'mend' },
];

/** Freeze the world, fly the camera, and frame a shot. */
export class PhotoMode extends Overlay {
  hideUI = false;
  private filter = 0;
  private pose = 0;
  private sel = 0;
  private fx: number;
  private fy: number;
  private prevState: PState;
  constructor(private w: GameWorld, private r: Renderer) {
    super();
    this.fx = w.camera.x;
    this.fy = w.camera.y;
    this.prevState = w.player.state;
    w.camera.focus = { x: this.fx, y: this.fy };
  }

  update(dt: number, input: InputState): void {
    this.t += dt;
    const sp = 140 / this.w.camera.zoom;
    if (input.down('left')) this.fx -= sp * dt;
    if (input.down('right')) this.fx += sp * dt;
    if (input.down('up')) this.fy -= sp * dt;
    if (input.down('down')) this.fy += sp * dt;
    this.w.camera.focus = { x: this.fx, y: this.fy };
    // Keep the camera smooth even though the world is paused
    this.w.camera.x += (this.fx - this.w.camera.x) * Math.min(1, dt * 6);
    this.w.camera.y += (this.fy - this.w.camera.y) * Math.min(1, dt * 6);
    if (input.pressed('tabL')) this.w.camera.zoom = Math.max(0.7, this.w.camera.zoom - 0.15);
    if (input.pressed('tabR')) this.w.camera.zoom = Math.min(2.5, this.w.camera.zoom + 0.15);
    const post = this.r.post;
    if (input.pressed('jump')) this.hideUI = !this.hideUI;
    if (input.pressed('attack')) {
      this.filter = (this.filter + 1) % FILTERS.length;
      post.photoFilter = this.filter;
      sfx('menu_move');
    }
    if (input.pressed('dash')) {
      post.photoVignette = post.photoVignette >= 1 ? 0 : post.photoVignette + 0.5;
      sfx('menu_move');
    }
    if (input.pressed('art')) {
      post.photoExposure = post.photoExposure >= 1.4 ? 0.6 : Math.round((post.photoExposure + 0.2) * 10) / 10;
      sfx('menu_move');
    }
    if (input.pressed('mend')) {
      this.pose = (this.pose + 1) % POSES.length;
      const ps = POSES[this.pose];
      const p = this.w.player;
      p.state = ps.state;
      if (ps.atk) {
        p.atkKind = ps.atk;
        p.atkT = 0.07;
      } else p.atkKind = null;
      sfx('menu_move');
    }
    void this.sel;
    if (cancelPressed(input)) {
      post.photoFilter = 0;
      post.photoVignette = 1;
      post.photoExposure = 1;
      this.w.camera.focus = null;
      this.w.camera.targetZoom = 1;
      this.w.camera.zoom = 1;
      this.w.player.state = this.prevState === 'rest' ? 'rest' : 'normal';
      this.w.player.atkKind = null;
      this.close();
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.hideUI) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, VIEW_H - 22, VIEW_W, 22);
    text(ctx, 'PHOTO MODE', 8, 12, 8, UI.gold, 'left', 'bold');
    const p = this.r.post;
    text(ctx, `Move: pan · Q/R: zoom (${this.w.camera.zoom.toFixed(2)}) · Jump: hide UI · Strike: filter (${FILTERS[this.filter]}) · Dash: vignette (${p.photoVignette}) · Art: exposure (${p.photoExposure}) · Mend: pose (${POSES[this.pose].name}) · Esc: exit`, VIEW_W / 2, VIEW_H - 9, 5.4, UI.ink, 'center');
  }
}
