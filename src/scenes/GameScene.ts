import type { Game, Scene } from '../core/Game';
import { GameWorld, type WorldUI } from '../world/GameWorld';
import { allRooms } from '../rooms/index';
import type { Progress } from '../progression/Progress';
import { setFlag, hasFlag } from '../progression/Progress';
import { HUD } from '../ui/HUD';
import { Overlay } from '../ui/overlay';
import { DialogueOverlay, ItemOverlay, LoreOverlay, ChoiceOverlay, ShopOverlay, TravelOverlay } from '../ui/overlays';
import { PauseMenu, type MenuHooks } from '../ui/PauseMenu';
import { PhotoMode } from '../ui/PhotoMode';
import { DebugMenu, type DebugFlags } from '../debug/DebugMenu';
import type { DialogueScript } from '../dialogue/types';
import { events, sfx } from '../core/events';
import { VIEW_H, VIEW_W } from '../camera/Camera';
import { UI, text } from '../ui/text';
import { BOSS_BY_ID } from '../bosses/registry';
import { trueEndingReady, secretEndingReady } from '../quests/quests';
import { ITEMS } from '../story/lore';
import { TILE } from '../world/tiles';
import { region } from '../world/regions';
import { TOTALS_FOR_SAVES } from './totals';
import { EndingScene } from './EndingScene';
import { TitleScene } from './TitleScene';

export const TOTALS = TOTALS_FOR_SAVES;

/** The in-game scene: simulation, rendering, HUD and every modal overlay. */
export class GameScene implements Scene, WorldUI {
  readonly world: GameWorld;
  readonly hud = new HUD();
  private overlays: (Overlay & { onClose?: () => void })[] = [];
  private unsubs: (() => void)[] = [];
  private flashT = 0;
  private flashMax = 1;
  private flashColor = '#fff';
  private flashAlpha = 0;
  private debugFlags: DebugFlags = { hitboxes: false, collision: false, stats: true };
  private photo: PhotoMode | null = null;
  private autosaveT = 0;

  constructor(private game: Game, progress: Progress, readonly slot: number, entry: 'start' | 'shrine') {
    this.world = new GameWorld(allRooms(), progress, game.settings, game.input, this, (p) => {
      const ok = game.saves.write(slot, p);
      if (!ok) this.hud.toast('Saving failed', 'Storage is unavailable or full. Progress is kept in memory.', 'info');
    });
    this.world.challengeRoomFor = (id) => BOSS_BY_ID.get(id)?.room ?? null;
    this.unsubs.push(
      events.on('toast', (t) => this.hud.toast(t.text, t.sub, t.kind)),
      events.on('areaTitle', (a) => this.hud.areaBanner(a.name, a.sub)),
      events.on('bossIntro', (b) => this.hud.bossIntro(b.name, b.title)),
      events.on('flash', (f) => {
        this.flashT = f.time;
        this.flashMax = f.time;
        this.flashColor = f.color;
        this.flashAlpha = f.alpha;
      }),
      events.on('shake', (s) => this.world.camera.shake(s.amount, s.time)),
    );
    this.world.begin(entry);
  }

  exit(): void {
    for (const u of this.unsubs) u();
  }

  // ------------------------------------------------------------------ WorldUI

  private push(o: Overlay & { onClose?: () => void }): void {
    this.overlays.push(o);
  }

  toast(t: string, sub?: string, kind?: 'item' | 'ability' | 'quest' | 'area' | 'info'): void {
    this.hud.toast(t, sub, kind);
  }
  hint(t: string): void {
    this.hud.hint(t);
  }
  flashAether(): void {
    this.hud.aetherFlash = 0.6;
  }
  dialogue(script: DialogueScript, onDone?: () => void): void {
    const pushNext = (s: DialogueScript) => this.dialogue({ ...s, npc: s.npc ?? script.npc }, onDone);
    this.push(new DialogueOverlay(script, onDone, pushNext));
  }
  openShrine(): void {
    const m = new PauseMenu(this.world, 'shrine', this.menuHooks());
    (m as PauseMenu & { onClose?: () => void }).onClose = () => {
      this.world.player.setState('normal');
      this.world.save();
    };
    this.push(m);
  }
  openTravel(): void {
    this.push(new TravelOverlay(this.world));
  }
  openShop(id: string): void {
    this.push(new ShopOverlay(this.world, id));
  }
  abilityGet(id: string): void {
    const p = this.world.player;
    p.setState('kneel');
    const o = new ItemOverlay('', '', '#ffffff', id, () => p.setState('normal'));
    this.push(o);
    this.world.save();
  }
  itemGet(title: string, desc: string, color: string, onDone?: () => void): void {
    this.push(new ItemOverlay(title, desc, color, null, onDone));
  }
  lore(title: string, body: string): void {
    this.push(new LoreOverlay(title, body));
  }
  cutscene(id: string, onDone?: () => void): void {
    const w = this.world;
    const p = w.progress;
    switch (id) {
      case 'opening':
        this.hud.hint('The snow falls from nowhere. Find a way down.');
        break;
      case 'seal_door': {
        const seals = ['seal_tide', 'seal_stars', 'seal_memory'];
        const have = seals.filter((s) => p.keys.includes(s));
        if (have.length === 3) {
          setFlag(p, 'seals_3');
          sfx('discover');
          w.camera.shake(0.6, 1.5);
          this.dialogue({ lines: [{ who: '', text: 'You press the three seals into the door. Tide. Star. Flower. The door remembers them, and opens.' }] });
          w.save();
        } else {
          // Re-arm the trigger so the door can be tried again later.
          delete p.flags['ev_seal_door'];
          const missing = seals.filter((s) => !p.keys.includes(s)).map((s) => ITEMS[s].name);
          this.dialogue({ lines: [{ who: '', text: `Three hollows in the door. ${have.length ? 'Your seals fit, but ' : ''}it needs: ${missing.join(', ')}.` }] });
        }
        break;
      }
    }
    onDone?.();
  }
  ending(_id: string): void {
    const p = this.world.progress;
    const te = trueEndingReady(p);
    const options = [
      { label: 'Take the Dreamer\'s place', hint: 'Become the new dream. The Veil will hold.', run: () => this.finish('standard') },
      {
        label: 'Wake the Dreamer', disabled: !te.ok,
        hint: te.ok ? 'End the long night, gently.' : `Something is still forgotten: ${te.missing.join('; ')}.`,
        run: () => this.finish('true'),
      },
    ];
    if (secretEndingReady(p)) options.push({ label: 'Put on the Unworn Mask', hint: 'It has no eyes. It was never meant to see.', run: () => this.finish('secret') });
    this.push(new ChoiceOverlay('The Dreamer Below', [...options, { label: 'Not yet', hint: 'Return to the Veil.', run: () => undefined }], 'Orun breathes beneath the light. Its dream is the Veil. Its nightmare is gone. What will you do?'));
  }
  challengeMenu(id: string): void {
    const info = BOSS_BY_ID.get(id);
    const w = this.world;
    if (!info) return;
    if (!w.progress.bosses[id]) {
      this.dialogue({ lines: [{ who: '', text: 'The dais is dark. You have not yet faced the memory it holds.' }] });
      return;
    }
    const rec = w.progress.challenges[id];
    this.push(new ChoiceOverlay(info.name, [
      { label: 'Remember', hint: 'Face it again. Your time is recorded.', run: () => { w.challengeMod = 0; w.startChallenge(id); } },
      { label: 'Remember — Ascended', hint: 'It strikes twice as hard and endures longer.', run: () => { w.challengeMod = 1; w.startChallenge(id); } },
      { label: 'Remember — One Breath', hint: 'A single blow will end you.', run: () => { w.challengeMod = 2; w.startChallenge(id); } },
      { label: 'Leave', run: () => undefined },
    ], rec ? `Best ${rec.bestTime}s · ${rec.clears} clear${rec.clears > 1 ? 's' : ''}${rec.noHit ? ' · flawless' : ''}` : info.title));
  }

  private finish(id: string): void {
    const p = this.world.progress;
    if (!p.endings.includes(id)) p.endings.push(id);
    setFlag(p, `ending_${id}`);
    this.world.save();
    this.game.setScene(new EndingScene(this.game, id, p, this.slot));
  }

  private menuHooks(): MenuHooks {
    return {
      settings: this.game.settings,
      input: this.game.input,
      onSettingsChanged: () => {
        this.game.applySettings();
        this.world.applySettings();
      },
      quitToTitle: () => this.game.setScene(new TitleScene(this.game)),
      photoMode: () => {
        this.photo = new PhotoMode(this.world, this.game.renderer);
        this.push(this.photo);
      },
      debugMenu: this.game.debugEnabled ? () => this.push(new DebugMenu(this.world, this.debugFlags)) : null,
      totals: TOTALS,
    };
  }

  // ------------------------------------------------------------------ loop

  update(dt: number): void {
    const input = this.game.input;
    const w = this.world;
    this.hud.update(dt);
    this.flashT = Math.max(0, this.flashT - dt);
    // Overlays
    for (let i = this.overlays.length - 1; i >= 0; i--) {
      const o = this.overlays[i];
      if (o.closed) {
        this.overlays.splice(i, 1);
        o.onClose?.();
        if (o === this.photo) this.photo = null;
        input.flush();
      }
    }
    const top = this.overlays[this.overlays.length - 1];
    if (top) {
      top.update(dt, input);
      if (!top.pauses) w.update(dt);
      return;
    }
    if (input.pressed('pause') && w.deathT < 0 && !w.transition) {
      this.push(new PauseMenu(w, 'pause', this.menuHooks()));
      return;
    }
    if (input.pressed('map') && w.deathT < 0) {
      this.push(new PauseMenu(w, 'map', this.menuHooks()));
      return;
    }
    if (this.game.debugEnabled && input.pressed('tabR') && input.down('down')) {
      this.push(new DebugMenu(w, this.debugFlags));
      return;
    }
    w.update(dt);
    // Audio listener + underwater filter
    this.game.audio.listenerX = w.player.cx;
    this.game.audio.setUnderwater(w.player.inWater);
    // Periodic safety autosave of exploration progress (never changes the respawn shrine).
    this.autosaveT += dt;
    if (this.autosaveT > 90 && w.deathT < 0 && !w.activeBoss?.bossActive) {
      this.autosaveT = 0;
      w.save();
    }
  }

  render(time: number): void {
    const r = this.game.renderer;
    const w = this.world;
    r.post.flashAlpha = this.flashT > 0 ? (this.flashT / this.flashMax) * this.flashAlpha : 0;
    r.post.flashColor = this.flashColor;
    r.renderWorld(w, time);
    if (this.game.debugEnabled && (this.debugFlags.hitboxes || this.debugFlags.collision)) r.drawDebug(w, { hit: this.debugFlags.hitboxes, collide: this.debugFlags.collision });
    r.screenSpace();
    const ctx = r.ctx;
    const hideUI = this.photo?.hideUI;
    if (!hideUI) {
      let prompt: { x: number; y: number; label: string } | null = null;
      const target = w.nearestInteractable();
      if (target && w.player.onGround && !this.overlays.length && w.player.canAct()) {
        const cam = w.camera;
        prompt = { x: (target.cx - cam.left) * cam.zoom, y: (target.y - 10 - cam.top) * cam.zoom, label: target.interactLabel?.() ?? 'Interact' };
      }
      if (!this.photo) this.hud.draw(ctx, w, time, prompt);
      // Death caption
      if (w.deathT > 0.8) {
        const a = Math.min(1, (w.deathT - 0.8) / 0.8);
        ctx.globalAlpha = a;
        text(ctx, 'THE VEIL REMEMBERS YOU', VIEW_W / 2, VIEW_H / 2, 12, '#d8d0e8', 'center', 'bold');
        ctx.globalAlpha = 1;
      }
    }
    for (const o of this.overlays) o.draw(ctx, time);
    if ((this.game.settings.showFps || (this.game.debugEnabled && this.debugFlags.stats)) && !hideUI) this.drawStats(ctx);
  }

  private drawStats(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const w = this.world;
    const r = g.renderer;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
    const lines = [`${g.fps} fps · ${g.frameMs.toFixed(1)} ms`];
    if (g.debugEnabled && this.debugFlags.stats) {
      lines.push(`room ${w.room.id} (${region(w.room.region).name})`);
      lines.push(`pos ${Math.round(w.player.cx / TILE)},${Math.round(w.player.cy / TILE)} · ${w.player.state}`);
      lines.push(`entities ${w.entities.length} · drawn ${r.stats.entities}`);
      lines.push(`particles ${w.fx.count}/${w.fx.budget} · lights ${r.stats.lights}`);
      lines.push(`chunks ${r.stats.chunks} · builds ${r.stats.chunkBuilds}`);
      lines.push(`projectiles ${w.projectiles.filter((p) => p.active).length}`);
      if (mem) lines.push(`heap ${(mem.usedJSHeapSize / 1048576).toFixed(1)} MB`);
      lines.push(hasFlag(w.progress, 'gloam_defeated') ? 'gloam defeated' : `bosses ${Object.keys(w.progress.bosses).length}`);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(VIEW_W - 130, VIEW_H - 10 - lines.length * 8, 126, lines.length * 8 + 6);
    lines.forEach((l, i) => text(ctx, l, VIEW_W - 8, VIEW_H - 8 - (lines.length - 1 - i) * 8, 6, i === 0 ? '#9fffc0' : UI.dim, 'right'));
  }
}
