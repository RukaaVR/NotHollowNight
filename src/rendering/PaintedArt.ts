/**
 * Hand-painted region backdrops (original artwork generated in Canva for
 * Veilfall, stored in public/art/bg). Images load lazily the first time a
 * region is entered; until then the procedural backdrop is drawn instead,
 * so the game never waits on — or breaks without — the artwork.
 */

const PAINTED_REGIONS = ['th', 'lw', 'mg', 'gs', 'dc', 'lc', 'af', 'sa', 'tc', 'br', 'so', 'vg', 'he', 'ab', 'eh'];

const images = new Map<string, HTMLImageElement | null>();

function artUrl(id: string): string {
  // Relative to the page so the build works from any base path.
  return `./art/bg/${id}.jpg`;
}

/** The painted backdrop for a region, or null while it loads (or if it failed). */
export function paintedBackdrop(regionId: string): HTMLImageElement | null {
  if (!PAINTED_REGIONS.includes(regionId) || typeof Image === 'undefined') return null;
  const hit = images.get(regionId);
  if (hit !== undefined) return hit && hit.complete && hit.naturalWidth > 0 ? hit : null;
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => images.set(regionId, null);
  img.src = artUrl(regionId);
  images.set(regionId, img);
  return null;
}

/** Start loading every backdrop (used by the title screen while the player reads the menu). */
export function preloadPaintedArt(): void {
  for (const id of PAINTED_REGIONS) paintedBackdrop(id);
}

const panels = new Map<string, HTMLImageElement | null>();

/** A painted cinematic panel (public/art/cine/<id>.jpg), or null while it loads or if it failed. */
export function paintedPanel(id: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const hit = panels.get(id);
  if (hit !== undefined) return hit && hit.complete && hit.naturalWidth > 0 ? hit : null;
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => panels.set(id, null);
  img.src = `./art/cine/${id}.jpg`;
  panels.set(id, img);
  return null;
}
