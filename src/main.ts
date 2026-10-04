import { Game } from './core/Game';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { newProgress } from './progression/Progress';

declare global {
  interface Window {
    __veilfall?: {
      game: Game;
      /** Start gameplay immediately in a fresh memory-only journey (tests / debug). */
      quickStart: (room?: string) => GameScene;
    };
  }
}

function boot(): void {
  const canvas = document.getElementById('game') as HTMLCanvasElement;
  const bootEl = document.getElementById('boot');
  try {
    const game = new Game(canvas);
    const params = new URLSearchParams(location.search);
    const quickStart = (room?: string): GameScene => {
      const p = newProgress();
      if (room) p.room = room;
      const s = new GameScene(game, p, Number(params.get('slot') ?? 2), 'start');
      game.setScene(s);
      return s;
    };
    window.__veilfall = { game, quickStart };
    if (params.get('scene') === 'game') quickStart(params.get('room') ?? undefined);
    else game.setScene(new TitleScene(game));
    // Tests drive the simulation deterministically with ?manual=1.
    if (params.get('manual') !== '1') game.start();
    else game.advance(1);
    bootEl?.remove();
    canvas.focus();
  } catch (e) {
    if (bootEl) {
      bootEl.className = 'err';
      bootEl.textContent = `Veilfall could not start: ${(e as Error).message}`;
    }
    throw e;
  }
}

boot();
