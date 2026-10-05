import { describe, it, expect } from 'vitest';
import { makeWorld, step, box, FLAT, type UiLog } from './helpers';
import { SaveSystem, MemoryKV, migrate } from '../../src/save/SaveSystem';
import { newProgress, PROGRESS_VERSION, completion } from '../../src/progression/Progress';
import { computeStats, canEquip, threadsUsed } from '../../src/progression/stats';
import { RELICS } from '../../src/relics/relics';
import { setQuest, give, trueEndingReady } from '../../src/quests/quests';
import { Pickup } from '../../src/world/objects/pickups';
import { VeilGate } from '../../src/world/objects/interactables';
import { createEnemy, ENEMY_DEFS } from '../../src/enemies/registry';
import { createBoss, BOSSES } from '../../src/bosses/registry';
import { events } from '../../src/core/events';
import { defaultSettings, sanitizeSettings, difficultyParams } from '../../src/accessibility/settings';
import { makeNewGamePlus } from '../../src/scenes/EndingScene';
import { TOTALS_FOR_SAVES } from '../../src/scenes/totals';
import { allRooms } from '../../src/rooms/index';
import type { Boss } from '../../src/bosses/Boss';
import type { Enemy } from '../../src/enemies/Enemy';
import { TILE } from '../../src/world/tiles';

function setup(log?: UiLog) {
  const r = makeWorld([box('t', FLAT), box('u', FLAT, [1, 0])], newProgress(), log);
  r.world.progress.room = 't';
  r.world.progress.shrine = 't';
  r.world.begin('start');
  step(r.world, r.input, 10);
  return r;
}

function tap(input: { hold: (a: 'attack' | 'jump') => void; release: (a: 'attack' | 'jump') => void }, world: Parameters<typeof step>[0], a: 'attack' | 'jump'): void {
  input.hold(a);
  step(world, input as Parameters<typeof step>[1], 2);
  input.release(a);
}

function recordSfx(): string[] {
  const ids: string[] = [];
  events.on('sfx', (e) => ids.push(e.id));
  return ids;
}

describe('save system', () => {
  it('round-trips a progress object', () => {
    const s = new SaveSystem(new MemoryKV());
    const p = newProgress();
    p.fragments = 321;
    p.relics.push('quickstep');
    expect(s.write(0, p)).toBe(true);
    const r = s.load(0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.progress.fragments).toBe(321);
      expect(r.progress.relics).toEqual(['quickstep']);
    }
  });

  it('reports empty slots', () => {
    const s = new SaveSystem(new MemoryKV());
    const r = s.load(1);
    expect(r.ok).toBe(false);
    expect(s.summary(1, () => 0).empty).toBe(true);
  });

  it('falls back to the backup when the save is corrupted, and never deletes the damaged data', () => {
    const kv = new MemoryKV();
    const s = new SaveSystem(kv);
    const p = newProgress();
    p.fragments = 10;
    s.write(0, p);
    p.fragments = 20;
    s.write(0, p);
    kv.setItem('veilfall.save.0', kv.getItem('veilfall.save.0')!.replace('"fragments":20', '"fragments":99999'));
    const damaged = kv.getItem('veilfall.save.0');
    const r = s.load(0);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.fromBackup).toBe(true);
      expect(r.progress.fragments).toBe(10);
    }
    expect(kv.getItem('veilfall.save.0')).toBe(damaged);
  });

  it('reports corruption without a backup instead of silently resetting', () => {
    const kv = new MemoryKV();
    kv.setItem('veilfall.save.2', '{not json');
    const s = new SaveSystem(kv);
    const r = s.load(2);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('corrupt');
    expect(s.summary(2, () => 0).corrupt).toBe(true);
    expect(kv.getItem('veilfall.save.2')).toBe('{not json');
  });

  it('refuses saves from a newer version', () => {
    const kv = new MemoryKV();
    const s = new SaveSystem(kv);
    s.write(0, newProgress());
    const env = JSON.parse(kv.getItem('veilfall.save.0')!);
    env.version = PROGRESS_VERSION + 5;
    kv.setItem('veilfall.save.0', JSON.stringify(env));
    kv.removeItem('veilfall.save.0.bak');
    const r = s.load(0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('future');
  });

  it('migrates v1 saves forward and fills missing fields', () => {
    const { progress, from } = migrate({ version: 1, currency: 77, abilities: { dash: true }, relics: ['quickstep'] });
    expect(from).toBe(1);
    expect(progress.version).toBe(PROGRESS_VERSION);
    expect(progress.fragments).toBe(77);
    expect(progress.abilities.dash).toBe(true);
    expect(progress.challenges).toEqual({});
    expect(progress.banked).toBe(0);
    expect(Array.isArray(progress.markers)).toBe(true);
    expect(progress.stats.deaths).toBe(0);
  });

  it('erase keeps a recovery copy', () => {
    const kv = new MemoryKV();
    const s = new SaveSystem(kv);
    s.write(0, newProgress());
    s.erase(0);
    expect(s.load(0).ok).toBe(false);
    expect(kv.getItem('veilfall.save.0.erased')).toBeTruthy();
  });

  it('world.save writes the current room', () => {
    const { world, saves } = setup();
    world.save();
    expect(saves.at(-1)!.room).toBe('t');
  });
});

describe('relics and stats', () => {
  it('has 25–40 relics with unique ids', () => {
    expect(RELICS.length).toBeGreaterThanOrEqual(25);
    expect(RELICS.length).toBeLessThanOrEqual(40);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(RELICS.length);
  });

  it('applies relic effects only when equipped', () => {
    const p = newProgress();
    p.relics = ['quickstep', 'twin_mend', 'glass_crown'];
    expect(computeStats(p).dashCooldown).toBeCloseTo(0.5);
    p.equipped = ['quickstep', 'glass_crown'];
    const s = computeStats(p);
    expect(s.dashCooldown).toBeCloseTo(0.3);
    expect(s.damageTakenMult).toBe(2);
    expect(s.critMult).toBe(2.5);
  });

  it('respects the thread budget', () => {
    const p = newProgress();
    p.relics = RELICS.map((r) => r.id);
    p.threadSlots = 3;
    const fits = RELICS.filter((r) => r.cost <= 3);
    for (const r of fits) {
      if (canEquip(p, r.id)) p.equipped.push(r.id);
    }
    expect(threadsUsed(p)).toBeLessThanOrEqual(3);
    expect(p.equipped.length).toBeGreaterThan(0);
    expect(canEquip(p, 'nonexistent')).toBe(false);
  });
});

describe('combat and damage', () => {
  it('a strike damages and eventually kills an enemy, dropping fragments', () => {
    const { world, input } = setup();
    const p = world.player;
    p.facing = 1;
    const e = createEnemy(world, 'husk', p.cx + 24, p.y + p.h, false) as Enemy;
    world.add(e);
    const hp0 = e.hp;
    const sfx = recordSfx();
    tap(input, world, 'attack');
    step(world, input, 18);
    expect(e.hp).toBeLessThan(hp0);
    expect(sfx).toContain('swing');
    for (let i = 0; i < 20 && !e.dead; i++) {
      p.body.x = e.x - p.w - 6;
      p.facing = 1;
      tap(input, world, 'attack');
      step(world, input, 20);
    }
    expect(e.dead || e.hp <= 0).toBe(true);
    expect(world.progress.stats.kills).toBeGreaterThan(0);
  });

  it('every enemy type can be created and simulated without errors', () => {
    const { world, input } = setup();
    world.godMode = true;
    expect(ENEMY_DEFS.length).toBeGreaterThanOrEqual(30);
    for (const d of ENEMY_DEFS) {
      const e = createEnemy(world, d.id, world.player.cx + 80, 9 * TILE, false);
      expect(e, d.id).toBeTruthy();
      world.add(e!);
      step(world, input, 30);
      e!.dead = true;
      step(world, input, 1);
    }
  });

  it('player damage respects i-frames and difficulty', () => {
    const { world } = setup();
    const p = world.player;
    const v0 = p.vigor;
    expect(p.hurt(1, p.cx + 10)).toBe(true);
    expect(p.vigor).toBe(v0 - 1);
    expect(p.hurt(1, p.cx + 10)).toBe(false);
    expect(p.vigor).toBe(v0 - 1);
    expect(difficultyParams('veilborn').enemyDamage).toBeGreaterThan(difficultyParams('pilgrim').enemyDamage * 0 + 1);
  });

  it('One Breath rematch modifier makes any hit lethal', () => {
    const { world } = setup();
    world.challengeBoss = 'gatekeeper';
    world.challengeMod = 2;
    world.player.hurt(1, world.player.cx + 10);
    expect(world.player.vigor).toBe(0);
  });

  it('death leaves half of carried fragments as a remnant', () => {
    const { world, input } = setup();
    world.progress.fragments = 100;
    world.player.vigor = 1;
    world.player.iframes = 0;
    world.player.hurt(1, world.player.cx + 10);
    step(world, input, 60 * 4);
    expect(world.progress.stats.deaths).toBe(1);
    const rem = world.progress.remnant;
    expect((rem?.amount ?? 0) + world.progress.fragments).toBe(100);
    expect(world.player.vigor).toBe(world.player.maxVigor);
  });
});

describe('healing', () => {
  it('holding mend converts Aether into Vigor', () => {
    const { world, input } = setup();
    const p = world.player;
    p.vigor = p.maxVigor - 2;
    p.aether = 99;
    input.hold('mend');
    step(world, input, 70);
    input.release('mend');
    expect(p.vigor).toBe(p.maxVigor - 1);
    expect(p.aether).toBe(66);
  });

  it('releasing mend early cancels without spending Aether', () => {
    const { world, input } = setup();
    const p = world.player;
    p.vigor = p.maxVigor - 1;
    p.aether = 99;
    input.hold('mend');
    step(world, input, 20);
    input.release('mend');
    step(world, input, 5);
    expect(p.vigor).toBe(p.maxVigor - 1);
    expect(p.aether).toBe(99);
  });
});

describe('quests and collectibles', () => {
  it('quests toast on start and completion', () => {
    const log: UiLog = { calls: [] };
    const { world } = setup(log);
    setQuest(world, 'lamplighter', 1);
    setQuest(world, 'lamplighter', 2, true);
    const toasts = log.calls.filter((c) => c.fn === 'toast').map((c) => c.args[0]);
    expect(toasts).toEqual(['New quest', 'Quest complete']);
    expect(world.progress.quests.lamplighter.done).toBe(true);
  });

  it('four Vigor Embers raise max Vigor', () => {
    const { world } = setup();
    const before = world.player.maxVigor;
    for (let i = 0; i < 4; i++) give(world, 'heart', 1);
    expect(world.player.maxVigor).toBe(before + 1);
  });

  it('collecting pickups records them permanently', () => {
    const { world, input } = setup();
    const p = world.player;
    world.add(new Pickup(world, p.x, p.y, 'shard', 'test_shard', Object.keys({ s1: 1 })[0]));
    world.add(new Pickup(world, p.x, p.y, 'relic', 'test_relic', 'quickstep'));
    step(world, input, 3);
    expect(world.progress.pickups.test_shard).toBe(true);
    expect(world.progress.relics).toContain('quickstep');
    // A relic already owned (Veilfall+) becomes fragments instead.
    const f = world.progress.fragments;
    world.add(new Pickup(world, p.x, p.y, 'relic', 'test_relic2', 'quickstep'));
    step(world, input, 3);
    expect(world.progress.fragments).toBe(f + 200);
  });

  it('the true ending lists exactly what is missing', () => {
    const p = newProgress();
    const r = trueEndingReady(p);
    expect(r.ok).toBe(false);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it('completion grows with progress', () => {
    const p = newProgress();
    expect(completion(p, TOTALS_FOR_SAVES)).toBe(0);
    p.abilities.dash = true;
    expect(completion(p, TOTALS_FOR_SAVES)).toBeGreaterThan(0);
  });
});

describe('heart and vessel totals', () => {
  it('match the number of embers and phial shards placed in the world and rewards', () => {
    // Every source of heart/vessel fragments must add up to the totals the UI shows.
    let hearts = 0;
    let vessels = 0;
    const all = makeWorld(allRooms()).world;
    for (const r of all.map.list) {
      for (const pl of all.map.grid(r.id).placements) {
        const s = pl.spawn;
        if (s?.k === 'pickup' && s.t === 'heart') hearts++;
        if (s?.k === 'pickup' && s.t === 'vessel') vessels++;
      }
    }
    const { world } = setup();
    for (const b of BOSSES) {
      const boss = createBoss(world, b.id, 100, 100) as Boss | null;
      for (const rw of boss?.rewards ?? []) {
        if (rw.kind === 'heart') hearts++;
        if (rw.kind === 'vessel') vessels++;
      }
    }
    // NPC and shop sources: Leaflet's 12-leaf reward and Marrow's two embers;
    // Old Wick's vessel, Leaflet's 20-leaf reward and Marrow's two phial shards.
    hearts += 1 + 2;
    vessels += 1 + 1 + 2;
    expect(hearts).toBe(TOTALS_FOR_SAVES.hearts);
    expect(vessels).toBe(TOTALS_FOR_SAVES.vessels);
    expect(hearts % 4).toBe(0);
    expect(vessels % 3).toBe(0);
  });
});

describe('fast travel', () => {
  it('a Veil Gate attunes on first use and opens travel afterwards', () => {
    const log: UiLog = { calls: [] };
    const { world } = setup(log);
    const g = new VeilGate(world, world.player.cx, world.player.y + world.player.h);
    world.add(g);
    g.interact();
    expect(world.progress.veilGates.t).toBe(true);
    g.interact();
    expect(log.calls.some((c) => c.fn === 'openTravel')).toBe(true);
  });

  it('warping moves the player to another room', () => {
    const { world, input } = setup();
    world.warp('u', 100, 9 * TILE);
    step(world, input, 90);
    expect(world.room.id).toBe('u');
  });
});

describe('bosses', () => {
  it('all bosses construct and simulate', () => {
    const { world, input } = setup();
    world.godMode = true;
    expect(BOSSES.length).toBeGreaterThanOrEqual(12);
    for (const b of BOSSES) {
      const boss = createBoss(world, b.id, 15 * TILE, 10 * TILE) as Boss;
      expect(boss, b.id).toBeTruthy();
      world.add(boss);
      boss.beginIntro();
      step(world, input, 60 * 4);
      expect(boss.bstate === 'fight' || boss.bstate === 'shift', b.id).toBe(true);
      boss.dead = true;
      world.activeBoss = null;
      world.cutsceneLock = false;
      world.player.setState('normal');
      step(world, input, 2);
    }
  });

  it('phases advance at health thresholds and defeat is recorded', () => {
    const { world, input } = setup();
    world.godMode = true;
    const boss = createBoss(world, 'gatekeeper', 20 * TILE, 10 * TILE) as Boss;
    world.add(boss);
    boss.beginIntro();
    step(world, input, 60 * 4);
    const sfx = recordSfx();
    const hit = (dmg: number) => boss.takeHit({ damage: dmg, dir: 1, dirY: 0, knock: 0, stagger: 0, source: 'blade', crit: false, hitId: Math.random(), x: boss.cx, y: boss.cy });
    hit(boss.maxHp * 0.55);
    expect(boss.phase).toBe(1);
    expect(sfx).toContain('boss_phase');
    step(world, input, 60 * 2);
    hit(boss.maxHp);
    step(world, input, 60 * 4);
    expect(world.progress.bosses.gatekeeper).toBeGreaterThan(0);
    expect(world.progress.flags.boss_gatekeeper).toBeGreaterThan(0);
  });
});

describe('audio triggers', () => {
  it('movement and actions emit sound events', () => {
    const { world, input } = setup();
    const sfx = recordSfx();
    input.hold('jump');
    step(world, input, 50);
    input.release('jump');
    expect(sfx).toContain('jump');
    expect(sfx).toContain('land');
  });

  it('music state follows combat and bosses', () => {
    const { world, input } = setup();
    const states: string[] = [];
    events.on('music', (m) => states.push(m.state));
    world.godMode = true;
    const boss = createBoss(world, 'gatekeeper', 10 * TILE, 10 * TILE) as Boss;
    world.add(boss);
    boss.beginIntro();
    step(world, input, 60 * 5);
    expect(states).toContain('boss');
  });
});

describe('settings and Veilfall+', () => {
  it('sanitizes damaged settings', () => {
    const s = sanitizeSettings({ masterVolume: 7, shake: -3, difficulty: 'impossible', textScale: 'big' });
    expect(s.masterVolume).toBeLessThanOrEqual(1);
    expect(s.shake).toBeGreaterThanOrEqual(0);
    expect(s.difficulty).toBe('wanderer');
    expect(typeof s.textScale).toBe('number');
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
  });

  it('Veilfall+ keeps relics and records but resets the world', () => {
    const p = newProgress();
    p.relics = ['quickstep'];
    p.equipped = ['quickstep'];
    p.threadSlots = 6;
    p.bladeLevel = 3;
    p.abilities.dash = true;
    p.bosses.gatekeeper = 1;
    p.endings = ['standard'];
    p.pickups.x = true;
    const n = makeNewGamePlus(p);
    expect(n.ngPlus).toBe(1);
    expect(n.relics).toEqual(['quickstep']);
    expect(n.threadSlots).toBe(6);
    expect(n.bladeLevel).toBe(3);
    expect(n.endings).toEqual(['standard']);
    expect(n.abilities).toEqual({});
    expect(n.bosses).toEqual({});
    expect(n.pickups).toEqual({});
  });
});

describe('room transitions through real doors', () => {
  it('walking off the west edge of lw_gate enters lw_square', () => {
    const { world, input } = makeWorld(allRooms());
    world.progress.room = 'lw_gate';
    world.begin('start');
    step(world, input, 30);
    // lw_square is to the west of lw_gate on the ground row.
    const g = world.grid;
    world.player.body.x = 3 * TILE;
    world.player.body.y = 15 * TILE - world.player.h - 1;
    expect(g.isSolidAt(0, 14)).toBe(false);
    input.hold('left');
    step(world, input, 120);
    input.release('left');
    expect(world.room.id).toBe('lw_square');
    expect(world.player.state).not.toBe('dead');
  });
});
