import { TAU } from '../core/math';
import { glow } from '../rendering/draw';

/**
 * Procedural icon painter for relics, abilities and items. Each glyph index
 * combines a base emblem with ornament so every relic reads distinctly.
 */
export function relicIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, glyph: number, color: string, dim = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= dim ? 0.35 : 1;
  // Setting: a dark medallion with a gold rim
  ctx.fillStyle = '#16131e';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = dim ? '#5a5668' : '#c9a96a';
  ctx.lineWidth = Math.max(0.6, r * 0.12);
  ctx.stroke();
  if (!dim) glow(ctx, 0, 0, r * 1.2, color, 0.25);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(0.6, r * 0.12);
  const s = r * 0.6;
  const base = glyph % 12;
  const orn = Math.floor(glyph / 12);
  switch (base) {
    case 0: // blade
      ctx.beginPath();
      ctx.moveTo(-s * 0.2, s);
      ctx.lineTo(0, -s);
      ctx.lineTo(s * 0.2, s);
      ctx.fill();
      break;
    case 1: // heart
      ctx.beginPath();
      ctx.moveTo(0, s * 0.8);
      ctx.bezierCurveTo(-s * 1.2, -s * 0.2, -s * 0.4, -s, 0, -s * 0.3);
      ctx.bezierCurveTo(s * 0.4, -s, s * 1.2, -s * 0.2, 0, s * 0.8);
      ctx.fill();
      break;
    case 2: // thread spiral
      ctx.beginPath();
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * TAU * 2;
        const rr = (i / 40) * s;
        if (i === 0) ctx.moveTo(0, 0);
        else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.stroke();
      break;
    case 3: // flame
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s, 0, 0, s);
      ctx.quadraticCurveTo(-s, 0, 0, -s);
      ctx.fill();
      break;
    case 4: // mirror / circle in circle
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.8, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.2, -s * 0.2, s * 0.3, 0, TAU);
      ctx.fill();
      break;
    case 5: // fang
      ctx.beginPath();
      ctx.moveTo(-s * 0.6, -s * 0.6);
      ctx.quadraticCurveTo(0, -s * 0.2, s * 0.6, -s * 0.6);
      ctx.lineTo(0, s);
      ctx.closePath();
      ctx.fill();
      break;
    case 6: // lantern
      ctx.fillRect(-s * 0.45, -s * 0.5, s * 0.9, s * 1.1);
      ctx.fillRect(-s * 0.2, -s * 0.85, s * 0.4, s * 0.3);
      break;
    case 7: // drop
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.quadraticCurveTo(s * 0.9, s * 0.3, 0, s * 0.9);
      ctx.quadraticCurveTo(-s * 0.9, s * 0.3, 0, -s);
      ctx.fill();
      break;
    case 8: // star
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU - Math.PI / 2;
        const rr = i % 2 ? s * 0.4 : s;
        ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      break;
    case 9: // crescent
      ctx.beginPath();
      ctx.arc(0, 0, s, 0.4, TAU - 0.4);
      ctx.arc(s * 0.4, 0, s * 0.7, TAU - 0.9, 0.9, true);
      ctx.fill();
      break;
    case 10: // wing
      ctx.beginPath();
      ctx.moveTo(-s, s * 0.4);
      ctx.quadraticCurveTo(-s * 0.2, -s, s, -s * 0.6);
      ctx.quadraticCurveTo(s * 0.2, 0, -s, s * 0.4);
      ctx.fill();
      break;
    default: // eye
      ctx.beginPath();
      ctx.ellipse(0, 0, s, s * 0.5, 0, 0, TAU);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.3, 0, TAU);
      ctx.fill();
  }
  // Ornament rings distinguish the second and third sets of glyphs
  if (orn >= 1) {
    ctx.globalAlpha *= 0.6;
    for (let i = 0; i < (orn === 1 ? 4 : 8); i++) {
      const a = (i / (orn === 1 ? 4 : 8)) * TAU;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.82, Math.sin(a) * r * 0.82, r * 0.08, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Ability emblems: one bespoke symbol per power. */
export function abilityIcon(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, id: string, color: string, dim = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha *= dim ? 0.3 : 1;
  ctx.strokeStyle = dim ? '#5a5668' : color;
  ctx.fillStyle = dim ? '#5a5668' : color;
  ctx.lineWidth = Math.max(0.7, r * 0.14);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.stroke();
  if (!dim) glow(ctx, 0, 0, r * 1.3, color, 0.3);
  const s = r * 0.5;
  ctx.beginPath();
  switch (id) {
    case 'dash':
      ctx.moveTo(-s, -s * 0.5);
      ctx.lineTo(s, 0);
      ctx.lineTo(-s, s * 0.5);
      ctx.moveTo(-s * 1.4, 0);
      ctx.lineTo(-s * 0.4, 0);
      ctx.stroke();
      break;
    case 'lance':
      ctx.moveTo(-s, s);
      ctx.lineTo(s, -s);
      ctx.moveTo(s, -s);
      ctx.lineTo(s * 0.3, -s * 0.8);
      ctx.moveTo(s, -s);
      ctx.lineTo(s * 0.8, -s * 0.3);
      ctx.stroke();
      break;
    case 'grip':
      ctx.moveTo(-s * 0.5, -s);
      ctx.lineTo(-s * 0.5, s);
      ctx.moveTo(-s * 0.5, -s * 0.3);
      ctx.lineTo(s * 0.6, -s * 0.6);
      ctx.moveTo(-s * 0.5, s * 0.3);
      ctx.lineTo(s * 0.6, 0);
      ctx.stroke();
      break;
    case 'lantern':
      ctx.fillRect(-s * 0.4, -s * 0.5, s * 0.8, s);
      ctx.fillRect(-s * 0.15, -s * 0.9, s * 0.3, s * 0.4);
      break;
    case 'step':
      ctx.arc(-s * 0.4, 0, s * 0.4, 0, TAU);
      ctx.fill();
      ctx.globalAlpha *= 0.5;
      ctx.beginPath();
      ctx.arc(s * 0.5, 0, s * 0.4, 0, TAU);
      ctx.fill();
      break;
    case 'dive':
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(-s, -s * 0.5 + i * s * 0.5);
        ctx.quadraticCurveTo(0, -s * 0.9 + i * s * 0.5, s, -s * 0.5 + i * s * 0.5);
      }
      ctx.stroke();
      break;
    case 'drop':
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s * 0.6);
      ctx.moveTo(-s * 0.5, s * 0.1);
      ctx.lineTo(0, s * 0.6);
      ctx.lineTo(s * 0.5, s * 0.1);
      ctx.moveTo(-s, s);
      ctx.lineTo(s, s);
      ctx.stroke();
      break;
    case 'glide':
      ctx.moveTo(-s, 0);
      ctx.quadraticCurveTo(0, -s, s, 0);
      ctx.quadraticCurveTo(0, -s * 0.3, -s, 0);
      ctx.fill();
      break;
    case 'phase':
      ctx.setLineDash([1.5, 1.5]);
      ctx.rect(-s * 0.7, -s * 0.8, s * 1.4, s * 1.6);
      ctx.stroke();
      ctx.setLineDash([]);
      break;
    case 'grapple':
      ctx.arc(s * 0.4, -s * 0.4, s * 0.35, 0, TAU);
      ctx.moveTo(s * 0.15, -s * 0.15);
      ctx.lineTo(-s, s);
      ctx.stroke();
      break;
    default:
      ctx.arc(0, 0, s * 0.5, 0, TAU);
      ctx.fill();
  }
  ctx.restore();
}
