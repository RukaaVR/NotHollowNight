import type { EnemyDef, Enemy } from '../Enemy';
import { groundBrain, flyBrain, alert } from '../ai';
import { pose, legs, enemyEye, walkPhase, fillCircle, dangerZone, teleColor } from '../kit';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, ellipse, blob } from '../../rendering/draw';
import { TAU, clamp } from '../../core/math';
import { T, TILE } from '../../world/tiles';
import { hurtPlayerRect } from '../../combat/combat';
import type { HitInfo } from '../../world/Entity';

/** Find the floor below a point (returns y of floor top) within the room. */
function floorBelow(e: Enemy, x: number, y: number): number {
  const g = e.world.grid;
  const tx = Math.floor(x / TILE);
  let ty = Math.floor(y / TILE);
  while (ty < g.h && !g.isSolidAt(tx, ty) && g.tile(tx, ty) !== T.OneWay) ty++;
  return ty * TILE;
}

// ---------------------------------------------------------------- Sunken Archive

export const inkWraith: EnemyDef = {
  id: 'ink_wraith', name: 'Ink Wraith', region: 'sa', category: 'ambush',
  hp: 18, dmg: 1, w: 12, h: 22, frags: 7, sight: 140, weight: 0.9, stagger: 4, color: '#5a4a7a', pitch: 0.9,
  role: 'Lurks as a puddle of ink, rises to slash, then sinks and resurfaces beneath you.', weakness: 'The puddle ripples before it rises. Strike first.',
  lore: 'Words spilled and never read. They pooled in the low stacks and learned to stand up.',
  init(e) {
    e.hidden = true;
    e.setState('hidden');
  },
  think(e, dt) {
    const b = e.body;
    if (e.state === 'hidden') {
      b.vx = 0;
      e.vars.t = (e.vars.t ?? 0) + dt;
      const near = e.distToPlayer() < 70;
      if (e.vars.sunk) {
        // Travel under the floor toward the player, then rise.
        if (e.vars.t > 1.3) {
          const fy = floorBelow(e, e.p.cx, e.p.cy);
          b.x = clamp(e.p.cx - e.w / 2 + (fxRng.next() - 0.5) * 30, 0, e.world.grid.pw - e.w);
          b.y = fy - e.h;
          e.vars.sunk = 0;
          e.vars.t = 0;
          e.vars.rising = 1;
        }
        return;
      }
      if (near || e.vars.rising) {
        e.vars.rise = (e.vars.rise ?? 0) + dt;
        if (e.vars.rise > e.tele(0.45)) {
          e.hidden = false;
          e.vars.rise = 0;
          e.vars.rising = 0;
          e.facePlayer();
          sfx('enemy_alert', e.cx, e.cy, 0.5, 0.8);
          e.setState('attack');
          e.atkKind = 0;
        }
      }
      return;
    }
    if (e.state === 'attack') {
      // Double slash
      const ph = e.atk(dt, 0.25, 0.32, 0.35);
      if (ph === 2) {
        if (e.atkEnter) {
          b.vx = e.facing * 120;
          sfx('swing', e.cx, e.cy, 0.5, 0.7);
        }
        e.strike(e.frontRect(18, 18, 2));
        if (e.atkT > e.tele(0.25) + 0.16 && !e.vars.second) {
          e.vars.second = 1;
          e.facePlayer();
          b.vx = e.facing * 120;
          e.lastHitId = -1;
        }
      }
      if (ph === 4) {
        e.vars.second = 0;
        e.hidden = true;
        e.vars.sunk = 1;
        e.vars.t = 0;
        e.world.fx.burst(e.cx, e.bottom, 10, '#2a2040', 60, 0.5, 3);
        e.setState('hidden');
      }
      return;
    }
    e.setState('hidden');
    e.hidden = true;
  },
  draw(ctx, e) {
    if (e.hidden) {
      const rip = e.vars.rise ? e.vars.rise * 4 : Math.sin(e.t * 2) * 0.5;
      ctx.fillStyle = 'rgba(20,14,30,0.85)';
      ellipse(ctx, e.cx, e.bottom - 1, 9 + rip, 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,100,170,0.5)';
      ctx.lineWidth = 0.6;
      ellipse(ctx, e.cx, e.bottom - 1, 5 + ((e.t * 6) % 6), 1.2);
      ctx.stroke();
      return;
    }
    pose(ctx, e, () => {
      ctx.fillStyle = '#1a1424';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-7, -14, 0, -22);
      ctx.quadraticCurveTo(7, -14, 6, 0);
      for (let i = 0; i < 5; i++) ctx.lineTo(6 - i * 3, Math.sin(e.t * 6 + i) * 1.5);
      ctx.fill();
      enemyEye(ctx, e, 2, -17, 1, '#c8b8ff');
      // Quill claws
      const sw = e.atkPhase === 2 ? Math.sin(e.atkT * 30) * 0.8 : -0.5;
      ctx.save();
      ctx.translate(3, -12);
      ctx.rotate(sw);
      ctx.strokeStyle = '#d8d0e8';
      ctx.lineWidth = 0.8;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(10, -2 + i * 2);
        ctx.stroke();
      }
      ctx.restore();
      // Dripping ink
      fillCircle(ctx, -2, -((e.t * 10) % 10), 0.8, '#2a2040');
    });
  },
};

export const pageSwarm: EnemyDef = {
  id: 'page_swarm', name: 'Paper Murmuration', region: 'sa', category: 'swarm',
  hp: 16, dmg: 1, w: 18, h: 16, frags: 6, sight: 170, weight: 1.6, stagger: 3, flying: true, color: '#efe4c4', pitch: 1.6,
  role: 'A flock of loose pages that wheels and dives as one.', weakness: 'Every strike tears pages away. Keep swinging.',
  lore: 'Unbound chapters searching for the book they belong to.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 90, keep: 50, range: 110, cooldown: 1.5, hoverAmp: 14,
      attack: (en, d) => {
        const ph = en.atk(d, 0.35, 0.5, 0.2);
        if (ph === 2 && en.atkEnter) {
          const a = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
          en.body.vx = Math.cos(a) * 220;
          en.body.vy = Math.sin(a) * 220;
          sfx('swing', en.cx, en.cy, 0.4, 1.8);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    const n = Math.max(3, Math.ceil((e.hp / e.maxHp) * 10));
    for (let i = 0; i < n; i++) {
      const a = e.t * (1.5 + (i % 3) * 0.4) + (i * TAU) / n;
      const r = 5 + (i % 3) * 2.5;
      const x = e.cx + Math.cos(a) * r;
      const y = e.cy + Math.sin(a * 1.3) * r * 0.7;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a * 2);
      ctx.fillStyle = e.telegraph > 0 && i % 2 ? teleColor(e) : '#e8dcbc';
      ctx.fillRect(-2.5, -1.5, 5, 3);
      ctx.fillStyle = 'rgba(60,40,20,0.6)';
      ctx.fillRect(-1.5, -0.5, 3, 0.4);
      ctx.restore();
    }
  },
};

export const scribe: EnemyDef = {
  id: 'scribe', name: 'Mad Scribe', region: 'sa', category: 'ranged',
  hp: 16, dmg: 1, w: 12, h: 22, frags: 7, sight: 190, weight: 1, stagger: 3, color: '#d8c890', pitch: 1.1,
  role: 'Hurls fans of razor pages and vanishes when approached.', weakness: 'It cannot write and flee at once. Strike during the throw.',
  lore: 'He is still transcribing the Archive by hand. He is on page four of an infinite book.',
  think(e, dt) {
    if (e.state === 'chase' && e.distToPlayer() < 46 && e.cd < 0.6 && !e.vars.blinked) {
      // Panic blink
      const p = e.p;
      for (let i = 0; i < 6; i++) {
        const nx = clamp(p.cx + (fxRng.next() < 0.5 ? -1 : 1) * (90 + fxRng.next() * 40), 8, e.world.grid.pw - 8);
        const fy = floorBelow(e, nx, e.cy);
        if (fy < e.world.grid.ph && Math.abs(fy - e.bottom) < 64) {
          e.world.fx.burst(e.cx, e.cy, 14, '#efe4c4', 90, 0.5, 2);
          e.body.x = nx - e.w / 2;
          e.body.y = fy - e.h;
          e.world.fx.burst(nx, fy - 10, 14, '#efe4c4', 90, 0.5, 2);
          sfx('teleport', nx, fy, 0.4, 1.2);
          e.vars.blinked = 1;
          break;
        }
      }
    }
    groundBrain(e, dt, {
      patrol: 20, chase: 40, range: 170, cooldown: 1.6, keep: 110, yRange: 90,
      attack: (en, d) => {
        en.vars.blinked = 0;
        const ph = en.atk(d, 0.55, 0.1, 0.45);
        if (ph === 2 && en.atkEnter) {
          const a = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
          for (let i = -2; i <= 2; i++) en.world.spawnProjectile('page', en.cx, en.cy - 4, Math.cos(a + i * 0.18) * 160, Math.sin(a + i * 0.18) * 160, { r: 3, life: 2 });
          sfx('enemy_shoot', en.cx, en.cy, 0.5, 1.5);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      ctx.fillStyle = '#4a3a2a';
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-4, -16);
      ctx.quadraticCurveTo(0, -20, 4, -16);
      ctx.lineTo(6, 0);
      ctx.closePath();
      ctx.fill();
      // Hunched head with spectacles
      fillCircle(ctx, 2, -18, 3.5, '#c8b8a0');
      ctx.strokeStyle = '#ffeab0';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(3.5, -18.5, 1.3, 0, TAU);
      ctx.stroke();
      enemyEye(ctx, e, 3.5, -18.5, 0.5, '#ffeab0');
      // Giant quill
      const swing = e.atkPhase === 1 ? -1.2 * e.telegraph : e.atkPhase === 2 ? 0.8 : 0;
      ctx.save();
      ctx.translate(4, -12);
      ctx.rotate(-0.6 + swing);
      ctx.fillStyle = '#efe4c4';
      ellipse(ctx, 0, -8, 1.8, 8);
      ctx.fill();
      ctx.strokeStyle = '#2a2030';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, 4);
      ctx.stroke();
      ctx.restore();
      // Floating book
      const by = -22 + Math.sin(e.t * 2) * 1.5;
      ctx.fillStyle = '#6a3a2a';
      ctx.fillRect(-9, by, 6, 4);
      ctx.fillStyle = '#efe4c4';
      ctx.fillRect(-8.5, by + 0.5, 5, 1);
      glow(ctx, -6, by + 2, 8, '#ffeab0', 0.4);
    });
  },
};

// ---------------------------------------------------------------- Thorn Chapel

export const acolyte: EnemyDef = {
  id: 'acolyte', name: 'Thorn Acolyte', region: 'tc', category: 'shielded',
  hp: 24, dmg: 1, w: 12, h: 22, frags: 9, sight: 150, weight: 0.7, stagger: 5, color: '#d07a8a', pitch: 1.0,
  role: 'Raises a barrier of thorns, then punishes the strike it absorbed.', weakness: 'Strike from behind, or wait for it to lower the barrier to attack.',
  lore: 'Novices of the Thorn Saint. They vowed to suffer every wound meant for another.',
  think(e, dt) {
    const near = e.distToPlayer() < 50;
    e.guard = (near && e.state === 'chase') || (e.vars.guardT ?? 0) > 0;
    e.vars.guardT = Math.max(0, (e.vars.guardT ?? 0) - dt);
    if (e.vars.counter) {
      e.vars.counter = 0;
      e.setState('attack');
      e.atkKind = 1;
    }
    groundBrain(e, dt, {
      patrol: 20, chase: 45, range: 40, cooldown: 1.5,
      attack: (en, d) => {
        en.guard = false;
        const quick = en.atkKind === 1;
        const ph = en.atk(d, quick ? 0.18 : 0.45, 0.18, 0.5);
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 170;
          en.strike(en.frontRect(26, 10, 6));
        }
        if (ph === 4) en.atkKind = 0;
        return ph === 4;
      },
    });
  },
  init(e) {
    e.onArmorHit = (_h: HitInfo) => {
      e.vars.counter = 1;
      e.vars.guardT = 0.2;
      e.world.fx.shards(e.cx + e.facing * 8, e.cy, 6, '#d07a8a', 120);
    };
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 2, 6, -6, 6, walkPhase(e), '#2a1418', 1.6);
      ctx.fillStyle = '#4a2a30';
      ctx.beginPath();
      ctx.moveTo(-5, -4);
      ctx.lineTo(-4, -17);
      ctx.quadraticCurveTo(0, -22, 4, -17);
      ctx.lineTo(5, -4);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e8d8d0';
      ellipse(ctx, 2, -16, 2.5, 3);
      ctx.fill();
      enemyEye(ctx, e, 3, -16.5, 0.6, '#ff8aa0');
      // Thorn crown
      ctx.strokeStyle = '#6a3a3a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        ctx.moveTo(-3 + i * 1.6, -19);
        ctx.lineTo(-3.5 + i * 1.6, -22);
      }
      ctx.stroke();
      // Thorn barrier or spear
      if (e.guard) {
        ctx.strokeStyle = '#a04a5a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          ctx.moveTo(7, -2 - i * 3.4);
          ctx.lineTo(11, -3 - i * 3.4 + Math.sin(e.t * 4 + i));
        }
        ctx.stroke();
        glow(ctx, 9, -11, 10, '#ff8aa0', 0.3);
      } else {
        const th = e.atkPhase === 2 ? 14 : 0;
        ctx.strokeStyle = '#8a5a4a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-2 + th, -11);
        ctx.lineTo(12 + th, -11);
        ctx.stroke();
      }
    });
  },
};

export const wretch: EnemyDef = {
  id: 'wretch', name: 'Bramble Wretch', region: 'tc', category: 'ranged',
  hp: 20, dmg: 1, w: 12, h: 24, frags: 8, sight: 190, weight: 0.8, stagger: 4, color: '#a04a5a', pitch: 0.8,
  role: 'Calls thorns up from the ground beneath its prey.', weakness: 'Watch the ground for the red sigil, then rush it.',
  lore: 'It prayed for its enemies to be pierced. The thorns took the prayer literally, and then took the one who prayed.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 18, chase: 34, range: 180, cooldown: 2.0, keep: 100, yRange: 100,
      attack: (en, d) => {
        const ph = en.atk(d, 0.75, 0.25, 0.4);
        if (ph === 1 && en.atkEnter) {
          en.vars.tx = en.p.cx;
          en.vars.ty = floorBelow(en, en.p.cx, en.p.cy - 4);
        }
        if (ph === 2) {
          if (en.atkEnter) {
            sfx('break', en.vars.tx, en.vars.ty, 0.6, 1.4);
            en.world.fx.shards(en.vars.tx, en.vars.ty, 10, '#a04a5a', 200);
          }
          hurtPlayerRect(en.world, en.vars.tx - 10, en.vars.ty - 40, 20, 40, 1, en.vars.tx, { source: en });
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    if (e.state === 'attack' && e.atkPhase === 1) dangerZone(ctx, e, e.vars.tx - 10, e.vars.ty - 3, 20, 3, e.telegraph);
    if (e.state === 'attack' && e.atkPhase === 2) {
      ctx.fillStyle = '#6a2a3a';
      for (let i = 0; i < 5; i++) {
        const x = e.vars.tx - 8 + i * 4;
        const hgt = 30 + (i % 2) * 10;
        ctx.beginPath();
        ctx.moveTo(x - 2, e.vars.ty);
        ctx.lineTo(x, e.vars.ty - hgt);
        ctx.lineTo(x + 2, e.vars.ty);
        ctx.fill();
      }
    }
    pose(ctx, e, () => {
      ctx.strokeStyle = '#4a2028';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.quadraticCurveTo(-4, -12, 0, -22);
      ctx.moveTo(2, 0);
      ctx.quadraticCurveTo(4, -10, 1, -18);
      ctx.stroke();
      const lift = e.atkPhase === 1 ? -6 * e.telegraph : 0;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(6, -18 + lift, 10, -12 + lift);
      ctx.moveTo(0, -16);
      ctx.quadraticCurveTo(-6, -18 + lift, -9, -12 + lift);
      ctx.stroke();
      ctx.lineCap = 'butt';
      fillCircle(ctx, 0.5, -22, 3, '#3a1820');
      enemyEye(ctx, e, 1.5, -22.5, 0.8, '#ff6a7a');
    });
  },
};

// ---------------------------------------------------------------- Black Reservoir

export const lurker: EnemyDef = {
  id: 'lurker', name: 'Still Lurker', region: 'br', category: 'ambush',
  hp: 18, dmg: 1, w: 16, h: 12, frags: 7, sight: 120, weight: 0.9, stagger: 4, color: '#60b0b8', pitch: 0.6,
  role: 'Waits beneath still water and leaps at anything on the shore.', weakness: 'Out of the water it is clumsy. Punish it before it slides back.',
  lore: 'It has not moved in so long that the water forgot it was there. Then you arrived.',
  think(e, dt) {
    const b = e.body;
    const wet = e.world.grid.liquidAt(e.cx, e.cy) === T.Water;
    if (e.state === 'idle' || e.state === 'hidden' || e.state === 'patrol') {
      e.hidden = wet;
      if (wet) {
        b.vy = -20 * Math.sin(e.t);
        b.vx = 0;
      }
      if (e.distToPlayer() < 110 && e.cd <= 0 && e.p.state !== 'dead') {
        alert(e);
        e.hidden = false;
      }
      return;
    }
    if (e.state === 'alert') {
      if (e.stateT > e.tele(0.4)) {
        const dx = e.p.cx - e.cx;
        b.vx = clamp(dx * 1.6, -200, 200);
        b.vy = -360;
        e.world.fx.splash(e.cx, e.y, 12);
        sfx('splash', e.cx, e.cy);
        e.setState('attack');
      }
      return;
    }
    if (e.state === 'attack') {
      if (e.stateT > 0.2 && b.onGround) {
        e.setState('recover');
        e.world.fx.dust(e.cx, e.bottom, 5);
      }
      return;
    }
    if (e.state === 'recover') {
      b.vx *= 0.8;
      if (e.stateT > 1.0) e.setState('return');
      return;
    }
    if (e.state === 'return') {
      const dx = e.home.x - e.cx;
      b.vx = Math.sign(dx) * 60;
      if (wet || Math.abs(dx) < 4 || e.stateT > 3) {
        e.cd = e.cooldown(1.2);
        e.setState('idle');
      }
      return;
    }
    e.setState('idle');
  },
  draw(ctx, e) {
    if (e.hidden) {
      glow(ctx, e.cx - 3, e.cy, 6, '#70e0d0', 0.4);
      glow(ctx, e.cx + 3, e.cy, 6, '#70e0d0', 0.4);
      return;
    }
    pose(ctx, e, () => {
      ctx.fillStyle = '#1e3a40';
      blob(ctx, [-8, 0, -7, -8, 2, -12, 8, -8, 8, -2]);
      ctx.fill();
      ctx.fillStyle = '#9fe8e0';
      for (const [x, y] of [[-4, -7], [0, -9], [3, -6], [-2, -4]] as const) fillCircle(ctx, x, y, 0.8, '#9fe8e0');
      // Wide mouth
      ctx.strokeStyle = '#0a1a1c';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.quadraticCurveTo(3, -1, -2, -3);
      ctx.stroke();
      enemyEye(ctx, e, 5, -8, 1.2, '#d0fff0');
      legs(ctx, 2, 10, -2, 3, walkPhase(e), '#1e3a40', 1.5);
    });
  },
};

export const coralback: EnemyDef = {
  id: 'coralback', name: 'Coralback', region: 'br', category: 'armored',
  hp: 26, dmg: 1, w: 18, h: 12, frags: 9, sight: 140, weight: 0.6, stagger: 4, armor: 'top', color: '#e08a7a', pitch: 0.9,
  role: 'Sideways scuttler with a coral shell no plunge can crack.', weakness: 'Strike it from the side. Its snaps leave it exposed.',
  lore: 'The coral grew on its back for four hundred years. It no longer knows which of them is the crab.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 40, chase: 90, range: 30, cooldown: 0.9,
      attack: (en, d) => {
        const ph = en.atk(d, 0.4, 0.12, 0.45);
        if (ph === 2) en.strike(en.frontRect(16, 10, 0));
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 4, 16, -3, 4, e.t * 18, '#6a3a30', 1.2);
      ctx.fillStyle = '#7a4a40';
      ellipse(ctx, 0, -5, 8, 4.5);
      ctx.fill();
      // Coral growths
      ctx.strokeStyle = '#ff9a8a';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, -8);
      ctx.lineTo(-5, -13);
      ctx.lineTo(-7, -15);
      ctx.moveTo(-5, -13);
      ctx.lineTo(-3, -16);
      ctx.moveTo(2, -9);
      ctx.lineTo(3, -14);
      ctx.moveTo(5, -8);
      ctx.lineTo(7, -12);
      ctx.stroke();
      ctx.lineCap = 'butt';
      enemyEye(ctx, e, 6, -9, 0.8, '#ffffff');
      // Claw
      const open = e.atkPhase === 1 ? 0.8 * e.telegraph : e.atkPhase === 2 ? -0.1 : 0.3;
      ctx.fillStyle = '#9a5a4a';
      ctx.save();
      ctx.translate(8, -5);
      ctx.rotate(-open);
      ctx.beginPath();
      ctx.ellipse(4, -1, 4, 1.8, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
      ctx.save();
      ctx.translate(8, -4);
      ctx.rotate(open);
      ctx.beginPath();
      ctx.ellipse(4, 1, 4, 1.5, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
  },
};

// ---------------------------------------------------------------- Starwell Observatory

export const sentinel: EnemyDef = {
  id: 'sentinel', name: 'Star Sentinel', region: 'so', category: 'ranged',
  hp: 20, dmg: 1, w: 14, h: 14, frags: 8, sight: 220, weight: 0.8, stagger: 4, flying: true, color: '#e0e4ff', pitch: 1.3,
  role: 'Armillary eye that traces a line, then burns along it.', weakness: 'The beam follows the line it drew. Step off it and strike.',
  lore: 'It was built to track the stars. It tracks whatever moves now.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 45, keep: 130, range: 220, cooldown: 2.4,
      attack: (en, d) => {
        const ph = en.atk(d, 0.85, 0.35, 0.4);
        en.body.vx *= 0.85;
        en.body.vy *= 0.85;
        if (ph === 1 && en.atkEnter) {
          en.vars.ang = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
        }
        if (ph === 1 && en.telegraph < 0.6) en.vars.ang = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
        if (ph === 2) {
          if (en.atkEnter) sfx('boss_beam', en.cx, en.cy, 0.5, 1.4);
          const a = en.vars.ang;
          const len = beamLength(en, a);
          const p = en.p;
          // Distance from player centre to the beam segment
          const px = p.cx - en.cx;
          const py = p.cy - en.cy;
          const along = px * Math.cos(a) + py * Math.sin(a);
          const perp = Math.abs(-px * Math.sin(a) + py * Math.cos(a));
          if (along > 0 && along < len && perp < 7) p.hurt(1, en.cx);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    const a = e.vars.ang ?? 0;
    if (e.state === 'attack' && (e.atkPhase === 1 || e.atkPhase === 2)) {
      const len = beamLength(e, a);
      ctx.save();
      ctx.translate(e.cx, e.cy);
      ctx.rotate(a);
      if (e.atkPhase === 1) {
        ctx.strokeStyle = teleColor(e);
        ctx.globalAlpha = 0.3 + e.telegraph * 0.6;
        ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(len, 0);
        ctx.stroke();
        ctx.setLineDash([]);
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(200,210,255,0.5)';
        ctx.fillRect(0, -6, len, 12);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, -2, len, 4);
      }
      ctx.restore();
    }
    ctx.save();
    ctx.translate(e.cx, e.cy);
    glow(ctx, 0, 0, 16, '#d0d8ff', 0.6);
    ctx.strokeStyle = '#a8b0e0';
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 2.5, e.t * (0.8 + i * 0.5) + i, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    enemyEye(ctx, e, e.cx, e.cy, 2.2, '#ffffff');
  },
};

function beamLength(e: Enemy, a: number): number {
  const g = e.world.grid;
  for (let d = 8; d < 400; d += 4) {
    const x = e.cx + Math.cos(a) * d;
    const y = e.cy + Math.sin(a) * d;
    if (g.isSolidAt(Math.floor(x / TILE), Math.floor(y / TILE))) return d;
  }
  return 400;
}

export const orreryKnight: EnemyDef = {
  id: 'orrery_knight', name: 'Orrery Knight', region: 'so', category: 'shielded',
  hp: 44, dmg: 1, w: 14, h: 26, frags: 16, sight: 160, weight: 0.4, stagger: 6, color: '#b8c0ff', pitch: 0.7,
  role: 'Guarded by orbiting shield-moons that turn blades aside.', weakness: 'Time your strike to the gap between the moons.',
  lore: 'The astronomers\' last guard. Its moons follow the true orbits of a sky no one below has seen.',
  init(e) {
    e.guardAll = true;
  },
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 18, chase: 42, range: 50, cooldown: 1.3,
      attack: (en, d) => {
        const ph = en.atk(d, 0.5, 0.2, 0.55);
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 230;
          en.strike(en.frontRect(22, 8, 8));
        }
        return ph === 4;
      },
    });
    // Moons block if the player is on the side where a moon currently is.
    const p = e.p;
    const pa = Math.atan2(p.cy - e.cy, p.cx - e.cx);
    let blocked = false;
    for (let i = 0; i < 3; i++) {
      const a = e.t * 1.6 + (i * TAU) / 3;
      let diff = Math.abs(((a - pa + Math.PI * 3) % TAU) - Math.PI);
      if (diff > Math.PI) diff = TAU - diff;
      if (diff < 0.45) blocked = true;
    }
    e.guard = blocked && e.state !== 'stagger';
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 2, 8, -8, 8, walkPhase(e), '#2a2a44', 2.2);
      ctx.fillStyle = '#2a3058';
      ctx.beginPath();
      ctx.moveTo(-6, -6);
      ctx.lineTo(-5, -20);
      ctx.lineTo(5, -20);
      ctx.lineTo(6, -6);
      ctx.closePath();
      ctx.fill();
      // Starry cape specks
      for (let i = 0; i < 5; i++) fillCircle(ctx, -4 + ((i * 3.3) % 8), -8 - ((i * 5.1) % 11), 0.5, '#e0e4ff');
      ctx.fillStyle = '#8890c8';
      ctx.beginPath();
      ctx.arc(0, -23, 4, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#0a0c1a';
      ctx.fillRect(0, -24, 4, 1.2);
      enemyEye(ctx, e, 2.5, -23.4, 0.6, '#e0e4ff');
      const th = e.atkPhase === 2 ? 12 : 0;
      ctx.strokeStyle = '#d0d8ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0 + th, -14);
      ctx.lineTo(14 + th, -14);
      ctx.stroke();
    });
    // Orbiting moons (world space)
    for (let i = 0; i < 3; i++) {
      const a = e.t * 1.6 + (i * TAU) / 3;
      const x = e.cx + Math.cos(a) * 15;
      const y = e.cy + Math.sin(a) * 15;
      glow(ctx, x, y, 7, '#d8e0ff', 0.5);
      fillCircle(ctx, x, y, 2.6, '#c8d0ff');
    }
  },
};


void legs;
export const LATE: EnemyDef[] = [inkWraith, pageSwarm, scribe, acolyte, wretch, lurker, coralback, sentinel, orreryKnight];
