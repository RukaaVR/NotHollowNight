/** Typography helpers. All UI text respects the player's text-scale setting. */
export const UI = {
  textScale: 1,
  hudScale: 1,
  gold: '#e8d4a0',
  ink: '#f2ecdf',
  dim: '#9a94a8',
  faint: '#5a5668',
  panel: 'rgba(10,9,16,0.88)',
  panelEdge: 'rgba(232,212,160,0.35)',
  accent: '#9fe8ff',
};

export const SERIF = '"Cormorant Garamond", "EB Garamond", Georgia, "Times New Roman", serif';

export function font(size: number, weight = 'normal', italic = false): string {
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
  // Corner flourishes
  ctx.fillStyle = UI.gold;
  for (const [cx, cy] of [[x + 1.5, y + 1.5], [x + w - 1.5, y + 1.5], [x + 1.5, y + h - 1.5], [x + w - 1.5, y + h - 1.5]]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy - 2.5);
    ctx.lineTo(cx + 2.5, cy);
    ctx.lineTo(cx, cy + 2.5);
    ctx.lineTo(cx - 2.5, cy);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A thin decorative divider with a central diamond. */
export function divider(ctx: CanvasRenderingContext2D, cx: number, y: number, w: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
  g.addColorStop(0, 'rgba(232,212,160,0)');
  g.addColorStop(0.5, 'rgba(232,212,160,0.8)');
  g.addColorStop(1, 'rgba(232,212,160,0)');
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
