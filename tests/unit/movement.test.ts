import { describe, it, expect } from 'vitest';
import { makeWorld, step, box, FLAT } from './helpers';
import { P } from '../../src/player/constants';
import { TILE } from '../../src/world/tiles';

function setup(rows = FLAT) {
  const r = makeWorld([box('t', rows)]);
  r.world.progress.room = 't';
  r.world.begin('start');
  step(r.world, r.input, 10);
  return r;
}

describe('player movement', () => {
  it('stands on the floor', () => {
    const { world } = setup();
    expect(world.player.onGround).toBe(true);
    expect(world.player.y + world.player.h).toBeCloseTo(10 * TILE, 3);
  });

  it('accelerates to run speed and decelerates quickly', () => {
    const { world, input } = setup();
    input.hold('right');
    step(world, input, 20);
    expect(world.player.body.vx).toBeCloseTo(P.RUN, 0);
    input.release('right');
    step(world, input, 6);
    expect(Math.abs(world.player.body.vx)).toBeLessThan(5);
  });

  it('variable jump: tap is lower than hold', () => {
    const a = setup();
    a.input.hold('jump');
    let peakHold = 0;
    const startY = a.world.player.y;
    for (let i = 0; i < 60; i++) {
      step(a.world, a.input, 1);
      peakHold = Math.max(peakHold, startY - a.world.player.y);
    }
    const b = setup();
    b.input.tap('jump');
    let peakTap = 0;
    for (let i = 0; i < 60; i++) {
      step(b.world, b.input, 1);
      peakTap = Math.max(peakTap, startY - b.world.player.y);
    }
    expect(peakHold).toBeGreaterThan(55);
    expect(peakHold).toBeLessThan(80);
    expect(peakTap).toBeLessThan(peakHold * 0.6);
    expect(peakTap).toBeGreaterThan(8);
  });

  it('coyote time allows a jump just after leaving a ledge', () => {
    const rows = [
      '##############################',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..@.........................#',
      '#######......................#',
      '#............................#',
      '#............................#',
      '##############################',
    ];
    const { world, input } = setup(rows);
    input.hold('right');
    let left = false;
    for (let i = 0; i < 120 && !left; i++) {
      step(world, input, 1);
      if (!world.player.onGround) left = true;
    }
    expect(left).toBe(true);
    step(world, input, 3);
    input.tap('jump');
    step(world, input, 1);
    expect(world.player.body.vy).toBeLessThan(-300);
  });

  it('jump buffering triggers a jump on landing', () => {
    const { world, input } = setup();
    world.player.body.y -= 40;
    world.player.body.vy = 200;
    step(world, input, 4);
    input.tap('jump');
    step(world, input, 8);
    expect(world.player.body.vy).toBeLessThan(0);
  });

  it('dash covers distance quickly once unlocked', () => {
    const { world, input } = setup();
    world.progress.abilities.dash = true;
    const x0 = world.player.x;
    input.tap('dash');
    step(world, input, 12);
    expect(world.player.x - x0).toBeGreaterThan(50);
  });

  it('cannot dash without the ability', () => {
    const { world, input } = setup();
    const x0 = world.player.x;
    input.tap('dash');
    step(world, input, 12);
    expect(world.player.x - x0).toBeLessThan(5);
  });

  it('spikes damage and return the player to safe ground', () => {
    const rows = [
      '##############################',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#............................#',
      '#..@.....^^^^................#',
      '##############################',
    ];
    const { world, input } = setup(rows);
    const v0 = world.player.vigor;
    input.hold('right');
    step(world, input, 60);
    input.releaseAll();
    step(world, input, 40);
    expect(world.player.vigor).toBe(v0 - 1);
    expect(world.player.cx).toBeLessThan(9 * TILE);
  });
});
