import { sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { sign } from '../core/math';
import type { Enemy } from './Enemy';

export interface GroundOpts {
  patrol: number;
  chase: number;
  range: number;
  cooldown: number;
  /** Runs the attack; return true when finished. */
  attack: (e: Enemy, dt: number) => boolean;
  patrolRange?: number;
  /** Preferred horizontal distance to keep (ranged walkers). */
  keep?: number;
  recover?: number;
  /** Vertical tolerance for attacking. */
  yRange?: number;
  idleTime?: number;
}

/** Shared ground walker brain implementing the full behaviour state machine. */
export function groundBrain(e: Enemy, dt: number, o: GroundOpts): void {
  const b = e.body;
  const p = e.p;
  switch (e.state) {
    case 'idle':
      e.walk(0, 0, dt);
      if (e.stateT > (o.idleTime ?? 1.2) + fxRng.next() * 0.02) e.setState('patrol');
      if (e.sees()) alert(e);
      break;
    case 'patrol': {
      const range = o.patrolRange ?? 80;
      if (Math.abs(e.cx - e.home.x) > range && sign(e.home.x - e.cx) !== e.facing) e.facing = sign(e.home.x - e.cx);
      if (!e.walk(e.facing, o.patrol, dt)) {
        e.facing = -e.facing;
        e.setState('idle');
      }
      if (e.stateT > 3 + fxRng.next()) e.setState('idle');
      if (e.sees()) alert(e);
      break;
    }
    case 'alert':
      e.walk(0, 0, dt);
      e.facePlayer();
      if (e.stateT > 0.32) e.setState('chase');
      break;
    case 'chase': {
      const seen = e.sees(e.def.sight * 1.4);
      if (seen) e.lostT = 0;
      else e.lostT += dt;
      const dx = p.cx - e.cx;
      const adx = Math.abs(dx);
      const dy = Math.abs(p.cy - e.cy);
      let dir = sign(dx);
      if (o.keep !== undefined) {
        if (adx < o.keep - 12) dir = -dir;
        else if (adx < o.keep + 12) dir = 0;
      }
      if (!seen) dir = sign(e.lastSeen.x - e.cx);
      if (dir === 0) {
        e.walk(0, 0, dt);
        e.facePlayer();
      } else if (!e.walk(dir, o.chase, dt) && o.keep !== undefined) e.facePlayer();
      if (seen && e.cd <= 0 && adx < o.range && dy < (o.yRange ?? 40)) {
        e.facePlayer();
        e.setState('attack');
      }
      if (e.lostT > 2.2) e.setState('search');
      break;
    }
    case 'attack':
      if (o.attack(e, dt)) {
        e.cd = e.cooldown(o.cooldown);
        e.telegraph = 0;
        e.setState('recover');
      }
      break;
    case 'recover':
      e.walk(0, 0, dt, 600);
      if (e.stateT > (o.recover ?? 0.35)) e.setState(e.sees(e.def.sight * 1.4) ? 'chase' : 'search');
      break;
    case 'search':
      if (!e.walk(e.facing, o.patrol, dt) || (e.stateT % 1.2 < dt)) e.facing = -e.facing;
      if (e.sees()) alert(e);
      if (e.stateT > 3) e.setState('return');
      break;
    case 'return': {
      const dx = e.home.x - e.cx;
      if (Math.abs(dx) < 6 || !e.walk(sign(dx), o.patrol, dt)) e.setState('idle');
      if (e.sees()) alert(e);
      break;
    }
    case 'stagger':
    case 'hidden':
      break;
  }
  void b;
}

export interface FlyOpts {
  speed: number;
  /** Preferred distance from the player. */
  keep: number;
  range: number;
  cooldown: number;
  attack: (e: Enemy, dt: number) => boolean;
  hoverAmp?: number;
  /** Height above player to hover at. */
  above?: number;
}

/** Shared flyer brain: drift at home, close in to a preferred distance, attack. */
export function flyBrain(e: Enemy, dt: number, o: FlyOpts): void {
  const p = e.p;
  const hover = Math.sin(e.t * 2.2) * (o.hoverAmp ?? 6);
  switch (e.state) {
    case 'idle':
    case 'patrol':
      e.fly(e.home.x + Math.sin(e.t * 0.7) * 30, e.home.y - e.h - 8 + hover, o.speed * 0.4, dt, 200);
      if (e.sees()) alert(e);
      break;
    case 'alert':
      e.body.vx *= 0.9;
      e.body.vy *= 0.9;
      e.facePlayer();
      if (e.stateT > 0.3) e.setState('chase');
      break;
    case 'chase': {
      const seen = e.sees(e.def.sight * 1.5);
      e.lostT = seen ? 0 : e.lostT + dt;
      const ang = Math.atan2(e.cy - p.cy, e.cx - p.cx);
      const tx = p.cx + Math.cos(ang) * o.keep;
      const ty = p.cy - (o.above ?? 24) + Math.sin(ang) * o.keep * 0.3 + hover;
      e.fly(seen ? tx : e.lastSeen.x, seen ? ty : e.lastSeen.y - 20, o.speed, dt);
      if (seen && e.cd <= 0 && e.distToPlayer() < o.range) e.setState('attack');
      if (e.lostT > 2.5) e.setState('return');
      break;
    }
    case 'attack':
      if (o.attack(e, dt)) {
        e.cd = e.cooldown(o.cooldown);
        e.telegraph = 0;
        e.setState('recover');
      }
      break;
    case 'recover':
      e.body.vx *= 0.94;
      e.body.vy *= 0.94;
      if (e.stateT > 0.4) e.setState('chase');
      break;
    case 'search':
    case 'return':
      e.fly(e.home.x, e.home.y - e.h - 8, o.speed * 0.6, dt, 300);
      if (Math.hypot(e.cx - e.home.x, e.cy - (e.home.y - e.h)) < 20) e.setState('idle');
      if (e.sees()) alert(e);
      break;
    default:
      break;
  }
}

export function alert(e: Enemy): void {
  e.setState('alert');
  e.alertMark = 0.5;
  e.facePlayer();
  sfx('enemy_alert', e.cx, e.cy, 0.4, e.def.pitch);
}
