import { Entity, type HitInfo, type HitResult } from '../world/Entity';
import type { GameWorld } from '../world/GameWorld';
import { TILE } from '../world/tiles';
import { sfx } from '../core/events';
import { glow, fillCircle } from '../rendering/draw';
import { hasFlag, setFlag } from '../progression/Progress';
import { questStage, setQuest } from './quests';
import { Pickup } from '../world/objects/pickups';

/** One of the three silent Hour Bells in the Drowned City. */
export class QuestBell extends Entity {
  swing = 0;
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number, public id: string) {
    super(world);
    this.w = 20;
    this.h = 20;
    this.x = tx * TILE + 8 - 10;
    this.y = ty * TILE;
    this.hittable = true;
    this.layer = 12;
  }

  get rung(): boolean {
    return hasFlag(this.world.progress, this.id);
  }

  takeHit(hit: HitInfo): HitResult {
    const w = this.world;
    this.swing = hit.dir * 0.6;
    sfx('bell', this.cx, this.cy, 1, this.id === 'bell_1' ? 0.8 : this.id === 'bell_2' ? 1 : 1.25);
    w.fx.ring(this.cx, this.cy + 6, 6, 60, 0.8, '#ffe7a0');
    if (!this.rung) {
      setFlag(w.progress, this.id);
      const n = ['bell_1', 'bell_2', 'bell_3'].filter((b) => hasFlag(w.progress, b)).length;
      if (questStage(w.progress, 'bells') === 0) setQuest(w, 'bells', 1);
      w.ui.toast(`A bell rings out (${n}/3)`, n === 3 ? 'Far away, something answers.' : 'Its voice carries through the drowned streets.', 'quest');
      if (n === 3) {
        setFlag(w.progress, 'bells_rung');
        setQuest(w, 'bells', 2, true);
        w.camera.shake(0.4, 1.2);
      }
    }
    return { hit: true, bounce: false };
  }

  update(dt: number): void {
    this.t += dt;
    this.swing *= Math.exp(-1.2 * dt);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const ang = Math.sin(this.t * 4) * this.swing;
    ctx.save();
    ctx.translate(this.cx, this.y);
    ctx.strokeStyle = '#3a3030';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -60);
    ctx.lineTo(0, 0);
    ctx.stroke();
    ctx.rotate(ang);
    ctx.fillStyle = this.rung ? '#c8a050' : '#6a5a40';
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    ctx.quadraticCurveTo(-9, 8, -10, 18);
    ctx.lineTo(10, 18);
    ctx.quadraticCurveTo(9, 8, 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e0c890';
    ctx.fillRect(-10, 16, 20, 2);
    fillCircle(ctx, 0, 19, 2, '#3a2a1a');
    ctx.restore();
    if (!this.rung) glow(ctx, this.cx, this.cy, 18, '#ffe7a0', 0.2 + 0.1 * Math.sin(this.t * 2));
  }
}

/** The empty flower bed where Fen wants the Pale Bloom planted. */
export class BloomBed extends Entity {
  t = 0;
  constructor(world: GameWorld, tx: number, ty: number) {
    super(world);
    this.w = 30;
    this.h = 10;
    this.x = tx * TILE + 8 - 15;
    this.y = (ty + 1) * TILE - 10;
    this.interactRange = 28;
    if (hasFlag(world.progress, 'garden_bloomed')) this.light = { r: 90, color: '#ffe0f0', intensity: 0.9 };
  }

  interactLabel(): string {
    return hasFlag(this.world.progress, 'garden_bloomed') ? 'Inspect' : 'Plant';
  }

  interact(): void {
    const w = this.world;
    const p = w.progress;
    if (hasFlag(p, 'garden_bloomed')) {
      w.ui.dialogue({ lines: [{ who: '', text: 'The Pale Bloom sways, though there is no wind. Someone is remembering you.' }] });
      return;
    }
    const i = p.keys.indexOf('pale_bloom');
    if (i < 0) {
      w.ui.dialogue({ lines: [{ who: '', text: 'An empty bed of dark soil, carefully tended. A small sign reads: "For the one we forgot to remember."' }] });
      return;
    }
    p.keys.splice(i, 1);
    setFlag(p, 'garden_bloomed');
    setQuest(w, 'bloom', 2, true);
    this.light = { r: 90, color: '#ffe0f0', intensity: 0.9 };
    sfx('discover');
    w.fx.burst(this.cx, this.y, 40, '#ffe0f0', 120, 1.5, 3);
    w.ui.toast('The Pale Bloom takes root', 'Petals open all across the garden.', 'quest');
    if (!p.pickups.echo_7_bloom) w.add(new Pickup(w, this.cx - 8, this.y - 40, 'echo', 'echo_7_bloom', 'echo_7'));
  }

  update(dt: number): void {
    this.t += dt;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#2a1e18';
    ctx.fillRect(this.x, this.y + 4, this.w, 6);
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(this.x - 1, this.y + 3, this.w + 2, 2);
    if (hasFlag(this.world.progress, 'garden_bloomed')) {
      for (let i = 0; i < 5; i++) {
        const fx = this.x + 4 + i * 5.5;
        const sway = Math.sin(this.t * 1.5 + i) * 1;
        ctx.strokeStyle = '#5a8a4a';
        ctx.beginPath();
        ctx.moveTo(fx, this.y + 4);
        ctx.lineTo(fx + sway, this.y - 6 - (i % 2) * 3);
        ctx.stroke();
        fillCircle(ctx, fx + sway, this.y - 7 - (i % 2) * 3, 2.2, '#fff4fa');
      }
      glow(ctx, this.cx, this.y - 6, 26, '#ffe0f0', 0.6);
    }
  }
}
