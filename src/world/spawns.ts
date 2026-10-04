/**
 * Declarative entity placements used by room definitions. Each room maps a
 * single character in its ASCII layout to one of these specs.
 */
export type Spawn =
  | { k: 'enemy'; t: string; elite?: boolean; flag?: string }
  | { k: 'boss'; t: string }
  | { k: 'npc'; t: string }
  | { k: 'pickup'; t: PickupType; id: string; value?: string }
  | { k: 'lore'; id: string; style?: 'tablet' | 'mural' | 'inscription' | 'echo' }
  | { k: 'prop'; t: string; text?: string; flip?: boolean }
  | { k: 'lever'; id: string }
  | { k: 'switch'; id: string }
  | { k: 'gate'; id: string; h?: number; w?: number; opensOn?: string; closesOn?: string; boss?: boolean }
  | { k: 'mover'; w: number; dx: number; dy: number; period: number; phase?: number }
  | { k: 'faller'; w: number }
  | { k: 'crusher'; w: number; h: number; dy: number; period: number; phase?: number }
  | { k: 'elevator'; id: string; dy: number; w?: number }
  | { k: 'timedgate'; h: number; period: number; open: number; phase?: number }
  | { k: 'wind'; w: number; h: number; fx: number; fy: number }
  | { k: 'current'; w: number; h: number; fx: number; fy: number }
  | { k: 'trigger'; id: string; w: number; h: number; event: string }
  | { k: 'dummy' }
  | { k: 'challenge'; id: string }
  | { k: 'ending'; id: string };

export type PickupType =
  | 'ability'
  | 'relic'
  | 'heart' // vigor fragment (4 = +1 max vigor)
  | 'vessel' // aether vessel fragment (3 = +max aether)
  | 'fragment' // veil fragments currency stash
  | 'shard' // memory shard (lore collectible)
  | 'echo' // echo of the old civilization (true ending requirement)
  | 'lostrelic' // rare treasure, sold to the curator
  | 'key' // quest item
  | 'blade' // weapon upgrade ore ("Pale Ore" equivalent named Veilsteel)
  | 'map'; // region map page
