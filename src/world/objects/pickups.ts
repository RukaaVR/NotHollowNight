import { Entity } from '../Entity';
import type { GameWorld } from '../GameWorld';
import type { PickupType } from '../spawns';
import { TAU, dist } from '../../core/math';
import { fxRng } from '../../core/rng';
import { sfx } from '../../core/events';
import { glow, fillCircle } from '../../rendering/draw';
import { ABILITY_BY_ID } from '../../abilities/abilities';
import { RELIC_BY_ID } from '../../relics/relics';
import { ECHOES, ITEMS, LOST_RELICS, SHARDS } from '../../story/lore';
import { region } from '../regions';
import { makeBody, stepBody, type Body } from '../physics';
import { TILE } from '../tiles';
import { PK } from '../../vfx/Particles';

const COLORS: Record<PickupType, string> = {
  ability: '#ffffff', relic: '#ffe08a', heart: '#ff8a9a', vessel: '#7fd6ff', fragment: '#cfd8ff', shard: '#d8c8ff',
  echo: '#a8ffe8', lostrelic: '#ffd060', key: '#f0d890', blade: '#e8f0ff', map: '#f0d890',
};

/** A persistent collectible placed in a room. */
export class Pickup extends Entity {
  t = fxRng.next() * 10;
  constructor(world: GameWorld, x: number, y: number, public kind: PickupType, public id: string, public value: string) {
    super(world);
    this.w = 14;
    this.h = 14;
    this.x = x + 1;
    this.y = y + 1;
    this.layer = 30;
    this.light = { r: kind === 'ability' ? 90 : 46, color: this.color, intensity: 0.8, flicker: 0.1 };
  }

  get color(): string {
    if (this.kind === 'ability') return ABILITY_BY_ID.get(this.value)?.color ?? '#fff';
    if (this.kind === 'relic') return RELIC_BY_ID.get(this.value)?.color ?? COLORS.relic;
    if (this.kind === 'key') return ITEMS[this.value]?.color ?? COLORS.key;
    return COLORS[this.kind];
  }

  update(dt: number): void {
    this.t += dt;
    const p = this.world.player;
    if (fxRng.next() < 0.12) this.world.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * 10, this.cy + 4, 0, -14, 0.8, 1.2, this.color, { additive: true, size2: 0.2 });
    if (p.state === 'dead') return;
    if (p.x < this.x + this.w && p.x + p.w > this.x && p.y < this.y + this.h && p.y + p.h > this.y) this.collect();
  }

  collect(): void {
    const w = this.world;
    const pr = w.progress;
    this.dead = true;
    pr.pickups[this.id] = true;
    w.fx.burst(this.cx, this.cy, 24, this.color, 140, 0.8, 2.5);
    w.fx.ring(this.cx, this.cy, 4, 40, 0.5, this.color);
    switch (this.kind) {
      case 'ability': {
        pr.abilities[this.value] = true;
        w.refreshStats();
        sfx('ability_get');
        w.ui.abilityGet(this.value);
        break;
      }
      case 'relic': {
        if (!pr.relics.includes(this.value)) pr.relics.push(this.value);
        const r = RELIC_BY_ID.get(this.value)!;
        sfx('pickup_rare');
        w.ui.itemGet(r.name, `${r.desc}\n\nEquip relics at a Veil Shrine. Costs ${r.cost} thread${r.cost > 1 ? 's' : ''}.`, r.color);
        break;
      }
      case 'heart': {
        pr.heartFragments++;
        sfx('pickup_rare');
        const n = pr.heartFragments % 4;
        if (n === 0) {
          pr.vigorBonus++;
          w.refreshStats();
          w.player.vigor = w.player.maxVigor;
          w.ui.itemGet('Vigor Ember', 'Four embers burn as one. Your maximum Vigor has increased.', COLORS.heart);
        } else w.ui.itemGet('Vigor Ember', `${n} of 4 gathered. Collect four to strengthen your Vigor.`, COLORS.heart);
        break;
      }
      case 'vessel': {
        pr.vesselFragments++;
        sfx('pickup_rare');
        const n = pr.vesselFragments % 3;
        if (n === 0) {
          pr.aetherBonus++;
          w.refreshStats();
          w.ui.itemGet('Aether Phial', 'Three shards form a vessel. You can hold more Aether.', COLORS.vessel);
        } else w.ui.itemGet('Aether Phial Shard', `${n} of 3 gathered. Collect three to expand your Aether.`, COLORS.vessel);
        break;
      }
      case 'fragment': {
        const amt = parseInt(this.value, 10) || 50;
        pr.fragments += amt;
        sfx('pickup');
        w.ui.toast(`+${amt} Veil Fragments`, 'A forgotten cache.', 'item');
        break;
      }
      case 'shard': {
        if (!pr.shards.includes(this.value)) pr.shards.push(this.value);
        sfx('pickup');
        const e = SHARDS[this.value];
        w.ui.lore(`Memory Shard — ${e?.title ?? ''}`, e?.text ?? '');
        break;
      }
      case 'echo': {
        if (!pr.echoes.includes(this.value)) pr.echoes.push(this.value);
        sfx('pickup_rare');
        const e = ECHOES[this.value];
        w.ui.lore(e?.title ?? 'Echo', e?.text ?? '');
        break;
      }
      case 'lostrelic': {
        if (!pr.lostRelics.includes(this.value)) pr.lostRelics.push(this.value);
        const r = LOST_RELICS[this.value];
        sfx('pickup_rare');
        w.ui.itemGet(r?.name ?? 'Lost Relic', `${r?.desc ?? ''}\n\nThe Curator in Lanternwake collects such treasures.`, r?.color ?? '#ffd060');
        break;
      }
      case 'key': {
        if (!pr.keys.includes(this.value)) pr.keys.push(this.value);
        const it = ITEMS[this.value];
        sfx('pickup_rare');
        w.ui.itemGet(it?.name ?? 'Key Item', it?.desc ?? '', it?.color ?? '#f0d890');
        if (['mask_1', 'mask_2', 'mask_3'].every((k) => pr.keys.includes(k)) && !pr.keys.includes('unworn_mask')) {
          pr.keys.push('unworn_mask');
          w.ui.toast('The shards fit together', 'You now carry the Unworn Mask.', 'quest');
        }
        break;
      }
      case 'blade': {
        pr.flags.ore = (pr.flags.ore ?? 0) + 1;
        sfx('pickup_rare');
        w.ui.itemGet('Veilsteel Ore', 'A shard of the same metal as your blade. A smith could use it to temper the Veilblade.', COLORS.blade);
        break;
      }
      case 'map': {
        pr.mapPages[this.value] = true;
        sfx('pickup');
        w.ui.toast(`Map of ${region(this.value).name}`, 'Rooms in this region now appear on your map.', 'item');
        break;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const bob = Math.sin(this.t * 2.4) * 2;
    const x = this.cx;
    const y = this.cy + bob;
    const c = this.color;
    glow(ctx, x, y, this.kind === 'ability' ? 26 : 16, c, 0.7);
    ctx.save();
    ctx.translate(x, y);
    switch (this.kind) {
      case 'ability': {
        ctx.rotate(this.t * 0.8);
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 3, (i * TAU) / 3, 0, TAU);
          ctx.stroke();
        }
        fillCircle(ctx, 0, 0, 3.5, '#ffffff');
        break;
      }
      case 'relic': {
        ctx.rotate(Math.sin(this.t) * 0.2);
        ctx.fillStyle = '#2a2230';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        fillCircle(ctx, 0, 0, 2.5, c);
        break;
      }
      case 'heart': {
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.quadraticCurveTo(5, -1, 0, 6);
        ctx.quadraticCurveTo(-5, -1, 0, -6);
        ctx.fill();
        fillCircle(ctx, 0, 0, 1.5, '#fff');
        break;
      }
      case 'vessel': {
        ctx.fillStyle = 'rgba(30,50,70,0.8)';
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-2, -6);
        ctx.lineTo(2, -6);
        ctx.lineTo(2, -3);
        ctx.quadraticCurveTo(6, 0, 4, 5);
        ctx.lineTo(-4, 5);
        ctx.quadraticCurveTo(-6, 0, -2, -3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = c;
        ctx.fillRect(-3.5, 1, 7, 3.5);
        break;
      }
      case 'shard':
      case 'echo': {
        ctx.rotate(this.t * 0.5);
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 7);
        ctx.lineTo(-4, 0);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 0);
        ctx.lineTo(0, 0);
        ctx.closePath();
        ctx.fill();
        if (this.kind === 'echo') {
          ctx.strokeStyle = c;
          ctx.globalAlpha = 0.5 + 0.5 * Math.sin(this.t * 3);
          ctx.beginPath();
          ctx.arc(0, 0, 9 + Math.sin(this.t * 3) * 2, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      case 'blade': {
        ctx.rotate(0.3);
        ctx.fillStyle = '#b8c4dc';
        ctx.beginPath();
        ctx.moveTo(-5, 3);
        ctx.lineTo(-2, -5);
        ctx.lineTo(4, -3);
        ctx.lineTo(5, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1, -3, 2, 2);
        break;
      }
      default: {
        ctx.fillStyle = '#e8dcc0';
        ctx.fillRect(-5, -6, 10, 12);
        ctx.strokeStyle = c;
        ctx.strokeRect(-5, -6, 10, 12);
        ctx.fillStyle = c;
        ctx.fillRect(-3, -3, 6, 1);
        ctx.fillRect(-3, 0, 6, 1);
      }
    }
    ctx.restore();
  }
}

/** Currency orb dropped by foes; bounces then is collected. */
export class FragmentOrb extends Entity {
  body: Body;
  t = 0;
  constructor(world: GameWorld, x: number, y: number, public value: number) {
    super(world);
    this.body = makeBody(x - 3, y - 3, 6, 6);
    this.body.vx = (fxRng.next() - 0.5) * 160;
    this.body.vy = -120 - fxRng.next() * 140;
    this.w = 6;
    this.h = 6;
    this.layer = 35;
  }

  update(dt: number): void {
    this.t += dt;
    const b = this.body;
    const p = this.world.player;
    const d = dist(b.x, b.y, p.cx, p.cy);
    const magnet = this.world.stats.magnet ? 110 : 26;
    if (this.t > 0.35 && d < magnet) {
      const s = 360;
      b.vx = ((p.cx - b.x) / d) * s;
      b.vy = ((p.cy - b.y) / d) * s;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    } else {
      b.vy = Math.min(b.vy + 900 * dt, 400);
      if (b.onGround) b.vx *= 0.85;
      stepBody(this.world.grid, this.world.solids, b, dt, { phase: false, drop: false, openEdges: false });
      if (b.onGround && Math.abs(b.vy) < 1 && this.t < 1) b.vy = -40;
    }
    this.x = b.x;
    this.y = b.y;
    if (this.t > 0.25 && d < 10) {
      this.dead = true;
      this.world.progress.fragments += this.value;
      sfx('pickup', b.x, b.y, 0.35, 1 + Math.min(0.5, this.value / 50));
      this.world.fx.burst(b.x, b.y, 3, '#cfd8ff', 50, 0.3, 1.5);
    }
    if (this.t > 30) this.dead = true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const s = this.value >= 25 ? 4 : this.value >= 5 ? 3 : 2;
    glow(ctx, this.x + 3, this.y + 3, s * 3, '#aab8ff', 0.6);
    ctx.save();
    ctx.translate(this.x + 3, this.y + 3);
    ctx.rotate(this.t * 3);
    ctx.fillStyle = '#e4ecff';
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.7, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.7, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Fragments left behind on death. Touch to recover. */
export class Remnant extends Entity {
  t = 0;
  constructor(world: GameWorld, x: number, y: number, public amount: number) {
    super(world);
    this.w = 16;
    this.h = 22;
    this.x = x - 8;
    this.y = y - 10;
    this.layer = 30;
    this.light = { r: 70, color: '#9fb8ff', intensity: 0.8, flicker: 0.2 };
  }

  update(dt: number): void {
    this.t += dt;
    const p = this.world.player;
    if (fxRng.next() < 0.3) this.world.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * 12, this.bottom, 0, -25, 1, 1.4, '#9fb8ff', { additive: true, size2: 0.2 });
    if (p.state !== 'dead' && dist(p.cx, p.cy, this.cx, this.cy) < 16) {
      this.dead = true;
      this.world.progress.fragments += this.amount;
      this.world.progress.remnant = null;
      sfx('pickup_rare');
      this.world.fx.burst(this.cx, this.cy, 30, '#bcd0ff', 150, 0.8, 2.5);
      this.world.ui.toast(`Remnant recovered`, `+${this.amount} Veil Fragments`, 'item');
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const x = this.cx;
    const y = this.cy + Math.sin(this.t * 1.8) * 2;
    glow(ctx, x, y, 30, '#7f9cff', 0.6);
    ctx.save();
    ctx.globalAlpha = 0.75;
    // A lantern made of crystallised memory
    ctx.strokeStyle = '#c8d6ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y - 8);
    ctx.stroke();
    ctx.fillStyle = 'rgba(160,190,255,0.35)';
    ctx.beginPath();
    ctx.moveTo(x - 5, y - 8);
    ctx.lineTo(x + 5, y - 8);
    ctx.lineTo(x + 6, y + 6);
    ctx.lineTo(x - 6, y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    fillCircle(ctx, x, y, 3 + Math.sin(this.t * 5) * 0.6, '#ffffff');
    ctx.restore();
  }
}

export function tileToWorld(t: number): number {
  return t * TILE;
}
