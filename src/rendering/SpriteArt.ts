/**
 * Hand-painted character sprites (original artwork generated in Canva for
 * Veilfall, keyed out to transparent PNGs in public/art/sprites). Each
 * character is a single painting; motion (breathing, walking bob, wind-up
 * lean, lunge, squash, hit flash) is applied procedurally when it is drawn.
 *
 * Images load lazily. Until a sprite arrives, or if it fails to load, the
 * procedural vector drawing is used instead, so nothing ever waits on art.
 */

export type SpriteKind = 'player' | 'enemy' | 'boss' | 'npc';

interface Painted {
  img: HTMLImageElement;
  /** White silhouette for hit flashes, built on first use. */
  flash?: HTMLCanvasElement;
}

const cache = new Map<string, Painted | null>();

const SPRITES: Record<SpriteKind, string[]> = {
  player: ['player'],
  enemy: [
    'husk', 'moth', 'rootling', 'thornback', 'shade', 'bark_knight', 'puffcap', 'dropper', 'capling', 'bloatcap',
    'prism_mite', 'wisp', 'geode', 'sentry', 'imp', 'eel', 'hound', 'drone', 'brute', 'spitter', 'ink_wraith',
    'page_swarm', 'scribe', 'acolyte', 'wretch', 'lurker', 'coralback', 'sentinel', 'orrery_knight', 'maiden',
    'topiary', 'gearwarden', 'arc_node', 'maw', 'dream_eater',
  ],
  boss: [
    'gatekeeper', 'weeping_root', 'mycelia', 'bell_warden', 'ash_warden', 'archivist', 'thorn_saint', 'ormund',
    'astronomer', 'crown', 'conductor', 'gloam', 'first_wanderer',
  ],
  npc: [
    'old_wick', 'marrow', 'tamsin', 'rhoswen', 'quenna', 'corvane', 'kettle', 'oriel', 'ossian', 'pell', 'dorran',
    'ilka', 'castor', 'hush', 'seraphel_echo', 'hollis', 'mourner', 'ysolde', 'flicker', 'ambrose', 'ottoline',
    'gristle', 'leaflet', 'maudlin', 'calder', 'juno', 'fen', 'unit9',
  ],
};

/**
 * Which way each painting faces: 1 = right, -1 = left. Enemies and the player
 * were painted facing right, bosses and most townsfolk facing left.
 */
const NATIVE_FACING: Record<SpriteKind, number> = { player: 1, enemy: 1, boss: -1, npc: -1 };
const FACING_OVERRIDE: Record<string, number> = { 'npc/juno': 1 };

let enabled = true;

/** Turn painted sprites on or off (off = always the procedural drawings). */
export function setPaintedSprites(on: boolean): void {
  enabled = on;
}

function load(kind: SpriteKind, id: string): Painted | null {
  if (!enabled || typeof Image === 'undefined' || !SPRITES[kind].includes(id)) return null;
  const key = `${kind}/${id}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit && hit.img.complete && hit.img.naturalWidth > 0 ? hit : null;
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => cache.set(key, null);
  img.src = `./art/sprites/${key}.png`;
  cache.set(key, { img });
  return null;
}

/** True once the painting for this character is ready to draw. */
export function hasSprite(kind: SpriteKind, id: string): boolean {
  return load(kind, id) !== null;
}

/** Start loading every sprite (the title screen calls this while the menu is up). */
export function preloadSprites(): void {
  for (const kind of Object.keys(SPRITES) as SpriteKind[]) for (const id of SPRITES[kind]) load(kind, id);
}

function flashOf(p: Painted): HTMLCanvasElement {
  if (p.flash) return p.flash;
  const c = document.createElement('canvas');
  c.width = p.img.naturalWidth;
  c.height = p.img.naturalHeight;
  const g = c.getContext('2d');
  if (g) {
    g.drawImage(p.img, 0, 0);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, c.width, c.height);
  }
  p.flash = c;
  return c;
}

export interface SpritePose {
  /** Anchor point in world space (feet, or centre when `centered`). */
  x: number;
  y: number;
  /** Drawn height in world units. */
  height: number;
  /** Optional cap on drawn width; the sprite shrinks to fit. */
  maxWidth?: number;
  /** Direction the character should face: 1 = right, -1 = left. */
  facing: number;
  /** Anchor at the sprite's centre rather than its feet. */
  centered?: boolean;
  rotate?: number;
  scaleX?: number;
  scaleY?: number;
  /** Extra offset applied along the facing direction (lunges, recoil). */
  push?: number;
  lift?: number;
  alpha?: number;
  /** 0..1 strength of the white hit flash drawn over the sprite. */
  flash?: number;
  /** Draw only the white silhouette (for additive flash passes). */
  flashOnly?: boolean;
}

/**
 * Draws a painted character. Returns false (drawing nothing) while the image
 * is unavailable, so callers can fall back to their procedural drawing.
 */
export function drawSprite(ctx: CanvasRenderingContext2D, kind: SpriteKind, id: string, pose: SpritePose): boolean {
  const p = load(kind, id);
  if (!p) return false;
  const img = p.img;
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  let s = pose.height / ih;
  if (pose.maxWidth && iw * s > pose.maxWidth) s = pose.maxWidth / iw;
  const dw = iw * s;
  const dh = ih * s;
  const native = FACING_OVERRIDE[`${kind}/${id}`] ?? NATIVE_FACING[kind];
  const dir = pose.facing < 0 ? -1 : 1;
  ctx.save();
  if (pose.alpha !== undefined) ctx.globalAlpha *= pose.alpha;
  ctx.translate(pose.x + (pose.push ?? 0) * dir, pose.y - (pose.lift ?? 0));
  // Rotation is expressed in the character's own frame: positive leans forward.
  if (pose.rotate) ctx.rotate(pose.rotate * dir);
  ctx.scale((pose.scaleX ?? 1) * dir * native, pose.scaleY ?? 1);
  const ox = -dw / 2;
  const oy = pose.centered ? -dh / 2 : -dh;
  const prevSmooth = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = true;
  if (!pose.flashOnly) ctx.drawImage(img, ox, oy, dw, dh);
  const f = pose.flashOnly ? 1 : (pose.flash ?? 0);
  if (f > 0) {
    ctx.globalAlpha *= Math.min(1, f);
    ctx.drawImage(flashOf(p), ox, oy, dw, dh);
  }
  ctx.imageSmoothingEnabled = prevSmooth;
  ctx.restore();
  return true;
}
