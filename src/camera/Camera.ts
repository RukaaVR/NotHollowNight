import { clamp, damp } from '../core/math';
import { fxRng } from '../core/rng';

/** Default framing: slightly closer than one room screen, for a more intimate view. */
export const BASE_ZOOM = 1.18;
export const VIEW_W = 480;
export const VIEW_H = 270;

export interface CamBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Smooth-follow camera with look-ahead, trauma-based shake, cinematic locks
 * and zoom. Positions are the view centre in room space.
 */
export class Camera {
  x = VIEW_W / 2;
  y = VIEW_H / 2;
  zoom = BASE_ZOOM;
  targetZoom = BASE_ZOOM;
  bounds: CamBounds = { x: 0, y: 0, w: VIEW_W, h: VIEW_H };
  /** Cinematic lock region (e.g. boss arenas). Overrides follow when set. */
  lock: CamBounds | null = null;
  /** Explicit focus point (cutscenes). */
  focus: { x: number; y: number } | null = null;
  /** A point of interest the follow camera leans toward (the active boss). */
  attend: { x: number; y: number } | null = null;
  shakeMult = 1;
  private trauma = 0;
  private shakeTime = 0;
  private lookX = 0;
  private lookY = 0;
  offX = 0;
  offY = 0;
  /** Directional kick (impact) that decays quickly. */
  private kickX = 0;
  private kickY = 0;
  private t = 0;

  setBounds(w: number, h: number): void {
    this.bounds = { x: 0, y: 0, w, h };
  }

  snap(tx: number, ty: number): void {
    this.x = tx;
    this.y = ty;
    this.lookX = 0;
    this.lookY = 0;
    this.clampToBounds();
  }

  shake(amount: number, time = 0.25): void {
    this.trauma = Math.min(1.2, Math.max(this.trauma, amount));
    this.shakeTime = Math.max(this.shakeTime, time);
  }

  kick(dx: number, dy: number): void {
    this.kickX += dx;
    this.kickY += dy;
  }

  get viewW(): number {
    return VIEW_W / this.zoom;
  }
  get viewH(): number {
    return VIEW_H / this.zoom;
  }

  update(dt: number, px: number, py: number, vx: number, facing: number, lookDir: number, grounded: boolean): void {
    this.t += dt;
    this.zoom = damp(this.zoom, this.targetZoom, 4, dt);
    let tx: number;
    let ty: number;
    if (this.focus) {
      tx = this.focus.x;
      ty = this.focus.y;
      this.x = damp(this.x, tx, 3, dt);
      this.y = damp(this.y, ty, 3, dt);
    } else {
      const wantLook = facing * 36 + clamp(vx * 0.12, -24, 24);
      this.lookX = damp(this.lookX, wantLook, 2.2, dt);
      this.lookY = damp(this.lookY, lookDir * 64, lookDir !== 0 ? 2.5 : 5, dt);
      tx = px + this.lookX;
      ty = py - 18 + this.lookY;
      // In boss fights, lean toward the boss so both combatants stay framed.
      if (this.attend) {
        tx += clamp((this.attend.x - px) * 0.4, -VIEW_W * 0.3, VIEW_W * 0.3);
        ty += clamp((this.attend.y - py) * 0.3, -VIEW_H * 0.25, VIEW_H * 0.25);
      }
      this.x = damp(this.x, tx, 7, dt);
      this.y = damp(this.y, ty, grounded ? 6 : 4, dt);
    }
    this.clampToBounds();
    // Shake
    if (this.shakeTime > 0) this.shakeTime -= dt;
    else this.trauma = Math.max(0, this.trauma - dt * 2.4);
    const s = this.trauma * this.trauma * this.shakeMult;
    this.offX = (fxRng.next() * 2 - 1) * 7 * s + this.kickX;
    this.offY = (fxRng.next() * 2 - 1) * 6 * s + this.kickY;
    this.kickX = damp(this.kickX, 0, 18, dt);
    this.kickY = damp(this.kickY, 0, 18, dt);
  }

  private clampToBounds(): void {
    const b = this.lock ?? this.bounds;
    const hw = this.viewW / 2;
    const hh = this.viewH / 2;
    if (b.w <= this.viewW) this.x = b.x + b.w / 2;
    else this.x = clamp(this.x, b.x + hw, b.x + b.w - hw);
    if (b.h <= this.viewH) this.y = b.y + b.h / 2;
    else this.y = clamp(this.y, b.y + hh, b.y + b.h - hh);
  }

  /** Top-left of the view in room space, including shake. */
  get left(): number {
    return this.x - this.viewW / 2 + this.offX;
  }
  get top(): number {
    return this.y - this.viewH / 2 + this.offY;
  }
}
