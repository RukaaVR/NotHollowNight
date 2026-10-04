/**
 * Lightweight typed event bus. The simulation emits events, presentation
 * layers (audio, rumble, UI toasts) subscribe. Tests can record events to
 * verify audio triggers without an AudioContext.
 */
export type SfxId =
  | 'step' | 'jump' | 'land' | 'dash' | 'wallgrab' | 'walljump' | 'glide' | 'step_shadow'
  | 'swing' | 'swing_heavy' | 'charge' | 'charge_ready' | 'hit' | 'hit_heavy' | 'hit_armor' | 'crit'
  | 'player_hurt' | 'player_die' | 'heal_start' | 'heal' | 'aether_full'
  | 'enemy_die' | 'enemy_alert' | 'enemy_attack' | 'enemy_shoot' | 'explode'
  | 'boss_roar' | 'boss_slam' | 'boss_phase' | 'boss_die' | 'boss_beam' | 'boss_charge'
  | 'pickup' | 'pickup_rare' | 'ability_get' | 'shrine' | 'save' | 'door' | 'lever' | 'break'
  | 'menu_move' | 'menu_select' | 'menu_back' | 'menu_open' | 'text' | 'grapple' | 'grapple_hit'
  | 'splash' | 'lance' | 'drop_impact' | 'bell' | 'gate' | 'crumble' | 'teleport' | 'shield' | 'discover'
  | 'parry' | 'buy' | 'deny' | 'quest';

export type MusicState = 'exploration' | 'combat' | 'elite' | 'boss' | 'lowhealth' | 'victory' | 'discovery' | 'story' | 'silence';

export interface GameEvents {
  sfx: { id: SfxId; x?: number; y?: number; vol?: number; pitch?: number };
  music: { state: MusicState };
  musicTheme: { theme: string };
  rumble: { strong: number; weak: number; ms: number };
  toast: { text: string; sub?: string; kind?: 'item' | 'ability' | 'quest' | 'area' | 'info' };
  shake: { amount: number; time: number };
  roomEnter: { id: string };
  areaTitle: { name: string; sub: string };
  bossIntro: { name: string; title: string };
  bossDefeated: { id: string };
  playerDied: Record<string, never>;
  flash: { color: string; time: number; alpha: number };
}

type Handler<T> = (payload: T) => void;

export class EventBus {
  private handlers: { [K in keyof GameEvents]?: Handler<GameEvents[K]>[] } = {};

  on<K extends keyof GameEvents>(type: K, fn: Handler<GameEvents[K]>): () => void {
    const list = (this.handlers[type] ??= []) as Handler<GameEvents[K]>[];
    list.push(fn);
    return () => {
      const i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    };
  }

  emit<K extends keyof GameEvents>(type: K, payload: GameEvents[K]): void {
    const list = this.handlers[type] as Handler<GameEvents[K]>[] | undefined;
    if (!list) return;
    for (let i = 0; i < list.length; i++) list[i](payload);
  }

  clear(): void {
    this.handlers = {};
  }
}

export const events = new EventBus();

export function sfx(id: SfxId, x?: number, y?: number, vol?: number, pitch?: number): void {
  events.emit('sfx', { id, x, y, vol, pitch });
}
