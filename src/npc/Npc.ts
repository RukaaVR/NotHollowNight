import { Entity } from '../world/Entity';
import type { GameWorld } from '../world/GameWorld';
import type { DialogueScript } from '../dialogue/types';
import type { Progress } from '../progression/Progress';
import { sfx } from '../core/events';
import { glow } from '../rendering/draw';

export interface NpcDef {
  id: string;
  name: string;
  /** Short epithet shown in the dialogue box. */
  title: string;
  w: number;
  h: number;
  /** Whether the NPC appears in this room right now. */
  present?: (p: Progress, room: string) => boolean;
  talk: (w: GameWorld, n: Npc) => DialogueScript;
  draw: (ctx: CanvasRenderingContext2D, n: Npc) => void;
  light?: { r: number; color: string };
}

export class Npc extends Entity {
  t = Math.random() * 10;
  facing = 1;
  talkT = 0;
  constructor(world: GameWorld, readonly def: NpcDef, fx: number, fy: number) {
    super(world);
    this.w = def.w;
    this.h = def.h;
    this.x = fx - def.w / 2;
    this.y = fy - def.h;
    this.layer = 25;
    this.interactRange = 30;
    if (def.light) this.light = { r: def.light.r, color: def.light.color, intensity: 0.7 };
  }

  interactLabel(): string {
    return 'Listen';
  }

  interact(): void {
    const w = this.world;
    const st = (w.progress.npcs[this.def.id] ??= { met: false, talks: 0, seen: [] });
    const script = this.def.talk(w, this);
    st.met = true;
    st.talks++;
    script.npc = this.def.id;
    this.talkT = 0.6;
    sfx('text', this.cx, this.cy, 0.5);
    w.ui.dialogue(script);
  }

  update(dt: number): void {
    this.t += dt;
    this.talkT = Math.max(0, this.talkT - dt);
    const p = this.world.player;
    if (Math.abs(p.cx - this.cx) < 90) this.facing = p.cx < this.cx ? -1 : 1;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.cx, this.bottom);
    ctx.scale(this.facing, 1);
    this.def.draw(ctx, this);
    ctx.restore();
    const p = this.world.player;
    if (Math.hypot(p.cx - this.cx, p.cy - this.cy) < this.interactRange && p.onGround) {
      glow(ctx, this.cx, this.y - 6, 6, '#ffe8b0', 0.6 + 0.2 * Math.sin(this.t * 4));
    }
  }

  /** Has the player already heard a particular line set? Records it. */
  once(key: string): boolean {
    const st = (this.world.progress.npcs[this.def.id] ??= { met: false, talks: 0, seen: [] });
    if (st.seen.includes(key)) return false;
    st.seen.push(key);
    return true;
  }

  get talks(): number {
    return this.world.progress.npcs[this.def.id]?.talks ?? 0;
  }
}
