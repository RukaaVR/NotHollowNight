import { Overlay, Nav, confirmPressed, cancelPressed } from './overlay';
import type { InputState } from '../core/input';
import type { DialogueScript } from '../dialogue/types';
import { UI, text, paragraph, panel, divider, wrap, font } from './text';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { sfx } from '../core/events';
import { NPC_BY_ID } from '../npc/registry';
import type { Npc } from '../npc/Npc';
import { abilityIcon, relicIcon } from './icons';
import { ABILITY_BY_ID } from '../abilities/abilities';
import { glow } from '../rendering/draw';
import { SHOP_BY_ID, type ShopItem } from '../npc/shops';
import type { GameWorld } from '../world/GameWorld';
import { setFlag } from '../progression/Progress';
import { RELIC_BY_ID } from '../relics/relics';
import { region } from '../world/regions';
import { TILE } from '../world/tiles';
import { TAU } from '../core/math';

// ---------------------------------------------------------------- Dialogue

export class DialogueOverlay extends Overlay {
  private line = 0;
  private chars = 0;
  private choiceIdx = 0;
  private nav = new Nav();
  private blip = 0;
  private fakeNpc: Npc | null = null;
  constructor(private script: DialogueScript, private onDone?: () => void, private pushNext?: (s: DialogueScript) => void) {
    super();
    if (script.npc) {
      const def = NPC_BY_ID.get(script.npc);
      if (def) this.fakeNpc = { def, t: 0, facing: 1 } as unknown as Npc;
    }
  }

  private get cur() {
    return this.script.lines[this.line];
  }

  update(dt: number, input: InputState): void {
    this.t += dt;
    if (this.fakeNpc) this.fakeNpc.t += dt;
    const full = this.cur ? this.cur.text.length : 0;
    if (this.chars < full) {
      const speed = input.down('confirm') || input.down('jump') ? 160 : 55;
      const before = Math.floor(this.chars);
      this.chars = Math.min(full, this.chars + speed * dt);
      this.blip += Math.floor(this.chars) - before;
      if (this.blip >= 3) {
        this.blip = 0;
        sfx('text');
      }
      if (confirmPressed(input)) this.chars = full;
      return;
    }
    const lastLine = this.line >= this.script.lines.length - 1;
    if (lastLine && this.script.choices?.length) {
      this.choiceIdx = this.nav.list(input, dt, this.choiceIdx, this.script.choices.length);
      if (confirmPressed(input)) {
        sfx('menu_select');
        const ch = this.script.choices[this.choiceIdx];
        this.close();
        const next = ch.run();
        if (next && this.pushNext) this.pushNext(next);
        else this.onDone?.();
      }
      return;
    }
    if (confirmPressed(input) || input.pressed('cancel')) {
      if (lastLine) {
        this.close();
        this.onDone?.();
      } else {
        this.line++;
        this.chars = 0;
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    const cur = this.cur;
    if (!cur) return;
    const h = 66;
    const y = VIEW_H - h - 10;
    const x = 20;
    const w = VIEW_W - 40;
    const a = Math.min(1, this.t * 6);
    ctx.globalAlpha = a;
    panel(ctx, x, y, w, h, 1);
    let tx = x + 12;
    if (this.fakeNpc && cur.who !== 'Aeren' && cur.who !== '') {
      // Portrait frame
      const px = x + 8;
      const py = y + 8;
      ctx.fillStyle = 'rgba(30,26,40,0.9)';
      ctx.fillRect(px, py, 50, 50);
      ctx.strokeStyle = UI.panelEdge;
      ctx.strokeRect(px + 0.5, py + 0.5, 49, 49);
      ctx.save();
      ctx.beginPath();
      ctx.rect(px, py, 50, 50);
      ctx.clip();
      ctx.translate(px + 25, py + 46);
      const sc = 34 / Math.max(this.fakeNpc.def.h, 14);
      ctx.scale(sc * 1.2, sc * 1.2);
      glow(ctx, 0, -this.fakeNpc.def.h / 2, 20, '#ffe8b0', 0.2);
      this.fakeNpc.def.draw(ctx, this.fakeNpc);
      ctx.restore();
      tx = px + 60;
    }
    const name = cur.who === 'Aeren' ? 'Aeren' : cur.who;
    if (name) {
      text(ctx, name, tx, y + 15, 8, cur.who === 'Aeren' ? UI.accent : UI.gold, 'left', 'bold');
      const def = this.fakeNpc?.def;
      if (def && def.name === name && def.title) text(ctx, def.title, tx + ctx.measureText(name).width + 8, y + 15, 6, UI.dim, 'left', 'normal', true);
    }
    const shown = cur.text.slice(0, Math.floor(this.chars));
    paragraph(ctx, shown, tx, y + (name ? 28 : 20), 7.5, x + w - tx - 12, cur.who === '' ? '#d8d0c0' : UI.ink, 1.35);
    const lastLine = this.line >= this.script.lines.length - 1;
    if (this.chars >= cur.text.length) {
      if (lastLine && this.script.choices?.length) {
        const cw = 150;
        const ch = this.script.choices.length * 13 + 10;
        const cx = x + w - cw - 6;
        const cy = y - ch - 4;
        panel(ctx, cx, cy, cw, ch, 1);
        this.script.choices.forEach((c, i) => {
          const sel = i === this.choiceIdx;
          text(ctx, (sel ? '◆ ' : '   ') + c.label, cx + 10, cy + 15 + i * 13, 7, sel ? UI.gold : UI.dim);
        });
      } else {
        const bob = Math.sin(this.t * 6) * 1.5;
        ctx.fillStyle = UI.gold;
        ctx.beginPath();
        ctx.moveTo(x + w - 14, y + h - 12 + bob);
        ctx.lineTo(x + w - 8, y + h - 12 + bob);
        ctx.lineTo(x + w - 11, y + h - 8 + bob);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- Item / ability cards

export class ItemOverlay extends Overlay {
  constructor(private title: string, private desc: string, private color: string, private abilityId: string | null, private onDone?: () => void) {
    super();
  }
  update(dt: number, input: InputState): void {
    this.t += dt;
    if (this.t > 0.6 && (confirmPressed(input) || cancelPressed(input))) {
      sfx('menu_select');
      this.close();
      this.onDone?.();
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const a = Math.min(1, this.t * 3);
    ctx.fillStyle = `rgba(0,0,0,${0.55 * a})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = a;
    const cy = VIEW_H / 2 - 20;
    const ab = this.abilityId ? ABILITY_BY_ID.get(this.abilityId) : null;
    glow(ctx, VIEW_W / 2, cy - 30, 50 + Math.sin(this.t * 2) * 4, this.color, 0.5);
    if (ab) abilityIcon(ctx, VIEW_W / 2, cy - 30, 16, ab.id, ab.color);
    else {
      ctx.save();
      ctx.translate(VIEW_W / 2, cy - 30);
      ctx.rotate(this.t * 0.5);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 12);
      ctx.lineTo(-9, 0);
      ctx.fill();
      ctx.restore();
    }
    if (ab) text(ctx, 'A NEW POWER', VIEW_W / 2, cy - 2, 7, UI.dim, 'center');
    text(ctx, (ab ? ab.name : this.title).toUpperCase(), VIEW_W / 2, cy + 14, 14, UI.gold, 'center', 'bold');
    divider(ctx, VIEW_W / 2, cy + 22, 180, a);
    let y = cy + 36;
    if (ab) {
      y += paragraph(ctx, ab.short, VIEW_W / 2, y, 8, 300, UI.ink, 1.35, 'center');
      y += 4;
      y += paragraph(ctx, ab.howTo, VIEW_W / 2, y, 7, 300, UI.accent, 1.35, 'center');
      y += 4;
      paragraph(ctx, ab.lore, VIEW_W / 2, y, 6.5, 300, UI.dim, 1.35, 'center');
    } else paragraph(ctx, this.desc, VIEW_W / 2, y, 7.5, 300, UI.ink, 1.4, 'center');
    if (this.t > 0.6) text(ctx, 'Continue', VIEW_W / 2, VIEW_H - 16, 6.5, UI.dim, 'center', 'normal', true);
    ctx.globalAlpha = 1;
  }
}

export class LoreOverlay extends Overlay {
  constructor(private title: string, private body: string) {
    super();
  }
  update(dt: number, input: InputState): void {
    this.t += dt;
    if (this.t > 0.4 && (confirmPressed(input) || cancelPressed(input) || input.pressed('interact'))) {
      sfx('menu_back');
      this.close();
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const a = Math.min(1, this.t * 4);
    ctx.fillStyle = `rgba(0,0,0,${0.5 * a})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.globalAlpha = a;
    const w = 320;
    const lines = wrap(ctx, this.body, 8, w - 40);
    const h = 60 + lines.length * 8 * UI.textScale * 1.45;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    // Parchment-like tablet
    ctx.fillStyle = 'rgba(30,26,22,0.95)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(200,170,120,0.5)';
    ctx.strokeRect(x + 3.5, y + 3.5, w - 7, h - 7);
    text(ctx, this.title, VIEW_W / 2, y + 22, 10, UI.gold, 'center', 'bold');
    divider(ctx, VIEW_W / 2, y + 29, 120, a);
    lines.forEach((l, i) => text(ctx, l, VIEW_W / 2, y + 46 + i * 8 * UI.textScale * 1.45, 8, '#e8dcc8', 'center', 'normal', true));
    ctx.globalAlpha = 1;
  }
}

// ---------------------------------------------------------------- Choice

export interface ChoiceOption {
  label: string;
  hint?: string;
  disabled?: boolean;
  run: () => void;
}

export class ChoiceOverlay extends Overlay {
  private idx = 0;
  private nav = new Nav();
  constructor(private title: string, private options: ChoiceOption[], private body = '', private cancellable = true) {
    super();
  }
  update(dt: number, input: InputState): void {
    this.t += dt;
    this.idx = this.nav.list(input, dt, this.idx, this.options.length);
    if (confirmPressed(input) && this.t > 0.2) {
      const o = this.options[this.idx];
      if (o.disabled) {
        sfx('deny');
        return;
      }
      sfx('menu_select');
      this.close();
      o.run();
    } else if (this.cancellable && cancelPressed(input)) {
      sfx('menu_back');
      this.close();
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const w = 300;
    const bodyLines = this.body ? wrap(ctx, this.body, 7, w - 30) : [];
    const h = 44 + bodyLines.length * 10 + this.options.length * 16;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h, 1);
    text(ctx, this.title, VIEW_W / 2, y + 18, 9, UI.gold, 'center', 'bold');
    bodyLines.forEach((l, i) => text(ctx, l, VIEW_W / 2, y + 32 + i * 10, 7, UI.dim, 'center'));
    const oy = y + 36 + bodyLines.length * 10;
    this.options.forEach((o, i) => {
      const sel = i === this.idx;
      const col = o.disabled ? UI.faint : sel ? UI.gold : UI.ink;
      text(ctx, (sel ? '◆ ' : '') + o.label, VIEW_W / 2, oy + 6 + i * 16, 8, col, 'center');
      if (sel && o.hint) text(ctx, o.hint, VIEW_W / 2, y + h + 12, 6.5, UI.dim, 'center', 'normal', true);
    });
  }
}

// ---------------------------------------------------------------- Shop

export class ShopOverlay extends Overlay {
  private idx = 0;
  private nav = new Nav();
  private msg = '';
  private msgT = 0;
  constructor(private w: GameWorld, private shopId: string) {
    super();
    this.opaque = true;
  }
  private items(): ShopItem[] {
    return SHOP_BY_ID.get(this.shopId)?.items(this.w.progress) ?? [];
  }
  private say(m: string): void {
    this.msg = m;
    this.msgT = 2.5;
  }
  update(dt: number, input: InputState): void {
    this.t += dt;
    this.msgT = Math.max(0, this.msgT - dt);
    const items = this.items();
    this.idx = Math.min(this.idx, Math.max(0, items.length - 1));
    this.idx = this.nav.list(input, dt, this.idx, items.length);
    if (cancelPressed(input)) {
      sfx('menu_back');
      this.close();
      return;
    }
    if (!confirmPressed(input) || !items.length) return;
    const it = items[this.idx];
    const p = this.w.progress;
    switch (it.kind) {
      case 'deposit': {
        const n = it.value === 'all' ? p.fragments : Math.min(100, p.fragments);
        if (n <= 0) return void this.deny('Nothing to deposit.');
        p.fragments -= n;
        p.banked += n;
        sfx('buy');
        this.w.save();
        return;
      }
      case 'withdraw': {
        const n = it.value === 'all' ? p.banked : Math.min(100, p.banked);
        if (n <= 0) return void this.deny('The vault is empty.');
        p.banked -= n;
        p.fragments += n;
        sfx('buy');
        this.w.save();
        return;
      }
      case 'sell': {
        p.fragments += -it.price;
        setFlag(p, `sold_${it.value}`);
        sfx('buy');
        this.say(`Sold for ${-it.price} fragments.`);
        this.w.save();
        return;
      }
      case 'blade': {
        const need = parseInt(it.value, 10);
        if ((p.flags.ore ?? 0) < need) return void this.deny('Not enough Veilsteel Ore.');
        if (p.fragments < it.price) return void this.deny('Not enough fragments.');
        p.fragments -= it.price;
        p.flags.ore = (p.flags.ore ?? 0) - need;
        p.bladeLevel++;
        this.w.refreshStats();
        sfx('buy');
        this.say('The Veilblade remembers how to bite.');
        this.w.save();
        return;
      }
      default:
        break;
    }
    if (p.fragments < it.price) return void this.deny('Not enough fragments.');
    p.fragments -= it.price;
    p.pickups[`shop_${it.id}`] = true;
    sfx('buy');
    switch (it.kind) {
      case 'relic':
        if (!p.relics.includes(it.value)) p.relics.push(it.value);
        this.say(`${it.name} acquired. Equip it at a shrine.`);
        break;
      case 'heart':
        p.heartFragments++;
        if (p.heartFragments % 4 === 0) {
          p.vigorBonus++;
          this.w.refreshStats();
          this.w.player.vigor = this.w.player.maxVigor;
          this.say('Four embers burn as one. Vigor increased!');
        } else this.say(`Vigor Ember ${p.heartFragments % 4}/4.`);
        break;
      case 'vessel':
        p.vesselFragments++;
        if (p.vesselFragments % 3 === 0) {
          p.aetherBonus++;
          this.w.refreshStats();
          this.say('A new Aether Phial!');
        } else this.say(`Phial shard ${p.vesselFragments % 3}/3.`);
        break;
      case 'map':
        p.mapPages[it.value] = true;
        this.say('The map unfolds.');
        break;
      case 'item':
        if (!p.keys.includes(it.value)) p.keys.push(it.value);
        this.say(`${it.name} acquired.`);
        break;
      case 'thread':
        p.threadSlots = Math.min(9, p.threadSlots + 1);
        this.say(`You can bear ${p.threadSlots} threads.`);
        break;
    }
    this.w.save();
  }
  private deny(m: string): void {
    sfx('deny');
    this.say(m);
  }
  draw(ctx: CanvasRenderingContext2D): void {
    const shop = SHOP_BY_ID.get(this.shopId);
    if (!shop) return;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const x = 40;
    const y = 24;
    const w = VIEW_W - 80;
    const h = VIEW_H - 48;
    panel(ctx, x, y, w, h, 1);
    text(ctx, shop.title, x + 14, y + 20, 11, UI.gold, 'left', 'bold');
    text(ctx, `◆ ${this.w.progress.fragments}`, x + w - 14, y + 20, 9, '#e4ecff', 'right');
    text(ctx, `"${shop.greeting}"`, x + 14, y + 33, 6.5, UI.dim, 'left', 'normal', true);
    const items = this.items();
    if (!items.length) text(ctx, 'Nothing left to offer.', x + 14, y + 60, 8, UI.dim, 'left', 'normal', true);
    items.slice(0, 9).forEach((it, i) => {
      const sel = i === this.idx;
      const iy = y + 52 + i * 15;
      if (sel) {
        ctx.fillStyle = 'rgba(232,212,160,0.1)';
        ctx.fillRect(x + 8, iy - 10, w * 0.55, 14);
      }
      if (it.kind === 'relic') {
        const r = RELIC_BY_ID.get(it.value);
        if (r) relicIcon(ctx, x + 18, iy - 3, 5, r.glyph, r.color);
      } else {
        ctx.fillStyle = it.color;
        ctx.beginPath();
        ctx.arc(x + 18, iy - 3, 3, 0, TAU);
        ctx.fill();
      }
      text(ctx, it.name, x + 28, iy, 7.5, sel ? UI.gold : UI.ink);
      if (it.price > 0) text(ctx, `${it.price}`, x + w * 0.55, iy, 7, this.w.progress.fragments >= it.price ? '#e4ecff' : '#a05050', 'right');
      else if (it.price < 0) text(ctx, `+${-it.price}`, x + w * 0.55, iy, 7, '#9fffc0', 'right');
    });
    const it = items[this.idx];
    if (it) paragraph(ctx, it.desc, x + w * 0.6, y + 56, 7, w * 0.36, UI.ink, 1.4);
    if (this.msgT > 0) text(ctx, this.msg, VIEW_W / 2, y + h - 10, 7, UI.accent, 'center', 'normal', true);
  }
}

// ---------------------------------------------------------------- Fast travel

export class TravelOverlay extends Overlay {
  private idx = 0;
  private nav = new Nav();
  constructor(private w: GameWorld) {
    super();
    this.opaque = true;
  }
  private gates(): string[] {
    return Object.keys(this.w.progress.veilGates).filter((id) => this.w.map.get(id));
  }
  update(dt: number, input: InputState): void {
    this.t += dt;
    const g = this.gates();
    this.idx = this.nav.list(input, dt, this.idx, g.length);
    if (cancelPressed(input)) {
      this.close();
      return;
    }
    if (confirmPressed(input) && g.length) {
      const id = g[this.idx];
      this.close();
      if (id === this.w.room.id) return;
      const grid = this.w.map.grid(id);
      const v = grid.placements.find((pl) => pl.ch === 'V');
      const fx = v ? v.tx * TILE + 8 : grid.pw / 2;
      const fy = v ? (v.ty + 1) * TILE : grid.ph - TILE;
      sfx('teleport');
      this.w.warp(id, fx, fy);
    }
  }
  draw(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(10,6,20,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const g = this.gates();
    const w = 220;
    const h = 40 + g.length * 14;
    const x = (VIEW_W - w) / 2;
    const y = (VIEW_H - h) / 2;
    panel(ctx, x, y, w, h);
    text(ctx, 'Veil Gates', VIEW_W / 2, y + 18, 10, '#d8c8ff', 'center', 'bold');
    if (g.length < 2) text(ctx, 'Attune more gates to travel between them.', VIEW_W / 2, y + h + 12, 6.5, UI.dim, 'center', 'normal', true);
    g.forEach((id, i) => {
      const def = this.w.map.get(id)!;
      const sel = i === this.idx;
      const here = id === this.w.room.id;
      text(ctx, `${sel ? '◆ ' : ''}${region(def.region).name}${def.title ? ' — ' + def.title : ''}${here ? '  (here)' : ''}`, VIEW_W / 2, y + 34 + i * 14, 7, sel ? UI.gold : UI.ink, 'center');
    });
    ctx.font = font(6);
  }
}
