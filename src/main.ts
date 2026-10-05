import '@fontsource/cinzel/latin-400.css';
import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cormorant-garamond/latin-400.css';
import '@fontsource/cormorant-garamond/latin-400-italic.css';
import '@fontsource/cormorant-garamond/latin-600.css';
import '@fontsource/cormorant-garamond/latin-700.css';
import { Game } from './core/Game';
import { TitleScene } from './scenes/TitleScene';
import { GameScene } from './scenes/GameScene';
import { newProgress } from './progression/Progress';
import { createEnemy, ENEMY_DEFS } from './enemies/registry';
import { BOSSES } from './bosses/registry';
import { ABILITIES } from './abilities/abilities';
import { events } from './core/events';

declare global {
  interface Window {
    __veilfall?: {
      game: Game;
      /** Start gameplay immediately in a fresh memory-only journey (tests / debug). */
      quickStart: (room?: string) => GameScene;
      /** Registries and helpers for automated tests and the debug console. */
      lib: Record<string, unknown>;
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
    const sfxLog: string[] = [];
    events.on('sfx', (e) => {
      sfxLog.push(e.id);
      if (sfxLog.length > 500) sfxLog.shift();
    });
    window.__veilfall = { game, quickStart, lib: { createEnemy, ENEMY_DEFS, BOSSES, ABILITIES, sfxLog } };
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

// Canvas text only uses a web font once it has loaded, so wait (briefly) for them.
const fontLoads = ['600 20px Cinzel', '400 20px Cinzel', '400 20px "Cormorant Garamond"', 'italic 400 20px "Cormorant Garamond"', '700 20px "Cormorant Garamond"'].map((f) => document.fonts.load(f).catch(() => undefined));
void Promise.race([Promise.all(fontLoads), new Promise((r) => setTimeout(r, 1500))]).then(boot);
