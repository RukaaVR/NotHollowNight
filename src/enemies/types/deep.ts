import type { EnemyDef, Enemy } from '../Enemy';
import { groundBrain, alert } from '../ai';
import { pose, legs, enemyEye, walkPhase, fillCircle } from '../kit';
import { sfx } from '../../core/events';
import { fxRng } from '../../core/rng';
import { glow, ellipse, blob } from '../../rendering/draw';
import { TAU, clamp, sign } from '../../core/math';
import { TILE } from '../../world/tiles';
import { PK } from '../../vfx/Particles';
import { moveX } from '../../world/physics';

// ---------------------------------------------------------------- Veiled Garden

export const maiden: EnemyDef = {
  id: 'maiden', name: 'Petal Maiden', region: 'vg', category: 'melee',
  hp: 22, dmg: 1, w: 12, h: 24, frags: 9, sight: 170, weight: 0.9, stagger: 4, color: '#ffc8e8', pitch: 1.4,
  role: 'A dancer who cuts through you and leaves blades of petals in her wake.', weakness: 'Her dash ends in a curtsey. Strike then.',
  lore: 'The Queen\'s handmaidens danced in the garden every evening. Nobody told them to stop.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 26, chase: 55, range: 110, cooldown: 1.6, recover: 0.7,
      attack: (en, d) => {
        const ph = en.atk(d, 0.45, 0.32, 0.6);
        if (ph === 2) {
          if (en.atkEnter) sfx('dash', en.cx, en.cy, 0.6, 1.3);
          en.body.vx = en.facing * 280;
          if (fxRng.next() < 0.5) en.world.spawnProjectile('petal', en.cx, en.cy, 0, -5, { r: 3, life: 1.1, wall: false });
          en.strike({ x: en.x, y: en.y + 4, w: en.w, h: en.h - 4 });
          if (en.wallAhead(en.facing) || !en.safeAhead(en.facing)) en.body.vx = 0;
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      const spin = e.atkPhase === 2 ? e.t * 30 : Math.sin(e.t * 2) * 0.2;
      // Petal skirt
      ctx.save();
      ctx.translate(0, -7);
      for (let i = 0; i < 7; i++) {
        ctx.rotate(TAU / 7);
        ctx.fillStyle = i % 2 ? '#f4c8e0' : '#e0a8c8';
        ctx.beginPath();
        ctx.ellipse(0, 4 + Math.sin(spin + i) * 0.5, 2.2, 5, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = '#3a2a3a';
      ctx.fillRect(-1.5, -18, 3, 10);
      fillCircle(ctx, 0, -20, 3, '#f0e0e8');
      enemyEye(ctx, e, 1.5, -20.5, 0.6, '#c84a8a');
      // Veil
      ctx.fillStyle = 'rgba(255,230,245,0.5)';
      ctx.beginPath();
      ctx.moveTo(-3, -23);
      ctx.quadraticCurveTo(-8, -16, -6 + Math.sin(e.t * 3), -8);
      ctx.lineTo(-1, -20);
      ctx.fill();
      // Blade arm
      ctx.strokeStyle = '#f8f0ff';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(1, -15);
      ctx.lineTo(10, e.atkPhase === 2 ? -15 : -10);
      ctx.stroke();
    });
  },
};

export const topiary: EnemyDef = {
  id: 'topiary', name: 'Topiary Beast', region: 'vg', category: 'ambush',
  hp: 30, dmg: 1, w: 22, h: 18, frags: 11, sight: 140, weight: 0.5, stagger: 5, color: '#6aa86a', pitch: 0.7,
  role: 'Disguised as a hedge, it bursts into a charge when you pass.', weakness: 'Its charge cannot turn. Leap over and strike its flank.',
  lore: 'Clipped into the shape of a royal hound, it grew teeth to match.',
  init(e) {
    e.hidden = true;
    e.setState('hidden');
  },
  think(e, dt) {
    if (e.state === 'hidden') {
      e.body.vx = 0;
      if (e.distToPlayer() < 72 && e.p.state !== 'dead') {
        e.vars.wake = (e.vars.wake ?? 0) + dt;
        if (fxRng.next() < 0.4) e.world.fx.spawn(PK.Leaf, e.cx + (fxRng.next() - 0.5) * 20, e.y, (fxRng.next() - 0.5) * 40, -40, 1, 2, '#5a8a4a', { grav: 120, vr: 5 });
        if (e.vars.wake > e.tele(0.4)) {
          e.hidden = false;
          alert(e);
        }
      }
      return;
    }
    groundBrain(e, dt, {
      patrol: 24, chase: 50, range: 160, cooldown: 1.6, recover: 0.8,
      attack: (en, d) => {
        const ph = en.atk(d, 0.4, 1.0, 0.5);
        if (ph === 2) {
          en.body.vx = en.facing * 230;
          if (en.wallAhead(en.facing) || !en.safeAhead(en.facing)) {
            en.atkT = 99;
            en.world.camera.shake(0.2, 0.1);
          }
          if (fxRng.next() < 0.4) en.world.fx.spawn(PK.Leaf, en.cx, en.cy, -en.facing * 40, -30, 0.8, 2, '#6a9a5a', { grav: 200, vr: 6 });
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      if (!e.hidden) legs(ctx, 4, 16, -4, 4, walkPhase(e) * 1.4, '#3a2a1a', 1.8);
      ctx.fillStyle = '#3a6a3a';
      blob(ctx, [-11, -2, -11, -12, -4, -18, 5, -17, 11, -10, 10, -2]);
      ctx.fill();
      ctx.fillStyle = '#4a8a4a';
      for (let i = 0; i < 9; i++) fillCircle(ctx, -8 + ((i * 7) % 18), -6 - ((i * 5) % 11), 2.4, '#4a8a4a');
      if (!e.hidden) {
        ctx.fillStyle = '#4a8a4a';
        ellipse(ctx, 11, -11, 5, 4);
        ctx.fill();
        ctx.fillStyle = '#f0f0e0';
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(12 + i * 1.3, -9);
          ctx.lineTo(12.6 + i * 1.3, -7);
          ctx.lineTo(13.2 + i * 1.3, -9);
          ctx.fill();
        }
        enemyEye(ctx, e, 12, -12, 0.9, '#ffe070');
      } else {
        // A few flowers so it reads as a hedge
        fillCircle(ctx, -4, -15, 1.2, '#ffd8f0');
        fillCircle(ctx, 4, -14, 1.2, '#fff0f6');
      }
    });
  },
};

// ---------------------------------------------------------------- Hollow Engine

export const gearwarden: EnemyDef = {
  id: 'gearwarden', name: 'Gearwarden', region: 'he', category: 'armored',
  hp: 30, dmg: 1, w: 18, h: 18, frags: 11, sight: 170, weight: 0.6, stagger: 5, color: '#c0b090', pitch: 0.9,
  role: 'Rolls in as an armoured wheel, then unfolds into whirling blades.', weakness: 'Untouchable while rolling. Strike as it unfolds.',
  lore: 'The Engine\'s maintenance staff. They maintain it by removing anything that is not the Engine.',
  think(e, dt) {
    const rolling = e.state === 'chase' || e.state === 'patrol' || e.state === 'search' || e.state === 'return';
    e.guard = rolling;
    e.guardAll = rolling;
    if (rolling) e.vars.roll = (e.vars.roll ?? 0) + e.body.vx * dt * 0.12;
    groundBrain(e, dt, {
      patrol: 40, chase: 120, range: 36, cooldown: 1.2, recover: 0.8,
      attack: (en, d) => {
        const ph = en.atk(d, 0.45, 0.45, 0.4);
        en.body.vx *= 0.85;
        if (ph === 2) {
          if (en.atkEnter) sfx('swing_heavy', en.cx, en.cy, 0.5, 1.2);
          en.strike({ x: en.cx - 20, y: en.y - 2, w: 40, h: en.h + 2 });
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    const rolling = e.guard;
    ctx.save();
    ctx.translate(e.cx, e.cy);
    if (rolling) {
      ctx.rotate(e.vars.roll ?? 0);
      ctx.strokeStyle = '#8a7a5a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * TAU;
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      }
      ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        ctx.fillStyle = '#a89870';
        ctx.fillRect(Math.cos(a) * 9 - 1, Math.sin(a) * 9 - 1, 2, 2);
      }
      enemyEye(ctx, e, 0, 0, 1.5, '#ffd890');
    } else {
      ctx.scale(e.facing, 1);
      ctx.fillStyle = '#4a4438';
      ctx.fillRect(-5, -6, 10, 14);
      enemyEye(ctx, e, 2, -3, 1.2, '#ffd890');
      const spin = e.atkPhase === 2 ? e.t * 40 : e.atkPhase === 1 ? e.telegraph * 2 : 0;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 6, -1);
        ctx.rotate(spin * s);
        ctx.strokeStyle = '#d8c8a0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-9, 0);
        ctx.lineTo(9, 0);
        ctx.stroke();
        ctx.restore();
      }
      legs(ctx, 2, 6, 8, 3, 0, '#3a3428', 1.6);
    }
    ctx.restore();
  },
};

export const arcNode: EnemyDef = {
  id: 'arc_node', name: 'Arc Node', region: 'he', category: 'environmental',
  hp: 14, dmg: 1, w: 10, h: 18, frags: 4, sight: 0, weight: 0, stagger: 99, color: '#ffe890', pitch: 1.6, noContact: true,
  role: 'Paired pylons that pulse lethal arcs of current between them.', weakness: 'Destroy either pylon to sever the arc.',
  lore: 'The Engine\'s fence. It does not hate you. It does not know you are there.',
  init(e) {
    e.vars.phase = (e.home.x * 0.013) % 3;
  },
  think(e, _dt) {
    e.body.vx = 0;
    // Find partner once (nearest node on a similar row)
    if (e.vars.partnerSearched === undefined) {
      e.vars.partnerSearched = 1;
      let best: Enemy | null = null;
      let bd = 260;
      for (const o of e.world.entities) {
        const en = o as Enemy;
        if (en === e || !en.def || en.def.id !== 'arc_node') continue;
        const d = Math.hypot(en.cx - e.cx, en.cy - e.cy);
        if (d < bd && en.cx > e.cx) {
          bd = d;
          best = en;
        }
      }
      (e as Enemy & { partner?: Enemy | null }).partner = best;
    }
    const partner = (e as Enemy & { partner?: Enemy | null }).partner;
    if (!partner || partner.deathT >= 0 || partner.dead) return;
    const cyc = (e.world.time + e.vars.phase) % 3;
    e.vars.on = cyc > 1.6 ? 1 : 0;
    e.vars.warn = cyc > 1.1 && cyc <= 1.6 ? 1 : 0;
    if (e.vars.on) {
      const p = e.p;
      const ax = e.cx;
      const ay = e.y + 3;
      const bx = partner.cx;
      const by = partner.y + 3;
      const dx = bx - ax;
      const dy = by - ay;
      const len = Math.hypot(dx, dy) || 1;
      const t = clamp(((p.cx - ax) * dx + (p.cy - ay) * dy) / (len * len), 0, 1);
      const qx = ax + dx * t;
      const qy = ay + dy * t;
      if (Math.abs(p.cx - qx) < p.w / 2 + 3 && Math.abs(p.cy - qy) < p.h / 2 + 3) p.hurt(1, qx);
      if (fxRng.next() < 0.3) e.world.fx.sparks(qx, qy, 0, 1, '#fff8c0', 120);
    }
  },
  draw(ctx, e) {
    const partner = (e as Enemy & { partner?: Enemy | null }).partner;
    if (partner && partner.deathT < 0 && !partner.dead && e.deathT < 0 && (e.vars.on || e.vars.warn)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = e.vars.on ? '#fff8c0' : 'rgba(255,200,120,0.35)';
      ctx.lineWidth = e.vars.on ? 2 : 0.6;
      ctx.beginPath();
      const ax = e.cx;
      const ay = e.y + 3;
      const bx = partner.cx;
      const by = partner.y + 3;
      ctx.moveTo(ax, ay);
      const n = 8;
      for (let i = 1; i < n; i++) {
        const u = i / n;
        ctx.lineTo(ax + (bx - ax) * u + (fxRng.next() - 0.5) * (e.vars.on ? 6 : 2), ay + (by - ay) * u + (fxRng.next() - 0.5) * (e.vars.on ? 6 : 2));
      }
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }
    ctx.fillStyle = '#3a3630';
    ctx.fillRect(e.x + 2, e.y + 4, e.w - 4, e.h - 4);
    ctx.fillStyle = '#8a7a50';
    for (let i = 0; i < 4; i++) ctx.fillRect(e.x + 1, e.y + 6 + i * 3, e.w - 2, 1.2);
    fillCircle(ctx, e.cx, e.y + 3, 3, e.vars.on ? '#fff8c0' : e.vars.warn ? '#ffb060' : '#6a5a40');
    if (e.vars.on || e.vars.warn) glow(ctx, e.cx, e.y + 3, 14, '#ffe890', e.vars.on ? 1 : 0.5);
  },
};

// ---------------------------------------------------------------- Abyss

export const maw: EnemyDef = {
  id: 'maw', name: 'Gloam Maw', region: 'ab', category: 'ambush',
  hp: 26, dmg: 1, w: 20, h: 14, frags: 10, sight: 150, weight: 0, stagger: 4, color: '#9a5ae0', pitch: 0.4, corrupt: 25,
  role: 'A mouth in the floor that drags prey toward it.', weakness: 'Dash against the pull, then strike as it bites down.',
  lore: 'The Dreamer\'s hunger, leaking up through the cracks in its sleep.',
  init(e) {
    e.hidden = true;
    e.setState('hidden');
  },
  think(e, dt) {
    e.body.vx = 0;
    if (e.state === 'hidden') {
      if (e.distToPlayer() < 130 && e.cd <= 0 && e.p.state !== 'dead') {
        e.hidden = false;
        e.setState('attack');
        sfx('boss_roar', e.cx, e.cy, 0.3, 1.8);
      }
      return;
    }
    if (e.state === 'attack') {
      const ph = e.atk(dt, 1.1, 0.2, 0.9);
      const p = e.p;
      if (ph === 1 && e.atkT > 0.2) {
        // Vacuum pull
        const dir = sign(e.cx - p.cx);
        if (Math.abs(p.cx - e.cx) > 6 && !e.world.stats.windImmune) moveX(e.world.grid, e.world.solids, p.body, dir * 70 * dt, { phase: !!e.world.progress.abilities.phase, drop: false, openEdges: true });
        if (fxRng.next() < 0.6) {
          const a = fxRng.next() * Math.PI;
          e.world.fx.spawn(PK.Glow, e.cx + Math.cos(a) * 60, e.bottom - Math.sin(a) * 40, -Math.cos(a) * 80, Math.sin(a) * 60, 0.6, 1.5, '#b080ff', { additive: true, size2: 0.2 });
        }
      }
      if (ph === 2) {
        if (e.atkEnter) {
          e.world.camera.shake(0.35, 0.12);
          sfx('boss_slam', e.cx, e.cy, 0.5, 1.6);
        }
        e.strike({ x: e.cx - 18, y: e.bottom - 30, w: 36, h: 30 });
      }
      if (ph === 4) {
        e.cd = e.cooldown(1.8);
        e.hidden = true;
        e.setState('hidden');
      }
    }
  },
  draw(ctx, e) {
    const open = e.state === 'attack' ? (e.atkPhase === 1 ? e.telegraph : e.atkPhase === 2 ? 0.1 : 0.5) : 0;
    ctx.save();
    ctx.translate(e.cx, e.bottom);
    glow(ctx, 0, -2, 20 + open * 20, '#8a4ad0', 0.4 + open * 0.4);
    ctx.fillStyle = '#120818';
    ellipse(ctx, 0, -1, 12, 2 + open * 10);
    ctx.fill();
    // Teeth ring
    ctx.fillStyle = '#e8d8f0';
    for (let i = 0; i < 10; i++) {
      const u = i / 9;
      const x = -11 + u * 22;
      const yTop = -1 - Math.sin(u * Math.PI) * (2 + open * 9);
      ctx.beginPath();
      ctx.moveTo(x - 1.2, yTop);
      ctx.lineTo(x, yTop + 3);
      ctx.lineTo(x + 1.2, yTop);
      ctx.fill();
    }
    if (open > 0.2) fillCircle(ctx, 0, -1 - open * 4, 1.5, '#ff8aff');
    ctx.restore();
  },
};

export const dreamEater: EnemyDef = {
  id: 'dream_eater', name: 'Dream Eater', region: 'ab', category: 'elite',
  hp: 28, dmg: 1, w: 10, h: 22, frags: 12, sight: 200, weight: 0.8, stagger: 4, color: '#b090ff', pitch: 1.0, corrupt: 20,
  role: 'A shadow wearing a stolen shape. It blinks behind you and dashes like you do.', weakness: 'It always reappears behind you. Turn and strike first.',
  lore: 'One of the forty-one who came before. It forgot its name, then its face, then that it was ever a child.',
  think(e, dt) {
    groundBrain(e, dt, {
      patrol: 30, chase: 75, range: 160, cooldown: 1.7, yRange: 80,
      attack: (en, d) => {
        const ph = en.atk(d, 0.4, 0.25, 0.45);
        if (ph === 1 && en.atkEnter) {
          // Blink behind the player
          const p = en.p;
          const nx = clamp(p.cx - p.facing * 36, 8, en.world.grid.pw - 8);
          const g = en.world.grid;
          if (!g.isSolidAt(Math.floor(nx / TILE), Math.floor((p.y + p.h - 4) / TILE))) {
            en.world.fx.burst(en.cx, en.cy, 14, '#8a6ad0', 90, 0.5, 2.5);
            en.body.x = nx - en.w / 2;
            en.body.y = p.y + p.h - en.h;
            en.world.fx.burst(nx, en.cy, 14, '#8a6ad0', 90, 0.5, 2.5);
            sfx('step_shadow', nx, en.cy, 0.6, 0.7);
          }
          en.facePlayer();
        }
        if (ph === 2) {
          if (en.atkEnter) sfx('dash', en.cx, en.cy, 0.5, 0.7);
          en.body.vx = en.facing * 300;
          en.strike({ x: en.x - 4, y: en.y, w: en.w + 8, h: en.h });
          if (fxRng.next() < 0.7) en.world.fx.spawn(PK.Glow, en.cx, en.cy + (fxRng.next() - 0.5) * 16, -en.facing * 30, 0, 0.4, 2, '#6a4aa0', { additive: true });
        }
        return ph === 4;
      },
    });
  },
  draw(ctx, e) {
    pose(ctx, e, () => {
      // An inverted echo of Aeren's silhouette: dark mask, pale void cloak.
      ctx.fillStyle = 'rgba(20,10,30,0.92)';
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-7, -10, -3, -16);
      ctx.lineTo(3, -16);
      ctx.quadraticCurveTo(7, -10, 6, 0);
      for (let i = 0; i < 4; i++) ctx.lineTo(6 - i * 4, Math.sin(e.t * 5 + i) * 1.5);
      ctx.fill();
      // Hood, its tip trailing backward
      ctx.beginPath();
      ctx.moveTo(-4, -16);
      ctx.quadraticCurveTo(0, -23, 4, -16);
      ctx.quadraticCurveTo(-4, -20, -11 + Math.sin(e.t * 3), -17);
      ctx.closePath();
      ctx.fill();
      // Black mask with violet slit
      ctx.fillStyle = '#05020a';
      ellipse(ctx, 1.5, -15, 3, 3.4);
      ctx.fill();
      ctx.strokeStyle = '#d0a8ff';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(2.5, -17);
      ctx.lineTo(2.5, -13);
      ctx.stroke();
      glow(ctx, 2.5, -15, 8, '#b090ff', 0.6 + e.telegraph * 0.6);
    });
  },
};

void blob;
export const DEEP: EnemyDef[] = [maiden, topiary, gearwarden, arcNode, maw, dreamEater];
