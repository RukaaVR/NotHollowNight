import { Entity } from '../Entity';
import type { GameWorld } from '../GameWorld';
import { newHitId, playerStrike } from '../../combat/combat';
import { glow } from '../../rendering/draw';
import { fxRng } from '../../core/rng';
import { PK } from '../../vfx/Particles';

/** Rising column of Aether (Up + Veil Art). */
export class Spire extends Entity {
  t = 0;
  hitId = newHitId();
  hitId2 = newHitId();
  constructor(world: GameWorld, x: number, footY: number) {
    super(world);
    this.x = x - 14;
    this.w = 28;
    this.h = 96;
    this.y = footY - this.h;
    this.layer = 55;
    this.light = { r: 90, color: '#bfe8ff', intensity: 1 };
  }

  update(dt: number): void {
    this.t += dt;
    const w = this.world;
    const st = w.stats;
    const grow = Math.min(1, this.t / 0.08);
    const top = this.bottom - this.h * grow;
    if (this.t > 0.03 && this.t < 0.32) {
      const id = this.t < 0.16 ? this.hitId : this.hitId2;
      playerStrike(w, { x: this.x, y: top, w: this.w, h: this.bottom - top }, {
        base: 11 * st.lanceMult * st.globalDamage, dir: 0, dirY: -1, knock: 1.2, stagger: 2, source: 'spire', hitId: id, breaks: true, canCrit: true,
      });
    }
    if (fxRng.next() < 0.9 && this.t < 0.3) w.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * 20, this.bottom - fxRng.next() * this.h, 0, -120, 0.4, 2, '#d8f4ff', { additive: true, size2: 0.2 });
    if (this.t > 0.45) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const a = this.t < 0.3 ? 1 : Math.max(0, 1 - (this.t - 0.3) / 0.15);
    const grow = Math.min(1, this.t / 0.08);
    const top = this.bottom - this.h * grow;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a * 0.5;
    ctx.fillStyle = '#7fc8ff';
    ctx.fillRect(this.x, top, this.w, this.bottom - top);
    ctx.globalAlpha = a;
    ctx.fillStyle = '#e8f8ff';
    const wob = Math.sin(this.t * 60) * 2;
    ctx.fillRect(this.cx - 4 + wob * 0.3, top, 8, this.bottom - top);
    ctx.restore();
    glow(ctx, this.cx, this.bottom - 6, 30, '#bfe8ff', a);
    glow(ctx, this.cx, top, 20, '#ffffff', a * 0.8);
  }
}

/** Floating text used by the training dummy and debug readouts. */
export class FloatText extends Entity {
  t = 0;
  constructor(world: GameWorld, x: number, y: number, public text: string, public color: string) {
    super(world);
    this.x = x;
    this.y = y;
    this.layer = 90;
  }
  update(dt: number): void {
    this.t += dt;
    this.y -= 24 * dt;
    if (this.t > 0.9) this.dead = true;
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.globalAlpha = Math.max(0, 1 - this.t / 0.9);
    ctx.font = 'bold 8px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#000';
    ctx.fillText(this.text, this.x + 0.5, this.y + 0.5);
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }
}
