/** Movement tuning. Units: px, seconds. Tile = 16px. */
export const P = {
  W: 10,
  H: 22,
  RUN: 142,
  ACC_GROUND: 1700,
  DEC_GROUND: 2300,
  ACC_AIR: 1150,
  DEC_AIR: 800,
  GRAVITY: 1450,
  APEX_GRAVITY_MULT: 0.55,
  APEX_THRESHOLD: 70,
  JUMP_V: 432,
  JUMP_CUT: 0.42,
  MAX_FALL: 470,
  FAST_FALL: 640,
  COYOTE: 0.1,
  BUFFER: 0.13,
  DASH_SPEED: 390,
  DASH_TIME: 0.165,
  WALL_SLIDE: 70,
  WALL_CLIMB: 64,
  WALL_STAMINA: 0.9,
  WALL_JUMP_X: 200,
  WALL_JUMP_V: 410,
  WALL_JUMP_LOCK: 0.13,
  GLIDE_SPEED: 168,
  SWIM_SPEED: 112,
  SHALLOW_MULT: 0.78,
  GRAPPLE_RANGE: 150,
  GRAPPLE_SPEED: 430,
  DROP_SPEED: 720,
  STEP_TIME: 0.09,
  STEP_COOLDOWN: 0.55,
  HURT_TIME: 0.22,
  IFRAMES: 1.05,
  CHARGE_DELAY: 0.22,
  LEDGE_REACH: 9,
};

export interface AttackSpec {
  startup: number;
  active: number;
  recovery: number;
  w: number;
  h: number;
  ox: number;
  oy: number;
  mult: number;
  knock: number;
  stagger: number;
  hitstop: number;
}

export const ATTACKS: Record<'side' | 'up' | 'down' | 'charged' | 'air', AttackSpec> = {
  side: { startup: 0.035, active: 0.085, recovery: 0.15, w: 30, h: 22, ox: 4, oy: -2, mult: 1, knock: 1, stagger: 1, hitstop: 0.045 },
  air: { startup: 0.03, active: 0.09, recovery: 0.13, w: 30, h: 26, ox: 3, oy: -2, mult: 1, knock: 0.8, stagger: 1, hitstop: 0.045 },
  up: { startup: 0.035, active: 0.09, recovery: 0.15, w: 26, h: 30, ox: 0, oy: -26, mult: 1, knock: 0.6, stagger: 1, hitstop: 0.045 },
  down: { startup: 0.03, active: 0.11, recovery: 0.12, w: 22, h: 28, ox: 0, oy: 18, mult: 1, knock: 0.4, stagger: 1, hitstop: 0.045 },
  charged: { startup: 0.07, active: 0.12, recovery: 0.3, w: 52, h: 38, ox: 0, oy: -10, mult: 2.6, knock: 2.6, stagger: 4, hitstop: 0.11 },
};
