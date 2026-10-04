import { events, type MusicState, type SfxId } from '../core/events';
import { REGION_BY_ID, type Ambience, type MusicTheme } from '../world/regions';
import type { Settings } from '../accessibility/settings';
import { Rng } from '../core/rng';

/**
 * Fully procedural audio: every sound effect and note of music is synthesised
 * at runtime with the Web Audio API. Nothing is sampled.
 */
export class AudioEngine {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private ambBus!: GainNode;
  private uiBus!: GainNode;
  private lowpass!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private reverb!: ConvolverNode;
  private reverbSend!: GainNode;
  // music layers
  private layers: Record<'pad' | 'bass' | 'lead' | 'perc' | 'choir', GainNode> = {} as never;
  private theme: MusicTheme | null = null;
  private themeId = '';
  private state: MusicState = 'exploration';
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private rng = new Rng(7);
  private melodyIdx = 0;
  private ambNodes: AudioNode[] = [];
  private ambId: Ambience | '' = '';
  private ambTimer: number | null = null;
  private lastSfx = new Map<SfxId, number>();
  private underwater = false;
  listenerX = 0;
  private stingQueue: 'victory' | 'discovery' | null = null;
  private unsubs: (() => void)[] = [];

  constructor(private settings: Settings) {}

  /** Must be called from a user gesture. Safe to call repeatedly. */
  start(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master = ctx.createGain();
    this.lowpass = ctx.createBiquadFilter();
    this.lowpass.type = 'lowpass';
    this.lowpass.frequency.value = 20000;
    this.master.connect(this.lowpass).connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.ambBus = ctx.createGain();
    this.uiBus = ctx.createGain();
    for (const b of [this.musicBus, this.sfxBus, this.ambBus, this.uiBus]) b.connect(this.master);
    // Noise
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // Cheap generated reverb impulse
    this.reverb = ctx.createConvolver();
    const ir = ctx.createBuffer(2, ctx.sampleRate * 2.6, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3.2);
    }
    this.reverb.buffer = ir;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.35;
    this.reverbSend.connect(this.reverb).connect(this.master);
    for (const k of ['pad', 'bass', 'lead', 'perc', 'choir'] as const) {
      const g = ctx.createGain();
      g.gain.value = 0;
      g.connect(this.musicBus);
      g.connect(this.reverbSend);
      this.layers[k] = g;
    }
    this.applyVolumes();
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 30);
    this.unsubs.push(
      events.on('sfx', (e) => this.play(e.id, e.x, e.vol, e.pitch)),
      events.on('music', (e) => this.setState(e.state)),
      events.on('musicTheme', (e) => this.setTheme(e.theme)),
    );
    if (this.themeId) this.setTheme(this.themeId, true);
  }

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = this.settings;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(s.masterVolume, t, 0.05);
    this.musicBus.gain.setTargetAtTime(s.musicVolume * 0.55, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume * 0.9, t, 0.05);
    this.ambBus.gain.setTargetAtTime(s.ambienceVolume * 0.5, t, 0.05);
    this.uiBus.gain.setTargetAtTime(s.dialogueVolume * 0.6, t, 0.05);
  }

  setUnderwater(on: boolean): void {
    if (!this.ctx || on === this.underwater) return;
    this.underwater = on;
    this.lowpass.frequency.setTargetAtTime(on ? 700 : 20000, this.ctx.currentTime, 0.15);
  }

  // ------------------------------------------------------------------ music

  setTheme(id: string, force = false): void {
    if (id === this.themeId && !force) return;
    this.themeId = id;
    if (!this.ctx) return;
    let theme: MusicTheme | undefined;
    if (id.startsWith('boss_')) {
      const base = REGION_BY_ID.get(BOSS_REGION[id.slice(5)] ?? 'th')?.music;
      if (base) theme = { ...base, bpm: base.bpm * 1.45 + 12, perc: 2, density: Math.min(1, base.density + 0.35), scale: [0, 1, 3, 5, 7, 8, 11], lead: 'strings', pad: 'choir' };
      if (id === 'boss_gloam') theme = { root: 38, scale: [0, 1, 3, 5, 6, 8, 10], bpm: 112, prog: [0, 1, 5, 6], lead: 'choir', pad: 'drone', perc: 2, density: 0.7 };
    } else if (id === 'title') {
      theme = { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 56, prog: [0, 5, 3, 4], lead: 'piano', pad: 'strings', perc: 0, density: 0.3 };
    } else if (id === 'ending_true') {
      theme = { root: 53, scale: [0, 2, 4, 5, 7, 9, 11], bpm: 64, prog: [0, 3, 4, 5], lead: 'strings', pad: 'choir', perc: 0, density: 0.5 };
    } else if (id === 'ending_standard') {
      theme = { root: 50, scale: [0, 2, 3, 5, 7, 8, 10], bpm: 54, prog: [0, 5, 3, 4], lead: 'piano', pad: 'strings', perc: 0, density: 0.35 };
    } else if (id === 'ending_secret') {
      theme = { root: 45, scale: [0, 2, 4, 6, 7, 9, 11], bpm: 70, prog: [0, 4, 1, 5], lead: 'bell', pad: 'choir', perc: 1, density: 0.5 };
    } else theme = REGION_BY_ID.get(id)?.music;
    if (!theme) return;
    this.theme = theme;
    this.step = 0;
    this.melodyIdx = 0;
    this.rng.seed(id.length * 1013 + theme.root);
    this.updateLayerGains(true);
    const region = REGION_BY_ID.get(id);
    if (region) this.setAmbience(region.ambience);
  }

  setState(s: MusicState): void {
    const prev = this.state;
    this.state = s;
    if ((s === 'victory' || s === 'discovery') && prev !== s) this.stingQueue = s;
    this.updateLayerGains(false);
  }

  private updateLayerGains(instant: boolean): void {
    if (!this.ctx) return;
    const s = this.state;
    const g: Record<string, number> = { pad: 0.5, bass: 0.25, lead: 0.4, perc: 0, choir: 0.15 };
    switch (s) {
      case 'combat': Object.assign(g, { pad: 0.45, bass: 0.55, lead: 0.45, perc: 0.5, choir: 0.1 }); break;
      case 'elite': Object.assign(g, { pad: 0.5, bass: 0.65, lead: 0.5, perc: 0.65, choir: 0.35 }); break;
      case 'boss': Object.assign(g, { pad: 0.55, bass: 0.7, lead: 0.6, perc: 0.75, choir: 0.45 }); break;
      case 'lowhealth': Object.assign(g, { pad: 0.35, bass: 0.2, lead: 0.15, perc: 0.25, choir: 0.2 }); break;
      case 'story': Object.assign(g, { pad: 0.55, bass: 0.1, lead: 0.2, perc: 0, choir: 0.35 }); break;
      case 'victory': Object.assign(g, { pad: 0.6, bass: 0.2, lead: 0.5, perc: 0, choir: 0.4 }); break;
      case 'discovery': Object.assign(g, { pad: 0.5, bass: 0.15, lead: 0.5, perc: 0, choir: 0.3 }); break;
      case 'silence': Object.assign(g, { pad: 0, bass: 0, lead: 0, perc: 0, choir: 0 }); break;
      default: break;
    }
    const t = this.ctx.currentTime;
    for (const k of Object.keys(this.layers) as (keyof typeof this.layers)[]) {
      this.layers[k].gain.cancelScheduledValues(t);
      this.layers[k].gain.setTargetAtTime(g[k], t, instant ? 0.05 : s === 'silence' ? 0.6 : 1.2);
    }
  }

  private schedule(): void {
    const ctx = this.ctx;
    if (!ctx || !this.theme) return;
    if (ctx.currentTime > this.nextTime + 1) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + 0.2) {
      this.playStep(this.nextTime);
      const spb = 60 / this.theme.bpm / 2; // eighth notes
      this.nextTime += spb;
      this.step++;
    }
  }

  private freq(midi: number): number {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  private scaleNote(degree: number, octave = 0): number {
    const th = this.theme!;
    const n = th.scale.length;
    const oct = Math.floor(degree / n);
    const d = ((degree % n) + n) % n;
    return th.root + th.scale[d] + (oct + octave) * 12;
  }

  private playStep(t: number): void {
    const th = this.theme!;
    const s = this.step;
    const bar = Math.floor(s / 8);
    const chordDeg = th.prog[bar % th.prog.length];
    const beatInBar = s % 8;
    const lowHp = this.state === 'lowhealth';
    if (this.stingQueue && beatInBar === 0) {
      this.sting(t, this.stingQueue);
      this.stingQueue = null;
    }
    // Pad: sustained chord each bar
    if (beatInBar === 0) {
      const dur = (60 / th.bpm) * 4;
      for (const off of [0, 2, 4]) this.note(this.layers.pad, th.pad, this.freq(this.scaleNote(chordDeg + off, 0)), t, dur * 1.05, 0.07);
      this.note(this.layers.choir, 'choir', this.freq(this.scaleNote(chordDeg + 4, 1)), t, dur, 0.04);
    }
    // Bass
    if (beatInBar === 0 || (this.state !== 'exploration' && beatInBar === 4) || ((this.state === 'boss' || this.state === 'elite') && beatInBar % 2 === 0)) {
      this.note(this.layers.bass, 'bass', this.freq(this.scaleNote(chordDeg, -2)), t, 60 / th.bpm, 0.18);
    }
    // Lead melody: a constrained random walk that resolves on chord tones.
    const density = th.density * (this.state === 'boss' ? 1.2 : this.state === 'story' ? 0.6 : 1) * (lowHp ? 0.4 : 1);
    if (this.rng.next() < density * (beatInBar % 2 === 0 ? 0.9 : 0.45)) {
      const step = this.rng.pick([-2, -1, -1, 0, 1, 1, 2, 3, -3]);
      this.melodyIdx = Math.max(-2, Math.min(9, this.melodyIdx + step));
      let deg = chordDeg + this.melodyIdx;
      if (beatInBar === 0) deg = chordDeg + this.rng.pick([0, 2, 4, 7]);
      const dur = (60 / th.bpm / 2) * this.rng.pick([1, 1, 2, 3]);
      this.note(this.layers.lead, th.lead, this.freq(this.scaleNote(deg, 1)), t, dur, 0.09);
    }
    // Percussion
    if (th.perc > 0 || this.state === 'combat' || this.state === 'boss' || this.state === 'elite') {
      if (beatInBar === 0 || beatInBar === 4) this.drum(t, 'kick');
      if (beatInBar === 4 || (th.perc >= 2 && beatInBar === 6)) this.drum(t, 'snare');
      if (th.perc >= 1 || this.state === 'boss') this.drum(t, 'hat');
    }
    if (lowHp && (beatInBar === 0 || beatInBar === 1)) this.drum(t, 'heart');
  }

  private sting(t: number, kind: 'victory' | 'discovery'): void {
    if (!this.ctx) return;
    const th = this.theme!;
    const degs = kind === 'victory' ? [0, 2, 4, 7, 9] : [4, 7, 9, 11];
    degs.forEach((d, i) => this.note(this.layers.lead, kind === 'victory' ? 'strings' : 'bell', this.freq(this.scaleNote(d, 1)), t + i * 0.12, 1.4, 0.11));
    void th;
  }

  private note(bus: GainNode, inst: string, f: number, t: number, dur: number, vol: number): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(bus);
    const env = (a: number, d: number, sus: number, r: number) => {
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.setTargetAtTime(vol * sus, t + a, d);
      g.gain.setTargetAtTime(0, t + dur, r);
    };
    const osc = (type: OscillatorType, freq: number, detune = 0): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      o.start(t);
      o.stop(t + dur + 2);
      return o;
    };
    switch (inst) {
      case 'piano': {
        env(0.005, 0.25, 0.25, 0.4);
        osc('triangle', f).connect(g);
        const o2 = osc('sine', f * 2, 4);
        const g2 = ctx.createGain();
        g2.gain.value = 0.3;
        o2.connect(g2).connect(g);
        break;
      }
      case 'harp': {
        env(0.003, 0.3, 0.1, 0.5);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(f * 8, t);
        lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.4);
        osc('triangle', f).connect(lp).connect(g);
        break;
      }
      case 'bell':
      case 'glass': {
        env(0.004, inst === 'bell' ? 0.9 : 0.6, 0.0, 1.2);
        const ratios = inst === 'bell' ? [1, 2.76, 5.4] : [1, 3.01, 6.2];
        ratios.forEach((r, i) => {
          const gg = ctx.createGain();
          gg.gain.value = 0.5 / (i + 1);
          osc('sine', f * r).connect(gg).connect(g);
        });
        break;
      }
      case 'flute': {
        env(0.08, 0.4, 0.7, 0.2);
        const o = osc('sine', f);
        const vib = osc('sine', 5);
        const vg = ctx.createGain();
        vg.gain.value = f * 0.006;
        vib.connect(vg).connect(o.frequency);
        o.connect(g);
        break;
      }
      case 'strings': {
        env(0.25, 0.6, 0.8, 0.5);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = Math.min(4000, f * 5);
        osc('sawtooth', f, -6).connect(lp);
        osc('sawtooth', f, 6).connect(lp);
        const gg = ctx.createGain();
        gg.gain.value = 0.35;
        lp.connect(gg).connect(g);
        break;
      }
      case 'choir': {
        env(0.5, 1, 0.8, 0.8);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 800;
        bp.Q.value = 1.2;
        for (const dt of [-8, 0, 7]) osc('sawtooth', f, dt).connect(bp);
        const gg = ctx.createGain();
        gg.gain.value = 0.4;
        bp.connect(gg).connect(g);
        break;
      }
      case 'organ': {
        env(0.02, 0.4, 0.8, 0.2);
        const gg = ctx.createGain();
        gg.gain.value = 0.3;
        osc('square', f).connect(gg).connect(g);
        osc('sine', f / 2).connect(g);
        break;
      }
      case 'drone': {
        env(0.8, 1.5, 0.9, 1.2);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 500;
        osc('sawtooth', f / 2, -10).connect(lp);
        osc('sawtooth', f / 2, 10).connect(lp);
        const gg = ctx.createGain();
        gg.gain.value = 0.5;
        lp.connect(gg).connect(g);
        break;
      }
      case 'bass': {
        env(0.01, 0.2, 0.5, 0.15);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 400;
        osc('triangle', f).connect(lp).connect(g);
        osc('sine', f / 2).connect(g);
        break;
      }
      default: {
        env(0.3, 0.6, 0.8, 0.5);
        osc('triangle', f).connect(g);
      }
    }
  }

  private drum(t: number, kind: 'kick' | 'snare' | 'hat' | 'heart'): void {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.connect(this.layers.perc);
    if (kind === 'kick' || kind === 'heart') {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(kind === 'heart' ? 70 : 110, t);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
      g.gain.setValueAtTime(kind === 'heart' ? 0.5 : 0.35, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.3);
    } else {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const f = ctx.createBiquadFilter();
      f.type = kind === 'hat' ? 'highpass' : 'bandpass';
      f.frequency.value = kind === 'hat' ? 7000 : 1800;
      g.gain.setValueAtTime(kind === 'hat' ? 0.05 : 0.18, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'hat' ? 0.05 : 0.18));
      src.connect(f).connect(g);
      src.start(t, Math.random());
      src.stop(t + 0.25);
    }
  }

  // ------------------------------------------------------------------ ambience

  setAmbience(a: Ambience): void {
    if (!this.ctx || a === this.ambId) return;
    this.ambId = a;
    for (const n of this.ambNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* already stopped */
      }
      n.disconnect();
    }
    this.ambNodes = [];
    if (this.ambTimer) window.clearInterval(this.ambTimer);
    const ctx = this.ctx;
    const loopNoise = (type: BiquadFilterType, freq: number, gain: number, lfo = 0) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = gain;
      src.connect(f).connect(g).connect(this.ambBus);
      src.start();
      this.ambNodes.push(src, f, g);
      if (lfo > 0) {
        const o = ctx.createOscillator();
        o.frequency.value = lfo;
        const og = ctx.createGain();
        og.gain.value = gain * 0.8;
        o.connect(og).connect(g.gain);
        o.start();
        this.ambNodes.push(o, og);
      }
    };
    const drone = (f: number, gain: number) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = gain;
      o.connect(g).connect(this.ambBus);
      o.start();
      this.ambNodes.push(o, g);
    };
    switch (a) {
      case 'wind': loopNoise('bandpass', 500, 0.12, 0.13); break;
      case 'drip': loopNoise('lowpass', 300, 0.05); break;
      case 'water': loopNoise('lowpass', 600, 0.12, 0.08); break;
      case 'machinery': loopNoise('lowpass', 120, 0.25); drone(55, 0.05); break;
      case 'choir': drone(110, 0.025); drone(165, 0.02); break;
      case 'hum': drone(220, 0.015); drone(330.5, 0.01); loopNoise('highpass', 6000, 0.01); break;
      case 'fire': loopNoise('bandpass', 900, 0.05, 0.4); break;
      case 'leaves': loopNoise('highpass', 2500, 0.03, 0.2); break;
      case 'void': drone(41, 0.06); loopNoise('lowpass', 90, 0.15, 0.05); break;
    }
    // Occasional one-shots: drips, distant creatures, clanks
    this.ambTimer = window.setInterval(() => {
      if (!this.ctx || Math.random() > 0.35) return;
      const t = this.ctx.currentTime;
      if (a === 'drip' || a === 'water') this.tone(this.ambBus, 'sine', 900 + Math.random() * 800, t, 0.12, 0.05, 300);
      else if (a === 'machinery') this.noiseHit(this.ambBus, 2000, t, 0.12, 0.06);
      else if (a === 'void' || a === 'wind') this.tone(this.ambBus, 'sine', 70 + Math.random() * 40, t, 1.4, 0.04, -20);
      else if (a === 'fire') this.noiseHit(this.ambBus, 3000, t, 0.03, 0.04);
    }, 900);
  }

  // ------------------------------------------------------------------ sfx

  private tone(bus: AudioNode, type: OscillatorType, f: number, t: number, dur: number, vol: number, slide = 0, pan = 0): void {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    o.connect(g).connect(p).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(bus: AudioNode, f: number, t: number, dur: number, vol: number, type: BiquadFilterType = 'bandpass', pan = 0, sweepTo = 0): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const flt = ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(f, t);
    if (sweepTo) flt.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    src.connect(flt).connect(g).connect(p).connect(bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  play(id: SfxId, x?: number, vol = 1, pitch = 1): void {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const now = ctx.currentTime;
    // Rate-limit identical sounds to avoid clipping during swarms.
    const last = this.lastSfx.get(id) ?? 0;
    if (now - last < 0.025) return;
    this.lastSfx.set(id, now);
    const t = now + 0.005;
    const pan = x === undefined ? 0 : Math.max(-0.8, Math.min(0.8, (x - this.listenerX) / 260));
    const B = id.startsWith('menu') || id === 'text' ? this.uiBus : this.sfxBus;
    const v = vol;
    const pr = pitch;
    switch (id) {
      case 'step': this.noiseHit(B, 900 * pr, t, 0.05, 0.05 * v, 'lowpass', pan); break;
      case 'jump': this.noiseHit(B, 1200, t, 0.08, 0.08 * v, 'bandpass', pan, 2400); this.tone(B, 'sine', 300 * pr, t, 0.08, 0.04 * v, 200, pan); break;
      case 'land': this.noiseHit(B, 400, t, 0.1, 0.12 * v, 'lowpass', pan); break;
      case 'dash': this.noiseHit(B, 3000, t, 0.18, 0.12 * v, 'bandpass', pan, 600); break;
      case 'step_shadow': this.tone(B, 'sine', 900 * pr, t, 0.25, 0.08 * v, -700, pan); this.noiseHit(B, 5000, t, 0.2, 0.05 * v, 'highpass', pan); break;
      case 'wallgrab': this.noiseHit(B, 700, t, 0.06, 0.08 * v, 'lowpass', pan); break;
      case 'walljump': this.noiseHit(B, 1500, t, 0.1, 0.1 * v, 'bandpass', pan, 3000); break;
      case 'glide': this.noiseHit(B, 600, t, 0.4, 0.05 * v, 'bandpass', pan, 1200); break;
      case 'swing': this.noiseHit(B, 2500 * pr, t, 0.12, 0.13 * v, 'bandpass', pan, 800); break;
      case 'swing_heavy': this.noiseHit(B, 1800 * pr, t, 0.25, 0.2 * v, 'bandpass', pan, 300); this.tone(B, 'sine', 120, t, 0.25, 0.1 * v, -60, pan); break;
      case 'charge': this.tone(B, 'sine', 300 * pr, t, 0.5, 0.05 * v, 500, pan); break;
      case 'charge_ready': this.tone(B, 'sine', 1400, t, 0.3, 0.08 * v, 0, pan); this.tone(B, 'sine', 2100, t + 0.04, 0.3, 0.05 * v, 0, pan); break;
      case 'hit': this.noiseHit(B, 1800 * pr, t, 0.08, 0.2 * v, 'bandpass', pan); this.tone(B, 'square', 180 * pr, t, 0.06, 0.06 * v, -80, pan); break;
      case 'hit_heavy': this.noiseHit(B, 900 * pr, t, 0.2, 0.3 * v, 'lowpass', pan); this.tone(B, 'sine', 90, t, 0.25, 0.2 * v, -40, pan); break;
      case 'hit_armor': this.tone(B, 'square', 1400 * pr, t, 0.12, 0.06 * v, -200, pan); this.tone(B, 'triangle', 2600, t, 0.1, 0.05 * v, 0, pan); break;
      case 'crit': this.noiseHit(B, 2400, t, 0.1, 0.25 * v, 'bandpass', pan); this.tone(B, 'triangle', 1600, t, 0.25, 0.08 * v, 400, pan); break;
      case 'player_hurt': this.tone(B, 'sawtooth', 220 * pr, t, 0.25, 0.12 * v, -140, pan); this.noiseHit(B, 600, t, 0.2, 0.2 * v, 'lowpass', pan); break;
      case 'player_die': this.tone(B, 'sine', 440, t, 2, 0.15 * v, -380, pan); this.noiseHit(B, 400, t, 1.5, 0.15 * v, 'lowpass', pan, 60); break;
      case 'heal_start': this.tone(B, 'sine', 400, t, 0.6, 0.04 * v, 200, pan); break;
      case 'heal': [0, 4, 7].forEach((s, i) => this.tone(B, 'sine', 523 * Math.pow(2, s / 12), t + i * 0.05, 0.6, 0.06 * v, 0, pan)); break;
      case 'aether_full': this.tone(B, 'sine', 1760, t, 0.3, 0.03 * v, 0, pan); break;
      case 'enemy_die': this.noiseHit(B, 500 * pr, t, 0.35, 0.18 * v, 'lowpass', pan, 100); this.tone(B, 'triangle', 300 * pr, t, 0.3, 0.07 * v, -220, pan); break;
      case 'enemy_alert': this.tone(B, 'square', 500 * pr, t, 0.08, 0.04 * v, 200, pan); break;
      case 'enemy_attack': this.tone(B, 'sawtooth', 160 * pr, t, 0.18, 0.04 * v, 80, pan); break;
      case 'enemy_shoot': this.tone(B, 'sine', 700 * pr, t, 0.15, 0.06 * v, -400, pan); break;
      case 'explode': this.noiseHit(B, 300, t, 0.6, 0.35 * v, 'lowpass', pan, 60); this.tone(B, 'sine', 70, t, 0.5, 0.25 * v, -30, pan); break;
      case 'boss_roar': this.tone(B, 'sawtooth', 90 * pr, t, 1.4, 0.12 * v, -30, pan); this.noiseHit(B, 300 * pr, t, 1.2, 0.2 * v, 'bandpass', pan, 120); break;
      case 'boss_slam': this.noiseHit(B, 200, t, 0.45, 0.35 * v, 'lowpass', pan); this.tone(B, 'sine', 55 * pr, t, 0.5, 0.3 * v, -20, pan); break;
      case 'boss_phase': this.tone(B, 'sawtooth', 110 * pr, t, 1, 0.1 * v, 110, pan); this.tone(B, 'sine', 880 * pr, t, 1.2, 0.05 * v, -440, pan); break;
      case 'boss_die': for (let i = 0; i < 5; i++) this.noiseHit(B, 300 + i * 100, t + i * 0.3, 0.6, 0.3 * v, 'lowpass', pan); this.tone(B, 'sine', 220, t, 3, 0.15 * v, -180, pan); break;
      case 'boss_beam': this.tone(B, 'sawtooth', 300 * pr, t, 0.5, 0.06 * v, 600, pan); break;
      case 'boss_charge': this.tone(B, 'sine', 200 * pr, t, 0.8, 0.07 * v, 400, pan); break;
      case 'pickup': this.tone(B, 'sine', 1200 * pr, t, 0.12, 0.05 * v, 400, pan); break;
      case 'pickup_rare': [0, 4, 7, 12].forEach((s, i) => this.tone(B, 'triangle', 660 * Math.pow(2, s / 12), t + i * 0.07, 0.5, 0.07 * v, 0, pan)); break;
      case 'ability_get': [0, 7, 12, 16, 19, 24].forEach((s, i) => this.tone(B, 'sine', 392 * Math.pow(2, s / 12), t + i * 0.1, 1.4, 0.07 * v, 0, pan)); break;
      case 'shrine': [0, 4, 7, 11].forEach((s, i) => this.tone(B, 'sine', 330 * Math.pow(2, s / 12), t + i * 0.18, 2, 0.06 * v, 0, pan)); break;
      case 'save': this.tone(B, 'sine', 990, t, 0.4, 0.03 * v); break;
      case 'door': case 'gate': this.noiseHit(B, 250, t, 0.4, 0.2 * v, 'lowpass', pan); this.tone(B, 'square', 70, t, 0.3, 0.05 * v, -10, pan); break;
      case 'lever': this.tone(B, 'square', 300, t, 0.08, 0.06 * v, -100, pan); this.noiseHit(B, 1200, t + 0.05, 0.15, 0.1 * v, 'bandpass', pan); break;
      case 'break': this.noiseHit(B, 1100 * pr, t, 0.35, 0.3 * v, 'bandpass', pan, 200); break;
      case 'crumble': this.noiseHit(B, 600, t, 0.3, 0.1 * v, 'lowpass', pan); break;
      case 'menu_move': this.tone(B, 'sine', 880, t, 0.04, 0.04 * v); break;
      case 'menu_select': this.tone(B, 'sine', 660, t, 0.08, 0.05 * v); this.tone(B, 'sine', 990, t + 0.05, 0.1, 0.05 * v); break;
      case 'menu_back': this.tone(B, 'sine', 660, t, 0.08, 0.05 * v, -200); break;
      case 'menu_open': this.tone(B, 'triangle', 440, t, 0.15, 0.04 * v, 220); break;
      case 'text': this.tone(B, 'square', 520 + Math.random() * 120, t, 0.025, 0.012 * v); break;
      case 'grapple': this.tone(B, 'sawtooth', 600, t, 0.2, 0.05 * v, 900, pan); break;
      case 'grapple_hit': this.tone(B, 'triangle', 1500, t, 0.12, 0.06 * v, 0, pan); break;
      case 'splash': this.noiseHit(B, 1400 * pr, t, 0.3, 0.15 * v, 'bandpass', pan, 400); break;
      case 'lance': this.tone(B, 'sine', 1200 * pr, t, 0.3, 0.08 * v, -800, pan); this.noiseHit(B, 4000, t, 0.2, 0.06 * v, 'highpass', pan); break;
      case 'drop_impact': this.noiseHit(B, 250, t, 0.5, 0.4 * v, 'lowpass', pan); this.tone(B, 'sine', 60, t, 0.4, 0.3 * v, -20, pan); break;
      case 'bell': [1, 2.76, 5.4].forEach((r, i) => this.tone(B, 'sine', 220 * pr * r, t, 2.5 - i * 0.6, (0.12 / (i + 1)) * v, 0, pan)); break;
      case 'teleport': this.tone(B, 'sine', 300 * pr, t, 0.35, 0.06 * v, 900, pan); break;
      case 'shield': this.tone(B, 'triangle', 1100, t, 0.3, 0.07 * v, -300, pan); break;
      case 'discover': [0, 3, 7, 10, 14].forEach((s, i) => this.tone(this.uiBus, 'sine', 523 * Math.pow(2, s / 12), t + i * 0.09, 1.2, 0.05 * v)); break;
      case 'parry': this.tone(B, 'triangle', 2000, t, 0.3, 0.1 * v, -500, pan); break;
      case 'buy': this.tone(B, 'triangle', 1300, t, 0.15, 0.06 * v, 0); this.tone(B, 'triangle', 1700, t + 0.06, 0.15, 0.06 * v, 0); break;
      case 'deny': this.tone(B, 'square', 160, t, 0.12, 0.04 * v, -40); break;
      case 'quest': [0, 5, 9].forEach((s, i) => this.tone(this.uiBus, 'triangle', 587 * Math.pow(2, s / 12), t + i * 0.1, 0.8, 0.05 * v)); break;
    }
  }

  dispose(): void {
    if (this.timer) window.clearInterval(this.timer);
    if (this.ambTimer) window.clearInterval(this.ambTimer);
    for (const u of this.unsubs) u();
    void this.ctx?.close();
    this.ctx = null;
  }
}

const BOSS_REGION: Record<string, string> = {
  gatekeeper: 'th', weeping_root: 'mg', mycelia: 'gs', prism: 'lc', bell_warden: 'dc', ash_warden: 'af', archivist: 'sa',
  thorn_saint: 'tc', ormund: 'br', astronomer: 'so', crown: 'vg', conductor: 'he', gloam: 'ab', first_wanderer: 'ab',
};
