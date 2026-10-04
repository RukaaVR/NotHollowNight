export const TILE = 16;

/** Runtime tile ids. */
export enum T {
  Empty = 0,
  Solid = 1,
  OneWay = 2,
  Spike = 3,
  Acid = 4,
  Water = 5,
  Breakable = 6,
  Hidden = 7,
  Fragile = 8,
  Crumble = 9,
  Phase = 10,
  Thorn = 11,
  Shallow = 12,
  SolidAlt = 13,
}

export const CHAR_TO_TILE: Record<string, T> = {
  '#': T.Solid,
  'X': T.SolidAlt,
  '=': T.OneWay,
  '^': T.Spike,
  'v': T.Spike,
  '<': T.Spike,
  '>': T.Spike,
  'a': T.Acid,
  '~': T.Water,
  'B': T.Breakable,
  'H': T.Hidden,
  'F': T.Fragile,
  'C': T.Crumble,
  'P': T.Phase,
  'T': T.Thorn,
  'w': T.Shallow,
};

/** Characters that spawn global entities and leave an empty tile behind. */
export const ENTITY_CHARS = new Set(['G', 'S', 'L', 'c', 'f', '@', 'V']);

export function isSolidTile(t: T): boolean {
  return t === T.Solid || t === T.SolidAlt || t === T.Breakable || t === T.Hidden || t === T.Fragile || t === T.Crumble || t === T.Phase;
}

export function isHazardTile(t: T): boolean {
  return t === T.Spike || t === T.Acid || t === T.Thorn;
}

export function isLiquid(t: T): boolean {
  return t === T.Water || t === T.Shallow || t === T.Acid;
}
