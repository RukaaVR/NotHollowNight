import type { Player } from './Player';
import { ATTACKS } from './constants';
import { glow, ellipse, fillCircle } from '../rendering/draw';
import { TAU, clamp } from '../core/math';

const CLOAK = '#2b2f4a';
const CLOAK_DARK = '#1c1f33';
const TRIM = '#c9a96a';
const MASK = '#ece8f2';
const EYE = '#7fe0d0';
const SCARF = '#86d4c8';
const BLADE = '#e4ddff';

/**
 * Aeren: a small hooded wanderer with a long drooping hood-tip, a porcelain
 * mask split by a single line of light, and a ribbon-scarf that trails behind.
 */
export function drawAeren(ctx: CanvasRenderingContext2D, p: Player, time: number): void {
  const b = p.body;
  const st = p.state;
  if (p.hazardFading && p.stateT > 0.05) return;
  // Invulnerability flicker
  if (p.iframes > 0 && st !== 'step' && st !== 'dead' && Math.floor(time * 20) % 2 === 0 && p.flashT <= 0) ctx.globalAlpha = 0.45;

  // Shadow-step afterimages and dash trails
  for (const tr of p.stepTrail) {
    ctx.save();
    ctx.globalAlpha = tr.a * 0.45;
    ctx.translate(tr.x, tr.y + b.h);
    ctx.scale(p.facing, 1);
    silhouette(ctx, '#8a7aff');
    ctx.restore();
  }
  if (st === 'step') {
    ctx.globalAlpha = 0.25;
  }

  // Scarf (world space verlet)
  drawScarf(ctx, p);

  const cx = b.x + b.w / 2;
  const by = b.y + b.h;
  ctx.save();
  ctx.translate(cx, by);
  ctx.scale(p.facing * p.squashX, p.squashY);

  if (st === 'dead') {
    drawDead(ctx, p, time);
    ctx.restore();
    ctx.globalAlpha = 1;
    return;
  }

  const t = time;
  const running = b.onGround && Math.abs(b.vx) > 15 && st === 'normal';
  const air = !b.onGround && st !== 'swim' && st !== 'ledge' && st !== 'wall' && st !== 'climb';
  const breathe = Math.sin(t * 2.4) * 0.4;
  let lean = 0;
  if (running) lean = 0.12;
  if (st === 'dash') lean = 0.3;
  if (air) lean = clamp(b.vy / 900, -0.15, 0.25) * -1;
  if (st === 'swim') lean = 0.5;

  ctx.rotate(lean * 0.5);

  // ----- Legs
  const legPhase = p.runPhase;
  ctx.strokeStyle = '#141626';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  let l1 = 0;
  let l2 = 0;
  if (running) {
    l1 = Math.sin(legPhase) * 4;
    l2 = -l1;
  } else if (air) {
    l1 = 2;
    l2 = -2;
  } else if (st === 'mend' || st === 'rest' || st === 'kneel') {
    l1 = -3;
    l2 = 3;
  }
  const kneel = st === 'mend' || st === 'rest' || st === 'kneel' ? 4 : 0;
  ctx.beginPath();
  ctx.moveTo(-1.5, -6 + kneel);
  ctx.lineTo(-1.5 + l1, -0.5 - (running && l1 < 0 ? 1.5 : 0));
  ctx.moveTo(1.5, -6 + kneel);
  ctx.lineTo(1.5 + l2, -0.5 - (running && l2 < 0 ? 1.5 : 0));
  ctx.stroke();
  ctx.fillStyle = '#2a1e18';
  fillCircle(ctx, -1.5 + l1 + 0.8, -0.6, 1.3, '#2a1e18');
  fillCircle(ctx, 1.5 + l2 + 0.8, -0.6, 1.3, '#2a1e18');

  // ----- Cloak body
  ctx.translate(0, kneel);
  const sway = Math.sin(t * 3 + p.runPhase * 0.5) * 1.2 - clamp(b.vx / 80, -2.5, 2.5) * 0.6;
  const flare = p.gliding ? 1 : 0;
  ctx.fillStyle = CLOAK;
  ctx.beginPath();
  ctx.moveTo(-3.5, -17 + breathe);
  if (flare) {
    // Spread like wings while gliding
    ctx.quadraticCurveTo(-12, -14, -15 + sway, -6);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-5, -4);
    ctx.lineTo(5, -4);
    ctx.lineTo(8, -8);
    ctx.lineTo(15, -6);
    ctx.quadraticCurveTo(12, -14, 3.5, -17 + breathe);
  } else {
    ctx.quadraticCurveTo(-6.5, -10, -6 - sway * 0.6, -4.5);
    ctx.lineTo(-4 - sway * 0.8, -3);
    ctx.lineTo(-1.5 - sway, -4.2);
    ctx.lineTo(1 - sway * 0.8, -2.8);
    ctx.lineTo(3.5 - sway * 0.6, -4.2);
    ctx.lineTo(6 - sway * 0.4, -3.4);
    ctx.quadraticCurveTo(6.5, -10, 3.5, -17 + breathe);
  }
  ctx.closePath();
  ctx.fill();
  // Inner shading fold
  ctx.fillStyle = CLOAK_DARK;
  ctx.beginPath();
  ctx.moveTo(-1, -15 + breathe);
  ctx.quadraticCurveTo(-3, -9, -2 - sway, -4);
  ctx.lineTo(0 - sway, -4);
  ctx.quadraticCurveTo(-1, -9, 0.5, -15 + breathe);
  ctx.fill();
  // Gold trim at the hem
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(-5.5 - sway * 0.6, -4.6);
  ctx.lineTo(-1.5 - sway, -4.4);
  ctx.lineTo(3.5 - sway * 0.6, -4.4);
  ctx.lineTo(5.8 - sway * 0.4, -3.8);
  ctx.stroke();
  // Small clasp
  fillCircle(ctx, 2, -15 + breathe, 0.8, TRIM);

  // ----- Head: hood with its long drooping tip
  const hy = -19.5 + breathe;
  const tipSway = Math.sin(t * 2.2) * 1.5 - clamp(b.vx / 50, -4, 4);
  ctx.fillStyle = CLOAK;
  ctx.beginPath();
  ctx.moveTo(4.2, hy + 2.5);
  ctx.quadraticCurveTo(4.8, hy - 4.8, 0, hy - 5.2);
  ctx.quadraticCurveTo(-4, hy - 5, -5, hy - 2);
  // The tip, trailing backward and down
  ctx.quadraticCurveTo(-9 + tipSway * 0.4, hy - 3, -12 + tipSway, hy + 1.5 - (air ? 2 : 0));
  ctx.quadraticCurveTo(-7, hy + 0.5, -4.5, hy + 2.5);
  ctx.closePath();
  ctx.fill();
  // Hood opening
  ctx.fillStyle = '#0a0b14';
  ellipse(ctx, 1.4, hy - 0.4, 3.1, 3.4);
  ctx.fill();
  // Porcelain mask
  ctx.fillStyle = MASK;
  ctx.beginPath();
  ctx.moveTo(4, hy - 2.4);
  ctx.quadraticCurveTo(4.6, hy + 1.6, 1.8, hy + 2.8);
  ctx.quadraticCurveTo(-0.6, hy + 1.4, -0.2, hy - 1.2);
  ctx.quadraticCurveTo(1.2, hy - 3.6, 4, hy - 2.4);
  ctx.fill();
  // The line of light across the eye
  const eyeGlow = p.chargeReady ? 1 : p.chargeT > 0 ? 0.6 : 0.35;
  glow(ctx, 2.6, hy - 0.3, 5 + eyeGlow * 4, EYE, eyeGlow);
  ctx.strokeStyle = EYE;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(2.6, hy - 2.4);
  ctx.lineTo(2.6, hy + 1.4);
  ctx.stroke();

  // ----- Arm + Veilblade
  drawBlade(ctx, p, t, hy);

  ctx.restore();

  // Slash arcs (world space, after body)
  drawSlash(ctx, p);

  // Shield shimmer
  if (p.shield > 0) {
    ctx.strokeStyle = 'rgba(255,224,138,0.45)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, b.y + b.h / 2, 15 + Math.sin(time * 4), 0, TAU);
    ctx.stroke();
  }
  // Mend glow
  if (st === 'mend') glow(ctx, cx, b.y + b.h / 2, 18 + p.mendT * 10, '#9fe8ff', 0.4 + p.mendT);
  if (p.chargeT > 0.05) glow(ctx, cx + p.facing * 6, b.y + 8, 10 + Math.min(1, p.chargeT) * 10, p.chargeReady ? '#ffffff' : '#c8b8ff', p.chargeReady ? 0.9 : 0.4);
  if (p.flashT > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = p.flashT * 2.5;
    ctx.translate(cx, by);
    ctx.scale(p.facing, 1);
    silhouette(ctx, '#ff5040');
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawBlade(ctx: CanvasRenderingContext2D, p: Player, _t: number, hy: number): void {
  const k = p.atkKind;
  let ang = 2.2; // resting: held low behind
  let reach = 11;
  let handX = 2.5;
  let handY = -11;
  if (p.state === 'wall') {
    ang = 2.8;
  } else if (p.state === 'ledge' || p.state === 'climb') {
    ang = 3.1;
    handY = -18;
  } else if (p.state === 'mend' || p.state === 'rest') {
    ang = 1.57;
    handY = -8;
  } else if (p.chargeT > 0.05 && !k) {
    ang = -2.3;
    handX = -1;
    handY = -13;
  } else if (k) {
    const spec = ATTACKS[k];
    const prog = clamp((p.atkT - spec.startup) / spec.active, 0, 1);
    if (k === 'side' || k === 'air') {
      const from = p.combo === 0 ? -1.9 : 1.3;
      const to = p.combo === 0 ? 1.0 : -1.4;
      ang = p.atkT < spec.startup ? from : from + (to - from) * easeOut(prog);
      reach = 13;
    } else if (k === 'up') {
      ang = p.atkT < spec.startup ? 0.6 : 0.6 - 2.8 * easeOut(prog);
      handY = -15;
      reach = 13;
    } else if (k === 'down') {
      ang = p.atkT < spec.startup ? -1.2 : -1.2 + 3.4 * easeOut(prog);
      handY = -8;
      reach = 13;
    } else if (k === 'charged') {
      ang = p.atkT < spec.startup ? -2.5 : -2.5 + 3.8 * easeOut(prog);
      reach = 16;
    }
  }
  // Arm
  ctx.strokeStyle = CLOAK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(1, -14);
  ctx.lineTo(handX, handY);
  ctx.stroke();
  // Blade: slender, slightly curved, with a pale edge glow
  ctx.save();
  ctx.translate(handX, handY);
  ctx.rotate(ang);
  ctx.fillStyle = '#5a4a3a';
  ctx.fillRect(-1.5, -0.8, 2.5, 1.6);
  ctx.strokeStyle = TRIM;
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.arc(-2, 0, 1, 0, TAU);
  ctx.stroke();
  ctx.fillStyle = BLADE;
  ctx.beginPath();
  ctx.moveTo(1, -0.9);
  ctx.quadraticCurveTo(reach * 0.6, -1.8, reach, 0);
  ctx.quadraticCurveTo(reach * 0.6, 0.6, 1, 0.9);
  ctx.closePath();
  ctx.fill();
  if (p.chargeReady || k === 'charged') glow(ctx, reach * 0.6, 0, 8, '#ffffff', 0.7);
  ctx.restore();
  void hy;
}

function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t) * (1 - t);
}

function drawSlash(ctx: CanvasRenderingContext2D, p: Player): void {
  const k = p.atkKind;
  if (!k) return;
  const spec = ATTACKS[k];
  const t = p.atkT;
  if (t < spec.startup) return;
  const prog = clamp((t - spec.startup) / (spec.active + spec.recovery * 0.4), 0, 1);
  const alpha = 1 - prog;
  if (alpha <= 0) return;
  const r = p.attackRect();
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(k === 'side' || k === 'air' || k === 'charged' ? p.cx : cx, k === 'up' || k === 'down' ? p.cy : cy);
  if (k === 'side' || k === 'air' || k === 'charged') ctx.scale(p.facing, p.combo === 0 ? 1 : -1);
  const radius = k === 'charged' ? 30 : 20;
  let a0 = -1.2;
  let a1 = 1.1;
  if (k === 'up') {
    a0 = -Math.PI + 0.3;
    a1 = -0.3;
  } else if (k === 'down') {
    a0 = 0.3;
    a1 = Math.PI - 0.3;
  }
  const sweep = a0 + (a1 - a0) * easeOut(clamp(prog * 2.5, 0, 1));
  // Crescent: thick at the leading edge, thinning toward the tail.
  const color = k === 'charged' ? '255,255,255' : '220,210,255';
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = `rgba(${color},${alpha * (0.5 - i * 0.14)})`;
    ctx.lineWidth = (k === 'charged' ? 7 : 4.5) - i * 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius - i * 2.5, a0, sweep);
    ctx.stroke();
  }
  ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 1, Math.max(a0, sweep - 0.6), sweep);
  ctx.stroke();
  ctx.restore();
}

function drawScarf(ctx: CanvasRenderingContext2D, p: Player): void {
  const s = p.scarf;
  const n = s.n;
  ctx.save();
  ctx.fillStyle = SCARF;
  ctx.beginPath();
  // Ribbon outline: offset each point perpendicular to the chain.
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(n - 1, i + 1);
    let dx = s.px[i1] - s.px[i0];
    let dy = s.py[i1] - s.py[i0];
    const d = Math.hypot(dx, dy) || 1;
    dx /= d;
    dy /= d;
    const w = 1.6 * (1 - i / n) + 0.4;
    left.push([s.px[i] - dy * w, s.py[i] + dx * w]);
    right.push([s.px[i] + dy * w, s.py[i] - dx * w]);
  }
  ctx.moveTo(left[0][0], left[0][1]);
  for (const [x, y] of left) ctx.lineTo(x, y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 1; i < n; i += 2) ctx.fillRect(s.px[i] - 0.4, s.py[i] - 0.4, 0.8, 0.8);
  ctx.restore();
}

function silhouette(ctx: CanvasRenderingContext2D, color: string): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-6, -3);
  ctx.quadraticCurveTo(-6, -12, -3.5, -17);
  ctx.quadraticCurveTo(-5, -22, -11, -18.5);
  ctx.quadraticCurveTo(-4, -26, 2, -24.5);
  ctx.quadraticCurveTo(5, -22, 3.5, -17);
  ctx.quadraticCurveTo(6.5, -10, 6, -3);
  ctx.closePath();
  ctx.fill();
}

function drawDead(ctx: CanvasRenderingContext2D, p: Player, time: number): void {
  // The mask cracks and the cloak empties into motes.
  const k = Math.min(1, p.deathT / 1.2);
  ctx.globalAlpha *= 1 - k * 0.8;
  ctx.rotate(-k * 1.2);
  silhouette(ctx, CLOAK);
  ctx.fillStyle = MASK;
  ellipse(ctx, 1.5, -19.5, 2.8, 3.2);
  ctx.fill();
  ctx.strokeStyle = '#2a2430';
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  ctx.moveTo(1, -22.5);
  ctx.lineTo(2, -19.5);
  ctx.lineTo(0.5, -17);
  ctx.stroke();
  glow(ctx, 2.6, -19.5, 8 * (1 - k), EYE, 1 - k);
  void time;
}
