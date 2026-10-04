import type { EnemyDef, Enemy } from '../Enemy';
import { groundBrain, flyBrain, alert } from '../ai';
import { pose, legs, enemyEye, walkPhase, fillCircle } from '../kit';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, ellipse, blob } from '../../rendering/draw';
import { TAU, sign } from '../../core/math';
import { TILE } from '../../world/tiles';
import { PK } from '../../vfx/Particles';

// ---------------------------------------------------------------- Threshold

export const husk: EnemyDef = {
  id: 'husk', name: 'Hollowed Wanderer', region: 'th', category: 'melee',
  hp: 14, dmg: 1, w: 12, h: 20, frags: 4, sight: 130, weight: 1, stagger: 4, color: '#8a8696', pitch: 0.9,
  role: 'Shambling melee. Lunges after a long wind-up.', weakness: 'Strike after its lunge misses — it needs time to recover.',
  lore: 'Travellers who came down looking for something and forgot what. They still walk, hoping to remember.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 26, chase: 62, range: 34, cooldown: 1.3,
      attack: (en, d) => {
        const ph = en.atk(d, 0.45, 0.16, 0.42);
        if (ph === 1) en.body.vx *= 0.8;
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 190;
          en.strike(en.frontRect(16, 14, 4));
        }
        if (ph === 3) en.body.vx *= 0.85;
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const ph = walkPhase(e);
      const hunch = Math.sin(e.t * 2) * 0.6;
      legs(ctx, 2, 6, -6, 7, ph, '#2a2630', 1.6);
      // Ragged cloak
      ctx.fillStyle = '#3a3644';
      blob(ctx, [-6, -4, -5, -14 + hunch, 0, -19 + hunch, 6, -15 + hunch, 6, -4, 0, -2]);
      ctx.fill();
      ctx.fillStyle = '#26222e';
      ctx.fillRect(-6, -5, 12, 2);
      // Pale face
      ellipse(ctx, 3, -15 + hunch, 3.4, 3);
      ctx.fillStyle = '#c8c0b8';
      ctx.fill();
      enemyEye(ctx, e, 4.5, -15.5 + hunch, 0.8, '#e8d8a0');
      // Arm (raised during wind-up)
      const raise = e.atkPhase === 1 ? -0.9 * e.telegraph : e.atkPhase === 2 ? 0.8 : 0.2;
      ctx.save();
      ctx.translate(2, -12 + hunch);
      ctx.rotate(raise);
      ctx.strokeStyle = '#4a4656';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(9, 3);
      ctx.stroke();
      ctx.strokeStyle = '#c8c0b8';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(9, 3);
      ctx.lineTo(12, 1);
      ctx.moveTo(9, 3);
      ctx.lineTo(12, 4);
      ctx.stroke();
      ctx.restore();
      // Broken lantern
      ctx.fillStyle = '#2a2018';
      ctx.fillRect(-7, -9, 3, 4);
      glow(ctx, -5.5, -7, 6, '#ffb070', 0.35);
    });
  },
};

export const moth: EnemyDef = {
  id: 'moth', name: 'Ember Moth', region: 'th', category: 'flying',
  hp: 6, dmg: 1, w: 10, h: 8, frags: 2, sight: 150, weight: 1.6, stagger: 2, flying: true, color: '#ffb070', pitch: 1.6,
  role: 'Erratic flyer that darts at intruders.', weakness: 'Fragile. A single upward strike usually ends it.',
  lore: 'Drawn to light, they mistook the first lanterns of the Descent for the sun. They have been circling ever since.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 70, keep: 40, range: 90, cooldown: 1.6, hoverAmp: 10,
      attack: (en, d) => {
        const ph = en.atk(d, 0.4, 0.4, 0.2);
        if (ph === 1) {
          en.body.vx *= 0.9;
          en.body.vy *= 0.9;
        } else if (ph === 2) {
          if (en.atkEnter) {
            const a = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
            en.body.vx = Math.cos(a) * 230;
            en.body.vy = Math.sin(a) * 230;
          }
        }
        return ph === 4;
      },
    });
    e.body.vx += Math.sin(e.t * 9) * 40 * dt * 4;
  },
  draw(ctx, e) {
    const flap = Math.sin(e.t * 30);
    ctx.save();
    ctx.translate(e.cx, e.cy);
    glow(ctx, 0, 2, 14, '#ffb070', 0.6);
    ctx.fillStyle = 'rgba(220,180,140,0.75)';
    for (const s of [-1, 1]) {
      ellipse(ctx, s * 4, -1, 4.5, 2.5 + flap * 1.6, s * 0.4);
      ctx.fill();
    }
    ctx.fillStyle = '#3a2a20';
    ellipse(ctx, 0, 0, 1.8, 3.5);
    ctx.fill();
    fillCircle(ctx, 0, 2.5, 1.6, '#ffcf8a');
    ctx.restore();
  },
};

// ---------------------------------------------------------------- Mourning Grove

export const rootling: EnemyDef = {
  id: 'rootling', name: 'Rootling', region: 'mg', category: 'ambush',
  hp: 10, dmg: 1, w: 10, h: 10, frags: 3, sight: 110, weight: 1.3, stagger: 3, color: '#a8885a', pitch: 1.3,
  role: 'Hides underground and bursts out beneath travellers.', weakness: 'A twitching sprout betrays it. Strike as it surfaces.',
  lore: 'The Grove\'s smallest roots learned to walk so they could follow the people who planted them.',
  init(e) {
    e.hidden = true;
    e.setState('hidden');
  },
  think(e, dt) {
    if (e.state === 'hidden') {
      e.body.vx = 0;
      if (e.distToPlayer() < 64 && e.p.state !== 'dead') {
        e.vars.emerge = (e.vars.emerge ?? 0) + dt;
        if (fxRng.next() < 0.5) e.world.fx.dust(e.cx, e.bottom, 1, 'rgba(120,100,70,0.6)', 30);
        if (e.vars.emerge > e.tele(0.35)) {
          e.hidden = false;
          e.body.vy = -260;
          e.world.fx.dust(e.cx, e.bottom, 8, 'rgba(120,100,70,0.7)', 80);
          sfx('enemy_alert', e.cx, e.cy, 0.5, 1.3);
          e.setState('chase');
        }
      } else e.vars.emerge = 0;
      return;
    }
    groundBrain(e, dt, {
      patrol: 30, chase: 50, range: 70, cooldown: 0.5,
      attack: (en, d) => {
        // Hop toward the player
        const ph = en.atk(d, 0.15, 0.05, 0.25);
        if (ph === 2 && en.atkEnter && en.body.onGround) {
          en.body.vy = -230;
          en.body.vx = en.facing * 110;
        }
        return ph === 4 && en.body.onGround;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      if (e.hidden) {
        const tw = Math.sin(e.t * 12) * (e.vars.emerge ? 2 : 0.6);
        ctx.strokeStyle = '#6a8a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(tw, -4, tw + 1.5, -6);
        ctx.stroke();
        fillCircle(ctx, tw + 2, -6.5, 1.4, '#8aaa5a');
        return;
      }
      const sq = e.body.onGround ? 1 : 1.15;
      ctx.scale(1 / sq, sq);
      ctx.fillStyle = '#6a5034';
      blob(ctx, [-5, 0, -5, -6, 0, -10, 5, -7, 5, 0]);
      ctx.fill();
      ctx.strokeStyle = '#3a2818';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -2);
      ctx.lineTo(-1, -7);
      ctx.moveTo(1, -1);
      ctx.lineTo(3, -6);
      ctx.stroke();
      // Leaf ears
      ctx.fillStyle = '#7a9a4a';
      ellipse(ctx, -2, -11, 1.5, 3.5, -0.5);
      ctx.fill();
      ellipse(ctx, 2, -11, 1.5, 3.5, 0.5);
      ctx.fill();
      enemyEye(ctx, e, 2, -5.5, 1.3, '#ffa040');
      legs(ctx, 3, 6, -1, 3, walkPhase(e), '#4a3420', 1);
    });
  },
};

export const thornback: EnemyDef = {
  id: 'thornback', name: 'Thornback Beetle', region: 'mg', category: 'armored',
  hp: 22, dmg: 1, w: 20, h: 12, frags: 7, sight: 160, weight: 0.5, stagger: 5, armor: 'front', color: '#6a7a4a', pitch: 0.7,
  role: 'Armoured charger. Its thorned shell turns aside blades from the front.', weakness: 'Strike from above or behind. If it rams a wall, it reels.',
  lore: 'Bred by royal gardeners to guard the hedges. The hedges are gone; the beetles still patrol their outlines.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 22, chase: 40, range: 150, cooldown: 1.8, yRange: 30,
      attack: (en, d) => {
        const ph = en.atk(d, 0.55, 1.1, 0.3);
        if (ph === 1) {
          en.body.vx = 0;
          if (fxRng.next() < 0.4) en.world.fx.dust(en.cx - en.facing * 8, en.bottom, 1);
        } else if (ph === 2) {
          en.body.vx = en.facing * 220;
          if (fxRng.next() < 0.5) en.world.fx.dust(en.cx, en.bottom, 1);
          if (en.wallAhead(en.facing) && en.body.onGround) {
            // Slammed into a wall: dazed
            en.world.camera.shake(0.3, 0.12);
            sfx('hit_armor', en.cx, en.cy);
            en.world.fx.sparks(en.cx + en.facing * 10, en.cy, -en.facing, 10);
            en.staggerT = 1.2;
            en.staggered = true;
            en.setState('stagger');
            return false;
          }
          if (!en.safeAhead(en.facing)) en.atkT = 99;
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 3, 14, -3, 4, walkPhase(e) * 1.5, '#2a2a1a', 1);
      // Shell
      ctx.fillStyle = '#3e4a2a';
      ctx.beginPath();
      ctx.moveTo(-10, -2);
      ctx.quadraticCurveTo(-9, -13, 2, -12);
      ctx.quadraticCurveTo(10, -11, 10, -3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#8a9a5a';
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.quadraticCurveTo(0, -12, 7, -8);
      ctx.stroke();
      // Thorns
      ctx.fillStyle = '#b8c08a';
      for (let i = 0; i < 5; i++) {
        const x = -8 + i * 4;
        const y = -10 - Math.sin((i / 4) * Math.PI) * 2;
        ctx.beginPath();
        ctx.moveTo(x - 1, y);
        ctx.lineTo(x + 0.5, y - 3.5);
        ctx.lineTo(x + 1.5, y);
        ctx.fill();
      }
      // Front plate
      ctx.fillStyle = '#5a6a3a';
      ellipse(ctx, 10, -6, 3.5, 4.5);
      ctx.fill();
      enemyEye(ctx, e, 11, -7, 1, '#ffd060');
      // Horn
      ctx.fillStyle = '#c8c89a';
      ctx.beginPath();
      ctx.moveTo(12, -5);
      ctx.lineTo(17, -7);
      ctx.lineTo(12, -3);
      ctx.fill();
    });
  },
};

export const shade: EnemyDef = {
  id: 'shade', name: 'Weeping Shade', region: 'mg', category: 'ranged',
  hp: 12, dmg: 1, w: 12, h: 18, frags: 5, sight: 170, weight: 1.2, stagger: 3, flying: true, color: '#a8c8e8', pitch: 1.2,
  role: 'Floating mourner that rains tears from a distance.', weakness: 'Close the distance; it panics when cornered.',
  lore: 'Grief given a shape. It cries for someone, though it no longer remembers who.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 60, keep: 95, range: 170, cooldown: 2.0, above: 40,
      attack: (en, d) => {
        const ph = en.atk(d, 0.6, 0.1, 0.4);
        en.body.vx *= 0.9;
        en.body.vy *= 0.9;
        if (ph === 2 && en.atkEnter) {
          const dx = en.p.cx - en.cx;
          for (let i = -1; i <= 1; i++) {
            const vx = dx * 0.9 + i * 40;
            en.world.spawnProjectile('tear', en.cx, en.cy + 4, vx * 0.9, -110 + Math.abs(i) * 20, { r: 3, grav: 420, life: 3 });
          }
          sfx('enemy_shoot', en.cx, en.cy, 0.6, 1.3);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    ctx.save();
    ctx.translate(e.cx, e.y + 4);
    const s = Math.sin(e.t * 2);
    glow(ctx, 0, 2, 16, '#9fc8f0', 0.3);
    // Veil
    ctx.fillStyle = 'rgba(200,215,235,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.quadraticCurveTo(7, -2, 6, 8);
    for (let i = 0; i <= 4; i++) ctx.lineTo(6 - i * 3, 14 + Math.sin(e.t * 5 + i) * 2);
    ctx.quadraticCurveTo(-7, -2, 0, -5);
    ctx.fill();
    // Hands to the face
    ctx.fillStyle = '#e8e8f0';
    fillCircle(ctx, -2, 0 + s * 0.3, 1.6, '#e8e8f0');
    fillCircle(ctx, 2, 0 + s * 0.3, 1.6, '#e8e8f0');
    // Tears
    ctx.fillStyle = e.telegraph > 0 ? '#ffffff' : '#9fd8ff';
    fillCircle(ctx, -1, 4 + ((e.t * 6) % 6), 0.8, ctx.fillStyle as string);
    fillCircle(ctx, 1.5, 3 + ((e.t * 6 + 3) % 6), 0.8, ctx.fillStyle as string);
    if (e.telegraph > 0) glow(ctx, 0, 0, 10, '#ffffff', e.telegraph);
    ctx.restore();
  },
};

export const barkKnight: EnemyDef = {
  id: 'bark_knight', name: 'Barkbound Knight', region: 'mg', category: 'shielded',
  hp: 40, dmg: 1, w: 16, h: 26, frags: 14, sight: 150, weight: 0.35, stagger: 7, color: '#8a6a4a', pitch: 0.6,
  role: 'Shield-bearing guardian. Blocks from the front; slams overhead.', weakness: 'Bait the overhead slam, then strike while its shield is lowered.',
  lore: 'Knights who swore to guard the Queen\'s garden forever. The bark grew over them as they stood their post.',
  init(e) {
    e.guard = true;
  },
  think(e, dt) {
    e.guard = e.state !== 'attack' && e.state !== 'recover' && e.state !== 'stagger';
    groundBrain(e, dt, {
      patrol: 18, chase: 34, range: 40, cooldown: 1.4, recover: 0.8,
      attack: (en, d) => {
        if (en.atkKind === 0) en.atkKind = fxRng.next() < 0.65 ? 1 : 2;
        if (en.atkKind === 1) {
          const ph = en.atk(d, 0.65, 0.14, 0.75);
          if (ph === 2) {
            if (en.atkEnter) {
              en.world.camera.shake(0.3, 0.12);
              en.world.fx.dust(en.cx + en.facing * 18, en.bottom, 8, 'rgba(150,120,90,0.6)', 60);
              sfx('boss_slam', en.cx, en.cy, 0.5, 1.4);
            }
            en.strike(en.frontRect(28, 26, 0), 1);
          }
          if (ph === 4) en.atkKind = 0;
          return ph === 4;
        }
        // Shield bash
        const ph = en.atk(d, 0.4, 0.2, 0.4);
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 200;
          en.strike(en.frontRect(12, 22, 2));
        }
        if (ph === 4) en.atkKind = 0;
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const ph = walkPhase(e);
      legs(ctx, 2, 8, -8, 8, ph, '#3a2a1a', 2.5);
      // Body of bark
      ctx.fillStyle = '#4a3624';
      blob(ctx, [-6, -6, -7, -20, -2, -26, 5, -22, 6, -6]);
      ctx.fill();
      ctx.strokeStyle = '#2a1e12';
      ctx.lineWidth = 0.7;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(-5 + i * 3, -8);
        ctx.quadraticCurveTo(-4 + i * 3, -16, -3 + i * 3, -22);
        ctx.stroke();
      }
      // Knot eye
      enemyEye(ctx, e, 2, -20, 1.4, '#c8ff8a');
      // Moss
      ctx.fillStyle = '#5a7a3a';
      ellipse(ctx, -2, -25, 4, 1.5);
      ctx.fill();
      // Club arm
      const raise = e.atkKind === 1 && e.atkPhase === 1 ? -2.2 * e.telegraph : e.atkKind === 1 && e.atkPhase >= 2 ? 0.6 : -0.3;
      ctx.save();
      ctx.translate(-3, -18);
      ctx.rotate(raise);
      ctx.fillStyle = '#5a4430';
      ctx.fillRect(0, -2, 16, 4);
      ctx.fillStyle = '#6a5038';
      ellipse(ctx, 16, 0, 4, 4.5);
      ctx.fill();
      ctx.restore();
      // Round shield
      if (e.guard || e.atkKind === 2) {
        ctx.fillStyle = '#6a4a2a';
        ellipse(ctx, 8, -13, 3.5, 8);
        ctx.fill();
        ctx.strokeStyle = '#a8885a';
        ctx.lineWidth = 1;
        ctx.stroke();
        fillCircle(ctx, 8.5, -13, 1.5, '#c8a870');
      }
    });
  },
};

// ---------------------------------------------------------------- Gloamspore Warrens

export const puffcap: EnemyDef = {
  id: 'puffcap', name: 'Puffcap', region: 'gs', category: 'environmental',
  hp: 10, dmg: 1, w: 14, h: 12, frags: 3, sight: 70, weight: 0, stagger: 99, color: '#b6f07a', pitch: 1.1, poison: 3,
  role: 'Rooted fungus that bursts into poison clouds when approached.', weakness: 'Strike it before it swells, or wait for the cloud to clear.',
  lore: 'Its spores carry a dream of sleep. Breathe them and your Aether drains away as you dream.',
  think(e, dt) {
    e.body.vx = 0;
    if (e.state === 'attack') {
      const ph = e.atk(dt, 0.5, 0.1, 1.4);
      if (ph === 2 && e.atkEnter) {
        for (let i = 0; i < 8; i++) {
          const a = -Math.PI / 2 + ((i - 3.5) / 7) * 2.6;
          e.world.spawnProjectile('spore', e.cx, e.y + 2, Math.cos(a) * 55, Math.sin(a) * 55, { r: 4, life: 2.2, poison: 3, accel: -20, wall: true });
        }
        e.world.fx.burst(e.cx, e.y + 4, 20, '#b6f07a', 70, 0.8, 3);
        sfx('enemy_shoot', e.cx, e.cy, 0.6, 0.8);
      }
      if (ph === 4) {
        e.cd = e.cooldown(1.2);
        e.setState('idle');
      }
      return;
    }
    if (e.cd <= 0 && e.distToPlayer() < 64) e.setState('attack');
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const swell = 1 + e.telegraph * 0.35 + Math.sin(e.t * 3) * 0.04;
      ctx.fillStyle = '#d8d0c0';
      ctx.fillRect(-2, -6, 4, 6);
      ctx.save();
      ctx.translate(0, -6);
      ctx.scale(swell, swell);
      ctx.fillStyle = '#6a8a3a';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 6, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#b6f07a';
      for (let i = 0; i < 5; i++) fillCircle(ctx, -5 + i * 2.5, -2 - (i % 2) * 2, 0.9, '#d8ff9a');
      ctx.restore();
      glow(ctx, 0, -8, 10, '#b6f07a', 0.3 + e.telegraph * 0.5);
    });
  },
};

export const dropper: EnemyDef = {
  id: 'dropper', name: 'Mycelid Dropper', region: 'gs', category: 'ambush',
  hp: 12, dmg: 1, w: 12, h: 10, frags: 4, sight: 120, weight: 1, stagger: 3, color: '#c8a8d8', pitch: 1.4,
  role: 'Clings to ceilings and drops on prey, then skitters fast.', weakness: 'Its thread is visible. Bait the drop, then strike as it lands.',
  lore: 'A spider made of mould. The threads it hangs from are older than it is.',
  init(e) {
    // Climb to the ceiling above the spawn point.
    const g = e.world.grid;
    let ty = Math.floor((e.body.y) / TILE);
    while (ty > 0 && !g.isSolidAt(Math.floor(e.cx / TILE), ty - 1)) ty--;
    e.body.y = ty * TILE;
    e.vars.anchorY = e.body.y;
    e.ignoreGravity = true;
    e.hidden = false;
    e.setState('hidden');
  },
  think(e, dt) {
    if (e.state === 'hidden') {
      e.body.vx = 0;
      e.body.vy = 0;
      e.body.y = e.vars.anchorY + Math.sin(e.t * 2) * 1.5;
      const dx = Math.abs(e.p.cx - e.cx);
      if (dx < 26 && e.p.cy > e.cy && e.world.lineOfSight(e.cx, e.cy, e.p.cx, e.p.cy)) {
        e.ignoreGravity = false;
        e.setState('attack');
        sfx('enemy_alert', e.cx, e.cy, 0.5, 1.5);
      }
      return;
    }
    if (e.state === 'attack' && !e.body.onGround) return;
    if (e.state === 'attack' && e.body.onGround) {
      e.world.fx.dust(e.cx, e.bottom, 5);
      e.setState('chase');
    }
    groundBrain(e, dt, {
      patrol: 40, chase: 100, range: 26, cooldown: 0.9,
      attack: (en, d) => {
        const ph = en.atk(d, 0.25, 0.12, 0.3);
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 160;
          en.strike(en.frontRect(10, 8, 2));
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    if (e.state === 'hidden') {
      ctx.strokeStyle = 'rgba(220,200,230,0.5)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(e.cx, e.vars.anchorY - 4);
      ctx.lineTo(e.cx, e.y);
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(e.cx, e.cy);
    if (e.state === 'hidden') ctx.scale(1, -1);
    ctx.scale(e.facing, 1);
    legs(ctx, 4, 12, 0, 5, e.t * 12, '#6a5a78', 0.9);
    ctx.fillStyle = '#8a6a9a';
    ellipse(ctx, 0, -1, 5, 3.5);
    ctx.fill();
    ctx.fillStyle = '#c8a8d8';
    for (let i = 0; i < 3; i++) fillCircle(ctx, -2 + i * 2, -3, 0.7, '#e8c8f8');
    enemyEye(ctx, e, 3, -1, 0.8, '#ff8ad8');
    enemyEye(ctx, e, 4.5, 0, 0.6, '#ff8ad8');
    ctx.restore();
  },
};

export const capling: EnemyDef = {
  id: 'capling', name: 'Capling', region: 'gs', category: 'swarm',
  hp: 4, dmg: 1, w: 7, h: 7, frags: 1, sight: 140, weight: 2, stagger: 1, color: '#e0a0f0', pitch: 1.9,
  role: 'Tiny hoppers that attack in squeaking swarms.', weakness: 'Fragile; sweeping strikes scatter them.',
  lore: 'Each capling is a single thought of the Warrens, wandering off on its own.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 30, chase: 70, range: 90, cooldown: 0.35, idleTime: 0.5,
      attack: (en, d) => {
        const ph = en.atk(d, 0.12, 0.05, 0.15);
        if (ph === 2 && en.atkEnter && en.body.onGround) {
          en.body.vy = -200 - fxRng.next() * 80;
          en.body.vx = en.facing * (90 + fxRng.next() * 60);
          sfx('step', en.cx, en.cy, 0.2, 2);
        }
        return ph === 4 && en.body.onGround;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      ctx.fillStyle = '#e8d8e0';
      ctx.fillRect(-1, -4, 2, 3);
      legs(ctx, 2, 3, -1, 2, e.t * 20, '#8a6a7a', 0.8);
      ctx.fillStyle = '#b060d0';
      ctx.beginPath();
      ctx.ellipse(0, -4, 4, 3.5, 0, Math.PI, 0);
      ctx.fill();
      fillCircle(ctx, -1.5, -5.5, 0.6, '#ffd0ff');
      enemyEye(ctx, e, 1.5, -3, 0.6, '#ffffff');
    });
  },
};

export const bloatcap: EnemyDef = {
  id: 'bloatcap', name: 'Bloatcap', region: 'gs', category: 'explosive',
  hp: 8, dmg: 1, w: 12, h: 14, frags: 3, sight: 140, weight: 1, stagger: 99, color: '#ffb070', pitch: 0.8,
  role: 'Waddles close and detonates. Even in death it bursts.', weakness: 'Kill it from range with a Veil Lance, or strike and leap away.',
  lore: 'Overfed on dreams until it could hold no more. Mercy, for it, is distance.',
  think(e, dt) {
    if (e.state === 'attack') {
      e.body.vx *= 0.8;
      const ph = e.atk(dt, 0.8, 0.05, 0.1);
      if (ph >= 2) {
        e.world.explosion(e.cx, e.cy, 38, 'enemy', 1);
        e.vars.exploded = 1;
        e.die();
      }
      return;
    }
    groundBrain(e, dt, {
      patrol: 18, chase: 46, range: 34, cooldown: 0,
      attack: () => false,
    });
  },
  onDeath(e) {
    if (!e.vars.exploded) {
      e.vars.exploded = 1;
      e.world.explosion(e.cx, e.cy, 34, 'enemy', 1);
    }
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const swell = 1 + e.telegraph * 0.5 + Math.sin(e.t * (4 + e.telegraph * 30)) * 0.05 * (1 + e.telegraph * 3);
      legs(ctx, 2, 6, -2, 3, walkPhase(e), '#5a3a2a', 1.5);
      ctx.save();
      ctx.translate(0, -7);
      ctx.scale(swell, swell);
      ctx.fillStyle = e.telegraph > 0 && Math.sin(e.t * 40) > 0 ? '#ffe0b0' : '#c87040';
      ellipse(ctx, 0, 0, 6.5, 6);
      ctx.fill();
      ctx.fillStyle = '#ffd0a0';
      fillCircle(ctx, -2, -2, 1.2, '#ffe0c0');
      fillCircle(ctx, 2.5, 1, 0.9, '#ffe0c0');
      fillCircle(ctx, -1, 3, 1, '#ffe0c0');
      ctx.restore();
      enemyEye(ctx, e, 3, -8, 0.8, '#3a1a0a');
      glow(ctx, 0, -7, 12, '#ff9040', 0.2 + e.telegraph * 0.8);
    });
  },
};

void TAU;
void sign;
void alert;
void PK;
export const EARLY: EnemyDef[] = [husk, moth, rootling, thornback, shade, barkKnight, puffcap, dropper, capling, bloatcap];
export type { Enemy };
