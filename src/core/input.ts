export const ACTIONS = [
  'left', 'right', 'up', 'down',
  'jump', 'attack', 'dash', 'mend', 'art', 'step', 'grapple',
  'map', 'pause', 'confirm', 'cancel', 'tabL', 'tabR', 'interact',
] as const;
export type Action = (typeof ACTIONS)[number];

/** Actions that players may rebind from the settings menu. */
export const REBINDABLE: Action[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'dash', 'mend', 'art', 'step', 'grapple', 'interact', 'map', 'pause'];

export const ACTION_LABEL: Record<Action, string> = {
  left: 'Move Left', right: 'Move Right', up: 'Look Up', down: 'Crouch / Look Down',
  jump: 'Jump', attack: 'Strike', dash: 'Veil Dash', mend: 'Mend (hold)', art: 'Veil Art',
  step: 'Shadow Step', grapple: 'Aether Grapple', map: 'Map', pause: 'Pause / Inventory',
  confirm: 'Confirm', cancel: 'Back', tabL: 'Previous Tab', tabR: 'Next Tab', interact: 'Interact',
};

export type KeyBindings = Record<Action, string[]>;
export type PadBindings = Record<Action, number[]>;

export const DEFAULT_KEYS: KeyBindings = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'KeyZ'],
  attack: ['KeyJ', 'KeyX'],
  dash: ['KeyK', 'KeyC'],
  mend: ['KeyL', 'KeyV'],
  art: ['KeyU', 'KeyF'],
  step: ['KeyI', 'ShiftLeft'],
  grapple: ['KeyO', 'KeyG'],
  interact: ['KeyE', 'ArrowUp'],
  map: ['Tab', 'KeyM'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space', 'KeyZ', 'KeyJ'],
  cancel: ['Escape', 'Backspace'],
  tabL: ['KeyQ', 'PageUp'],
  tabR: ['KeyR', 'PageDown'],
};

// Standard gamepad mapping indices.
export const DEFAULT_PAD: PadBindings = {
  left: [14], right: [15], up: [12], down: [13],
  jump: [0], attack: [2], dash: [7, 1], mend: [3], art: [4], step: [5], grapple: [6],
  interact: [12], map: [8], pause: [9], confirm: [0], cancel: [1], tabL: [4], tabR: [5],
};

export const PAD_BUTTON_NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Select', 'Start', 'LS', 'RS', 'D-Up', 'D-Down', 'D-Left', 'D-Right', 'Home'];

export function keyLabel(code: string): string {
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map: Record<string, string> = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Escape: 'Esc',
    ShiftLeft: 'L-Shift', ShiftRight: 'R-Shift', ControlLeft: 'L-Ctrl', ControlRight: 'R-Ctrl',
    AltLeft: 'L-Alt', AltRight: 'R-Alt', Enter: 'Enter', Backspace: 'Bksp', Tab: 'Tab',
    PageUp: 'PgUp', PageDown: 'PgDn',
  };
  return map[code] ?? code;
}

/** Read-only view of input used by the simulation and UI. */
export interface InputState {
  down(a: Action): boolean;
  pressed(a: Action): boolean;
  released(a: Action): boolean;
  /** Horizontal axis -1..1 */
  axisX(): number;
  axisY(): number;
  consume(a: Action): void;
  beginStep(): void;
  flush(): void;
  rumble(strong: number, weak: number, ms: number): void;
  lastDevice: 'keyboard' | 'gamepad';
}

const N = ACTIONS.length;
const IDX = new Map<Action, number>(ACTIONS.map((a, i) => [a, i]));

/**
 * Edge-detected input. Presses that occur between fixed simulation steps are
 * latched so that a fast tap is never lost, even at low frame rates.
 */
export class Input implements InputState {
  keys: KeyBindings = structuredClone(DEFAULT_KEYS);
  pad: PadBindings = structuredClone(DEFAULT_PAD);
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  vibration = true;
  /** When set, the next key/button press is delivered here instead of to actions. */
  captureHook: ((code: string, isPad: boolean, button: number) => void) | null = null;

  private keyDown = new Set<string>();
  private cur = new Uint8Array(N);
  private prev = new Uint8Array(N);
  private latchedPress = new Uint8Array(N);
  private latchedRelease = new Uint8Array(N);
  private stepPress = new Uint8Array(N);
  private stepRelease = new Uint8Array(N);
  private padPrev: boolean[] = [];
  private ax = 0;
  private ay = 0;
  private gamepadIndex = -1;

  attach(target: Window): void {
    target.addEventListener('keydown', (e) => {
      if (this.captureHook && !e.repeat) {
        const hook = this.captureHook;
        this.captureHook = null;
        hook(e.code, false, -1);
        e.preventDefault();
        return;
      }
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.repeat) return;
      this.keyDown.add(e.code);
      this.lastDevice = 'keyboard';
      this.recompute(true);
    });
    target.addEventListener('keyup', (e) => {
      this.keyDown.delete(e.code);
      this.recompute(false);
    });
    target.addEventListener('blur', () => {
      this.keyDown.clear();
      this.recompute(false);
    });
    target.addEventListener('gamepadconnected', (e) => {
      this.gamepadIndex = (e as GamepadEvent).gamepad.index;
    });
  }

  private padButtonsDown: boolean[] = [];

  private recompute(_fromKey: boolean): void {
    for (let i = 0; i < N; i++) {
      const a = ACTIONS[i];
      let d = false;
      const ks = this.keys[a];
      for (let k = 0; k < ks.length; k++) if (this.keyDown.has(ks[k])) { d = true; break; }
      if (!d) {
        const bs = this.pad[a];
        for (let k = 0; k < bs.length; k++) if (this.padButtonsDown[bs[k]]) { d = true; break; }
      }
      if (!d && a === 'left' && this.padAxisX < -0.5) d = true;
      if (!d && a === 'right' && this.padAxisX > 0.5) d = true;
      if (!d && a === 'up' && this.padAxisY < -0.6) d = true;
      if (!d && a === 'down' && this.padAxisY > 0.6) d = true;
      const was = this.cur[i];
      this.cur[i] = d ? 1 : 0;
      if (d && !was) this.latchedPress[i] = 1;
      if (!d && was) this.latchedRelease[i] = 1;
    }
  }

  private padAxisX = 0;
  private padAxisY = 0;

  private pollGamepad(): void {
    if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let gp: Gamepad | null = null;
    if (this.gamepadIndex >= 0) gp = pads[this.gamepadIndex];
    if (!gp) for (const p of pads) if (p) { gp = p; this.gamepadIndex = p.index; break; }
    if (!gp) return;
    let any = false;
    for (let b = 0; b < gp.buttons.length; b++) {
      const pressed = gp.buttons[b].pressed || gp.buttons[b].value > 0.5;
      if (pressed && !this.padPrev[b]) {
        any = true;
        if (this.captureHook) {
          const hook = this.captureHook;
          this.captureHook = null;
          hook('', true, b);
        }
      }
      this.padPrev[b] = pressed;
      this.padButtonsDown[b] = pressed;
    }
    const x = gp.axes[0] ?? 0;
    const y = gp.axes[1] ?? 0;
    this.padAxisX = Math.abs(x) > 0.25 ? x : 0;
    this.padAxisY = Math.abs(y) > 0.25 ? y : 0;
    if (any || this.padAxisX !== 0 || this.padAxisY !== 0) this.lastDevice = 'gamepad';
    this.recompute(false);
  }

  /** Call once at the start of every fixed simulation step. */
  beginStep(): void {
    this.pollGamepad();
    for (let i = 0; i < N; i++) {
      this.stepPress[i] = this.latchedPress[i];
      this.stepRelease[i] = this.latchedRelease[i];
      this.latchedPress[i] = 0;
      this.latchedRelease[i] = 0;
      this.prev[i] = this.cur[i];
    }
    const l = this.cur[IDX.get('left')!];
    const r = this.cur[IDX.get('right')!];
    this.ax = this.padAxisX !== 0 && Math.abs(this.padAxisX) > 0.5 ? Math.sign(this.padAxisX) : r - l;
    const u = this.cur[IDX.get('up')!];
    const d = this.cur[IDX.get('down')!];
    this.ay = d - u;
  }

  /** Clears pending presses (used when switching between menus and gameplay). */
  flush(): void {
    this.stepPress.fill(0);
    this.latchedPress.fill(0);
  }

  down(a: Action): boolean {
    return this.cur[IDX.get(a)!] === 1;
  }
  pressed(a: Action): boolean {
    return this.stepPress[IDX.get(a)!] === 1;
  }
  released(a: Action): boolean {
    return this.stepRelease[IDX.get(a)!] === 1;
  }
  axisX(): number {
    return this.ax;
  }
  axisY(): number {
    return this.ay;
  }

  /** Consume a press so that other UI layers in the same step won't see it. */
  consume(a: Action): void {
    this.stepPress[IDX.get(a)!] = 0;
  }

  rumble(strong: number, weak: number, ms: number): void {
    if (!this.vibration || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    const gp = this.gamepadIndex >= 0 ? navigator.getGamepads()[this.gamepadIndex] : null;
    const act = gp?.vibrationActuator as unknown as { playEffect?: (t: string, p: object) => Promise<unknown> } | undefined;
    if (act?.playEffect) {
      act.playEffect('dual-rumble', { duration: ms, strongMagnitude: strong, weakMagnitude: weak }).catch(() => undefined);
    }
  }
}

/** Scriptable input used by automated tests and the attract-mode demo. */
export class VirtualInput implements InputState {
  lastDevice: 'keyboard' | 'gamepad' = 'keyboard';
  private held = new Set<Action>();
  private pressQ = new Set<Action>();
  private releaseQ = new Set<Action>();
  private stepP = new Set<Action>();
  private stepR = new Set<Action>();

  hold(a: Action): void {
    if (!this.held.has(a)) this.pressQ.add(a);
    this.held.add(a);
  }
  release(a: Action): void {
    if (this.held.has(a)) this.releaseQ.add(a);
    this.held.delete(a);
  }
  tap(a: Action): void {
    this.pressQ.add(a);
    this.releaseQ.add(a);
  }
  releaseAll(): void {
    for (const a of this.held) this.releaseQ.add(a);
    this.held.clear();
  }
  beginStep(): void {
    this.stepP = this.pressQ;
    this.stepR = this.releaseQ;
    this.pressQ = new Set();
    this.releaseQ = new Set();
  }
  flush(): void {
    this.stepP.clear();
  }
  consume(a: Action): void {
    this.stepP.delete(a);
  }
  down(a: Action): boolean {
    return this.held.has(a) || (this.stepP.has(a) && !this.stepR.has(a)) || (this.stepP.has(a) && this.stepR.has(a));
  }
  pressed(a: Action): boolean {
    return this.stepP.has(a);
  }
  released(a: Action): boolean {
    return this.stepR.has(a) && !this.held.has(a);
  }
  axisX(): number {
    return (this.down('right') ? 1 : 0) - (this.down('left') ? 1 : 0);
  }
  axisY(): number {
    return (this.down('down') ? 1 : 0) - (this.down('up') ? 1 : 0);
  }
  rumble(): void {
    /* no-op */
  }
}
