import { approach, clamp, dist, sign } from '../core/math';
import { events, sfx } from '../core/events';
import { fxRng } from '../core/rng';
import { makeBody, moveX, moveY, rectBlocked, stepBody, touchingWall, type Body, type MoveOpts } from '../world/physics';
import { T, TILE } from '../world/tiles';
import { ATTACKS, P, type AttackSpec } from './constants';
import { newHitId, playerStrike } from '../combat/combat';
import { PK } from '../vfx/Particles';
import type { GameWorld } from '../world/GameWorld';
import type { Entity } from '../world/Entity';
import { ScarfChain } from './Scarf';

export type PState =
  | 'normal' | 'dash' | 'step' | 'mend' | 'hurt' | 'wall' | 'ledge' | 'climb'
  | 'swim' | 'grapple' | 'drop' | 'dead' | 'locked' | 'rest' | 'kneel';

export type AttackKind = 'side' | 'up' | 'down' | 'charged' | 'air';

export class Player {
  readonly body: Body;
  state: PState = 'normal';
  stateT = 0;
  facing = 1;
  vigor = 5;
  aether = 0;
  shield = 0;
  shieldTimer = 0;
  iframes = 0;
  poison = 0;
  corruption = 0;
  gloamed = false;

  // movement timers
  coyote = 0;
  jumpBuffer = 0;
  jumping = false;
  dashCd = 0;
  airDash = true;
  airStep = true;
  stepCd = 0;
  dashDir = 1;
  dashT = 0;
  wallDir = 0;
  wallStamina = P.WALL_STAMINA;
  wallJumpLock = 0;
  detachT = 0;
  ledgeDir = 0;
  ledgeY = 0;
  gliding = false;
  dropThrough = 0;
  grappleTarget: Entity | null = null;
  landLag = 0;
  lookT = 0;
  lookDir = 0;
  fallPeak = 0;
  wasGround = true;
  inShallow = false;
  inWater = false;
  stepping = false;

  // combat
  atkKind: AttackKind | null = null;
  atkT = 0;
  atkSpec: AttackSpec = ATTACKS.side;
  atkHitId = 0;
  atkConnected = false;
  atkCooldown = 0;
  atkBuffer = 0;
  atkHoldT = 0;
  chargeT = 0;
  chargeReady = false;
  combo = 0;
  mendT = 0;
  leechCount = 0;
  tollCount = 0;
  artCd = 0;
  emberT = 0;

  // presentation
  squashX = 1;
  squashY = 1;
  runPhase = 0;
  flashT = 0;
  deathT = 0;
  afterT = 0;
  readonly scarf = new ScarfChain(8, 3.2);
  lastSafe = { x: 0, y: 0 };
  private safeT = 0;
  stepTrail: { x: number; y: number; a: number }[] = [];
  /** Remaining invulnerability after a hazard respawn fade. */
  hazardFade = 0;
  private hazardPending = false;

  constructor(private world: GameWorld) {
    this.body = makeBody(0, 0, P.W, P.H);
  }

  get x(): number { return this.body.x; }
  get y(): number { return this.body.y; }
  get w(): number { return this.body.w; }
  get h(): number { return this.body.h; }
  get cx(): number { return this.body.x + this.body.w / 2; }
  get cy(): number { return this.body.y + this.body.h / 2; }
  get onGround(): boolean { return this.body.onGround; }

  /** Place the player with feet at (fx, fy). */
  placeAt(fx: number, fy: number): void {
    this.body.x = fx - P.W / 2;
    this.body.y = fy - P.H;
    this.body.vx = 0;
    this.body.vy = 0;
    this.lastSafe.x = fx;
    this.lastSafe.y = fy;
    this.scarf.reset(this.cx, this.body.y + 7);
  }

  private get ab(): Record<string, boolean> {
    return this.world.progress.abilities;
  }

  private moveOpts(): MoveOpts {
    return { phase: !!this.ab.phase, drop: this.dropThrough > 0, openEdges: true };
  }

  setState(s: PState): void {
    if (this.state === s) return;
    this.state = s;
    this.stateT = 0;
  }

  canAct(): boolean {
    return this.state !== 'dead' && this.state !== 'locked' && this.state !== 'rest' && this.state !== 'kneel';
  }

  // ------------------------------------------------------------------
  update(dt: number): void {
    const w = this.world;
    const inp = w.input;
    const b = this.body;
    this.stateT += dt;
    this.iframes = Math.max(0, this.iframes - dt);
    this.coyote = Math.max(0, this.coyote - dt);
    this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
    this.dashCd = Math.max(0, this.dashCd - dt);
    this.stepCd = Math.max(0, this.stepCd - dt);
    this.wallJumpLock = Math.max(0, this.wallJumpLock - dt);
    this.dropThrough = Math.max(0, this.dropThrough - dt);
    this.atkCooldown = Math.max(0, this.atkCooldown - dt);
    this.atkBuffer = Math.max(0, this.atkBuffer - dt);
    this.landLag = Math.max(0, this.landLag - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    this.artCd = Math.max(0, this.artCd - dt);
    this.hazardFade = Math.max(0, this.hazardFade - dt);
    if (this.poison > 0) {
      this.poison -= dt;
      this.aether = Math.max(0, this.aether - 6 * dt);
      if (fxRng.next() < 0.2) w.fx.spawn(PK.Glow, this.cx + (fxRng.next() - 0.5) * 8, this.cy, 0, -20, 0.6, 1.5, '#9be36a', { additive: true });
    }
    if (w.stats.has.has('warding_lantern') && this.shield === 0) {
      this.shieldTimer -= dt;
      if (this.shieldTimer <= 0) {
        this.shield = 1;
        sfx('shield', this.cx, this.cy, 0.5);
      }
    }
    if (w.stats.has.has('aether_font') && this.state !== 'dead') this.gainAether(1.6 * dt, true);

    if (this.hazardPending) {
      if (this.stateT > 0.32) this.finishHazardRespawn();
      this.updatePresentation(dt);
      return;
    }

    if (this.state === 'dead') {
      this.deathT += dt;
      b.vx = approach(b.vx, 0, 600 * dt);
      b.vy = Math.min(b.vy + P.GRAVITY * 0.5 * dt, P.MAX_FALL);
      stepBody(w.grid, w.solids, b, dt, this.moveOpts());
      this.updatePresentation(dt);
      return;
    }

    const controllable = this.canAct();
    const ax = controllable ? inp.axisX() : 0;
    const ay = controllable ? inp.axisY() : 0;
    if (controllable) {
      if (inp.pressed('jump')) this.jumpBuffer = P.BUFFER;
      if (inp.pressed('attack')) {
        this.atkBuffer = 0.14;
        this.atkHoldT = 0;
      }
    }

    // Liquids
    const liq = w.grid.liquidAt(this.cx, b.y + b.h * 0.45);
    const feetLiq = w.grid.liquidAt(this.cx, b.y + b.h - 2);
    const wasWater = this.inWater;
    this.inWater = liq === T.Water;
    this.inShallow = feetLiq === T.Shallow || (feetLiq === T.Water && !this.inWater);
    if (this.inWater !== wasWater) {
      w.fx.splash(this.cx, b.y + b.h * 0.5, 10);
      sfx('splash', this.cx, this.cy);
    }
    if (this.inWater && this.state !== 'swim' && this.state !== 'hurt' && this.state !== 'locked') {
      if (this.ab.dive) {
        this.setState('swim');
        this.cancelAttack();
        this.gliding = false;
      } else {
        this.hazard('The black water will not let you breathe.');
        this.updatePresentation(dt);
        return;
      }
    }

    switch (this.state) {
      case 'normal': this.updateNormal(dt, ax, ay); break;
      case 'dash': this.updateDash(dt); break;
      case 'step': this.updateStep(dt); break;
      case 'mend': this.updateMend(dt); break;
      case 'hurt':
        b.vy = Math.min(b.vy + P.GRAVITY * dt, P.MAX_FALL);
        b.vx = approach(b.vx, 0, 500 * dt);
        if (this.stateT > P.HURT_TIME) this.setState(this.inWater && this.ab.dive ? 'swim' : 'normal');
        break;
      case 'wall': this.updateWall(dt, ax, ay); break;
      case 'ledge': this.updateLedge(ax, ay); break;
      case 'climb':
        b.vx = 0;
        b.vy = 0;
        if (this.stateT > 0.16) this.finishClimb();
        break;
      case 'swim': this.updateSwim(dt, ax, ay); break;
      case 'grapple': this.updateGrapple(dt); break;
      case 'drop': b.vx = 0; b.vy = P.DROP_SPEED; break;
      case 'locked':
      case 'rest':
      case 'kneel':
        b.vx = approach(b.vx, 0, P.DEC_GROUND * dt);
        b.vy = Math.min(b.vy + P.GRAVITY * dt, P.MAX_FALL);
        break;
    }

    // Integrate
    const wasGround = this.wasGround;
    const prevVy = b.vy;
    if (this.state === 'climb') {
      // no physics while climbing
    } else if (this.state === 'step') {
      // handled in updateStep
    } else {
      if (b.ground && b.ground.active) {
        // Carry with moving platforms
        moveX(w.grid, w.solids, b, b.ground.dx, this.moveOpts());
        moveY(w.grid, w.solids, b, b.ground.dy, this.moveOpts());
      }
      stepBody(w.grid, w.solids, b, dt, this.moveOpts());
      if (!b.onGround && prevVy >= 0 && this.state !== 'swim' && this.state !== 'grapple') {
        // Stay glued to the ground when walking off tiny steps on moving platforms.
        if (wasGround && rectBlocked(w.grid, w.solids, b.x, b.y + b.h, b.w, 3, this.moveOpts()) && this.state === 'normal' && !this.jumping) {
          moveY(w.grid, w.solids, b, 3, this.moveOpts());
        }
      }
      if (b.ground?.onStand) b.ground.onStand();
    }
    this.applyWind(dt);

    // Landing
    if (b.onGround) {
      this.coyote = P.COYOTE;
      this.airDash = true;
      this.airStep = true;
      this.wallStamina = P.WALL_STAMINA;
      this.gliding = false;
      if (!wasGround) this.onLand(prevVy);
    } else if (wasGround && this.state === 'normal' && !this.jumping) {
      this.fallPeak = b.y;
    }
    if (!b.onGround && b.y < this.fallPeak) this.fallPeak = b.y;
    if (b.onGround) this.fallPeak = b.y;
    this.wasGround = b.onGround;

    if (this.state === 'drop' && b.onGround) this.dropImpact();

    this.updateAttack(dt);
    this.checkHazards();
    this.updateSafe(dt);
    this.updatePresentation(dt);
  }

  // ------------------------------------------------------------------
  private updateNormal(dt: number, ax: number, ay: number): void {
    const w = this.world;
    const b = this.body;
    const inp = w.input;
    const st = w.stats;
    const ground = b.onGround;

    // Look up/down
    if (ground && ax === 0 && ay !== 0 && !this.atkKind) {
      this.lookT += dt;
      this.lookDir = this.lookT > 0.4 ? ay : 0;
    } else {
      this.lookT = 0;
      this.lookDir = 0;
    }

    // Horizontal
    let maxSpeed = P.RUN;
    if (this.inShallow) maxSpeed *= P.SHALLOW_MULT;
    if (this.chargeT > 0.05) maxSpeed *= 0.55;
    if (this.landLag > 0) maxSpeed *= 0.4;
    if (this.gliding) maxSpeed = P.GLIDE_SPEED;
    const target = (this.wallJumpLock > 0 ? 0 : ax) * maxSpeed;
    const accel = ground ? (ax !== 0 ? P.ACC_GROUND : P.DEC_GROUND) : (ax !== 0 ? P.ACC_AIR * st.airControl : P.DEC_AIR);
    if (this.wallJumpLock <= 0) b.vx = approach(b.vx, target, accel * dt);
    if (ax !== 0 && this.wallJumpLock <= 0 && !this.atkKind) this.facing = ax;

    // Jump
    if (this.jumpBuffer > 0 && (ground || this.coyote > 0)) {
      this.doJump();
    } else if (this.jumpBuffer > 0 && !ground && this.ab.grip && this.tryWallJumpFromAir()) {
      // handled
    } else if (!ground && this.ab.glide && inp.pressed('jump') && b.vy > -40) {
      this.gliding = true;
      this.jumpBuffer = 0;
      sfx('glide', this.cx, this.cy, 0.6);
    }
    if (this.jumping && !inp.down('jump') && b.vy < 0) {
      b.vy *= P.JUMP_CUT;
      this.jumping = false;
    }
    if (b.vy >= 0) this.jumping = false;
    if (this.gliding && (!inp.down('jump') || ground)) this.gliding = false;

    // Drop through one-way platforms: down + jump
    if (ground && ay > 0 && this.jumpBuffer > 0 && this.standingOnOneWay()) {
      this.dropThrough = 0.2;
      this.jumpBuffer = 0;
      this.coyote = 0;
      b.vy = 60;
    }

    // Gravity
    let g = P.GRAVITY;
    if (this.jumping && inp.down('jump') && Math.abs(b.vy) < P.APEX_THRESHOLD) g *= P.APEX_GRAVITY_MULT;
    let maxFall = P.MAX_FALL;
    if (ay > 0 && b.vy > 0 && !this.gliding) {
      maxFall = P.FAST_FALL;
      g *= 1.25;
    }
    b.vy = Math.min(b.vy + g * dt, maxFall);
    if (this.gliding) {
      b.vy = Math.min(b.vy, st.glideFall);
      if (fxRng.next() < 0.3) w.fx.spawn(PK.Mote, this.cx - this.facing * 6, b.y + 6, -this.facing * 20, 10, 0.5, 1, 'rgba(230,220,190,0.6)');
    }

    // Wall grip
    if (!ground && this.ab.grip && ax !== 0 && b.vy > -60 && this.wallJumpLock <= 0 && touchingWall(w.grid, w.solids, b, ax, this.moveOpts())) {
      this.wallDir = ax;
      this.facing = ax;
      this.setState('wall');
      this.gliding = false;
      this.cancelAttack();
      this.airDash = true;
      this.airStep = true;
      sfx('wallgrab', this.cx, this.cy, 0.5);
      return;
    }

    // Ledge grab
    if (!ground && b.vy >= -30 && ax !== 0 && this.tryLedge(ax)) return;

    if (!this.canAct()) return;

    // Abilities
    if (inp.pressed('dash') && this.ab.dash && this.dashCd <= 0 && (ground || this.airDash)) {
      this.startDash(ax !== 0 ? ax : this.facing);
      return;
    }
    if (inp.pressed('step') && this.ab.step && this.stepCd <= 0 && (ground || this.airStep)) {
      this.startStep(ax !== 0 ? ax : this.facing);
      return;
    }
    if (inp.pressed('grapple') && this.ab.grapple) {
      if (this.tryGrapple()) return;
    }
    if (inp.pressed('art')) {
      if (!ground && ay > 0 && this.ab.drop) {
        this.startDrop();
        return;
      }
      this.tryArt(ay < 0);
    }
    if (inp.pressed('mend') && ground && !this.atkKind) {
      this.tryMend();
      if (this.state === 'mend') return;
    }
    if (inp.pressed('interact') && ground && !this.atkKind && this.chargeT === 0) {
      const target = w.nearestInteractable();
      if (target) {
        b.vx = 0;
        target.interact!();
        return;
      }
    }
  }

  private standingOnOneWay(): boolean {
    const b = this.body;
    const g = this.world.grid;
    const row = Math.floor((b.y + b.h + 1) / TILE);
    const l = Math.floor(b.x / TILE);
    const r = Math.floor((b.x + b.w - 0.01) / TILE);
    let one = false;
    for (let c = l; c <= r; c++) {
      const t = g.tileClamped(c, row);
      if (t === T.OneWay) one = true;
      else if (t === T.Solid || t === T.SolidAlt || t === T.Breakable || t === T.Hidden) return false;
    }
    if (b.ground?.oneWay) one = true;
    return one;
  }

  doJump(): void {
    const b = this.body;
    b.vy = -P.JUMP_V;
    this.jumping = true;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.squashX = 0.72;
    this.squashY = 1.32;
    this.world.fx.dust(this.cx, b.y + b.h, 4);
    sfx('jump', this.cx, this.cy, 0.7);
  }

  private tryWallJumpFromAir(): boolean {
    const b = this.body;
    const w = this.world;
    for (const dir of [-1, 1]) {
      if (rectBlocked(w.grid, w.solids, dir > 0 ? b.x + b.w : b.x - 4, b.y + 2, 4, b.h - 6, this.moveOpts())) {
        this.wallDir = dir;
        this.wallJump();
        return true;
      }
    }
    return false;
  }

  private wallJump(): void {
    const b = this.body;
    b.vx = -this.wallDir * P.WALL_JUMP_X;
    b.vy = -P.WALL_JUMP_V;
    this.facing = -this.wallDir;
    this.wallJumpLock = P.WALL_JUMP_LOCK;
    this.jumping = true;
    this.jumpBuffer = 0;
    this.setState('normal');
    this.squashX = 0.75;
    this.squashY = 1.25;
    this.world.fx.dust(this.wallDir > 0 ? b.x + b.w : b.x, b.y + b.h / 2, 4);
    sfx('walljump', this.cx, this.cy, 0.7);
  }

  private tryLedge(dir: number): boolean {
    const w = this.world;
    const b = this.body;
    const g = w.grid;
    const col = dir > 0 ? Math.floor((b.x + b.w + 1) / TILE) : Math.floor((b.x - 1) / TILE);
    const headRow = Math.floor((b.y + 2) / TILE);
    for (let r = headRow; r <= headRow + 1; r++) {
      const cornerY = r * TILE;
      if (b.y < cornerY - 3 || b.y > cornerY + P.LEDGE_REACH) continue;
      if (!g.isSolidAt(col, r) || g.isSolidAt(col, r - 1) || g.tileClamped(col, r - 1) === T.Spike) continue;
      // Need space above the ledge to stand
      const standX = dir > 0 ? col * TILE + 1 : (col + 1) * TILE - b.w - 1;
      if (rectBlocked(g, w.solids, standX, cornerY - b.h, b.w, b.h, this.moveOpts())) continue;
      // And the player must be flush with the wall
      if (!touchingWall(g, w.solids, b, dir, this.moveOpts())) continue;
      this.ledgeDir = dir;
      this.ledgeY = cornerY;
      b.y = cornerY - 3;
      b.vy = 0;
      b.vx = 0;
      this.facing = dir;
      this.gliding = false;
      this.cancelAttack();
      this.setState('ledge');
      this.airDash = true;
      this.airStep = true;
      sfx('wallgrab', this.cx, this.cy, 0.4);
      return true;
    }
    return false;
  }

  private updateLedge(ax: number, ay: number): void {
    const b = this.body;
    const inp = this.world.input;
    b.vx = 0;
    b.vy = 0;
    if (inp.pressed('jump') || this.jumpBuffer > 0 || (ay < 0 && this.stateT > 0.12) || (ax === this.ledgeDir && this.stateT > 0.18)) {
      this.jumpBuffer = 0;
      this.setState('climb');
      sfx('step', this.cx, this.cy, 0.5);
    } else if (ay > 0 || ax === -this.ledgeDir) {
      this.setState('normal');
      b.vy = 40;
      this.wallJumpLock = 0.08;
    }
  }

  private finishClimb(): void {
    const b = this.body;
    const dir = this.ledgeDir;
    const col = dir > 0 ? Math.floor((b.x + b.w + 1) / TILE) : Math.floor((b.x - 1) / TILE);
    b.x = dir > 0 ? col * TILE + 1 : (col + 1) * TILE - b.w - 1;
    b.y = this.ledgeY - b.h;
    b.vx = dir * 40;
    b.vy = 0;
    this.squashX = 1.2;
    this.squashY = 0.85;
    this.setState('normal');
    this.wasGround = true;
  }

  private updateWall(dt: number, ax: number, ay: number): void {
    const w = this.world;
    const b = this.body;
    const inp = w.input;
    b.vx = this.wallDir * 20;
    if (!touchingWall(w.grid, w.solids, b, this.wallDir, this.moveOpts())) {
      // Reached the top: try a ledge, else drop off.
      if (!this.tryLedge(this.wallDir)) this.setState('normal');
      return;
    }
    if (b.onGround) {
      this.setState('normal');
      return;
    }
    if (ay < 0 && this.wallStamina > 0) {
      b.vy = -P.WALL_CLIMB;
      this.wallStamina -= dt;
      if (this.tryLedge(this.wallDir)) return;
    } else {
      const slide = ay > 0 ? P.WALL_SLIDE * 2.6 : P.WALL_SLIDE;
      b.vy = Math.min(b.vy + P.GRAVITY * dt, slide);
      if (b.vy > 20 && fxRng.next() < 0.3) w.fx.dust(this.wallDir > 0 ? b.x + b.w : b.x, b.y + 4, 1, 'rgba(200,190,170,0.35)', 10);
    }
    if (ax === -this.wallDir) {
      this.detachT += dt;
      if (this.detachT > 0.09) {
        this.detachT = 0;
        this.setState('normal');
        b.vx = -this.wallDir * 60;
      }
    } else this.detachT = 0;
    if (this.jumpBuffer > 0) {
      this.wallJump();
      return;
    }
    if (inp.pressed('dash') && this.ab.dash && this.dashCd <= 0) {
      this.startDash(-this.wallDir);
      return;
    }
  }

  startDash(dir: number): void {
    const b = this.body;
    this.dashDir = dir;
    this.facing = dir;
    this.dashT = P.DASH_TIME;
    this.dashCd = this.world.stats.dashCooldown;
    if (!b.onGround) this.airDash = false;
    this.gliding = false;
    this.cancelAttack();
    this.setState('dash');
    this.squashX = 1.35;
    this.squashY = 0.75;
    sfx('dash', this.cx, this.cy, 0.8);
    this.world.fx.dust(this.cx, b.y + b.h, 3);
    this.world.camera.kick(-dir * 1.5, 0);
  }

  private updateDash(dt: number): void {
    const b = this.body;
    const w = this.world;
    b.vx = this.dashDir * P.DASH_SPEED * (this.inWater ? 0.8 : 1);
    b.vy = 0;
    this.dashT -= dt;
    this.afterT -= dt;
    if (this.afterT <= 0) {
      this.afterT = 0.025;
      this.stepTrail.push({ x: this.cx, y: b.y, a: 0.6 });
    }
    if (w.stats.has.has('ember_wake')) {
      this.emberT -= dt;
      if (this.emberT <= 0) {
        this.emberT = 0.03;
        w.spawnEmberTrail(this.cx, b.y + b.h - 4);
      }
    }
    if (this.dashT <= 0 || b.wallL || b.wallR) {
      b.vx = this.dashDir * P.RUN * 0.9;
      this.setState(this.inWater && this.ab.dive ? 'swim' : 'normal');
    }
  }

  startStep(dir: number): void {
    const b = this.body;
    const w = this.world;
    this.dashDir = dir;
    this.facing = dir;
    this.stepCd = P.STEP_COOLDOWN;
    if (!b.onGround) this.airStep = false;
    this.iframes = Math.max(this.iframes, w.stats.stepIframes);
    this.stepping = true;
    this.cancelAttack();
    this.gliding = false;
    this.setState('step');
    sfx('step_shadow', this.cx, this.cy, 0.8);
    w.fx.burst(this.cx, this.cy, 12, '#b59cff', 90, 0.5, 2.5);
    this.stepTrail.push({ x: this.cx, y: b.y, a: 0.9 });
  }

  private updateStep(dt: number): void {
    const b = this.body;
    const w = this.world;
    const speed = w.stats.stepDistance / P.STEP_TIME;
    const blocked = moveX(w.grid, w.solids, b, this.dashDir * speed * dt, this.moveOpts());
    b.vy = 0;
    if (fxRng.next() < 0.8) w.fx.spawn(PK.Glow, this.cx, this.cy + (fxRng.next() - 0.5) * 16, -this.dashDir * 40, 0, 0.35, 2, '#9b84ff', { additive: true, size2: 0.2 });
    if (this.stateT >= P.STEP_TIME || blocked) {
      this.stepping = false;
      b.vx = this.dashDir * P.RUN * 0.6;
      w.fx.burst(this.cx, this.cy, 10, '#c8b8ff', 70, 0.4, 2);
      this.stepTrail.push({ x: this.cx, y: b.y, a: 0.9 });
      this.setState(this.inWater && this.ab.dive ? 'swim' : 'normal');
      // If the step ended inside a hazard, the hazard check will catch it.
    }
  }

  private tryGrapple(): boolean {
    const w = this.world;
    let best: Entity | null = null;
    let bestScore = Infinity;
    for (const a of w.anchors) {
      const d = dist(this.cx, this.cy, a.cx, a.cy);
      if (d > P.GRAPPLE_RANGE || d < 14) continue;
      if (!w.lineOfSight(this.cx, this.cy, a.cx, a.cy)) continue;
      const dx = a.cx - this.cx;
      let score = d;
      if (sign(dx) !== this.facing && Math.abs(dx) > 20) score += 80;
      if (a.cy > this.cy + 10) score += 40;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    if (!best) {
      sfx('deny', this.cx, this.cy, 0.3);
      return false;
    }
    this.grappleTarget = best;
    this.cancelAttack();
    this.gliding = false;
    this.setState('grapple');
    sfx('grapple', this.cx, this.cy);
    return true;
  }

  private updateGrapple(dt: number): void {
    const b = this.body;
    const t = this.grappleTarget;
    if (!t) {
      this.setState('normal');
      return;
    }
    const dx = t.cx - this.cx;
    const dy = t.cy + 8 - this.cy;
    const d = Math.sqrt(dx * dx + dy * dy);
    const tAccel = Math.min(1, this.stateT * 6);
    if (this.stateT < 0.07) {
      b.vx *= 0.8;
      b.vy *= 0.8;
      return;
    }
    if (d < 14 || this.stateT > 1.2) {
      b.vx = sign(dx) * 170;
      b.vy = -330;
      this.jumping = false;
      this.airDash = true;
      this.airStep = true;
      this.grappleTarget = null;
      this.setState('normal');
      sfx('grapple_hit', this.cx, this.cy, 0.6);
      return;
    }
    b.vx = (dx / d) * P.GRAPPLE_SPEED * tAccel;
    b.vy = (dy / d) * P.GRAPPLE_SPEED * tAccel;
    if (dx !== 0) this.facing = sign(dx);
    if (this.world.input.pressed('jump')) {
      b.vy = Math.min(b.vy, -200) - 120;
      this.grappleTarget = null;
      this.jumping = true;
      this.setState('normal');
      return;
    }
    if ((b.wallL || b.wallR || b.hitCeil) && this.stateT > 0.12) {
      this.grappleTarget = null;
      this.setState('normal');
    }
  }

  private startDrop(): void {
    this.cancelAttack();
    this.gliding = false;
    this.setState('drop');
    this.body.vy = P.DROP_SPEED;
    this.iframes = Math.max(this.iframes, 0.15);
    sfx('charge', this.cx, this.cy, 0.6, 0.6);
  }

  private dropImpact(): void {
    const w = this.world;
    const b = this.body;
    const broke = w.breakFragileUnder(b.x, b.y + b.h, b.w);
    playerStrike(w, { x: this.cx - 34, y: b.y + b.h - 22, w: 68, h: 24 }, {
      base: w.stats.bladeDamage * 2.2 * w.stats.globalDamage, dir: this.facing, dirY: 1, knock: 1.6, stagger: 3,
      source: 'drop', hitId: newHitId(), breaks: true, canCrit: false,
    });
    w.camera.shake(broke ? 0.45 : 0.55, 0.18);
    w.fx.dust(this.cx - 10, b.y + b.h, 8, 'rgba(210,190,170,0.6)', 120);
    w.fx.dust(this.cx + 10, b.y + b.h, 8, 'rgba(210,190,170,0.6)', 120);
    w.fx.ring(this.cx, b.y + b.h, 4, 46, 0.35, '#ffb27a');
    w.fx.sparks(this.cx, b.y + b.h, 0, 14, '#ffcf9a', 220);
    sfx('drop_impact', this.cx, this.cy);
    this.world.input.rumble(0.8, 0.5, 180);
    if (broke) {
      // Keep plunging through what we shattered.
      b.vy = P.DROP_SPEED;
      b.onGround = false;
      this.wasGround = false;
      return;
    }
    this.landLag = 0.18;
    this.squashX = 1.45;
    this.squashY = 0.62;
    this.setState('normal');
  }

  private updateSwim(dt: number, ax: number, ay: number): void {
    const b = this.body;
    const w = this.world;
    const inp = w.input;
    if (!this.inWater) {
      // Leaving water at the surface
      this.setState('normal');
      if (inp.down('jump') || b.vy < -40) {
        b.vy = -P.JUMP_V * 0.85;
        this.jumping = true;
      }
      return;
    }
    const sp = P.SWIM_SPEED * w.stats.swimSpeed;
    b.vx = approach(b.vx, ax * sp, 700 * dt);
    let ty = ay * sp;
    if (inp.down('jump')) ty = -sp * 1.15;
    if (ax === 0 && ay === 0 && !inp.down('jump')) ty = 18; // gentle sink
    b.vy = approach(b.vy, ty, 700 * dt);
    if (ax !== 0) this.facing = ax;
    if (fxRng.next() < 0.06) w.fx.bubbles(this.cx + this.facing * 4, b.y + 4, 1);
    if (inp.pressed('dash') && this.ab.dash && this.dashCd <= 0) {
      this.startDash(ax !== 0 ? ax : this.facing);
      return;
    }
    if (inp.pressed('art')) this.tryArt(ay < 0);
  }

  private updateMend(dt: number): void {
    const w = this.world;
    const b = this.body;
    b.vx = approach(b.vx, 0, P.DEC_GROUND * dt);
    b.vy = Math.min(b.vy + P.GRAVITY * dt, P.MAX_FALL);
    if (!w.input.down('mend') || !b.onGround) {
      this.setState('normal');
      return;
    }
    this.mendT += dt;
    if (fxRng.next() < 0.5) {
      const a = fxRng.next() * Math.PI * 2;
      w.fx.spawn(PK.Glow, this.cx + Math.cos(a) * 18, this.cy + Math.sin(a) * 18, -Math.cos(a) * 40, -Math.sin(a) * 40, 0.45, 1.8, '#9fe8ff', { additive: true, size2: 0.4 });
    }
    if (this.mendT >= w.stats.mendTime) {
      this.mendT = 0;
      this.aether -= w.stats.mendCost;
      this.heal(w.stats.mendAmount);
      w.fx.burst(this.cx, this.cy, 18, '#c8f4ff', 110, 0.6, 2.5);
      w.fx.ring(this.cx, this.cy, 6, 30, 0.4, '#bff0ff');
      sfx('heal', this.cx, this.cy);
      w.progress.stats.healed++;
      if (this.aether < w.stats.mendCost || this.vigor >= this.maxVigor) this.setState('normal');
    }
  }

  private tryMend(): void {
    const w = this.world;
    const st = w.stats;
    if (!st.canMend || this.poison > 0) {
      sfx('deny', this.cx, this.cy, 0.4);
      return;
    }
    if (this.aether < st.mendCost || this.vigor >= this.maxVigor) {
      sfx('deny', this.cx, this.cy, 0.3);
      w.ui.flashAether();
      return;
    }
    this.cancelAttack();
    this.mendT = 0;
    this.setState('mend');
    sfx('heal_start', this.cx, this.cy, 0.6);
  }

  private tryArt(up: boolean): void {
    const w = this.world;
    if (!this.ab.lance || this.artCd > 0) return;
    const cost = w.stats.artCost;
    if (this.aether < cost) {
      sfx('deny', this.cx, this.cy, 0.4);
      w.ui.flashAether();
      return;
    }
    this.aether -= cost;
    this.artCd = 0.35;
    this.cancelAttack();
    if (up) {
      w.spawnSpire(this.cx, this.body.y + this.body.h);
    } else {
      w.spawnLance(this.cx + this.facing * 8, this.cy - 2, this.facing);
      this.body.vx -= this.facing * 90;
      if (!this.body.onGround && this.body.vy > -60) this.body.vy = -60;
    }
    this.squashX = 1.2;
    this.squashY = 0.85;
  }

  // ------------------------------------------------------------------
  // Combat

  private canAttackNow(): boolean {
    return (this.state === 'normal' || this.state === 'swim') && this.canAct();
  }

  cancelAttack(): void {
    this.atkKind = null;
    this.atkT = 0;
    this.chargeT = 0;
    this.chargeReady = false;
  }

  private updateAttack(dt: number): void {
    const w = this.world;
    const inp = w.input;
    const st = w.stats;
    // Charging
    if (inp.down('attack') && this.canAttackNow()) {
      this.atkHoldT += dt;
      if (this.atkHoldT > P.CHARGE_DELAY && !(this.atkKind && this.atkKind !== 'side' && this.atkKind !== 'air')) {
        const before = this.chargeT;
        this.chargeT += dt;
        if (before < st.chargeTime && this.chargeT >= st.chargeTime) {
          this.chargeReady = true;
          sfx('charge_ready', this.cx, this.cy, 0.8);
          w.fx.ring(this.cx, this.cy, 4, 22, 0.3, '#e8e0ff');
        } else if (before === 0) sfx('charge', this.cx, this.cy, 0.4);
        if (fxRng.next() < (this.chargeReady ? 0.6 : 0.3)) {
          const a = fxRng.next() * Math.PI * 2;
          w.fx.spawn(PK.Glow, this.cx + Math.cos(a) * 14, this.cy + Math.sin(a) * 14, -Math.cos(a) * 30, -Math.sin(a) * 30, 0.35, 1.5, this.chargeReady ? '#ffffff' : '#c8b8ff', { additive: true, size2: 0.3 });
        }
      }
    } else {
      if (this.chargeReady && this.canAttackNow() && !this.atkKind) {
        this.startAttack('charged');
      }
      this.chargeT = 0;
      this.chargeReady = false;
      if (!inp.down('attack')) this.atkHoldT = 0;
    }

    if (this.atkKind) {
      const spec = this.atkSpec;
      const sp = st.attackSpeed;
      this.atkT += dt * sp;
      const t = this.atkT;
      if (t >= spec.startup && t < spec.startup + spec.active) this.attackActive();
      if (t >= spec.startup + spec.active + spec.recovery) {
        this.atkKind = null;
      }
      if (!this.canAttackNow()) this.atkKind = null;
    } else if (this.atkBuffer > 0 && this.atkCooldown <= 0 && this.canAttackNow()) {
      const ay = inp.axisY();
      const air = !this.body.onGround && this.state !== 'swim';
      let kind: AttackKind = air ? 'air' : 'side';
      if (ay < 0) kind = 'up';
      else if (ay > 0 && air) kind = 'down';
      this.startAttack(kind);
      this.atkBuffer = 0;
    }
  }

  private startAttack(kind: AttackKind): void {
    const w = this.world;
    this.atkKind = kind;
    this.atkSpec = ATTACKS[kind];
    this.atkT = 0;
    this.atkHitId = newHitId();
    this.atkConnected = false;
    this.combo = (this.combo + 1) % 2;
    const spec = this.atkSpec;
    this.atkCooldown = (spec.startup + spec.active + spec.recovery * 0.55) / w.stats.attackSpeed;
    this.gliding = false;
    if (kind === 'charged') {
      sfx('swing_heavy', this.cx, this.cy);
      w.camera.kick(this.facing * 2, 0);
      this.body.vx += this.facing * 120;
      this.squashX = 1.3;
      this.squashY = 0.8;
    } else sfx('swing', this.cx, this.cy, 0.75, 0.95 + fxRng.next() * 0.15);
  }

  attackRect(): { x: number; y: number; w: number; h: number } {
    const spec = this.atkSpec;
    const reach = this.world.stats.reach;
    const b = this.body;
    const k = this.atkKind;
    if (k === 'up') {
      const ww = spec.w * (0.85 + 0.15 * reach);
      const hh = spec.h * reach;
      return { x: this.cx - ww / 2, y: b.y - hh + 6, w: ww, h: hh };
    }
    if (k === 'down') {
      const ww = spec.w * (0.85 + 0.15 * reach);
      const hh = spec.h * reach;
      return { x: this.cx - ww / 2, y: b.y + b.h - 6, w: ww, h: hh };
    }
    if (k === 'charged') {
      const ww = spec.w * reach;
      return { x: this.facing > 0 ? this.cx - 6 : this.cx - ww + 6, y: b.y + spec.oy, w: ww, h: spec.h };
    }
    const ww = spec.w * reach;
    return { x: this.facing > 0 ? this.cx + spec.ox - 4 : this.cx - spec.ox - ww + 4, y: b.y + spec.oy, w: ww, h: spec.h };
  }

  private damageMult(): number {
    const st = this.world.stats;
    let m = st.globalDamage;
    if (this.vigor <= 1) m *= st.lowVigorDamage;
    if (this.inWater || this.inShallow) m *= st.waterDamage;
    return m;
  }

  private attackActive(): void {
    const w = this.world;
    const st = w.stats;
    const spec = this.atkSpec;
    const k = this.atkKind!;
    const r = this.attackRect();
    const res = playerStrike(w, r, {
      base: st.bladeDamage * spec.mult * this.damageMult(),
      dir: k === 'up' || k === 'down' ? this.facing : this.facing,
      dirY: k === 'up' ? -1 : k === 'down' ? 1 : 0,
      knock: spec.knock,
      stagger: spec.stagger * (st.has.has('charged_soul') && k === 'charged' ? 1.6 : 1),
      source: k === 'charged' ? 'charged' : k === 'down' ? 'down' : 'blade',
      hitId: this.atkHitId,
      breaks: true,
      canCrit: true,
      burn: st.fireDamage ? 3 : undefined,
    });
    if (res.hits > 0) this.onStrikeLanded(res.hits, res.aether, res.crit, res.killed);
    if (this.atkConnected) return;
    const b = this.body;
    if (res.hits > 0 || res.spike || res.wall) this.atkConnected = true;
    if (k === 'down' && (res.bounce || res.spike) && (res.hits > 0 || res.spike)) {
      b.vy = -P.JUMP_V * 0.95;
      this.jumping = false;
      this.airDash = true;
      this.airStep = true;
      this.gliding = false;
      if (res.spike) sfx('hit_armor', this.cx, b.y + b.h, 0.6);
    } else if (res.hits > 0 && (k === 'side' || k === 'air' || k === 'charged')) {
      b.vx -= this.facing * (b.onGround ? 110 : 70);
    } else if (res.wall && res.hits === 0) {
      b.vx -= this.facing * 120;
      w.fx.sparks(this.facing > 0 ? r.x + r.w : r.x, r.y + r.h / 2, -this.facing, 6, '#ffe6b0', 160);
      sfx('hit_armor', this.cx, this.cy, 0.5);
    }
  }

  private onStrikeLanded(hits: number, aetherHits: number, crit: boolean, killed: number): void {
    const w = this.world;
    const st = w.stats;
    const spec = this.atkSpec;
    if (aetherHits > 0) this.gainAether(11 * aetherHits * st.aetherGain * w.diff.aetherGain);
    w.hitstop(spec.hitstop * (crit ? 1.6 : 1) + (killed > 0 ? 0.03 : 0));
    w.camera.shake(this.atkKind === 'charged' ? 0.5 : crit ? 0.35 : 0.22, 0.08);
    w.camera.kick(this.facing * (this.atkKind === 'charged' ? 3 : 1.2), 0);
    w.input.rumble(this.atkKind === 'charged' ? 0.7 : 0.3, 0.4, this.atkKind === 'charged' ? 140 : 70);
    if (st.has.has('lifeleech_thorn')) {
      this.leechCount += hits;
      if (this.leechCount >= 12) {
        this.leechCount = 0;
        this.heal(1);
        w.fx.burst(this.cx, this.cy, 10, '#ff5c7a', 80, 0.5, 2);
      }
    }
    if (st.has.has('tolling_heart')) {
      this.tollCount += hits;
      if (this.tollCount >= 5) {
        this.tollCount = 0;
        w.toll(this.cx, this.cy);
      }
    }
  }

  gainAether(n: number, silent = false): void {
    const max = this.world.stats.maxAether;
    const before = this.aether;
    this.aether = Math.min(max, this.aether + n);
    if (!silent && before < max && this.aether >= max) sfx('aether_full', this.cx, this.cy, 0.4);
  }

  get maxVigor(): number {
    return this.world.stats.maxVigor - (this.gloamed ? 1 : 0);
  }

  heal(n: number): void {
    this.vigor = Math.min(this.maxVigor, this.vigor + n);
  }

  /** Apply enemy damage. Returns true if the blow connected (even if shielded). */
  hurt(dmg: number, srcX: number, opts?: { corrupt?: number; poison?: number; source?: { takeHit?: unknown } }): boolean {
    const w = this.world;
    if (this.state === 'dead' || this.hazardPending || w.godMode || w.cutsceneLock) return false;
    if (this.iframes > 0 || this.stepping) return false;
    if (this.state === 'dash' && w.stats.has.has('mirror_veil') && this.stateT < 0.14) {
      this.iframes = 0.45;
      w.fx.ring(this.cx, this.cy, 6, 34, 0.3, '#c9f1ff');
      w.fx.sparks(this.cx, this.cy, 0, 12, '#e8fbff', 200);
      w.reflectNear(this.cx, this.cy);
      sfx('parry', this.cx, this.cy);
      w.hitstop(0.06);
      return false;
    }
    const dir = sign(this.cx - srcX) || -this.facing;
    if (this.shield > 0) {
      this.shield = 0;
      this.shieldTimer = 25;
      this.iframes = 0.7;
      w.fx.shards(this.cx, this.cy, 10, '#ffe08a', 160);
      w.fx.ring(this.cx, this.cy, 6, 28, 0.3, '#ffe08a');
      sfx('shield', this.cx, this.cy);
      this.body.vx = dir * 120;
      w.hitstop(0.05);
      return true;
    }
    const st = w.stats;
    let amount = dmg * w.diff.enemyDamage * w.settings.assistDamage * st.damageTakenMult;
    amount = Math.max(0.5, Math.round(amount * 2) / 2);
    this.vigor = Math.max(0, this.vigor - amount);
    w.progress.stats.damageTaken += amount;
    if (w.challengeBoss) w.challengeHit = true;
    if (opts?.poison) this.poison = Math.max(this.poison, opts.poison);
    if (opts?.corrupt) this.addCorruption(opts.corrupt);
    this.iframes = P.IFRAMES + (w.settings.extraIframes ? 0.5 : 0);
    this.cancelAttack();
    this.gliding = false;
    this.grappleTarget = null;
    this.tollCount = 0;
    const kb = st.windImmune ? 0.65 : 1;
    this.body.vx = dir * 190 * kb;
    this.body.vy = this.inWater ? -80 : -230;
    this.setState('hurt');
    this.flashT = 0.25;
    w.hitstop(0.1);
    w.camera.shake(0.5, 0.15);
    w.input.rumble(0.9, 0.7, 220);
    events.emit('flash', { color: '#ff3020', time: 0.25, alpha: 0.18 });
    sfx('player_hurt', this.cx, this.cy);
    w.fx.sparks(this.cx, this.cy, 0, 10, '#ffffff', 200);
    w.fx.burst(this.cx, this.cy, 8, '#1a1424', 90, 0.6, 3);
    if (st.has.has('echo_heart')) w.echoPulse(this.cx, this.cy);
    if (st.has.has('spite_spines') && opts?.source && typeof opts.source.takeHit === 'function') {
      const src = opts.source as Entity;
      src.takeHit?.({ damage: 6, dir: -dir, dirY: 0, knock: 0.5, stagger: 0, source: 'spines', crit: false, hitId: newHitId(), x: src.cx, y: src.cy });
    }
    if (this.vigor <= 0) this.die();
    return true;
  }

  addCorruption(n: number): void {
    if (this.gloamed) return;
    this.corruption = Math.min(100, this.corruption + n);
    if (this.corruption >= 100) {
      this.gloamed = true;
      this.corruption = 0;
      this.vigor = Math.min(this.vigor, this.maxVigor);
      this.world.ui.toast('Gloamed', 'The corruption takes hold. Rest at a Veil Shrine to cleanse it.', 'info');
      sfx('player_hurt', this.cx, this.cy, 0.6, 0.5);
    }
  }

  die(): void {
    if (this.state === 'dead') return;
    this.setState('dead');
    this.deathT = 0;
    this.cancelAttack();
    this.body.vx = 0;
    this.body.vy = -120;
    this.world.onPlayerDeath();
  }

  /** Hazard contact: damage then return to the last safe ground. */
  hazard(reason?: string): void {
    const w = this.world;
    if (this.hazardPending || this.state === 'dead' || w.godMode) return;
    const safe = w.settings.safeHazards || w.stats.has.has('pilgrims_ash');
    if (!safe) {
      this.vigor = Math.max(0, this.vigor - 1);
      w.progress.stats.damageTaken += 1;
    }
    sfx('player_hurt', this.cx, this.cy, 0.9, 0.85);
    w.camera.shake(0.45, 0.15);
    w.hitstop(0.12);
    w.fx.sparks(this.cx, this.cy, 0, 12, '#ffffff', 200);
    events.emit('flash', { color: '#000000', time: 0.4, alpha: 0.9 });
    w.input.rumble(0.8, 0.6, 200);
    this.cancelAttack();
    if (this.vigor <= 0) {
      this.die();
      return;
    }
    if (reason) w.ui.hint(reason);
    this.hazardPending = true;
    this.setState('locked');
    this.body.vx = 0;
    this.body.vy = 0;
  }

  private finishHazardRespawn(): void {
    this.hazardPending = false;
    this.placeAt(this.lastSafe.x, this.lastSafe.y);
    this.iframes = 0.9;
    this.hazardFade = 0.4;
    this.setState('normal');
    this.wasGround = true;
  }

  get hazardFading(): boolean {
    return this.hazardPending;
  }

  private checkHazards(): void {
    if (this.hazardPending || this.state === 'dead') return;
    const w = this.world;
    const g = w.grid;
    const b = this.body;
    const x0 = Math.floor((b.x + 2) / TILE);
    const x1 = Math.floor((b.x + b.w - 2) / TILE);
    const y0 = Math.floor((b.y + 4) / TILE);
    const y1 = Math.floor((b.y + b.h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = g.tileClamped(tx, ty);
        if (t === T.Spike || t === T.Acid || t === T.Thorn) {
          if (this.stepping && t !== T.Acid) continue;
          // Spikes only hurt within their pointed half.
          if (t === T.Spike) {
            const tileTop = ty * TILE;
            if (b.y + b.h < tileTop + 6 && !this.isCeilingSpike(tx, ty)) continue;
          }
          this.hazard(t === T.Acid ? 'Acid eats at everything. Even memory.' : undefined);
          return;
        }
      }
    }
  }

  private isCeilingSpike(tx: number, ty: number): boolean {
    const row = this.world.room.rows[ty] ?? '';
    return row[tx] === 'v' || row[tx] === '<' || row[tx] === '>';
  }

  private updateSafe(dt: number): void {
    const b = this.body;
    if (!b.onGround || b.ground || this.state !== 'normal' || this.inWater) {
      this.safeT = 0;
      return;
    }
    this.safeT += dt;
    if (this.safeT < 0.15) return;
    const g = this.world.grid;
    const row = Math.floor((b.y + b.h + 1) / TILE);
    const l = Math.floor((b.x - 6) / TILE);
    const r = Math.floor((b.x + b.w + 6) / TILE);
    for (let c = l; c <= r; c++) {
      for (let rr = row - 2; rr <= row; rr++) {
        const t = g.tileClamped(c, rr);
        if (t === T.Spike || t === T.Acid || t === T.Thorn || t === T.Crumble || t === T.Water) return;
      }
      const under = g.tileClamped(c, row);
      if (under === T.Fragile) return;
    }
    if (this.cx < 8 || this.cx > g.pw - 8) return;
    this.lastSafe.x = this.cx;
    this.lastSafe.y = b.y + b.h;
  }

  private applyWind(dt: number): void {
    const w = this.world;
    if (w.stats.windImmune || this.state === 'climb' || this.state === 'ledge') return;
    for (const z of w.windZones) {
      const b = this.body;
      if (b.x < z.x + z.w && b.x + b.w > z.x && b.y < z.y + z.h && b.y + b.h > z.y) {
        const fx = z.fx * (this.state === 'normal' && this.gliding ? 1.6 : 1);
        const fy = z.fy * (this.gliding ? 1.8 : 1);
        moveX(w.grid, w.solids, b, fx * dt, this.moveOpts());
        if (this.state !== 'wall') {
          b.vy += fy * dt * 4;
          if (fy < 0 && this.gliding) b.vy = Math.max(b.vy, -180);
        }
      }
    }
  }

  private onLand(prevVy: number): void {
    const w = this.world;
    const b = this.body;
    const fall = b.y - this.fallPeak;
    const strength = clamp(prevVy / P.MAX_FALL, 0, 1.4);
    this.squashX = 1 + 0.35 * strength;
    this.squashY = 1 - 0.3 * strength;
    if (prevVy > 120) {
      w.fx.dust(this.cx, b.y + b.h, 3 + Math.round(strength * 5));
      sfx('land', this.cx, this.cy, 0.3 + 0.5 * strength);
    }
    if (fall > 150 && prevVy > 400) {
      w.camera.shake(0.28, 0.1);
      this.landLag = 0.1;
      w.input.rumble(0.3, 0.2, 80);
    }
  }

  private updatePresentation(dt: number): void {
    const b = this.body;
    const k = 1 - Math.exp(-14 * dt);
    this.squashX += (1 - this.squashX) * k;
    this.squashY += (1 - this.squashY) * k;
    if (b.onGround && Math.abs(b.vx) > 10) {
      const prev = this.runPhase;
      this.runPhase += Math.abs(b.vx) * dt * 0.075;
      if (Math.floor(prev / Math.PI) !== Math.floor(this.runPhase / Math.PI)) {
        sfx('step', this.cx, this.cy, this.inShallow ? 0.4 : 0.22, this.inShallow ? 0.7 : 1);
        if (this.inShallow) this.world.fx.splash(this.cx, b.y + b.h - 2, 3);
        else if (fxRng.next() < 0.4) this.world.fx.dust(this.cx - this.facing * 3, b.y + b.h, 1, 'rgba(200,190,170,0.35)', 15);
      }
    }
    for (let i = this.stepTrail.length - 1; i >= 0; i--) {
      this.stepTrail[i].a -= dt * 3;
      if (this.stepTrail[i].a <= 0) this.stepTrail.splice(i, 1);
    }
    // Scarf anchor at the neck
    const wind = this.world.windAt(this.cx, this.cy);
    this.scarf.update(dt, this.cx - this.facing * 1, b.y + 8, b.vx, b.vy, wind, this.inWater);
  }
}
