import { Input } from './input';
import { Renderer } from '../rendering/Renderer';
import { AudioEngine } from '../audio/Audio';
import { loadSettings, saveSettings, type Settings } from '../accessibility/settings';
import { SaveSystem, MemoryKV, type KV } from '../save/SaveSystem';
import { UI } from '../ui/text';
import { events } from './events';

export interface Scene {
  readonly id: string;
  update(dt: number): void;
  render(time: number): void;
  enter?(): void;
  exit?(): void;
}

export const STEP = 1 / 60;

function safeStorage(): Storage | null {
  try {
    const s = window.localStorage;
    const k = '__veilfall_probe__';
    s.setItem(k, '1');
    s.removeItem(k);
    return s;
  } catch {
    return null;
  }
}

/** Owns the canvas, systems and the fixed-timestep main loop. */
export class Game {
  readonly input = new Input();
  readonly renderer: Renderer;
  readonly audio: AudioEngine;
  readonly settings: Settings;
  readonly saves: SaveSystem;
  readonly storage: Storage | null;
  scene: Scene | null = null;
  time = 0;
  slot = 0;
  debugEnabled = false;
  fps = 60;
  frameMs = 0;
  private acc = 0;
  private last = 0;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private qualityKey = '';
  private slowT = 0;
  /** Exposed for automated tests. */
  steps = 0;

  constructor(readonly canvas: HTMLCanvasElement) {
    this.storage = safeStorage();
    this.settings = loadSettings(this.storage);
    this.saves = new SaveSystem((this.storage as KV | null) ?? new MemoryKV());
    this.renderer = new Renderer(canvas, this.settings);
    this.audio = new AudioEngine(this.settings);
    this.input.attach(window);
    this.debugEnabled = /[?&]debug=1/.test(location.search);
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'F2') {
        this.debugEnabled = !this.debugEnabled;
        e.preventDefault();
      }
    });
    // Audio can only start after a user gesture.
    const unlock = () => this.audio.start();
    window.addEventListener('keydown', unlock);
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('gamepadconnected', unlock);
    events.on('rumble', (r) => this.input.rumble(r.strong, r.weak, r.ms));
    this.applySettings();
  }

  resize(): void {
    this.renderer.resize(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
  }

  /** Push settings into every subsystem and persist them. */
  applySettings(): void {
    const s = this.settings;
    this.input.keys = s.keys;
    this.input.pad = s.pad;
    this.input.vibration = s.vibration;
    this.audio.applyVolumes();
    UI.textScale = s.textScale;
    UI.hudScale = s.hudScale;
    this.renderer.settings = s;
    const qk = `${s.quality}:${s.reducedParticles}`;
    if (qk !== this.qualityKey) {
      this.qualityKey = qk;
      this.resize();
    }
    saveSettings(this.storage, s);
  }

  setScene(s: Scene): void {
    this.scene?.exit?.();
    this.scene = s;
    this.input.flush();
    s.enter?.();
  }

  start(): void {
    this.last = performance.now();
    const loop = (now: number) => {
      this.frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /** Advance by real elapsed time using fixed simulation steps. */
  frame(now: number): void {
    const t0 = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.25) dt = 0.25;
    this.acc += dt;
    let n = 0;
    while (this.acc >= STEP && n < 5) {
      this.input.beginStep();
      this.scene?.update(STEP);
      this.time += STEP;
      this.acc -= STEP;
      this.steps++;
      n++;
    }
    if (n === 5) this.acc = 0;
    this.scene?.render(this.time);
    this.frameMs = performance.now() - t0;
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.adaptQuality(this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
    }
  }

  /** Step the quality preset down when gameplay runs persistently slow. */
  private adaptQuality(window: number): void {
    const s = this.settings;
    if (!s.autoQuality || this.scene?.id !== 'game' || document.hidden) {
      this.slowT = 0;
      return;
    }
    this.slowT = this.fps < 50 ? this.slowT + window : 0;
    if (this.slowT < 4) return;
    this.slowT = 0;
    const order = ['low', 'medium', 'high', 'ultra'] as const;
    const i = order.indexOf(s.quality);
    if (i <= 0) return;
    s.quality = order[i - 1];
    this.applySettings();
    events.emit('toast', { text: `Quality lowered to ${s.quality}`, sub: 'To keep the game smooth. Adaptive Quality can be turned off in Settings.', kind: 'info' });
  }

  /** Deterministic stepping for automated tests (bypasses requestAnimationFrame timing). */
  advance(frames: number): void {
    for (let i = 0; i < frames; i++) {
      this.input.beginStep();
      this.scene?.update(STEP);
      this.time += STEP;
      this.steps++;
    }
    this.scene?.render(this.time);
  }
}
