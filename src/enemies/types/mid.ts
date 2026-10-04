import { Enemy, type EnemyDef } from '../Enemy';
import { groundBrain, flyBrain, alert } from '../ai';
import { pose, legs, enemyEye, walkPhase, fillCircle } from '../kit';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, ellipse, blob } from '../../rendering/draw';
import { TAU, sign, clamp } from '../../core/math';
import { T, TILE } from '../../world/tiles';

// ---------------------------------------------------------------- Lumen Caverns

export const prismMite: EnemyDef = {
  id: 'prism_mite', name: 'Prism Mite', region: 'lc', category: 'swarm',
  hp: 10, dmg: 1, w: 10, h: 8, frags: 3, sight: 130, weight: 1.4, stagger: 2, color: '#b8f0ff', pitch: 1.7,
  role: 'Crystal crawler that shatters into smaller mites.', weakness: 'Finish the splinters quickly before they surround you.',
  lore: 'Lumen crystal that grew a little too close to a heartbeat and learned to imitate one.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 28, chase: e.vars.mini ? 85 : 60, range: 60, cooldown: 0.6,
      attack: (en, d) => {
        const ph = en.atk(d, 0.2, 0.05, 0.2);
        if (ph === 2 && en.atkEnter && en.body.onGround) {
          en.body.vy = -170;
          en.body.vx = en.facing * 130;
        }
        return ph === 4 && en.body.onGround;
      },
    });
  },
  onDeath(e) {
    if (e.vars.mini) return;
    for (const s of [-1, 1]) {
      const m = new Enemy(e.world, prismMite, e.cx + s * 4, e.bottom, false);
      m.vars.mini = 1;
      m.maxHp = m.hp = 4;
      m.body.w = m.w = 7;
      m.body.h = m.h = 6;
      m.body.vx = s * 120;
      m.body.vy = -180;
      m.setState('chase');
      e.world.add(m);
    }
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const k = e.vars.mini ? 0.65 : 1;
      ctx.scale(k, k);
      legs(ctx, 3, 8, -2, 3, e.t * 16, '#5a8aa0', 0.8);
      ctx.fillStyle = '#7ac8e8';
      ctx.beginPath();
      ctx.moveTo(-5, -2);
      ctx.lineTo(-3, -8);
      ctx.lineTo(2, -9);
      ctx.lineTo(6, -4);
      ctx.lineTo(4, -1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(230,250,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(-3, -8);
      ctx.lineTo(2, -9);
      ctx.lineTo(0, -4);
      ctx.closePath();
      ctx.fill();
      enemyEye(ctx, e, 4, -4, 0.8, '#ffffff');
      glow(ctx, 0, -5, 10, '#b8f0ff', 0.35);
    });
  },
};

export const wisp: EnemyDef = {
  id: 'wisp', name: 'Lumen Wisp', region: 'lc', category: 'ranged',
  hp: 12, dmg: 1, w: 10, h: 10, frags: 5, sight: 180, weight: 1.2, stagger: 3, flying: true, color: '#d8f8ff', pitch: 1.5,
  role: 'Blinks between positions and looses homing needles of light.', weakness: 'It must reappear before casting. Wait for the shimmer.',
  lore: 'A lantern-flame that wandered from its wick and never found its way back.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 50, keep: 110, range: 200, cooldown: 2.2,
      attack: (en, d) => {
        const ph = en.atk(d, 0.7, 0.1, 0.35);
        if (ph === 1 && en.atkEnter) {
          // Blink: fade out and reappear at a new vantage point near the player.
          const p = en.p;
          for (let tries = 0; tries < 8; tries++) {
            const a = fxRng.next() * TAU;
            const nx = p.cx + Math.cos(a) * 100;
            const ny = p.cy - 30 + Math.sin(a) * 40;
            const g = en.world.grid;
            if (!g.isSolidAt(Math.floor(nx / TILE), Math.floor(ny / TILE)) && en.world.lineOfSight(nx, ny, p.cx, p.cy)) {
              en.world.fx.burst(en.cx, en.cy, 12, '#d8f8ff', 80, 0.4, 2);
              en.body.x = clamp(nx - en.w / 2, 0, g.pw - en.w);
              en.body.y = clamp(ny - en.h / 2, 0, g.ph - en.h);
              en.world.fx.burst(nx, ny, 12, '#d8f8ff', 80, 0.4, 2);
              sfx('teleport', nx, ny, 0.4, 1.6);
              break;
            }
          }
          en.body.vx = 0;
          en.body.vy = 0;
        }
        if (ph === 2 && en.atkEnter) {
          const a = Math.atan2(en.p.cy - en.cy, en.p.cx - en.cx);
          for (let i = -1; i <= 1; i++) en.world.spawnProjectile('needle', en.cx, en.cy, Math.cos(a + i * 0.35) * 150, Math.sin(a + i * 0.35) * 150, { r: 3, homing: 1.4, life: 2.5, color: '#e8fbff' });
          sfx('enemy_shoot', en.cx, en.cy, 0.6, 1.7);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    ctx.save();
    ctx.translate(e.cx, e.cy);
    const a = e.atkPhase === 1 ? 0.4 + 0.6 * e.telegraph : 1;
    ctx.globalAlpha *= a;
    glow(ctx, 0, 0, 20, '#bfefff', 0.8);
    ctx.rotate(e.t * 1.5);
    ctx.fillStyle = 'rgba(200,240,255,0.7)';
    for (let i = 0; i < 5; i++) {
      ctx.rotate(TAU / 5);
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(1.5, -8);
      ctx.lineTo(0, -10);
      ctx.lineTo(-1.5, -8);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    fillCircle(ctx, e.cx, e.cy, 3, '#ffffff');
  },
};

export const geode: EnemyDef = {
  id: 'geode', name: 'Geode Golem', region: 'lc', category: 'armored',
  hp: 50, dmg: 1, w: 22, h: 24, frags: 16, sight: 150, weight: 0.2, stagger: 5, armor: 'all', color: '#9aa8c8', pitch: 0.5,
  role: 'Stone giant. Ordinary strikes glance off its hide.', weakness: 'Charged strikes, lances and plunges crack it. Once staggered, it is defenceless.',
  lore: 'Miners hollowed out this boulder and lived in it. When they left, the boulder kept the shape of living.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 14, chase: 28, range: 120, cooldown: 2.0, recover: 0.6,
      attack: (en, d) => {
        if (en.atkKind === 0) en.atkKind = Math.abs(en.dxToPlayer()) < 50 ? 1 : 2;
        if (en.atkKind === 1) {
          // Ground punch: shockwaves both ways
          const ph = en.atk(d, 0.75, 0.1, 0.6);
          if (ph === 2 && en.atkEnter) {
            for (const s of [-1, 1]) en.world.spawnProjectile('wave', en.cx + s * 12, en.bottom - 4, s * 150, 0, { r: 6, life: 1.6, color: '#b8c8e8' });
            en.world.camera.shake(0.4, 0.15);
            sfx('boss_slam', en.cx, en.cy, 0.6, 1.1);
            en.world.fx.dust(en.cx, en.bottom, 10, 'rgba(160,170,200,0.6)', 90);
          }
          if (ph === 4) en.atkKind = 0;
          return ph === 4;
        }
        // Rolling charge
        const ph = en.atk(d, 0.6, 1.0, 0.5);
        if (ph === 2) {
          en.body.vx = en.facing * 190;
          en.vars.roll = (en.vars.roll ?? 0) + d * 14 * en.facing;
          if (en.wallAhead(en.facing) || !en.safeAhead(en.facing)) en.atkT = 99;
        }
        if (ph === 4) en.atkKind = 0;
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const rolling = e.atkKind === 2 && e.atkPhase === 2;
      ctx.save();
      ctx.translate(0, -12);
      if (rolling) ctx.rotate(e.vars.roll ?? 0);
      ctx.fillStyle = '#4a4a5a';
      blob(ctx, [-11, 4, -10, -6, -2, -12, 8, -9, 11, 2, 4, 11, -6, 10]);
      ctx.fill();
      ctx.strokeStyle = '#2a2a36';
      ctx.lineWidth = 1;
      ctx.stroke();
      // Crystal growths
      ctx.fillStyle = '#9ad8ff';
      for (const [x, y, s] of [[-6, -9, 1], [3, -11, 1.3], [8, -6, 0.9]] as const) {
        ctx.beginPath();
        ctx.moveTo(x - 2 * s, y + 2);
        ctx.lineTo(x, y - 5 * s);
        ctx.lineTo(x + 2 * s, y + 2);
        ctx.fill();
      }
      // Crack with eyes
      if (!rolling) {
        ctx.strokeStyle = '#1a1a24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-2, -2);
        ctx.lineTo(9, -1);
        ctx.stroke();
        enemyEye(ctx, e, 4, -1.5, 1.1, '#b8f0ff');
        enemyEye(ctx, e, 8, -1, 0.9, '#b8f0ff');
      }
      ctx.restore();
      if (!rolling) {
        // Fists
        const lift = e.atkKind === 1 && e.atkPhase === 1 ? -10 * e.telegraph : 0;
        ctx.fillStyle = '#5a5a6a';
        ellipse(ctx, 12, -6 + lift, 4.5, 4.5);
        ctx.fill();
        ellipse(ctx, -11, -5, 4, 4);
        ctx.fill();
      }
    });
  },
};

// ---------------------------------------------------------------- Drowned City

export const sentry: EnemyDef = {
  id: 'sentry', name: 'Drowned Sentry', region: 'dc', category: 'melee',
  hp: 20, dmg: 1, w: 12, h: 22, frags: 7, sight: 150, weight: 0.8, stagger: 4, color: '#7fb8c8', pitch: 0.85,
  role: 'Spear-wielder that thrusts from long range, then hops back.', weakness: 'Its spear is long but slow to retract. Dash inside its reach.',
  lore: 'The city watch never received the order to stand down. They hold their posts beneath forty feet of water.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 22, chase: 50, range: 56, cooldown: 1.2, keep: 46,
      attack: (en, d) => {
        const ph = en.atk(d, 0.5, 0.18, 0.45);
        if (ph === 2) {
          if (en.atkEnter) en.body.vx = en.facing * 80;
          en.strike(en.frontRect(46, 6, 8));
        }
        if (ph === 3 && en.atkEnter && en.body.onGround) {
          en.body.vx = -en.facing * 140;
          en.body.vy = -140;
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 2, 6, -7, 7, walkPhase(e), '#1a2a30', 2);
      ctx.fillStyle = '#2a4450';
      ctx.fillRect(-5, -16, 10, 10);
      ctx.fillStyle = '#3a5a68';
      ctx.fillRect(-5, -17, 10, 2);
      // Helm
      ctx.fillStyle = '#4a6a78';
      ctx.beginPath();
      ctx.arc(0, -19, 4.5, Math.PI, 0);
      ctx.lineTo(4.5, -16);
      ctx.lineTo(-4.5, -16);
      ctx.fill();
      ctx.fillStyle = '#0a1418';
      ctx.fillRect(0.5, -19, 4, 1.4);
      enemyEye(ctx, e, 3, -18.4, 0.6, '#9fe8ff');
      // Seaweed
      ctx.strokeStyle = '#3a6a4a';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-3, -22);
      ctx.quadraticCurveTo(-5, -18, -4 + Math.sin(e.t * 2), -12);
      ctx.stroke();
      // Spear
      const thrust = e.atkPhase === 2 ? 22 : e.atkPhase === 1 ? -4 * e.telegraph : 0;
      ctx.strokeStyle = '#6a5a48';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-8 + thrust, -12);
      ctx.lineTo(20 + thrust, -12);
      ctx.stroke();
      ctx.fillStyle = '#c8d8e0';
      ctx.beginPath();
      ctx.moveTo(20 + thrust, -14);
      ctx.lineTo(26 + thrust, -12);
      ctx.lineTo(20 + thrust, -10);
      ctx.fill();
    });
  },
};

export const imp: EnemyDef = {
  id: 'imp', name: 'Tolling Imp', region: 'dc', category: 'flying',
  hp: 10, dmg: 1, w: 10, h: 10, frags: 4, sight: 170, weight: 1.4, stagger: 2, flying: true, color: '#c8b070', pitch: 1.8,
  role: 'Winged pest that rings a bell, scattering bolts of sound.', weakness: 'The bell must shake before it rings. Strike it mid-shake.',
  lore: 'Bell-imps lived in the towers and rang the hours. Since the bells stopped, they ring their own small bells at nothing.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 75, keep: 70, range: 140, cooldown: 2.2, above: 50,
      attack: (en, d) => {
        const ph = en.atk(d, 0.6, 0.1, 0.4);
        en.body.vx *= 0.88;
        en.body.vy *= 0.88;
        if (ph === 2 && en.atkEnter) {
          const off = fxRng.next() * TAU;
          for (let i = 0; i < 8; i++) {
            const a = off + (i / 8) * TAU;
            en.world.spawnProjectile('orb', en.cx, en.cy, Math.cos(a) * 95, Math.sin(a) * 95, { r: 3, life: 2, color: '#ffe7a0' });
          }
          sfx('bell', en.cx, en.cy, 0.5, 2.2);
          en.world.fx.ring(en.cx, en.cy, 3, 30, 0.3, '#ffe7a0');
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    ctx.save();
    ctx.translate(e.cx, e.cy);
    ctx.scale(e.facing, 1);
    const flap = Math.sin(e.t * 26);
    ctx.fillStyle = '#4a3a3a';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -1);
      ctx.lineTo(s * 8, -5 - flap * 3);
      ctx.lineTo(s * 6, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#6a4a4a';
    ellipse(ctx, 0, 0, 3.5, 4);
    ctx.fill();
    // Horns? No — long drooping ears
    ctx.fillStyle = '#5a3a3a';
    ellipse(ctx, -2, -4, 1, 3, -0.6);
    ctx.fill();
    enemyEye(ctx, e, 1.5, -1, 0.8, '#ffe070');
    // Bell
    const shake = e.atkPhase === 1 ? Math.sin(e.t * 50) * 0.6 : Math.sin(e.t * 3) * 0.2;
    ctx.save();
    ctx.translate(3, 4);
    ctx.rotate(shake);
    ctx.fillStyle = '#c8a050';
    ctx.beginPath();
    ctx.moveTo(-1, 0);
    ctx.lineTo(-2.5, 4);
    ctx.lineTo(2.5, 4);
    ctx.lineTo(1, 0);
    ctx.fill();
    ctx.restore();
    ctx.restore();
  },
};

function inWater(e: Enemy, x: number, y: number): boolean {
  return e.world.grid.liquidAt(x, y) === T.Water;
}

export const eel: EnemyDef = {
  id: 'eel', name: 'Gloom Eel', region: 'dc', category: 'ambush',
  hp: 14, dmg: 1, w: 18, h: 8, frags: 6, sight: 140, weight: 1, stagger: 3, flying: true, aquatic: true, color: '#5aa8a0', pitch: 0.7,
  role: 'Coils in black water and lunges at anything that swims or wades too near.', weakness: 'After a lunge it drifts, stunned by its own speed.',
  lore: 'Its lure glows like a lantern seen from far away. Many travellers swam toward it, hoping for a village.',
  think(e, dt) {
    const b = e.body;
    const wet = inWater(e, e.cx, e.cy);
    if (!wet) {
      b.vy = Math.min(b.vy + 900 * dt, 400);
      b.vx *= 0.99;
      return;
    }
    const p = e.p;
    const playerNear = e.distToPlayer() < e.def.sight && e.world.lineOfSight(e.cx, e.cy, p.cx, p.cy);
    if (e.state === 'attack') {
      const ph = e.atk(dt, 0.45, 0.35, 0.6);
      if (ph === 1) {
        b.vx *= 0.9;
        b.vy *= 0.9;
        e.facePlayer();
      } else if (ph === 2 && e.atkEnter) {
        const a = Math.atan2(p.cy - e.cy, p.cx - e.cx);
        b.vx = Math.cos(a) * 260;
        b.vy = Math.sin(a) * 260;
      } else if (ph === 3) {
        b.vx *= 0.95;
        b.vy *= 0.95;
      }
      if (ph === 4) {
        e.cd = e.cooldown(1.4);
        e.setState('patrol');
      }
      return;
    }
    if (playerNear && e.cd <= 0) {
      if (e.state !== 'chase') alert(e);
      e.setState('attack');
      return;
    }
    // Patrol within water: swim in an S-curve, turning when leaving water.
    const tx = e.cx + e.facing * 12;
    if (!inWater(e, tx, e.cy) || e.wallAhead(e.facing)) e.facing = -e.facing;
    b.vx += (e.facing * 50 - b.vx) * dt * 2;
    b.vy = Math.sin(e.t * 1.8) * 22;
    if (!inWater(e, e.cx, e.cy - 8)) b.vy = Math.abs(b.vy);
  },
  draw(ctx, e) {
    const segs = 7;
    ctx.save();
    ctx.lineCap = 'round';
    const dir = sign(e.body.vx) || e.facing;
    for (let i = segs - 1; i >= 0; i--) {
      const u = i / segs;
      const x = e.cx - dir * u * 18;
      const y = e.cy + Math.sin(e.t * 8 - u * 5) * 2.5 * u;
      fillCircle(ctx, x, y, 3.6 - u * 2.2, i === 0 ? '#2a4a48' : '#1e3a3a');
    }
    enemyEye(ctx, e, e.cx + dir * 2, e.cy - 1, 0.8, '#d0fff0');
    // Lure
    const lx = e.cx + dir * 6;
    const ly = e.cy - 7;
    ctx.strokeStyle = '#2a4a48';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(e.cx + dir * 2, e.cy - 3);
    ctx.quadraticCurveTo(e.cx + dir * 4, e.cy - 9, lx, ly);
    ctx.stroke();
    glow(ctx, lx, ly, 12, '#9fffe0', 0.8);
    fillCircle(ctx, lx, ly, 1.2, '#e0fff8');
    ctx.restore();
  },
};

export const hound: EnemyDef = {
  id: 'hound', name: 'Clockwork Hound', region: 'dc', category: 'melee',
  hp: 16, dmg: 1, w: 16, h: 11, frags: 6, sight: 170, weight: 1, stagger: 3, color: '#c8a870', pitch: 1.2,
  role: 'Relentless runner that pounces from a crouch.', weakness: 'Its pounce is committed. Step aside and strike it as it lands.',
  lore: 'Wound up by the city watch to fetch the drowned. Its key still turns, very slowly.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 40, chase: 115, range: 90, cooldown: 1.1, yRange: 60,
      attack: (en, d) => {
        const ph = en.atk(d, 0.35, 0.5, 0.3);
        if (ph === 1) en.body.vx *= 0.8;
        if (ph === 2) {
          if (en.atkEnter && en.body.onGround) {
            const dx = en.p.cx - en.cx;
            en.body.vx = clamp(dx * 2.2, -230, 230);
            en.body.vy = -300;
            sfx('jump', en.cx, en.cy, 0.4, 1.4);
          }
          if (en.atkT > en.tele(0.35) + 0.08 && en.body.onGround) en.atkT = en.tele(0.35) + 0.5;
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const crouch = e.atkPhase === 1 ? 2 * e.telegraph : 0;
      legs(ctx, 4, 12, -4 + crouch, 4, walkPhase(e) * 1.5, '#4a3a2a', 1.4);
      ctx.fillStyle = '#8a6a40';
      ctx.beginPath();
      ctx.moveTo(-8, -4 + crouch);
      ctx.lineTo(-6, -9 + crouch);
      ctx.lineTo(5, -9 + crouch);
      ctx.lineTo(7, -5 + crouch);
      ctx.closePath();
      ctx.fill();
      // Head
      ctx.fillStyle = '#9a7a4a';
      ctx.beginPath();
      ctx.moveTo(5, -9 + crouch);
      ctx.lineTo(11, -9 + crouch);
      ctx.lineTo(12, -6 + crouch);
      ctx.lineTo(6, -5 + crouch);
      ctx.fill();
      enemyEye(ctx, e, 9, -8 + crouch, 0.7, '#ffcf6a');
      // Gear and wind-up key
      ctx.save();
      ctx.translate(-1, -6.5 + crouch);
      ctx.rotate(e.t * 3);
      ctx.strokeStyle = '#d8b880';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(0, 0, 2, 0, TAU);
      ctx.stroke();
      ctx.restore();
      ctx.save();
      ctx.translate(-2, -10 + crouch);
      ctx.rotate(e.t * 0.5);
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(-0.5, -3, 1, 3);
      ctx.fillRect(-2, -4, 4, 1.4);
      ctx.restore();
    });
  },
};

// ---------------------------------------------------------------- Ashen Foundry

export const drone: EnemyDef = {
  id: 'drone', name: 'Cinder Drone', region: 'af', category: 'flying',
  hp: 12, dmg: 1, w: 12, h: 10, frags: 5, sight: 190, weight: 1.2, stagger: 3, flying: true, color: '#ff9a50', pitch: 1.3,
  role: 'Hovers high and drops burning cinders.', weakness: 'An upward strike or a lance knocks it out of the air.',
  lore: 'Built to carry coals between furnaces. It has decided you are a furnace that needs feeding.',
  think(e, dt) {
    flyBrain(e, dt, {
      speed: 80, keep: 30, range: 160, cooldown: 1.4, above: 80,
      attack: (en, d) => {
        const ph = en.atk(d, 0.4, 0.1, 0.3);
        if (ph === 2 && en.atkEnter) {
          en.world.spawnProjectile('fire', en.cx, en.bottom, en.body.vx * 0.5, 30, { r: 4, grav: 500, life: 3, explode: 22 });
          sfx('enemy_shoot', en.cx, en.cy, 0.5, 0.9);
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    ctx.save();
    ctx.translate(e.cx, e.cy);
    ctx.fillStyle = '#3a2a24';
    ctx.fillRect(-5, -3, 10, 7);
    ctx.fillStyle = '#5a4034';
    ctx.fillRect(-6, -4, 12, 2);
    // Rotors
    const r = Math.sin(e.t * 50) * 6;
    ctx.strokeStyle = 'rgba(200,180,160,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(-6 - r, -6);
    ctx.lineTo(-6 + r, -6);
    ctx.moveTo(6 - r, -6);
    ctx.lineTo(6 + r, -6);
    ctx.stroke();
    ctx.fillStyle = '#2a2020';
    ctx.fillRect(-6.5, -6, 1, 3);
    ctx.fillRect(5.5, -6, 1, 3);
    const heat = e.telegraph > 0 ? 1 : 0.6;
    ctx.fillStyle = `rgba(255,${140 + 60 * heat},60,1)`;
    ctx.fillRect(-3, 1, 6, 2);
    glow(ctx, 0, 3, 12, '#ff8a40', heat * 0.8);
    ctx.restore();
  },
};

export const brute: EnemyDef = {
  id: 'brute', name: 'Slag Brute', region: 'af', category: 'armored',
  hp: 46, dmg: 1, w: 22, h: 26, frags: 16, sight: 150, weight: 0.25, stagger: 6, armor: 'top', color: '#ff8a40', pitch: 0.5,
  role: 'Hulking smelter. Pounds the ground into rolling waves of slag.', weakness: 'Its back is soft. Jump the waves and strike from behind.',
  lore: 'A worker who fell into a vat of slag and climbed out still working.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 14, chase: 32, range: 90, cooldown: 1.8, recover: 0.6,
      attack: (en, d) => {
        if (en.atkKind === 0) en.atkKind = Math.abs(en.dxToPlayer()) < 36 ? 2 : 1;
        if (en.atkKind === 1) {
          const ph = en.atk(d, 0.75, 0.1, 0.7);
          if (ph === 2 && en.atkEnter) {
            for (const s of [-1, 1]) en.world.spawnProjectile('wave', en.cx + s * 14, en.bottom - 4, s * 170, 0, { r: 7, life: 1.8, color: '#ff9a50' });
            en.world.camera.shake(0.45, 0.15);
            en.world.fx.embers(en.cx, en.bottom, 12);
            sfx('boss_slam', en.cx, en.cy, 0.7, 0.9);
          }
          if (ph === 4) en.atkKind = 0;
          return ph === 4;
        }
        const ph = en.atk(d, 0.5, 0.15, 0.5);
        if (ph === 2) en.strike(en.frontRect(26, 22, 2));
        if (ph === 4) en.atkKind = 0;
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      legs(ctx, 2, 12, -8, 8, walkPhase(e), '#2a1a14', 3.5);
      ctx.fillStyle = '#3a2620';
      blob(ctx, [-10, -6, -11, -20, -3, -27, 8, -24, 11, -14, 9, -5]);
      ctx.fill();
      // Glowing cracks
      ctx.strokeStyle = '#ff9a50';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(-2, -16);
      ctx.lineTo(-4, -22);
      ctx.moveTo(3, -9);
      ctx.lineTo(6, -18);
      ctx.stroke();
      glow(ctx, 0, -15, 16, '#ff8a40', 0.4 + e.telegraph * 0.4);
      enemyEye(ctx, e, 6, -21, 1.2, '#ffd070');
      // Fists raised during ground pound
      const lift = e.atkKind === 1 && e.atkPhase === 1 ? -14 * e.telegraph : e.atkKind === 2 && e.atkPhase === 2 ? 0 : -2;
      ctx.fillStyle = '#4a2a20';
      ellipse(ctx, 11, -12 + lift, 5, 5);
      ctx.fill();
      ellipse(ctx, -11, -12 + lift, 4.5, 4.5);
      ctx.fill();
    });
  },
};

export const spitter: EnemyDef = {
  id: 'spitter', name: 'Ember Spitter', region: 'af', category: 'environmental',
  hp: 18, dmg: 1, w: 14, h: 14, frags: 5, sight: 200, weight: 0, stagger: 99, color: '#ffb060', pitch: 0.8,
  role: 'Fixed gargoyle-vent that spits fireballs at anything it sees.', weakness: 'Stay out of its sight line, or silence it at close range.',
  lore: 'An exhaust vent carved in the Archon\'s likeness. It still breathes fire on his behalf.',
  init(e) {
    e.ignoreGravity = true;
  },
  think(e, dt) {
    e.body.vx = 0;
    e.body.vy = 0;
    e.facePlayer();
    if (e.state === 'attack') {
      const ph = e.atk(dt, 0.55, 0.1, 0.4);
      if (ph === 2 && e.atkEnter) {
        const a = Math.atan2(e.p.cy - e.cy, e.p.cx - e.cx);
        e.world.spawnProjectile('fire', e.cx + Math.cos(a) * 8, e.cy + Math.sin(a) * 8, Math.cos(a) * 150, Math.sin(a) * 150, { r: 4.5, life: 2.5 });
        sfx('enemy_shoot', e.cx, e.cy, 0.6, 0.7);
      }
      if (ph === 4) {
        e.cd = e.cooldown(1.8);
        e.setState('idle');
      }
      return;
    }
    if (e.cd <= 0 && e.sees()) {
      if (e.state === 'idle') e.alertMark = 0.4;
      e.setState('attack');
    }
  },
  draw(ctx, e) {
    ctx.save();
    ctx.translate(e.cx, e.cy);
    ctx.fillStyle = '#2a2220';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4a3a34';
    ctx.beginPath();
    ctx.arc(0, -1, 6, Math.PI, 0);
    ctx.fill();
    // Brow ridges, like a stern face
    ctx.fillStyle = '#1a1414';
    ctx.fillRect(-5, -3, 4, 1.4);
    ctx.fillRect(1, -3, 4, 1.4);
    enemyEye(ctx, e, -3, -1, 0.8, '#ffb060');
    enemyEye(ctx, e, 3, -1, 0.8, '#ffb060');
    const mouth = 1 + e.telegraph * 2.5;
    ctx.fillStyle = '#ff9040';
    ellipse(ctx, 0, 3, 3, mouth);
    ctx.fill();
    glow(ctx, 0, 3, 10 + e.telegraph * 8, '#ff8a40', 0.5 + e.telegraph * 0.5);
    ctx.restore();
  },
};

void blob;
export const MID: EnemyDef[] = [prismMite, wisp, geode, sentry, imp, eel, hound, drone, brute, spitter];
