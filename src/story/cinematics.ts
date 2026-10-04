import { VIEW_H, VIEW_W } from '../camera/Camera';
import { Rng } from '../core/rng';
import { TAU, clamp, easeInOutSine } from '../core/math';
import { glow, fillCircle, ellipse } from '../rendering/draw';
import { UI, text, paragraph, divider } from '../ui/text';

/** A single illustrated panel of a cinematic. */
export interface Panel {
  duration: number;
  lines: string[];
  art: (ctx: CanvasRenderingContext2D, t: number, k: number) => void;
  music?: string;
}

const snowRng = new Rng(11);
const snow: { x: number; y: number; s: number; v: number }[] = [];
for (let i = 0; i < 120; i++) snow.push({ x: snowRng.next() * VIEW_W, y: snowRng.next() * VIEW_H, s: 0.5 + snowRng.next() * 1.2, v: 8 + snowRng.next() * 18 });

function drawSnow(ctx: CanvasRenderingContext2D, t: number, alpha = 0.8): void {
  ctx.fillStyle = `rgba(230,236,255,${alpha})`;
  for (const f of snow) {
    const y = (f.y + t * f.v) % VIEW_H;
    const x = (f.x + Math.sin(t * 0.5 + f.y) * 8 + t * 4) % VIEW_W;
    ctx.fillRect(x, y, f.s, f.s);
  }
}

function sky(ctx: CanvasRenderingContext2D, top: string, bottom: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function towers(ctx: CanvasRenderingContext2D, color: string, seed: number, base: number, hmax: number): void {
  const r = new Rng(seed);
  ctx.fillStyle = color;
  let x = -10;
  while (x < VIEW_W + 10) {
    const w = 14 + r.next() * 26;
    const h = 30 + r.next() * hmax;
    ctx.fillRect(x, base - h, w, h + 200);
    if (r.chance(0.5)) {
      ctx.beginPath();
      ctx.moveTo(x, base - h);
      ctx.lineTo(x + w / 2, base - h - 16 - r.next() * 20);
      ctx.lineTo(x + w, base - h);
      ctx.fill();
    }
    x += w + r.next() * 8;
  }
}

/** A tiny Aeren silhouette usable in cinematics. */
export function aerenFigure(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, eye: number, lying = false): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  if (lying) ctx.rotate(-Math.PI / 2 + 0.15);
  ctx.fillStyle = '#2b2f4a';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-6.5, -10, -3.5, -17);
  ctx.lineTo(3.5, -17);
  ctx.quadraticCurveTo(6.5, -10, 6, 0);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(4, -17);
  ctx.quadraticCurveTo(4.8, -24, 0, -24.5);
  ctx.quadraticCurveTo(-4, -24, -5, -21);
  ctx.quadraticCurveTo(-9, -22, -12, -17.5);
  ctx.quadraticCurveTo(-7, -18.5, -4.5, -17);
  ctx.fill();
  ctx.fillStyle = '#ece8f2';
  ellipse(ctx, 1.6, -19.8, 2.8, 3.2);
  ctx.fill();
  if (eye > 0) {
    glow(ctx, 2.6, -20, 6 + eye * 4, '#7fe0d0', eye);
    ctx.strokeStyle = `rgba(127,224,208,${eye})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(2.6, -22);
    ctx.lineTo(2.6, -18);
    ctx.stroke();
  }
  ctx.strokeStyle = '#86d4c8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-1, -16);
  ctx.quadraticCurveTo(-8, -14, -14, -10 + Math.sin(Date.now() / 300) * 1.5);
  ctx.stroke();
  ctx.restore();
}

export const OPENING: Panel[] = [
  {
    duration: 7, lines: ['Long ago, the sun went dark over Ilvane.'], music: 'title',
    art: (ctx, t, k) => {
      sky(ctx, '#05060c', '#1a1c2a');
      const sunA = clamp(1 - k * 0.9, 0.1, 1);
      glow(ctx, VIEW_W * 0.6, 80, 90, '#ffe8b0', sunA * 0.5);
      fillCircle(ctx, VIEW_W * 0.6, 80, 22, `rgba(255,236,190,${sunA})`);
      towers(ctx, '#0c0e16', 3, 220, 70);
      drawSnow(ctx, t, 0.6);
    },
  },
  {
    duration: 7, lines: ['Its people would not die with it.', 'They took up their lanterns, and went down.'],
    art: (ctx, t) => {
      sky(ctx, '#04050a', '#0e0f18');
      // The great chasm and a winding line of lanterns
      ctx.fillStyle = '#020204';
      ctx.beginPath();
      ctx.moveTo(140, VIEW_H);
      ctx.quadraticCurveTo(220, 120, 240, 60);
      ctx.lineTo(260, 60);
      ctx.quadraticCurveTo(290, 140, 360, VIEW_H);
      ctx.fill();
      for (let i = 0; i < 60; i++) {
        const u = ((i / 60 + t * 0.02) % 1);
        const x = 250 + Math.sin(u * 12) * (20 + u * 60);
        const y = 60 + u * 220;
        glow(ctx, x, y, 4, '#ffcf8a', 0.9 * (1 - u * 0.6));
      }
      towers(ctx, '#08090e', 9, 70, 30);
      drawSnow(ctx, t, 0.4);
    },
  },
  {
    duration: 9, lines: ['Beneath the world they wove the Veil —', 'a kingdom of remembered light, cradled in the dream of something vast and sleeping.'],
    art: (ctx, t, k) => {
      sky(ctx, '#0a0812', '#1c1430');
      // The sleeping shape far below
      glow(ctx, VIEW_W / 2, VIEW_H + 40, 220, '#8a6ad0', 0.35 + Math.sin(t) * 0.05);
      ctx.fillStyle = '#120a1e';
      ellipse(ctx, VIEW_W / 2, VIEW_H + 60, 260, 110);
      ctx.fill();
      // Cities of light suspended in caverns
      const r = new Rng(21);
      for (let i = 0; i < 40; i++) {
        const x = r.next() * VIEW_W;
        const y = 40 + r.next() * 140;
        glow(ctx, x, y, 3 + r.next() * 4, i % 3 ? '#ffcf8a' : '#9fe8ff', 0.8 * (0.5 + k * 0.5));
      }
      ctx.fillStyle = '#05040a';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const x = i * 60 + 10;
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 25, 40 + (i % 3) * 20);
        ctx.lineTo(x + 50, 0);
        ctx.fill();
      }
    },
  },
  {
    duration: 6, lines: ['Four hundred years passed in the dark.'],
    art: (ctx, t, k) => {
      sky(ctx, '#050408', '#0c0a10');
      const r = new Rng(33);
      for (let i = 0; i < 60; i++) {
        const x = r.next() * VIEW_W;
        const y = 60 + r.next() * 160;
        const dies = r.next();
        if (dies < k) continue;
        glow(ctx, x, y, 4, '#ffcf8a', 0.8);
      }
      void t;
    },
  },
  {
    duration: 7, lines: ['Then, on a night no one would remember,', 'every bell in the Veil stopped ringing at once.'],
    art: (ctx, t, k) => {
      sky(ctx, '#06101a', '#0f2a3a');
      towers(ctx, '#0a1820', 5, 260, 140);
      // The clock face at a quarter past eleven
      const cx = VIEW_W / 2;
      const cy = 100;
      glow(ctx, cx, cy, 50, '#9fe8ff', 0.3);
      fillCircle(ctx, cx, cy, 30, '#d8d0c0');
      ctx.strokeStyle = '#1a1418';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 9, cy - 15);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 22, cy);
      ctx.stroke();
      // A bell, swinging, then still
      const sw = Math.sin(t * 3) * (1 - k) * 0.4;
      ctx.save();
      ctx.translate(cx + 120, 50);
      ctx.rotate(sw);
      ctx.fillStyle = '#8a7040';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-18, 18, -20, 34);
      ctx.lineTo(20, 34);
      ctx.quadraticCurveTo(18, 18, 6, 0);
      ctx.fill();
      ctx.restore();
      // Rain
      ctx.strokeStyle = 'rgba(160,210,240,0.3)';
      ctx.lineWidth = 0.6;
      for (let i = 0; i < 80; i++) {
        const x = (i * 37 + t * 40) % VIEW_W;
        const y = (i * 53 + t * 300) % VIEW_H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 2, y + 8);
        ctx.stroke();
      }
    },
  },
  {
    duration: 9, lines: ['And far above, in the ruins where the snow still falls,', 'something that had been forgotten opened its eyes.'],
    art: (ctx, t, k) => {
      sky(ctx, '#0b0d14', '#1c2230');
      towers(ctx, '#151a24', 7, 200, 60);
      ctx.fillStyle = '#2a3040';
      ctx.fillRect(0, 210, VIEW_W, 60);
      ctx.fillStyle = '#d8deea';
      ctx.fillRect(0, 208, VIEW_W, 3);
      const eye = clamp((k - 0.5) * 3, 0, 1);
      aerenFigure(ctx, VIEW_W / 2, 210, 2.2, eye, k < 0.75);
      drawSnow(ctx, t, 0.8);
    },
  },
];

export const ENDINGS: Record<string, { title: string; music: string; panels: Panel[] }> = {
  standard: {
    title: 'The Long Lullaby',
    music: 'ending_standard',
    panels: [
      {
        duration: 8, lines: ['Aeren set the Veilblade into the Dreamer\'s heart, and lay down beside it.'],
        art: (ctx, t) => {
          sky(ctx, '#05030a', '#120a1e');
          glow(ctx, VIEW_W / 2, 160, 120, '#c8a0ff', 0.4 + Math.sin(t) * 0.05);
          aerenFigure(ctx, VIEW_W / 2, 200, 2, 0.6, true);
        },
      },
      {
        duration: 8, lines: ['The nightmare quieted. A new dream began — gentler, smaller, and a little sad.'],
        art: (ctx, t, k) => {
          sky(ctx, '#0a0812', '#1c1430');
          const r = new Rng(21);
          for (let i = 0; i < 50; i++) glow(ctx, r.next() * VIEW_W, 40 + r.next() * 160, 4, '#ffcf8a', 0.8 * k);
          void t;
        },
      },
      {
        duration: 9, lines: ['In Lanternwake, the lamps burned a little brighter.', 'No one could say why. Old Wick said it was someone humming.'],
        art: (ctx, t) => {
          sky(ctx, '#100c10', '#2a1d1a');
          towers(ctx, '#181210', 13, 220, 60);
          for (let i = 0; i < 20; i++) glow(ctx, 20 + i * 24, 190 - (i % 3) * 20, 5, '#ffcf8a', 0.7 + Math.sin(t * 2 + i) * 0.1);
        },
      },
      {
        duration: 8, lines: ['The Veil will hold. For a thousand years, perhaps.', 'As long as someone keeps dreaming it.'],
        art: (ctx) => {
          sky(ctx, '#020103', '#0c0612');
          ctx.fillStyle = '#ece8f2';
          ellipse(ctx, VIEW_W / 2, 150, 10, 12);
          ctx.fill();
          ctx.strokeStyle = '#2a1a3a';
          ctx.beginPath();
          ctx.moveTo(VIEW_W / 2 - 2, 140);
          ctx.lineTo(VIEW_W / 2 + 1, 152);
          ctx.stroke();
        },
      },
    ],
  },
  true: {
    title: 'Dawnbreak',
    music: 'ending_true',
    panels: [
      {
        duration: 8, lines: ['Aeren did not take the Dreamer\'s place.', 'Instead, Aeren hummed — the lullaby a queen once sang, sung backward, into a waking song.'],
        art: (ctx, t) => {
          sky(ctx, '#05030a', '#1a1030');
          glow(ctx, VIEW_W / 2, 200, 160 + Math.sin(t) * 10, '#ffe8c8', 0.45);
          aerenFigure(ctx, VIEW_W / 2, 210, 2, 1);
        },
      },
      {
        duration: 8, lines: ['Orun stirred, and woke, and was not angry.', 'It had only been waiting for someone to say goodbye.'],
        art: (ctx, t, k) => {
          sky(ctx, '#1a1030', '#4a3060');
          glow(ctx, VIEW_W / 2, VIEW_H, 260 * k + 40, '#fff0d8', 0.5);
          void t;
        },
      },
      {
        duration: 9, lines: ['The Starwell opened. One by one, the people of the Veil began to climb.', 'Captain Rhoswen went first. Old Wick carried the Great Lamp.'],
        art: (ctx, t) => {
          sky(ctx, '#2a2050', '#e8b890');
          for (let i = 0; i < 40; i++) {
            const u = (i / 40 + t * 0.03) % 1;
            glow(ctx, VIEW_W / 2 + Math.sin(u * 10) * 20, VIEW_H - u * 240, 3, '#ffcf8a', 0.9);
          }
        },
      },
      {
        duration: 10, lines: ['Above, the sun was rising. It had been rising for three hundred years.', 'Someone left a small porcelain mask in the grass, and did not look back.'],
        art: (ctx, t, k) => {
          sky(ctx, '#7aa8e0', '#ffe0b0');
          glow(ctx, VIEW_W / 2, 200 - k * 30, 120, '#fff4d0', 0.9);
          fillCircle(ctx, VIEW_W / 2, 200 - k * 30, 26, '#fff8e8');
          ctx.fillStyle = '#5a8a4a';
          ctx.fillRect(0, 220, VIEW_W, 50);
          ctx.fillStyle = '#ece8f2';
          ellipse(ctx, VIEW_W / 2 + 40, 222, 5, 3);
          ctx.fill();
          void t;
        },
      },
    ],
  },
  secret: {
    title: 'The Unmasked',
    music: 'ending_secret',
    panels: [
      {
        duration: 8, lines: ['Aeren put on the Unworn Mask, the one with no eyes.', 'It fit perfectly. It had always been meant to.'],
        art: (ctx, t) => {
          sky(ctx, '#020103', '#100818');
          glow(ctx, VIEW_W / 2, 150, 60, '#ffffff', 0.4 + Math.sin(t * 2) * 0.1);
          ctx.fillStyle = '#ffffff';
          ellipse(ctx, VIEW_W / 2, 150, 12, 14);
          ctx.fill();
        },
      },
      {
        duration: 8, lines: ['The Gloam knelt. The Dreamer fell silent.', 'The forty-one who came before bowed their heads, and finally rested.'],
        art: (ctx, t, k) => {
          sky(ctx, '#0c0612', '#2a1040');
          for (let i = 0; i < 41; i++) {
            const x = 20 + (i % 14) * 32;
            const y = 120 + Math.floor(i / 14) * 40;
            ctx.globalAlpha = 1 - k * 0.8;
            aerenFigure(ctx, x, y, 0.8, 0.3);
            ctx.globalAlpha = 1;
          }
          void t;
        },
      },
      {
        duration: 10, lines: ['Aeren rose into the dark above the Veil, and burned.', 'For the first time in four hundred years, the underworld had a sky — and a sun that remembered everyone.'],
        art: (ctx, t, k) => {
          sky(ctx, '#2a1040', '#ffb070');
          glow(ctx, VIEW_W / 2, 80 + (1 - k) * 100, 140, '#fff0c0', 0.9);
          fillCircle(ctx, VIEW_W / 2, 80 + (1 - k) * 100, 20, '#ffffff');
          towers(ctx, '#1a0a20', 41, 240, 80);
          void t;
        },
      },
    ],
  },
};

export const CREDITS: string[] = [
  'VEILFALL',
  '',
  'An original hand-drawn-style metroidvania',
  '',
  'Design · Programming · Art · Animation',
  'Music · Sound · Writing',
  'Created with Claude',
  '',
  'Every sprite, background and effect is painted by code at runtime.',
  'Every note of music and every sound is synthesised live.',
  '',
  'Featuring',
  'Aeren, the Wanderer',
  'Old Wick · Captain Rhoswen · Quenna · Marrow · Tamsin',
  'Master Corvane · Kettle · Oriel · Ossian · Ysolde',
  'Pell · Dorran · Ilka · Castor',
  'Brother Hollis · Sister Maudlin · Ambrose · Ottoline · Gristle',
  'Leaflet · Calder · Juno · Fen · Unit Nine · Flicker',
  'The Mourner · Hush · Seraphel',
  '',
  'Thank you for remembering.',
];

/** Plays a list of panels; returns true when finished. */
export class PanelPlayer {
  idx = 0;
  t = 0;
  skipped = false;
  constructor(readonly panels: Panel[]) {}

  get done(): boolean {
    return this.idx >= this.panels.length;
  }

  update(dt: number, advance: boolean): void {
    if (this.done) return;
    this.t += dt;
    const p = this.panels[this.idx];
    if (this.t >= p.duration || (advance && this.t > 1)) {
      this.idx++;
      this.t = 0;
    }
  }

  draw(ctx: CanvasRenderingContext2D, time: number): void {
    if (this.done) return;
    const p = this.panels[this.idx];
    const k = clamp(this.t / p.duration, 0, 1);
    p.art(ctx, time, k);
    // Fade in/out each panel
    const fade = Math.min(1, this.t / 1.2, (p.duration - this.t) / 1.2);
    ctx.fillStyle = `rgba(0,0,0,${1 - clamp(fade, 0, 1)})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Letterbox
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, VIEW_W, 22);
    ctx.fillRect(0, VIEW_H - 42, VIEW_W, 42);
    const ta = clamp((this.t - 0.6) / 1, 0, 1) * clamp((p.duration - this.t) / 0.8, 0, 1);
    ctx.globalAlpha = ta;
    p.lines.forEach((l, i) => paragraph(ctx, l, VIEW_W / 2, VIEW_H - 26 + i * 12 - (p.lines.length - 1) * 6, 8.5, VIEW_W - 60, '#e8e0d0', 1.3, 'center'));
    ctx.globalAlpha = 1;
    void easeInOutSine;
    void TAU;
  }
}

export function drawCredits(ctx: CanvasRenderingContext2D, t: number): boolean {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const speed = 16;
  let y = VIEW_H + 20 - t * speed;
  for (const line of CREDITS) {
    if (y > -20 && y < VIEW_H + 20) {
      const title = line === 'VEILFALL';
      text(ctx, line, VIEW_W / 2, y, title ? 22 : line === 'Featuring' ? 9 : 8, title ? UI.gold : line === 'Featuring' ? UI.gold : '#d8d0c0', 'center', title ? 'bold' : 'normal');
      if (title) divider(ctx, VIEW_W / 2, y + 8, 140);
    }
    y += line === 'VEILFALL' ? 30 : 16;
  }
  return y < -20;
}
