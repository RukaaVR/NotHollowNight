import type { InputState, Action } from '../core/input';
import { sfx } from '../core/events';

/** A modal UI layer drawn over the game. */
export abstract class Overlay {
  closed = false;
  /** Freeze the world while this overlay is open. */
  pauses = true;
  t = 0;
  abstract update(dt: number, input: InputState): void;
  abstract draw(ctx: CanvasRenderingContext2D, time: number): void;
  close(): void {
    this.closed = true;
  }
}

/** Directional navigation with key-repeat for menus. */
export class Nav {
  private held: Partial<Record<Action, number>> = {};
  step(input: InputState, dt: number, a: Action): boolean {
    if (input.pressed(a)) {
      this.held[a] = 0;
      return true;
    }
    if (input.down(a)) {
      const t = (this.held[a] ?? 0) + dt;
      this.held[a] = t;
      if (t > 0.38) {
        this.held[a] = 0.38 - 0.075;
        return true;
      }
    } else delete this.held[a];
    return false;
  }

  /** Vertical list navigation; returns the new index. */
  list(input: InputState, dt: number, idx: number, count: number): number {
    if (count <= 0) return 0;
    if (this.step(input, dt, 'up')) {
      sfx('menu_move');
      return (idx - 1 + count) % count;
    }
    if (this.step(input, dt, 'down')) {
      sfx('menu_move');
      return (idx + 1) % count;
    }
    return idx;
  }

  /** Grid navigation with `cols` columns. */
  grid(input: InputState, dt: number, idx: number, count: number, cols: number): number {
    if (count <= 0) return 0;
    let n = idx;
    if (this.step(input, dt, 'left')) n = idx - 1;
    if (this.step(input, dt, 'right')) n = idx + 1;
    if (this.step(input, dt, 'up')) n = idx - cols;
    if (this.step(input, dt, 'down')) n = idx + cols;
    if (n !== idx) {
      n = Math.max(0, Math.min(count - 1, n));
      if (n !== idx) sfx('menu_move');
    }
    return n;
  }

  horiz(input: InputState, dt: number): number {
    if (this.step(input, dt, 'left')) return -1;
    if (this.step(input, dt, 'right')) return 1;
    return 0;
  }
}

export function confirmPressed(input: InputState): boolean {
  return input.pressed('confirm') || input.pressed('jump') || input.pressed('attack');
}

export function cancelPressed(input: InputState): boolean {
  return input.pressed('cancel') || input.pressed('pause');
}
