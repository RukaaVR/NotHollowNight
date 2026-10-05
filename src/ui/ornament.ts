/**
 * Procedural filigree for Veilfall's titles and menus: mirrored scrolls,
 * tapering swashes and a central "veil drop" jewel, stroked like silver wire.
 */

/** A spiral curl ending at (x, y), winding `turns` times with radius r. */
function curl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, dir: number, turns = 1.4): void {
  const steps = 26;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const k = i / steps;
    const a = dir * k * turns * Math.PI * 2;
    const rr = r * (1 - k * 0.82);
    const px = x + Math.cos(a + Math.PI) * rr * dir;
    const py = y + Math.sin(a + Math.PI) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();
}

/** One half of the ornament, drawn for the right side (mirrored for the left). */
function half(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  // Long tapering swash
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.bezierCurveTo(w * 0.3, -h * 0.9, w * 0.55, h * 0.6, w, -h * 0.15);
  ctx.stroke();
  ctx.lineWidth = 0.7;
  ctx.beginPath();
  ctx.moveTo(12, 3);
  ctx.bezierCurveTo(w * 0.28, h * 0.9, w * 0.5, -h * 0.4, w * 0.82, h * 0.25);
  ctx.stroke();
  // Scrolls
  ctx.lineWidth = 0.9;
  curl(ctx, w * 0.3, -h * 0.35, h * 0.55, 1);
  curl(ctx, w * 0.56, h * 0.2, h * 0.45, -1);
  curl(ctx, w * 0.8, -h * 0.25, h * 0.3, 1, 1.1);
  // Leaf flicks
  ctx.lineWidth = 0.6;
  for (const [lx, ly, s] of [[w * 0.42, -h * 0.6, 1], [w * 0.68, h * 0.45, -1], [w * 0.92, -h * 0.05, 1]] as const) {
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(lx + 4, ly - 4 * s, lx + 9, ly - 1 * s);
    ctx.quadraticCurveTo(lx + 4, ly + 1 * s, lx, ly);
    ctx.stroke();
  }
  // Terminal dot
  ctx.beginPath();
  ctx.arc(w + 2, -h * 0.15, 1.1, 0, Math.PI * 2);
  ctx.fill();
}

/** The central jewel: a teardrop of light held in a pointed frame. */
function jewel(ctx: CanvasRenderingContext2D, s: number): void {
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -9 * s);
  ctx.quadraticCurveTo(7 * s, -1 * s, 0, 8 * s);
  ctx.quadraticCurveTo(-7 * s, -1 * s, 0, -9 * s);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5 * s);
  ctx.quadraticCurveTo(3.4 * s, 0.5 * s, 0, 4.5 * s);
  ctx.quadraticCurveTo(-3.4 * s, 0.5 * s, 0, -5 * s);
  ctx.fill();
}

/**
 * A full mirrored ornament centred at (cx, y), `w` wide on each side.
 * `pendant` adds the hanging drop used under the logo.
 */
export function filigree(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, h: number, color: string, glowColor: string | null, pendant = false): void {
  ctx.save();
  ctx.translate(cx, y);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 6;
  }
  half(ctx, w, h);
  ctx.save();
  ctx.scale(-1, 1);
  half(ctx, w, h);
  ctx.restore();
  jewel(ctx, h / 8);
  if (pendant) {
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0, h * 1.1);
    ctx.lineTo(0, h * 1.9);
    ctx.stroke();
    ctx.save();
    ctx.translate(0, h * 2.6);
    jewel(ctx, h / 14);
    ctx.restore();
    ctx.lineWidth = 0.7;
    curl(ctx, -6, h * 1.6, 5, -1, 1.1);
    curl(ctx, 6, h * 1.6, 5, 1, 1.1);
  }
  ctx.restore();
}

/** Small flourish used either side of a selected menu item. */
export function flourish(ctx: CanvasRenderingContext2D, x: number, y: number, dir: number, color: string): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.shadowColor = color;
  ctx.shadowBlur = 4;
  ctx.lineWidth = 0.9;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(6, -4, 12, 0);
  ctx.quadraticCurveTo(6, 4, 0, 0);
  ctx.stroke();
  curl(ctx, 14, 0, 3, 1, 1.2);
  ctx.beginPath();
  ctx.moveTo(-2, 0);
  ctx.lineTo(-6, -2);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-6, 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
