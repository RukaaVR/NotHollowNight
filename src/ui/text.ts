/** Typography helpers. All UI text respects the player's text-scale setting. */
export const UI = {
  textScale: 1,
  hudScale: 1,
  /** Highlight colour for selections and headings: pale silver-white. */
  gold: '#f4f0e4',
  ink: '#e6e4ec',
  dim: '#9c9aae',
  faint: '#5a5868',
  panel: 'rgba(6,6,12,0.86)',
  panelEdge: 'rgba(236,240,255,0.32)',
  accent: '#9fe8ff',
};

export const SERIF = '"Cormorant Garamond", "EB Garamond", Georgia, "Times New Roman", serif';

/** Engraved capitals for titles, banners and menus. */
export const DISPLAY = '"Cinzel", "Trajan Pro", Georgia, serif';

/** `weight` may be 'display' to use the engraved title face. */
export function font(size: number, weight = 'normal', italic = false): string {
  if (weight === 'display') return `600 ${Math.round(size * UI.textScale * 10) / 10}px ${DISPLAY}`;
  return `${italic ? 'italic ' : ''}${weight} ${Math.round(size * UI.textScale * 10) / 10}px ${SERIF}`;
}

export function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, color = UI.ink, align: CanvasTextAlign = 'left', weight = 'normal', italic = false): number {
  ctx.font = font(size, weight, italic);
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillText(s, x + 0.6, y + 0.6);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width;
  ctx.textAlign = 'left';
  return w;
}

export function measure(ctx: CanvasRenderingContext2D, s: string, size: number, weight = 'normal'): number {
  ctx.font = font(size, weight);
  return ctx.measureText(s).width;
}

/** Word-wrap text into lines that fit maxW. */
export function wrap(ctx: CanvasRenderingContext2D, s: string, size: number, maxW: number): string[] {
  ctx.font = font(size);
  const out: string[] = [];
  for (const para of s.split('\n')) {
    if (para === '') {
      out.push('');
      continue;
    }
    let line = '';
    for (const word of para.split(' ')) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        out.push(line);
        line = word;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export function paragraph(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, size: number, maxW: number, color = UI.ink, lineH = 1.35, align: CanvasTextAlign = 'left'): number {
  const lines = wrap(ctx, s, size, maxW);
  const lh = size * UI.textScale * lineH;
  lines.forEach((l, i) => text(ctx, l, x, y + i * lh, size, color, align));
  return lines.length * lh;
}

/** Ornamented translucent panel. */
export function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = UI.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = UI.panelEdge;
  ctx.lineWidth = 0.6;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
  // Corner scrolls in silver wire
  ctx.strokeStyle = 'rgba(236,240,255,0.75)';
  ctx.lineWidth = 0.7;
  ctx.lineCap = 'round';
  for (const [cx, cy, sx, sy] of [[x + 1.5, y + 1.5, 1, 1], [x + w - 1.5, y + 1.5, -1, 1], [x + 1.5, y + h - 1.5, 1, -1], [x + w - 1.5, y + h - 1.5, -1, -1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + sx * 9, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + sy * 9);
    ctx.moveTo(cx + sx * 3, cy + sy * 6);
    ctx.quadraticCurveTo(cx + sx * 3, cy + sy * 3, cx + sx * 6, cy + sy * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** A thin decorative divider with a central diamond. */
export function divider(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, 'rgba(236,240,255,0)');
  g.addColorStop(0.5, 'rgba(236,240,255,0.8)');
  g.addColorStop(1, 'rgba(236,240,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(cx - w / 2, y, w, 0.6);
  ctx.fillStyle = UI.gold;
  ctx.beginPath();
  ctx.moveTo(cx, y - 2);
  ctx.lineTo(cx + 2, y + 0.3);
  ctx.lineTo(cx, y + 2.6);
  ctx.lineTo(cx - 2, y + 0.3);
  ctx.fill();
  ctx.globalAlpha = 1;
}
