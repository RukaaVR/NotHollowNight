import type { InputState, Action } from '../core/input';
import { REBINDABLE, ACTION_LABEL, keyLabel, PAD_BUTTON_NAMES, DEFAULT_KEYS, DEFAULT_PAD, type Input } from '../core/input';
import { defaultSettings, type Settings } from '../accessibility/settings';
import { Nav, confirmPressed, cancelPressed } from './overlay';
import { UI, text, panel } from './text';
import { sfx } from '../core/events';

type Item =
  | { t: 'slider'; label: string; get: () => number; set: (v: number) => void; min: number; max: number; step: number; fmt?: (v: number) => string; help?: string }
  | { t: 'toggle'; label: string; get: () => boolean; set: (v: boolean) => void; help?: string }
  | { t: 'choice'; label: string; get: () => string; set: (v: string) => void; options: [string, string][]; help?: string }
  | { t: 'action'; label: string; run: () => void; help?: string }
  | { t: 'header'; label: string };

/**
 * Settings menu shared by the title screen and the pause menu. Every option
 * here takes effect immediately and is persisted.
 */
export class SettingsView {
  private page = 'root';
  private idx = 0;
  private nav = new Nav();
  private waiting: { action: Action; pad: boolean } | null = null;
  done = false;

  constructor(private s: Settings, private input: Input | null, private onChange: () => void) {}

  private pages(): Record<string, Item[]> {
    const s = this.s;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const ch = () => this.onChange();
    const slider = (label: string, key: keyof Settings, min: number, max: number, step: number, fmt = pct, help?: string): Item => ({
      t: 'slider', label, min, max, step, fmt, help,
      get: () => s[key] as number,
      set: (v) => {
        (s as unknown as Record<string, number>)[key] = Math.round(v * 100) / 100;
        ch();
      },
    });
    const toggle = (label: string, key: keyof Settings, help?: string): Item => ({
      t: 'toggle', label, help, get: () => s[key] as boolean, set: (v) => {
        (s as unknown as Record<string, boolean>)[key] = v;
        ch();
      },
    });
    const choice = (label: string, key: keyof Settings, options: [string, string][], help?: string): Item => ({
      t: 'choice', label, options, help, get: () => s[key] as string, set: (v) => {
        (s as unknown as Record<string, string>)[key] = v;
        ch();
      },
    });
    return {
      root: [
        { t: 'action', label: 'Audio', run: () => this.go('audio') },
        { t: 'action', label: 'Display & Effects', run: () => this.go('display') },
        { t: 'action', label: 'Accessibility', run: () => this.go('access') },
        { t: 'action', label: 'Difficulty & Assists', run: () => this.go('assist') },
        { t: 'action', label: 'Keyboard Controls', run: () => this.go('keys') },
        { t: 'action', label: 'Gamepad Controls', run: () => this.go('pad') },
        { t: 'action', label: 'Back', run: () => (this.done = true) },
      ],
      audio: [
        slider('Master Volume', 'masterVolume', 0, 1, 0.05),
        slider('Music', 'musicVolume', 0, 1, 0.05),
        slider('Sound Effects', 'sfxVolume', 0, 1, 0.05),
        slider('Ambience', 'ambienceVolume', 0, 1, 0.05),
        slider('Dialogue & Interface', 'dialogueVolume', 0, 1, 0.05),
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
      display: [
        choice('Quality Preset', 'quality', [['low', 'Low'], ['medium', 'Medium'], ['high', 'High'], ['ultra', 'Ultra']], 'Render resolution, lighting detail, parallax layers and particle budget.'),
        toggle('Reduced Particles', 'reducedParticles', 'Fewer sparks, dust and weather particles.'),
        slider('Camera Shake', 'shake', 0, 1, 0.05, pct, 'Scales all screen shake, from none to full.'),
        toggle('Show FPS', 'showFps'),
        toggle('Show Play Timer', 'showTimer'),
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
      access: [
        toggle('Reduce Flashes', 'reduceFlashes', 'Softens full-screen flashes from hits and explosions.'),
        toggle('High Contrast', 'highContrast', 'Dims backgrounds and brightens the playable layer.'),
        choice('Colour-blind Mode', 'colorblind', [['none', 'Off'], ['protanopia', 'Protanopia'], ['deuteranopia', 'Deuteranopia'], ['tritanopia', 'Tritanopia']], 'Changes danger, telegraph and elite colours.'),
        slider('Text Size', 'textScale', 0.8, 1.6, 0.1, pct),
        slider('HUD Size', 'hudScale', 0.6, 1.5, 0.1, pct),
        toggle('Controller Vibration', 'vibration'),
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
      assist: [
        choice('Difficulty', 'difficulty', [['pilgrim', 'Pilgrim'], ['wanderer', 'Wanderer'], ['veilborn', 'Veilborn']],
          'Pilgrim: longer telegraphs, calmer foes, no contact damage. Wanderer: as intended. Veilborn: fiercer foes and double damage. Health is never inflated.'),
        slider('Damage Taken', 'assistDamage', 0.25, 1, 0.25, pct, 'Lower values make every blow hurt less.'),
        slider('Game Speed', 'gameSpeed', 0.6, 1, 0.1, pct, 'Slows the whole game for more reaction time.'),
        toggle('Extended Invulnerability', 'extraIframes', 'Longer grace period after being hit.'),
        toggle('Telegraph Emphasis', 'telegraphBoost', 'Stronger, longer attack warnings.'),
        toggle('Keep Aether on Death', 'keepAetherOnDeath'),
        toggle('Safe Hazards', 'safeHazards', 'Spikes and thorns return you to safety without harm.'),
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
      keys: [
        ...REBINDABLE.map((a): Item => ({ t: 'action', label: ACTION_LABEL[a], run: () => this.rebind(a, false) })),
        { t: 'action', label: 'Reset to Defaults', run: () => { s.keys = structuredClone(DEFAULT_KEYS); ch(); } },
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
      pad: [
        ...REBINDABLE.filter((a) => !['left', 'right', 'up', 'down'].includes(a)).map((a): Item => ({ t: 'action', label: ACTION_LABEL[a], run: () => this.rebind(a, true) })),
        { t: 'action', label: 'Reset to Defaults', run: () => { s.pad = structuredClone(DEFAULT_PAD); ch(); } },
        { t: 'action', label: 'Back', run: () => this.go('root') },
      ],
    };
  }

  private go(p: string): void {
    this.page = p;
    this.idx = 0;
  }

  private rebind(a: Action, pad: boolean): void {
    if (!this.input) return;
    this.waiting = { action: a, pad };
    this.input.captureHook = (code, isPad, button) => {
      if (pad && isPad && button >= 0) this.s.pad[a] = [button];
      else if (!pad && !isPad && code && code !== 'Escape') {
        // Keep the secondary binding so menus stay usable.
        const second = this.s.keys[a].find((k) => k !== code && k !== this.s.keys[a][0]);
        this.s.keys[a] = second ? [code, second] : [code];
      }
      this.waiting = null;
      this.onChange();
    };
  }

  update(dt: number, input: InputState): void {
    if (this.waiting) return;
    const items = this.pages()[this.page];
    const selectable = items.map((it, i) => (it.t === 'header' ? -1 : i)).filter((i) => i >= 0);
    let si = Math.max(0, selectable.indexOf(this.idx));
    si = this.nav.list(input, dt, si, selectable.length);
    this.idx = selectable[si];
    const it = items[this.idx];
    const h = this.nav.horiz(input, dt);
    if (it.t === 'slider' && h !== 0) {
      it.set(Math.max(it.min, Math.min(it.max, it.get() + h * it.step)));
      sfx('menu_move');
    } else if (it.t === 'toggle' && (h !== 0 || confirmPressed(input))) {
      it.set(!it.get());
      sfx('menu_select');
    } else if (it.t === 'choice' && (h !== 0 || confirmPressed(input))) {
      const i = it.options.findIndex(([v]) => v === it.get());
      const n = (i + (h === 0 ? 1 : h) + it.options.length) % it.options.length;
      it.set(it.options[n][0]);
      sfx('menu_select');
    } else if (it.t === 'action' && confirmPressed(input)) {
      sfx('menu_select');
      it.run();
    }
    if (cancelPressed(input)) {
      sfx('menu_back');
      if (this.page === 'root') this.done = true;
      else this.go('root');
    }
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
    panel(ctx, x, y, w, h, 1);
    const titles: Record<string, string> = { root: 'Settings', audio: 'Audio', display: 'Display & Effects', access: 'Accessibility', assist: 'Difficulty & Assists', keys: 'Keyboard Controls', pad: 'Gamepad Controls' };
    text(ctx, titles[this.page], x + w / 2, y + 18, 10, UI.gold, 'center', 'bold');
    const items = this.pages()[this.page];
    const rowH = 13;
    const maxRows = Math.floor((h - 60) / rowH);
    const start = Math.max(0, Math.min(this.idx - Math.floor(maxRows / 2), items.length - maxRows));
    items.slice(start, start + maxRows).forEach((it, k) => {
      const i = start + k;
      const sel = i === this.idx;
      const yy = y + 36 + k * rowH;
      const col = sel ? UI.gold : UI.ink;
      text(ctx, (sel ? '◆ ' : '  ') + it.label, x + 16, yy, 7.5, col);
      let val = '';
      if (it.t === 'slider') val = (it.fmt ?? ((v: number) => String(v)))(it.get());
      else if (it.t === 'toggle') val = it.get() ? 'On' : 'Off';
      else if (it.t === 'choice') val = it.options.find(([v]) => v === it.get())?.[1] ?? '';
      else if (this.page === 'keys' && it.label !== 'Back' && it.label !== 'Reset to Defaults') {
        const a = REBINDABLE[i];
        val = this.waiting && this.waiting.action === a ? 'Press a key…' : this.s.keys[a].map(keyLabel).join(' / ');
      } else if (this.page === 'pad' && it.label !== 'Back' && it.label !== 'Reset to Defaults') {
        const a = REBINDABLE.filter((x2) => !['left', 'right', 'up', 'down'].includes(x2))[i];
        val = this.waiting && this.waiting.action === a ? 'Press a button…' : this.s.pad[a].map((b) => PAD_BUTTON_NAMES[b] ?? `B${b}`).join(' / ');
      }
      if (val) text(ctx, it.t === 'slider' || it.t === 'choice' ? `‹ ${val} ›` : val, x + w - 16, yy, 7.5, sel ? UI.gold : UI.dim, 'right');
      if (it.t === 'slider') {
        const bw = 60;
        const bx = x + w - 16 - bw - 50;
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(bx, yy - 3, bw, 2);
        ctx.fillStyle = sel ? UI.gold : UI.dim;
        ctx.fillRect(bx, yy - 3, bw * ((it.get() - it.min) / (it.max - it.min)), 2);
      }
    });
    const it = items[this.idx];
    if (it && 'help' in it && it.help) text(ctx, it.help, x + w / 2, y + h - 10, 6, UI.dim, 'center', 'normal', true);
  }
}

export { defaultSettings };
