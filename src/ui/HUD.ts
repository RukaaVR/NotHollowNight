import type { GameWorld } from '../world/GameWorld';
import { UI, text, panel, divider, font } from './text';
import { relicIcon } from './icons';
import { RELIC_BY_ID } from '../relics/relics';
import { glow } from '../rendering/draw';
import { TAU, clamp, formatTime } from '../core/math';
import { semanticColors } from '../accessibility/settings';
import { region } from '../world/regions';
import { VIEW_H, VIEW_W } from '../camera/Camera';

interface Toast {
  text: string;
  sub?: string;
  kind: string;
  t: number;
}

/** Minimal heads-up display: vigor, aether, relics, boss health, notices. */
export class HUD {
  aetherFlash = 0;
  private toasts: Toast[] = [];
  private hintText = '';
  private hintT = 0;
  banner: { name: string; sub: string; t: number } | null = null;
  bossTitle: { name: string; title: string; t: number } | null = null;
  private shownVigor = -1;
  private hurtFlash = 0;
  private bossShown = 0;

  toast(text: string, sub?: string, kind = 'info'): void {
    this.toasts.push({ text, sub, kind, t: 0 });
    if (this.toasts.length > 4) this.toasts.shift();
  }

  hint(s: string): void {
    this.hintText = s;
    this.hintT = 5;
  }

  areaBanner(name: string, sub: string): void {
    this.banner = { name, sub, t: 0 };
  }

  bossIntro(name: string, title: string): void {
    this.bossTitle = { name, title, t: 0 };
  }

  update(dt: number): void {
    this.aetherFlash = Math.max(0, this.aetherFlash - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < 4.5);
    this.hintT = Math.max(0, this.hintT - dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > (this.banner.sub ? 4.5 : 2.5)) this.banner = null;
    }
    if (this.bossTitle) {
      this.bossTitle.t += dt;
      if (this.bossTitle.t > 3.6) this.bossTitle = null;
    }
  }

  draw(ctx: CanvasRenderingContext2D, w: GameWorld, time: number, interact: { x: number; y: number; label: string } | null): void {
    const hs = UI.hudScale;
    const p = w.player;
    const sem = semanticColors(w.settings);
    if (this.shownVigor >= 0 && p.vigor < this.shownVigor) this.hurtFlash = 0.4;
    this.shownVigor = p.vigor;

    ctx.save();
    ctx.translate(10, 10);
    ctx.scale(hs, hs);
    // ---- Aether vessel
    const max = w.stats.maxAether;
    const frac = clamp(p.aether / max, 0, 1);
    const vx = 14;
    const vy = 14;
    const R = 12;
    ctx.fillStyle = 'rgba(8,8,14,0.8)';
    ctx.beginPath();
    ctx.arc(vx, vy, R + 1.5, 0, TAU);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(vx, vy, R, 0, TAU);
    ctx.clip();
    const level = vy + R - frac * R * 2;
    ctx.fillStyle = sem.aether;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(vx - R, vy + R);
    for (let i = 0; i <= 12; i++) {
      const xx = vx - R + (i / 12) * R * 2;
      ctx.lineTo(xx, level + Math.sin(time * 3 + i * 0.8) * 0.9);
    }
    ctx.lineTo(vx + R, vy + R);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    const canMend = p.aether >= w.stats.mendCost && w.stats.canMend;
    ctx.strokeStyle = this.aetherFlash > 0 && Math.floor(time * 12) % 2 === 0 ? sem.danger : canMend ? '#e8f8ff' : '#7a8496';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(vx, vy, R, 0, TAU);
    ctx.stroke();
    // Thresholds for each mend's worth
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 0.6;
    for (let a = w.stats.mendCost; a < max; a += w.stats.mendCost) {
      const yy = vy + R - (a / max) * R * 2;
      const half = Math.sqrt(Math.max(0, R * R - (yy - vy) * (yy - vy)));
      ctx.beginPath();
      ctx.moveTo(vx - half, yy);
      ctx.lineTo(vx + half, yy);
      ctx.stroke();
    }
    if (canMend) glow(ctx, vx, vy, R * 2, sem.aether, 0.25 + 0.1 * Math.sin(time * 3));
    if (p.poison > 0) {
      ctx.fillStyle = '#9be36a';
      ctx.font = font(7, 'bold');
      ctx.fillText('☣', vx + R - 2, vy + R + 2);
    }

    // ---- Vigor diamonds
    const maxV = p.maxVigor;
    let dx = 32;
    const dy = 9;
    for (let i = 0; i < maxV; i++) {
      const fill = clamp(p.vigor - i, 0, 1);
      drawDiamond(ctx, dx, dy, 4.6, fill, sem.health, this.hurtFlash > 0 && i === Math.floor(p.vigor) ? sem.danger : null);
      dx += 11;
    }
    if (p.gloamed) {
      drawDiamond(ctx, dx, dy, 4.6, 0, '#6a2a8a', null);
      ctx.strokeStyle = '#b080ff';
      ctx.beginPath();
      ctx.moveTo(dx - 3, dy - 2);
      ctx.lineTo(dx + 2, dy + 3);
      ctx.stroke();
      dx += 11;
    }
    if (p.shield > 0) drawDiamond(ctx, dx, dy, 4.6, 1, '#ffe08a', null);
    // Corruption gauge
    if (p.corruption > 0) {
      ctx.fillStyle = 'rgba(20,10,30,0.8)';
      ctx.fillRect(32, 17, 60, 2.5);
      ctx.fillStyle = '#9a5ae0';
      ctx.fillRect(32, 17, (p.corruption / 100) * 60, 2.5);
    }
    // ---- Fragments
    const fy = 26;
    ctx.fillStyle = '#cfd8ff';
    ctx.beginPath();
    ctx.moveTo(34, fy - 3);
    ctx.lineTo(36.5, fy);
    ctx.lineTo(34, fy + 3);
    ctx.lineTo(31.5, fy);
    ctx.fill();
    text(ctx, String(w.progress.fragments), 40, fy + 3, 8, '#e4ecff');
    const rem = w.progress.remnant;
    if (rem) text(ctx, `Remnant: ${rem.amount} ◆ — ${region(rem.room.split('_')[0]).name}`, 32, fy + 12, 6, '#9fb8ff', 'left', 'normal', true);
    // ---- Equipped relics (small)
    let rx = 6;
    const ry = rem ? fy + 22 : fy + 13;
    for (const id of w.progress.equipped) {
      const r = RELIC_BY_ID.get(id);
      if (!r) continue;
      relicIcon(ctx, rx, ry, 4, r.glyph, r.color);
      rx += 10;
    }
    // Ability readiness pips
    let ax = 6;
    const ay = ry + (w.progress.equipped.length ? 10 : 0);
    const pip = (ready: boolean, color: string) => {
      ctx.fillStyle = ready ? color : 'rgba(120,120,140,0.4)';
      ctx.beginPath();
      ctx.arc(ax, ay, 1.6, 0, TAU);
      ctx.fill();
      ax += 6;
    };
    if (w.progress.abilities.dash) pip(p.dashCd <= 0 && (p.onGround || p.airDash), '#9fd8ff');
    if (w.progress.abilities.step) pip(p.stepCd <= 0, '#b59cff');
    ctx.restore();

    // ---- Boss bar
    const boss = w.activeBoss;
    if (boss && boss.bossActive && boss.hp > 0) this.bossShown = Math.min(1, this.bossShown + 0.05);
    else this.bossShown = Math.max(0, this.bossShown - 0.05);
    if (boss && this.bossShown > 0) {
      ctx.globalAlpha = this.bossShown;
      const bw = 200;
      const bx = (VIEW_W - bw) / 2;
      const by = VIEW_H - 24;
      text(ctx, boss.bossName, VIEW_W / 2, by - 4, 8, UI.gold, 'center', 'bold');
      ctx.fillStyle = 'rgba(10,8,14,0.85)';
      ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
      const hpf = clamp(boss.hp / boss.maxHp, 0, 1);
      ctx.fillStyle = '#5a1a20';
      ctx.fillRect(bx, by, bw, 4);
      ctx.fillStyle = boss.staggered ? '#ffffff' : '#c84040';
      ctx.fillRect(bx, by, bw * hpf, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(bx, by, bw * hpf, 1);
      // Phase ticks
      const th = (boss as unknown as { thresholds?: number[] }).thresholds ?? [];
      ctx.fillStyle = UI.gold;
      for (const f of th) ctx.fillRect(bx + bw * f - 0.5, by - 1.5, 1, 7);
      // Stagger meter
      const sm = (boss as unknown as { staggerMax?: number }).staggerMax ?? 1;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(bx, by + 6, bw, 1.2);
      ctx.fillStyle = '#e8e0ff';
      ctx.fillRect(bx, by + 6, bw * clamp(boss.staggerMeter / sm, 0, 1), 1.2);
      if (boss.staggered) text(ctx, 'STAGGERED', VIEW_W / 2, by + 15, 6, '#ffffff', 'center', 'bold');
      ctx.globalAlpha = 1;
    }

    // ---- Challenge timer
    if (w.challengeBoss) text(ctx, `${(w.progress.playTime - w.challengeStart).toFixed(1)}s${w.challengeHit ? '' : '  ✦ flawless'}`, VIEW_W / 2, 14, 8, UI.gold, 'center');
    if (w.settings.showTimer) text(ctx, formatTime(w.progress.playTime), VIEW_W - 8, VIEW_H - 8, 7, UI.dim, 'right');

    // ---- Interact prompt
    if (interact) {
      const tw = ctx.measureText(interact.label).width;
      ctx.globalAlpha = 0.9;
      text(ctx, `▲ ${interact.label}`, interact.x, interact.y, 7, UI.gold, 'center');
      ctx.globalAlpha = 1;
      void tw;
    }

    // ---- Toasts
    let ty = 12;
    for (const t of this.toasts) {
      const a = Math.min(1, t.t * 4, (4.5 - t.t) * 2);
      ctx.globalAlpha = a;
      const wbox = 150;
      const x = VIEW_W - wbox - 8 + (1 - Math.min(1, t.t * 4)) * 20;
      const h = t.sub ? 24 : 15;
      panel(ctx, x, ty, wbox, h, 0.9);
      const color = t.kind === 'quest' ? '#ffd890' : t.kind === 'item' ? '#cfe8ff' : t.kind === 'area' ? UI.gold : UI.ink;
      text(ctx, t.text, x + 7, ty + 10, 7, color, 'left', 'bold');
      if (t.sub) text(ctx, t.sub.length > 46 ? t.sub.slice(0, 45) + '…' : t.sub, x + 7, ty + 19, 5.5, UI.dim);
      ty += h + 3;
    }
    ctx.globalAlpha = 1;

    // ---- Hint line
    if (this.hintT > 0 && this.hintText) {
      const a = Math.min(1, this.hintT, (5 - this.hintT) * 3);
      ctx.globalAlpha = a;
      text(ctx, this.hintText, VIEW_W / 2, VIEW_H - (boss && this.bossShown > 0 ? 44 : 18), 7, '#e8e0d0', 'center', 'normal', true);
      ctx.globalAlpha = 1;
    }

    // ---- Area banner
    if (this.banner) {
      const b = this.banner;
      const dur = b.sub ? 4.5 : 2.5;
      const a = Math.min(1, b.t / 0.8, (dur - b.t) / 0.8);
      ctx.globalAlpha = Math.max(0, a);
      const big = !!b.sub;
      text(ctx, b.name.toUpperCase(), VIEW_W / 2, big ? 96 : 40, big ? 18 : 9, UI.gold, 'center', 'bold');
      if (big) {
        divider(ctx, VIEW_W / 2, 104, 160 * Math.min(1, b.t), a);
        text(ctx, b.sub, VIEW_W / 2, 118, 8, '#d8d0c0', 'center', 'normal', true);
      }
      ctx.globalAlpha = 1;
    }
    // ---- Boss title card
    if (this.bossTitle) {
      const b = this.bossTitle;
      const a = Math.min(1, Math.max(0, (b.t - 0.6) / 0.6), (3.6 - b.t) / 0.6);
      if (a > 0) {
        ctx.globalAlpha = a;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(0, VIEW_H * 0.62, VIEW_W, 46);
        text(ctx, b.title, VIEW_W / 2, VIEW_H * 0.62 + 14, 7, '#c8c0b0', 'center', 'normal', true);
        text(ctx, b.name, VIEW_W / 2, VIEW_H * 0.62 + 32, 16, '#f4e8c8', 'center', 'bold');
        ctx.globalAlpha = 1;
      }
      if (b.t > 2.9 && b.t < 3.6) {
        ctx.globalAlpha = Math.min(1, (3.6 - b.t) * 2);
        text(ctx, 'BEGIN', VIEW_W / 2, VIEW_H * 0.62 + 56, 9, UI.gold, 'center', 'bold');
        ctx.globalAlpha = 1;
      }
    }
  }
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: number, color: string, flash: string | null): void {
  ctx.fillStyle = 'rgba(8,8,14,0.85)';
  ctx.beginPath();
  ctx.moveTo(x, y - r - 1);
  ctx.lineTo(x + r * 0.8 + 1, y);
  ctx.lineTo(x, y + r + 1);
  ctx.lineTo(x - r * 0.8 - 1, y);
  ctx.closePath();
  ctx.fill();
  if (fill > 0) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r * 0.8, y);
    ctx.lineTo(x, y + r);
    ctx.lineTo(x - r * 0.8, y);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = flash ?? color;
    ctx.fillRect(x - r, y + r - fill * r * 2, r * 2, fill * r * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(x - r, y - r, r, r * 0.6);
    ctx.restore();
  }
  ctx.strokeStyle = fill > 0 ? '#ffffff' : '#6a6478';
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.8, y);
  ctx.closePath();
  ctx.stroke();
}
