import { test, expect, type Page } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */
// Screenshot + smoke tests. The game runs with ?manual=1 so the simulation is
// stepped deterministically from the test via window.__veilfall.game.advance().

const errors: string[] = [];

async function boot(page: Page, query = ''): Promise<void> {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(`${e.message}\n${e.stack ?? ''}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('favicon')) errors.push(m.text());
  });
  await page.goto(`/?manual=1${query}`);
  await page.waitForFunction(() => !!(window as any).__veilfall);
}

async function step(page: Page, frames: number): Promise<void> {
  await page.evaluate((n) => (window as any).__veilfall.game.advance(n), frames);
}

/** Hold a key for a number of simulated frames. */
async function hold(page: Page, key: string, frames: number): Promise<void> {
  await page.keyboard.down(key);
  await step(page, frames);
  await page.keyboard.up(key);
  await step(page, 1);
}

async function tap(page: Page, key: string, after = 6): Promise<void> {
  await page.keyboard.down(key);
  await step(page, 2);
  await page.keyboard.up(key);
  await step(page, after);
}

async function startGame(page: Page, room?: string): Promise<void> {
  await page.evaluate((r) => (window as any).__veilfall.quickStart(r), room);
  await step(page, 30);
}

async function warp(page: Page, room: string, tx?: number, ty?: number): Promise<void> {
  await page.evaluate(
    ({ room, tx, ty }) => {
      const w = (window as any).__veilfall.game.scene.world;
      const g = w.map.grid(room);
      const s = tx !== undefined ? { x: tx * 16 + 8, y: (ty! + 1) * 16 } : g.playerStart ?? { x: 48, y: g.ph - 32 };
      w.warp(room, s.x, s.y);
    },
    { room, tx, ty },
  );
  await step(page, 60);
}

async function shot(page: Page, name: string): Promise<void> {
  await page.screenshot({ path: `test-results/screens/${name}.png` });
}

function noErrors(): void {
  expect(errors, errors.join('\n')).toEqual([]);
}

test('title screen', async ({ page }) => {
  await boot(page);
  await step(page, 60 * 8);
  await shot(page, '01-title');
  const scene = await page.evaluate(() => (window as any).__veilfall.game.scene.id);
  expect(scene).toBe('title');
  noErrors();
});

test('new game flow: slot, difficulty, opening, gameplay', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => localStorage.clear());
  await step(page, 60 * 8);
  await tap(page, 'Enter'); // New Game
  await tap(page, 'Enter'); // Slot 1
  await shot(page, '02-difficulty');
  await tap(page, 'Enter'); // Wanderer
  await step(page, 70);
  expect(await page.evaluate(() => (window as any).__veilfall.game.scene.id)).toBe('opening');
  await step(page, 60 * 4);
  await shot(page, '03-opening');
  // Hold Back to skip the cinematic.
  await hold(page, 'Escape', 100);
  await step(page, 120);
  expect(await page.evaluate(() => (window as any).__veilfall.game.scene.id)).toBe('game');
  const saved = await page.evaluate(() => localStorage.getItem('veilfall.save.0'));
  expect(saved).toContain('VEILFALL');
  noErrors();
});

test('gameplay: movement, jump and dash', async ({ page }) => {
  await boot(page);
  await startGame(page);
  const x0 = await page.evaluate(() => (window as any).__veilfall.game.scene.world.player.x);
  await hold(page, 'ArrowRight', 40);
  const x1 = await page.evaluate(() => (window as any).__veilfall.game.scene.world.player.x);
  expect(x1).toBeGreaterThan(x0 + 40);
  await page.keyboard.down('Space');
  await step(page, 8);
  const vy = await page.evaluate(() => (window as any).__veilfall.game.scene.world.player.body.vy);
  expect(vy).toBeLessThan(0);
  await page.keyboard.up('Space');
  await step(page, 60);
  await shot(page, '04-gameplay');
  noErrors();
});

test('combat: strike damages an enemy', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await step(page, 200);
  const hp = await page.evaluate(() => {
    const v = (window as any).__veilfall;
    const w = v.game.scene.world;
    const p = w.player;
    p.facing = 1;
    const e = v.lib.createEnemy(w, 'husk', p.cx + 26, p.y + p.h, false);
    w.add(e);
    (window as any).__enemy = e;
    return e.hp;
  });
  await step(page, 10);
  for (let i = 0; i < 3; i++) {
    await tap(page, 'KeyJ', 14);
  }
  await shot(page, '05-combat');
  const hp2 = await page.evaluate(() => (window as any).__enemy.hp);
  expect(hp2).toBeLessThan(hp);
  const log: string[] = await page.evaluate(() => (window as any).__veilfall.lib.sfxLog);
  expect(log).toContain('swing');
  expect(log).toContain('hit');
  noErrors();
});

test('map screen', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await step(page, 200);
  await tap(page, 'KeyM', 30);
  await shot(page, '06-map');
  expect(await page.evaluate(() => (window as any).__veilfall.game.scene.overlays.length)).toBe(1);
  noErrors();
});

test('inventory and settings', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await step(page, 200);
  await tap(page, 'Escape', 20);
  await tap(page, 'KeyR', 10); // Relics
  await tap(page, 'KeyR', 20); // Inventory
  await shot(page, '07-inventory');
  await tap(page, 'KeyR', 10); // Abilities
  await tap(page, 'KeyR', 10); // Journal
  await tap(page, 'KeyR', 20); // Settings
  await tap(page, 'Enter', 10); // enter settings
  await tap(page, 'ArrowDown', 4);
  await tap(page, 'ArrowDown', 4);
  await tap(page, 'Enter', 20); // Accessibility page
  await shot(page, '08-settings');
  noErrors();
});

test('NPC dialogue', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await warp(page, 'lw_square', 24, 14);
  await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    const npc = w.entities.find((e: any) => e.def?.id === 'old_wick');
    npc.interact();
  });
  await step(page, 90);
  await shot(page, '09-dialogue');
  expect(await page.evaluate(() => (window as any).__veilfall.game.scene.overlays.length)).toBeGreaterThan(0);
  noErrors();
});

test('shrine menu', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await warp(page, 'lw_square', 9, 14);
  await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    const s = w.entities.find((e: any) => e.interactLabel?.() === 'Rest');
    s.interact();
  });
  await step(page, 120);
  await shot(page, '10-shrine');
  noErrors();
});

test('boss intro, fight and victory', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await warp(page, 'th_boss');
  await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    w.godMode = true;
  });
  // Walk toward the boss to trigger the intro.
  await hold(page, 'ArrowRight', 90);
  await step(page, 40);
  await shot(page, '11-boss-intro');
  const active = await page.evaluate(() => !!(window as any).__veilfall.game.scene.world.activeBoss?.bossActive);
  expect(active).toBe(true);
  await step(page, 60 * 3);
  await shot(page, '12-boss-fight');
  // Finish it quickly with the debug damage multiplier.
  await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    w.debugDamageMult = 500;
    const b = w.activeBoss;
    w.player.x = b.cx - 30;
    w.player.y = b.y + b.h - w.player.h;
    w.player.facing = 1;
  });
  for (let i = 0; i < 8; i++) await tap(page, 'KeyJ', 12);
  await step(page, 60 * 2);
  await shot(page, '13-victory');
  await step(page, 60 * 3);
  const defeated = await page.evaluate(() => (window as any).__veilfall.game.scene.world.progress.bosses.gatekeeper);
  expect(defeated).toBeGreaterThan(0);
  noErrors();
});

test('death and respawn', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await step(page, 120);
  await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    w.progress.fragments = 120;
    w.player.vigor = 1;
    w.player.hurt(5, w.player.cx + 10);
  });
  await step(page, 100);
  await shot(page, '14-death');
  await step(page, 60 * 5);
  const st = await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    return { state: w.player.state, vigor: w.player.vigor, max: w.player.maxVigor, remnant: w.progress.remnant, frags: w.progress.fragments, deaths: w.progress.stats.deaths };
  });
  expect(st.state).not.toBe('dead');
  expect(st.vigor).toBe(st.max);
  expect(st.deaths).toBe(1);
  // Half the fragments are left as a remnant (or already recovered if Aeren respawned on top of it).
  expect(st.frags + (st.remnant?.amount ?? 0)).toBe(120);
  expect(st.remnant === null ? st.frags === 120 : st.remnant.amount === 60).toBe(true);
  noErrors();
});

test('every region renders without errors', async ({ page }) => {
  await boot(page);
  await startGame(page);
  const rooms: string[] = await page.evaluate(() => {
    const w = (window as any).__veilfall.game.scene.world;
    const seen = new Set<string>();
    return w.map.list.filter((r: any) => (seen.has(r.region) ? false : (seen.add(r.region), true))).map((r: any) => r.id);
  });
  expect(rooms.length).toBeGreaterThanOrEqual(12);
  for (const r of rooms) {
    await page.evaluate(() => ((window as any).__veilfall.game.scene.world.godMode = true));
    await warp(page, r);
    await step(page, 30);
    await shot(page, `region-${r}`);
  }
  noErrors();
});

test('ending, credits and Veilfall+', async ({ page }) => {
  await boot(page);
  await startGame(page);
  await page.evaluate(() => {
    const s = (window as any).__veilfall.game.scene;
    s.finish('true');
  });
  await step(page, 60 * 3);
  await shot(page, '15-ending');
  expect(await page.evaluate(() => (window as any).__veilfall.game.scene.id)).toBe('ending');
  noErrors();
});
